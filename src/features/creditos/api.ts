import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mesKey } from "@/lib/format";

/**
 * Leitura (somente consulta) dos créditos registrados por unidade e dos créditos a expirar
 * informados nas faturas. Nenhum valor é calculado além de somas e do último registro.
 */
export type RegistroCredito = {
  id: string;
  unidade_id: string;
  mes: string;
  saldo_anterior: number | null;
  recebidos: number | null;
  utilizados: number | null;
  saldo_atual: number | null;
  validade: string | null;
};

export type ResumoUnidadeCredito = {
  id: string;
  nome: string;
  numero_uc: string;
  geradora: boolean;
  situacao: string;
  indice: number;
  ultimo: RegistroCredito | null;
  aExpirar: { kwh: number | null; data: string | null; mes: string } | null;
};

export function useCreditos() {
  return useQuery({
    queryKey: ["creditos", "painel"],
    queryFn: async () => {
      const [u, c, f] = await Promise.all([
        supabase
          .from("unidades_consumidoras")
          .select("id, nome, numero_uc, geradora, situacao")
          .neq("situacao", "inativa")
          .order("created_at")
          .order("numero_uc"),
        supabase
          .from("creditos")
          .select(
            "id, unidade_id, mes_referencia, saldo_anterior_kwh, creditos_recebidos_kwh, creditos_utilizados_kwh, saldo_atual_kwh, validade",
          ),
        supabase
          .from("faturas")
          .select("unidade_id, mes_referencia, creditos_a_expirar_kwh, creditos_a_expirar_data"),
      ]);
      for (const r of [u, c, f]) if (r.error) throw r.error;

      const registros: RegistroCredito[] = (c.data ?? []).map((r) => ({
        id: r.id,
        unidade_id: r.unidade_id,
        mes: mesKey(r.mes_referencia),
        saldo_anterior: r.saldo_anterior_kwh,
        recebidos: r.creditos_recebidos_kwh,
        utilizados: r.creditos_utilizados_kwh,
        saldo_atual: r.saldo_atual_kwh,
        validade: r.validade,
      }));

      const unidades: ResumoUnidadeCredito[] = (u.data ?? []).map((un, indice) => {
        const proprios = registros
          .filter((r) => r.unidade_id === un.id)
          .sort((a, b) => b.mes.localeCompare(a.mes));
        const fatura = (f.data ?? [])
          .filter((x) => x.unidade_id === un.id)
          .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia))[0];
        return {
          ...un,
          indice,
          ultimo: proprios[0] ?? null,
          aExpirar: fatura
            ? {
                kwh: fatura.creditos_a_expirar_kwh,
                data: fatura.creditos_a_expirar_data,
                mes: mesKey(fatura.mes_referencia),
              }
            : null,
        };
      });

      const meses = [...new Set(registros.map((r) => r.mes))].sort();
      return { unidades, registros, meses };
    },
  });
}
