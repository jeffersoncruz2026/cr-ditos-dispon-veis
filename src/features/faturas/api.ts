import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { extrairFaturaIA } from "./extracao.functions";
import { sha256Hex } from "./pdf-texto";
import { decodificarXml, ehXml, lerXmlNf3e, XmlInvalidoError } from "./xml-nf3e";
import {
  extrairBasico,
  gerarAvisos,
  identificarUnidade,
  verificarDados,
  type Aviso,
} from "./analise";
import { normalizarDados, type DadosFatura } from "./campos";

export type Importacao = Tables<"importacoes_faturas">;
export type UnidadeRef = { id: string; nome: string; numero_uc: string };

export const faturasKeys = {
  all: ["faturas-importacao"] as const,
  importacoes: () => [...faturasKeys.all, "importacoes"] as const,
  importacao: (id: string) => [...faturasKeys.all, "importacao", id] as const,
  competencias: () => [...faturasKeys.all, "competencias"] as const,
};

export const TAMANHO_MAXIMO = 5 * 1024 * 1024;

export function useImportacoes() {
  return useQuery({
    queryKey: faturasKeys.importacoes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_faturas")
        .select(
          "id, arquivo_nome, arquivo_tamanho, status, metodo_extracao, unidade_id, mes_referencia, avisos, erro, fatura_id, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useImportacao(id: string) {
  return useQuery({
    queryKey: faturasKeys.importacao(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_faturas")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Faturas importadas, para o histórico de competências. */
export function useCompetencias() {
  return useQuery({
    queryKey: faturasKeys.competencias(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select(
          "id, unidade_id, mes_referencia, valor_total, consumo_kwh, saldo_creditos_kwh, vencimento",
        )
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUnidadesRef() {
  return useQuery({
    queryKey: ["unidades", "ref"],
    queryFn: async (): Promise<UnidadeRef[]> => {
      const { data, error } = await supabase
        .from("unidades_consumidoras")
        .select("id, nome, numero_uc")
        .order("created_at")
        .order("numero_uc");
      if (error) throw error;
      return data;
    },
  });
}

/** Analisa uma extração (IA ou básica): identifica a UC, confere valores no texto e gera avisos. */
export async function analisarExtracao(args: {
  texto: string;
  dados: DadosFatura;
  metodo: "ia" | "basica" | "xml";
  unidades: UnidadeRef[];
  erroIA?: string | null;
  observacoesIA?: string[];
  avisosExtras?: Aviso[];
}) {
  const { unidade, ambigua } = identificarUnidade(
    args.texto,
    args.unidades,
    typeof args.dados.numero_uc === "string" ? args.dados.numero_uc : null,
  );
  const dados = { ...args.dados };
  if (unidade && !dados.numero_uc) dados.numero_uc = unidade.numero_uc.replace(/\D/g, "");

  let faturaExistente = false;
  if (unidade && dados.mes_referencia) {
    const { count } = await supabase
      .from("faturas")
      .select("id", { count: "exact", head: true })
      .eq("unidade_id", unidade.id)
      .eq("mes_referencia", String(dados.mes_referencia));
    faturaExistente = (count ?? 0) > 0;
  }

  const semTexto = args.texto.replace(/\s|---|Página \d+/g, "").length < 50;
  const avisos: Aviso[] = [
    ...gerarAvisos({
      dados,
      verificacao: verificarDados(args.texto, dados),
      unidadeIdentificada: !!unidade,
      ucAmbigua: ambigua,
      faturaExistente,
      semTexto,
      metodo: args.metodo,
      erroIA: args.erroIA ?? null,
    }),
    ...(args.observacoesIA ?? []).map((m) => ({ nivel: "info" as const, mensagem: `IA: ${m}` })),
    ...(args.avisosExtras ?? []),
  ];
  return { dados, unidadeId: unidade?.id ?? null, avisos };
}

/** Executa a IA (ou a extração básica como alternativa) e grava o resultado na importação. */
async function extrairEGravar(importacaoId: string, texto: string, unidades: UnidadeRef[]) {
  let dados: DadosFatura;
  let metodo: "ia" | "basica" = "ia";
  let erroIA: string | null = null;
  let observacoesIA: string[] = [];
  let modelo: string | null = null;

  let ia: Awaited<ReturnType<typeof extrairFaturaIA>> | null = null;
  try {
    ia = await extrairFaturaIA({ data: { importacaoId } });
  } catch {
    ia = null;
  }
  if (ia?.ok) {
    dados = ia.dados;
    observacoesIA = ia.observacoes;
    modelo = ia.modelo;
  } else {
    metodo = "basica";
    dados = extrairBasico(texto);
    erroIA =
      ia && ia.motivo === "ia_nao_configurada"
        ? null
        : `Extração por IA indisponível${ia ? ` (${ia.mensagem.replace(/\.$/, "")})` : ""}. Foi usada a extração básica.`;
  }

  const analise = await analisarExtracao({ texto, dados, metodo, unidades, erroIA, observacoesIA });
  const { error } = await supabase
    .from("importacoes_faturas")
    .update({
      status: "aguardando_conferencia",
      metodo_extracao: metodo,
      dados_extraidos: { ...analise.dados, _modelo: modelo } as unknown as Json,
      avisos: analise.avisos as unknown as Json,
      unidade_id: analise.unidadeId,
      mes_referencia: (analise.dados.mes_referencia as string | null) ?? null,
      erro: null,
    })
    .eq("id", importacaoId);
  if (error) throw error;
  return { metodo, avisos: analise.avisos };
}

/**
 * Lê o XML da NF3e e grava o resultado na importação. A leitura é determinística (tags do XML),
 * então não há IA envolvida. No banco o método fica "basica" (restrição atual da coluna) e a
 * origem é registrada em `dados_extraidos._origem`.
 */
async function lerEGravarXml(importacaoId: string, xml: string, unidades: UnidadeRef[]) {
  const leitura = lerXmlNf3e(xml);
  const analise = await analisarExtracao({
    texto: leitura.texto,
    dados: leitura.dados,
    metodo: "xml",
    unidades,
    avisosExtras: leitura.avisos,
  });
  const { error } = await supabase
    .from("importacoes_faturas")
    .update({
      status: "aguardando_conferencia",
      metodo_extracao: "basica",
      dados_extraidos: {
        ...analise.dados,
        _origem: "xml_nf3e",
        _chave_nf3e: leitura.chave,
      } as unknown as Json,
      avisos: analise.avisos as unknown as Json,
      unidade_id: analise.unidadeId,
      mes_referencia: (analise.dados.mes_referencia as string | null) ?? null,
      erro: null,
    })
    .eq("id", importacaoId);
  if (error) throw error;
  return { metodo: "xml" as const, avisos: analise.avisos };
}

export type EtapaArquivo =
  "verificando" | "enviando" | "lendo" | "extraindo" | "concluido" | "duplicado" | "erro";

export type ResultadoArquivo = {
  etapa: EtapaArquivo;
  mensagem?: string;
  importacaoId?: string;
  metodo?: "ia" | "basica" | "xml";
  avisos?: Aviso[];
};

/** Pipeline completo de um XML de NF3e: duplicidade → leitura → armazenamento privado → fila de conferência. */
export async function processarArquivo(
  arquivo: File,
  unidades: UnidadeRef[],
  progresso: (r: ResultadoArquivo) => void,
): Promise<ResultadoArquivo> {
  try {
    if (!/xml/.test(arquivo.type) && !arquivo.name.toLowerCase().endsWith(".xml")) {
      return {
        etapa: "erro",
        mensagem: "Envie o XML da nota fiscal (NF3e). Arquivos PDF não são mais aceitos.",
      };
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
      return { etapa: "erro", mensagem: "O arquivo excede 5 MB." };
    }

    progresso({ etapa: "verificando" });
    const buffer = await arquivo.arrayBuffer();
    const hash = await sha256Hex(buffer);

    const [ativa, importada] = await Promise.all([
      supabase
        .from("importacoes_faturas")
        .select("id, status")
        .eq("arquivo_hash", hash)
        .neq("status", "descartada")
        .maybeSingle(),
      supabase
        .from("faturas")
        .select("id", { count: "exact", head: true })
        .eq("arquivo_hash", hash),
    ]);
    if (ativa.data) {
      return {
        etapa: "duplicado",
        importacaoId: ativa.data.id,
        mensagem:
          ativa.data.status === "importada"
            ? "Este XML já foi importado."
            : "Este XML já está na fila de importações.",
      };
    }
    if ((importada.count ?? 0) > 0)
      return { etapa: "duplicado", mensagem: "Este XML já foi importado." };

    // Lê antes de enviar: um arquivo que não é NF3e não chega ao armazenamento.
    progresso({ etapa: "lendo" });
    const xml = decodificarXml(buffer);
    try {
      lerXmlNf3e(xml);
    } catch (e) {
      if (e instanceof XmlInvalidoError) return { etapa: "erro", mensagem: e.message };
      throw e;
    }

    progresso({ etapa: "enviando" });
    const caminho = `${new Date().getFullYear()}/${hash}.xml`;
    const up = await supabase.storage
      .from("faturas")
      .upload(caminho, new Blob([buffer], { type: "text/xml" }), {
        contentType: "text/xml",
        upsert: false,
      });
    // O conteúdo integral do XML também fica em `texto_extraido`, então uma falha no
    // armazenamento do arquivo (ex.: bucket restrito a PDF) não impede a importação.
    const armazenado = !up.error || /exist|duplicate/i.test(up.error.message);

    const ins = await supabase
      .from("importacoes_faturas")
      .insert({
        arquivo_nome: arquivo.name,
        arquivo_path: caminho,
        arquivo_hash: hash,
        arquivo_tamanho: arquivo.size,
        texto_extraido: xml,
        status: "processando",
      })
      .select("id")
      .single();
    if (ins.error) {
      if (ins.error.code === "23505")
        return { etapa: "duplicado", mensagem: "Este XML já está na fila." };
      throw ins.error;
    }
    const importacaoId = ins.data.id;

    progresso({ etapa: "extraindo", importacaoId });
    try {
      const r = await lerEGravarXml(importacaoId, xml, unidades);
      return {
        etapa: "concluido",
        importacaoId,
        metodo: r.metodo,
        avisos: r.avisos,
        ...(armazenado
          ? {}
          : { mensagem: "Pronto para conferência (arquivo original não armazenado)" }),
      };
    } catch (e) {
      await supabase
        .from("importacoes_faturas")
        .update({ status: "erro", erro: e instanceof Error ? e.message : "Falha na leitura." })
        .eq("id", importacaoId);
      throw e;
    }
  } catch (e) {
    const msg = (e as { message?: string })?.message;
    return { etapa: "erro", mensagem: msg ? `Falha: ${msg}` : "Falha ao processar o arquivo." };
  }
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: faturasKeys.all });
    qc.invalidateQueries({ queryKey: ["unidades"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useReprocessar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async ({
      importacao,
      unidades,
    }: {
      importacao: Importacao;
      unidades: UnidadeRef[];
    }) => {
      await supabase
        .from("importacoes_faturas")
        .update({ status: "processando" })
        .eq("id", importacao.id);
      const texto = importacao.texto_extraido ?? "";
      // Importações antigas (PDF) continuam usando a extração anterior.
      return ehXml(texto)
        ? lerEGravarXml(importacao.id, texto, unidades)
        : extrairEGravar(importacao.id, texto, unidades);
    },
    onSettled: invalidar,
  });
}

export function useConfirmarImportacao() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (args: { importacaoId: string; unidadeId: string; dados: DadosFatura }) => {
      const { data, error } = await supabase.rpc("confirmar_importacao_fatura", {
        _importacao_id: args.importacaoId,
        _unidade_id: args.unidadeId,
        _dados: normalizarDados(args.dados) as unknown as Json,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidar,
  });
}

/** Salva o rascunho da conferência sem confirmar a importação. */
export function useSalvarRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      importacaoId: string;
      unidadeId: string | null;
      dados: DadosFatura;
      extras: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("importacoes_faturas")
        .update({
          dados_extraidos: { ...normalizarDados(args.dados), ...args.extras } as unknown as Json,
          unidade_id: args.unidadeId,
          mes_referencia: (args.dados.mes_referencia as string | null) ?? null,
        })
        .eq("id", args.importacaoId);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: faturasKeys.importacao(v.importacaoId) }),
  });
}

export function useDescartar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async (importacao: Pick<Importacao, "id" | "fatura_id">) => {
      if (importacao.fatura_id) {
        const del = await supabase.from("faturas").delete().eq("id", importacao.fatura_id);
        if (del.error) throw del.error;
      }
      const { error } = await supabase
        .from("importacoes_faturas")
        .update({ status: "descartada", fatura_id: null })
        .eq("id", importacao.id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export async function urlAssinadaPdf(caminho: string) {
  const { data, error } = await supabase.storage.from("faturas").createSignedUrl(caminho, 60 * 30);
  if (error) throw error;
  return data.signedUrl;
}
