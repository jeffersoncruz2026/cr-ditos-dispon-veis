import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mesKey } from "@/lib/format";

/**
 * Dados do dashboard: somente agregações simples (somas e agrupamentos) dos registros
 * existentes. Quando não há registros, os indicadores ficam `null` — nunca há valores fictícios.
 *
 * A busca (`useDashboardBase`) traz os registros uma vez; a montagem (`montarPainel`) é pura e
 * aplica os filtros de competência e unidade escolhidos na tela.
 */

export type SerieMensal = {
  mes: string;
  geracao: number | null;
  injetada: number | null;
  consumo: number | null;
  compensada: number | null;
  despesas: number | null;
  economia: number | null;
  creditos: number | null;
};
export type PorUnidade = { unidadeId: string; unidade: string; valor: number; cor: number };
export type ComparativoUnidade = {
  unidadeId: string;
  unidade: string;
  atual: number | null;
  anterior: number | null;
};
export type AlertaResumo = {
  id: string;
  titulo: string;
  severidade: string;
  tipo: string;
  created_at: string;
  unidade_id: string | null;
};

export type Kpis = {
  geracao: number | null;
  injetada: number | null;
  consumo: number | null;
  saldoCreditos: number | null;
  compensada: number | null;
  valorFaturas: number | null;
  economia: number | null;
  alertas: number;
};

type UnidadeBase = {
  id: string;
  nome: string;
  numero_uc: string;
  geradora: boolean;
  situacao: string;
};
type FaturaBase = {
  unidade_id: string;
  mes_referencia: string;
  consumo_kwh: number | null;
  valor_total: number | null;
  economia_estimada: number | null;
  energia_compensada_kwh: number | null;
  status: string;
  updated_at: string;
};
type GeracaoBase = {
  mes_referencia: string;
  geracao_kwh: number;
  energia_injetada_kwh: number | null;
  updated_at: string;
};
type CreditoBase = {
  unidade_id: string;
  mes_referencia: string;
  saldo_atual_kwh: number | null;
  updated_at: string;
};

export type DashboardBase = {
  unidades: UnidadeBase[];
  faturas: FaturaBase[];
  geracao: GeracaoBase[];
  creditos: CreditoBase[];
  alertas: AlertaResumo[];
  usinas: number;
};

export type Painel = {
  competencias: string[];
  competencia: string | null;
  anterior: string | null;
  atualizadoEm: string | null;
  kpis: Kpis;
  kpisAnteriores: Kpis | null;
  serie: SerieMensal[];
  consumoPorUnidade: PorUnidade[];
  comparativoFaturas: ComparativoUnidade[];
  porUnidade: Map<
    string,
    { consumo: number | null; valor: number | null; creditos: number | null; status: string | null }
  >;
  alertas: AlertaResumo[];
  unidades: UnidadeBase[];
  usinas: number;
};

const sumOrNull = (vals: (number | null | undefined)[]) => {
  const v = vals.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};

/** "2026-10-01" → "2026-09-01" */
export function mesAnterior(mes: string) {
  const [y = 1970, m = 1] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function useDashboardBase() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardBase> => {
      const [unidadesR, faturasR, geracaoR, creditosR, alertasR, usinasR] = await Promise.all([
        supabase
          .from("unidades_consumidoras")
          .select("id, nome, numero_uc, geradora, situacao")
          .neq("situacao", "inativa")
          .order("created_at")
          .order("numero_uc"),
        supabase
          .from("faturas")
          .select(
            "unidade_id, mes_referencia, consumo_kwh, valor_total, economia_estimada, energia_compensada_kwh, status, updated_at",
          ),
        supabase
          .from("geracao_solar")
          .select("mes_referencia, geracao_kwh, energia_injetada_kwh, updated_at"),
        supabase.from("creditos").select("unidade_id, mes_referencia, saldo_atual_kwh, updated_at"),
        supabase
          .from("alertas")
          .select("id, titulo, severidade, tipo, created_at, unidade_id")
          .eq("resolvido", false)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("usinas").select("id", { count: "exact", head: true }),
      ]);
      for (const r of [unidadesR, faturasR, geracaoR, creditosR, alertasR, usinasR])
        if (r.error) throw r.error;
      return {
        unidades: unidadesR.data ?? [],
        faturas: faturasR.data ?? [],
        geracao: geracaoR.data ?? [],
        creditos: creditosR.data ?? [],
        alertas: alertasR.data ?? [],
        usinas: usinasR.count ?? 0,
      };
    },
  });
}

/**
 * Monta os indicadores para a competência e a unidade escolhidas.
 * - Geração e energia injetada são da usina (não se dividem por unidade).
 * - Saldo de créditos = último registro de cada unidade até a competência.
 */
export function montarPainel(
  base: DashboardBase,
  opcoes: { competencia?: string | null; unidadeId?: string | null; meses?: number } = {},
): Painel {
  const unidadeId = opcoes.unidadeId ?? null;
  const daUnidade = <T extends { unidade_id: string | null }>(rows: T[]) =>
    unidadeId ? rows.filter((r) => r.unidade_id === unidadeId) : rows;

  const faturas = daUnidade(base.faturas);
  const creditos = daUnidade(base.creditos);
  const alertas = daUnidade(base.alertas);
  const { geracao } = base;

  const competencias = [
    ...new Set([...base.faturas, ...geracao].map((r) => mesKey(r.mes_referencia))),
  ]
    .sort()
    .reverse();
  const competencia =
    opcoes.competencia && competencias.includes(opcoes.competencia)
      ? opcoes.competencia
      : (competencias[0] ?? null);
  const anterior = competencia ? mesAnterior(competencia) : null;

  const doMes = <T extends { mes_referencia: string }>(rows: T[], mes: string | null) =>
    mes ? rows.filter((r) => mesKey(r.mes_referencia) === mes) : [];

  /** Último saldo de cada unidade até `mes` (inclusive). */
  const saldosAte = (mes: string, rows: CreditoBase[] = creditos) => {
    const ultimo = new Map<string, { mes: string; saldo: number | null }>();
    for (const c of rows) {
      const m = mesKey(c.mes_referencia);
      if (m > mes) continue;
      const prev = ultimo.get(c.unidade_id);
      if (!prev || m > prev.mes) ultimo.set(c.unidade_id, { mes: m, saldo: c.saldo_atual_kwh });
    }
    return ultimo;
  };

  const kpisDe = (mes: string | null): Kpis => {
    const fm = doMes(faturas, mes);
    const gm = doMes(geracao, mes);
    return {
      geracao: sumOrNull(gm.map((g) => g.geracao_kwh)),
      injetada: sumOrNull(gm.map((g) => g.energia_injetada_kwh)),
      consumo: sumOrNull(fm.map((f) => f.consumo_kwh)),
      saldoCreditos: mes ? sumOrNull([...saldosAte(mes).values()].map((c) => c.saldo)) : null,
      compensada: sumOrNull(fm.map((f) => f.energia_compensada_kwh)),
      valorFaturas: sumOrNull(fm.map((f) => f.valor_total)),
      economia: sumOrNull(fm.map((f) => f.economia_estimada)),
      alertas: alertas.length,
    };
  };

  const kpis = kpisDe(competencia);
  const temAnterior =
    !!anterior &&
    (doMes(faturas, anterior).length > 0 ||
      doMes(geracao, anterior).length > 0 ||
      creditos.some((c) => mesKey(c.mes_referencia) <= anterior));
  const kpisAnteriores = temAnterior ? { ...kpisDe(anterior), alertas: kpis.alertas } : null;

  // Série: meses com registros até a competência, limitada ao período escolhido.
  const meses = [...competencias]
    .reverse()
    .filter((m) => !competencia || m <= competencia)
    .slice(-(opcoes.meses ?? 12));
  const serie: SerieMensal[] = meses.map((mes) => {
    const fm = doMes(faturas, mes);
    const gm = doMes(geracao, mes);
    const temCredito = creditos.some((c) => mesKey(c.mes_referencia) <= mes);
    return {
      mes,
      geracao: sumOrNull(gm.map((g) => g.geracao_kwh)),
      injetada: sumOrNull(gm.map((g) => g.energia_injetada_kwh)),
      consumo: sumOrNull(fm.map((f) => f.consumo_kwh)),
      compensada: sumOrNull(fm.map((f) => f.energia_compensada_kwh)),
      despesas: sumOrNull(fm.map((f) => f.valor_total)),
      economia: sumOrNull(fm.map((f) => f.economia_estimada)),
      creditos: temCredito ? sumOrNull([...saldosAte(mes).values()].map((c) => c.saldo)) : null,
    };
  });

  const indice = new Map(base.unidades.map((u, i) => [u.id, i]));
  const nome = (id: string) => base.unidades.find((u) => u.id === id)?.nome ?? "Unidade removida";

  const faturasMes = doMes(faturas, competencia);
  const consumoPorUnidade: PorUnidade[] = [];
  for (const f of faturasMes) {
    if (typeof f.consumo_kwh !== "number") continue;
    const ex = consumoPorUnidade.find((c) => c.unidadeId === f.unidade_id);
    if (ex) ex.valor += f.consumo_kwh;
    else
      consumoPorUnidade.push({
        unidadeId: f.unidade_id,
        unidade: nome(f.unidade_id),
        valor: f.consumo_kwh,
        cor: indice.get(f.unidade_id) ?? 0,
      });
  }
  consumoPorUnidade.sort((a, b) => a.cor - b.cor);

  const faturasAnt = doMes(faturas, anterior);
  const idsComparativo = [...new Set([...faturasMes, ...faturasAnt].map((f) => f.unidade_id))].sort(
    (a, b) => (indice.get(a) ?? 99) - (indice.get(b) ?? 99),
  );
  const comparativoFaturas: ComparativoUnidade[] = idsComparativo.map((id) => ({
    unidadeId: id,
    unidade: nome(id),
    atual: sumOrNull(faturasMes.filter((f) => f.unidade_id === id).map((f) => f.valor_total)),
    anterior: sumOrNull(faturasAnt.filter((f) => f.unidade_id === id).map((f) => f.valor_total)),
  }));

  const saldosUnidades = competencia ? saldosAte(competencia, base.creditos) : new Map();
  const porUnidade: Painel["porUnidade"] = new Map();
  for (const u of base.unidades) {
    const fu = base.faturas.filter(
      (f) => f.unidade_id === u.id && mesKey(f.mes_referencia) === competencia,
    );
    porUnidade.set(u.id, {
      consumo: sumOrNull(fu.map((f) => f.consumo_kwh)),
      valor: sumOrNull(fu.map((f) => f.valor_total)),
      creditos: saldosUnidades.get(u.id)?.saldo ?? null,
      status: fu[0]?.status ?? null,
    });
  }

  const atualizadoEm =
    [...base.faturas, ...base.geracao, ...base.creditos]
      .map((r) => r.updated_at)
      .sort()
      .at(-1) ?? null;

  return {
    competencias,
    competencia,
    anterior: temAnterior ? anterior : null,
    atualizadoEm,
    kpis,
    kpisAnteriores,
    serie,
    consumoPorUnidade,
    comparativoFaturas,
    porUnidade,
    alertas,
    unidades: base.unidades,
    usinas: base.usinas,
  };
}
