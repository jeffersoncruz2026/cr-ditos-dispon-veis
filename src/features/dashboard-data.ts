import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mesKey } from "@/lib/format";

/**
 * Dados do dashboard: somente agregações simples (somas e agrupamentos) dos
 * registros existentes. Quando não há registros, os indicadores ficam `null`.
 */
export type SerieMensal = {
  mes: string;
  geracao: number | null;
  consumo: number | null;
  despesas: number | null;
};
export type PorUnidade = { unidade: string; valor: number };
export type AlertaResumo = {
  id: string;
  titulo: string;
  severidade: string;
  tipo: string;
  created_at: string;
};

export type DashboardData = {
  competencia: string | null;
  kpis: {
    geracao: number | null;
    injetada: number | null;
    consumo: number | null;
    saldoCreditos: number | null;
    valorFaturas: number | null;
    economia: number | null;
    unidades: number;
    alertas: number;
  };
  serie: SerieMensal[];
  consumoPorUnidade: PorUnidade[];
  creditosPorUnidade: PorUnidade[];
  alertas: AlertaResumo[];
  unidadesNomes: string[];
  usinas: number;
};

const sumOrNull = (vals: (number | null | undefined)[]) => {
  const v = vals.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const [unidadesR, faturasR, geracaoR, creditosR, alertasR, usinasR] = await Promise.all([
        supabase
          .from("unidades_consumidoras")
          .select("id, nome")
          .neq("situacao", "inativa")
          .order("created_at"),
        supabase
          .from("faturas")
          .select("unidade_id, mes_referencia, consumo_kwh, valor_total, economia_estimada"),
        supabase.from("geracao_solar").select("mes_referencia, geracao_kwh, energia_injetada_kwh"),
        supabase.from("creditos").select("unidade_id, mes_referencia, saldo_atual_kwh"),
        supabase
          .from("alertas")
          .select("id, titulo, severidade, tipo, created_at", { count: "exact" })
          .eq("resolvido", false)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("usinas").select("id", { count: "exact", head: true }),
      ]);
      for (const r of [unidadesR, faturasR, geracaoR, creditosR, alertasR, usinasR])
        if (r.error) throw r.error;

      const unidades = unidadesR.data ?? [];
      const faturas = faturasR.data ?? [];
      const geracao = geracaoR.data ?? [];
      const creditos = creditosR.data ?? [];
      const nomeUnidade = new Map(unidades.map((u) => [u.id, u.nome]));

      const meses = [
        ...new Set([...faturas, ...geracao].map((r) => mesKey(r.mes_referencia))),
      ].sort();
      const competencia = meses.at(-1) ?? null;
      const doMes = <T extends { mes_referencia: string }>(rows: T[], mes: string | null) =>
        mes ? rows.filter((r) => mesKey(r.mes_referencia) === mes) : [];

      const faturasMes = doMes(faturas, competencia);
      const geracaoMes = doMes(geracao, competencia);

      // Saldo atual = último registro de crédito de cada unidade.
      const ultimoCredito = new Map<string, { mes: string; saldo: number | null }>();
      for (const c of creditos) {
        const mes = mesKey(c.mes_referencia);
        const prev = ultimoCredito.get(c.unidade_id);
        if (!prev || mes > prev.mes)
          ultimoCredito.set(c.unidade_id, { mes, saldo: c.saldo_atual_kwh });
      }

      const serie = meses.slice(-12).map((mes) => ({
        mes,
        geracao: sumOrNull(doMes(geracao, mes).map((g) => g.geracao_kwh)),
        consumo: sumOrNull(doMes(faturas, mes).map((f) => f.consumo_kwh)),
        despesas: sumOrNull(doMes(faturas, mes).map((f) => f.valor_total)),
      }));

      const agrupar = (rows: { unidade_id: string; v: number | null }[]) => {
        const m = new Map<string, number>();
        for (const r of rows)
          if (typeof r.v === "number") m.set(r.unidade_id, (m.get(r.unidade_id) ?? 0) + r.v);
        return [...m].map(([id, valor]) => ({
          unidade: nomeUnidade.get(id) ?? "Unidade removida",
          valor,
        }));
      };

      return {
        competencia,
        kpis: {
          geracao: sumOrNull(geracaoMes.map((g) => g.geracao_kwh)),
          injetada: sumOrNull(geracaoMes.map((g) => g.energia_injetada_kwh)),
          consumo: sumOrNull(faturasMes.map((f) => f.consumo_kwh)),
          saldoCreditos: sumOrNull([...ultimoCredito.values()].map((c) => c.saldo)),
          valorFaturas: sumOrNull(faturasMes.map((f) => f.valor_total)),
          economia: sumOrNull(faturasMes.map((f) => f.economia_estimada)),
          unidades: unidades.length,
          alertas: alertasR.count ?? alertasR.data?.length ?? 0,
        },
        serie,
        consumoPorUnidade: agrupar(
          faturasMes.map((f) => ({ unidade_id: f.unidade_id, v: f.consumo_kwh })),
        ),
        creditosPorUnidade: agrupar(
          [...ultimoCredito].map(([unidade_id, c]) => ({ unidade_id, v: c.saldo })),
        ).filter((c) => c.valor > 0),
        alertas: alertasR.data ?? [],
        unidadesNomes: unidades.map((u) => u.nome),
        usinas: usinasR.count ?? 0,
      };
    },
  });
}
