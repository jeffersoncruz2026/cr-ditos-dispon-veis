import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Indica se a extração por IA está disponível no servidor. */
export const statusIA = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { iaConfigurada, MODELO_IA } = await import("./extracao.server");
    return { configurada: iaConfigurada(), modelo: MODELO_IA };
  });

/**
 * Extrai os dados de uma importação já enviada: lê o PDF do armazenamento privado
 * (com as permissões do próprio usuário) e consulta a IA. Não grava nada.
 */
export const extrairFaturaIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ importacaoId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: podeGravar } = await supabase.rpc("can_write", { _user_id: userId });
    if (!podeGravar) {
      return {
        ok: false as const,
        motivo: "falha" as const,
        mensagem: "Sem permissão para importar faturas.",
      };
    }

    const { data: imp, error } = await supabase
      .from("importacoes_faturas")
      .select("arquivo_path, texto_extraido")
      .eq("id", data.importacaoId)
      .single();
    if (error || !imp) {
      return {
        ok: false as const,
        motivo: "falha" as const,
        mensagem: "Importação não encontrada.",
      };
    }

    const arquivo = await supabase.storage.from("faturas").download(imp.arquivo_path);
    if (arquivo.error || !arquivo.data) {
      return {
        ok: false as const,
        motivo: "falha" as const,
        mensagem: "Não foi possível ler o PDF armazenado.",
      };
    }

    const { extrairComClaude } = await import("./extracao.server");
    return extrairComClaude(await arquivo.data.arrayBuffer(), imp.texto_extraido ?? "");
  });
