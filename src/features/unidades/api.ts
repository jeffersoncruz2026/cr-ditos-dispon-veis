import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Unidade = Tables<"unidades_consumidoras">;
export type Usina = Tables<"usinas">;
export type UnidadeComRateio = Unidade & { percentual: number | null; usina: Usina | null };

export type RateioConfiguracao = {
  id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  observacoes: string | null;
  itens: { unidade_id: string; percentual: number }[];
};

export const unidadesKeys = {
  all: ["unidades"] as const,
  lista: () => [...unidadesKeys.all, "lista"] as const,
  rateios: () => [...unidadesKeys.all, "rateios"] as const,
  historico: (id: string) => [...unidadesKeys.all, "historico", id] as const,
};

/** Histórico completo de configurações de rateio (mais recente primeiro). */
export function useRateios() {
  return useQuery({
    queryKey: unidadesKeys.rateios(),
    queryFn: async (): Promise<RateioConfiguracao[]> => {
      const { data, error } = await supabase
        .from("rateio_configuracoes")
        .select("id, vigencia_inicio, vigencia_fim, observacoes, rateios(unidade_id, percentual)")
        .order("vigencia_inicio", { ascending: false });
      if (error) throw error;
      return data.map(({ rateios, ...c }) => ({ ...c, itens: rateios }));
    },
  });
}

/** Unidades com o percentual da configuração vigente e a usina (se geradora). */
export function useUnidades() {
  const rateios = useRateios();
  const unidades = useQuery({
    queryKey: unidadesKeys.lista(),
    queryFn: async () => {
      const [u, us] = await Promise.all([
        supabase.from("unidades_consumidoras").select("*").order("created_at").order("numero_uc"),
        supabase.from("usinas").select("*"),
      ]);
      if (u.error) throw u.error;
      if (us.error) throw us.error;
      return { unidades: u.data, usinas: us.data };
    },
  });

  // Vigente = início até o mês atual e sem término anterior a hoje; programada = início futuro.
  const hoje = new Date().toISOString().slice(0, 10);
  const lista = rateios.data ?? [];
  const vigente =
    lista.find((c) => c.vigencia_inicio <= hoje && (!c.vigencia_fim || c.vigencia_fim >= hoje)) ??
    null;
  const programada = lista.find((c) => c.vigencia_inicio > hoje) ?? null;
  const ultima = lista[0] ?? null;
  const data: UnidadeComRateio[] | undefined = unidades.data?.unidades.map((u) => ({
    ...u,
    percentual: vigente
      ? (vigente.itens.find((i) => i.unidade_id === u.id)?.percentual ?? 0)
      : null,
    usina: unidades.data?.usinas.find((s) => s.unidade_geradora_id === u.id) ?? null,
  }));

  return {
    data,
    vigente,
    programada,
    ultima,
    rateios: lista,
    isLoading: unidades.isLoading || rateios.isLoading,
    isError: unidades.isError || rateios.isError,
    error: unidades.error ?? rateios.error,
  };
}

export function useHistoricoUnidade(id: string) {
  return useQuery({
    queryKey: unidadesKeys.historico(id),
    queryFn: async () => {
      const [faturas, creditos] = await Promise.all([
        supabase
          .from("faturas")
          .select("*")
          .eq("unidade_id", id)
          .order("mes_referencia", { ascending: false }),
        supabase
          .from("creditos")
          .select("*")
          .eq("unidade_id", id)
          .order("mes_referencia", { ascending: false }),
      ]);
      if (faturas.error) throw faturas.error;
      if (creditos.error) throw creditos.error;
      return { faturas: faturas.data, creditos: creditos.data };
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: unidadesKeys.all });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export type UsinaInput = Pick<
  TablesInsert<"usinas">,
  "potencia_kwp" | "quantidade_modulos" | "potencia_modulo_w" | "inversor" | "data_instalacao"
>;

export function useSalvarUnidade() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      unidade,
      usina,
    }: {
      id: string | null;
      unidade: TablesInsert<"unidades_consumidoras">;
      usina: UsinaInput | null;
    }) => {
      const res = id
        ? await supabase
            .from("unidades_consumidoras")
            .update(unidade)
            .eq("id", id)
            .select("id")
            .single()
        : await supabase.from("unidades_consumidoras").insert(unidade).select("id").single();
      if (res.error) throw res.error;
      const unidadeId = res.data.id;

      if (unidade.geradora && usina) {
        const { error } = await supabase
          .from("usinas")
          .upsert(
            { ...usina, nome: `Usina ${unidade.nome}`, unidade_geradora_id: unidadeId },
            { onConflict: "unidade_geradora_id" },
          );
        if (error) throw error;
      }
      return unidadeId;
    },
    onSuccess: invalidate,
  });
}

export function useExcluirUnidade() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unidades_consumidoras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useAplicarRateio() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (args: {
      vigencia: string;
      itens: { unidade_id: string; percentual: number }[];
      observacoes: string;
    }) => {
      const { error } = await supabase.rpc("aplicar_rateio", {
        _vigencia_inicio: args.vigencia,
        _percentuais: args.itens,
        _observacoes: args.observacoes,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Mensagem amigável para erros do Supabase/PostgREST. */
export function mensagemErro(e: unknown, padrao: string) {
  const err = e as { code?: string; message?: string };
  if (err?.code === "23505") return "Já existe uma unidade com este número de UC.";
  if (err?.code === "42501") return "Você não tem permissão para esta operação.";
  if (err?.code === "22023" && err.message) return err.message;
  if (err?.code === "PGRST205" || err?.code === "42P01" || err?.code === "42703")
    return "O banco de dados está desatualizado: há migrações pendentes.";
  return padrao;
}
