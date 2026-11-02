// Somente servidor: chamada ao Claude para extrair os dados de uma fatura.
import Anthropic from "@anthropic-ai/sdk";
import { esquemaExtracao, normalizarDados, type DadosFatura } from "./campos";

export const MODELO_IA = "claude-opus-5-5";

const INSTRUCOES = `Você é um analista de faturas de energia elétrica da Equatorial Goiás, especialista no Sistema de Compensação de Energia Elétrica (SCEE / micro e minigeração distribuída).

Extraia os dados da fatura anexada (PDF original) usando também o texto extraído do mesmo PDF, que acompanha a mensagem. Responda somente com o JSON do esquema.

Regras obrigatórias:
1. Use exclusivamente informações impressas na fatura. Nunca invente, estime, calcule ou complete valores. Se um dado não estiver na fatura, ou se houver dúvida real, use null ("Não informado").
2. Números em kWh e R$ como number, com ponto decimal (ex.: 1.234,56 na fatura → 1234.56). Percentuais de 0 a 100. Datas no formato AAAA-MM-DD. Competência no formato AAAA-MM-01.
3. Competência é o mês/ano de REFERÊNCIA da fatura. Não deduza a competência pelas datas de leitura nem pelo vencimento.
4. Datas de leitura (anterior, atual, próxima) são próprias de cada unidade consumidora; copie exatamente as desta fatura.
5. NÃO confunda geração do inversor com energia injetada: "energia_injetada_kwh" é a energia injetada na rede medida pela distribuidora para esta UC; "geracao_ciclo_kwh" só deve ser preenchida se a fatura imprimir explicitamente a geração da usina no ciclo.
6. NÃO confunda excedente recebido com crédito utilizado: "excedente_recebido_kwh" é o excedente alocado/recebido por esta UC; "creditos_utilizados_kwh" só deve ser preenchido quando a fatura disser explicitamente quanto de crédito foi utilizado/consumido. Não use a energia compensada nem diferenças de saldo como substitutas.
7. "energia_compensada_kwh" corresponde aos itens de energia compensada/injetada abatidos na fatura (quantidade em kWh, não o valor em R$).
8. Para itens de consumo divididos em TUSD e TE com a mesma quantidade de kWh, informe a quantidade uma única vez (não some TUSD + TE).
9. Tributos: preencha ICMS, PIS e COFINS com os valores em R$; "tributos_total" só se a fatura informar o total.
10. "numero_uc": número da unidade consumidora desta fatura, somente dígitos.
11. Use "observacoes" para apontar ambiguidades, campos ilegíveis ou valores que exigem conferência humana. Não repita a lista de campos nulos.`;

export type ResultadoIA =
  | { ok: true; dados: DadosFatura; observacoes: string[]; modelo: string }
  | {
      ok: false;
      motivo: "ia_nao_configurada" | "recusa" | "resposta_invalida" | "falha";
      mensagem: string;
    };

export function iaConfigurada() {
  return !!process.env["ANTHROPIC_API_KEY"];
}

function paraBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function extrairComClaude(pdf: ArrayBuffer, texto: string): Promise<ResultadoIA> {
  if (!iaConfigurada()) {
    return {
      ok: false,
      motivo: "ia_nao_configurada",
      mensagem: "A chave ANTHROPIC_API_KEY não está configurada no servidor.",
    };
  }
  const client = new Anthropic();
  try {
    const resp = await client.beta.messages.create({
      model: MODELO_IA,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: esquemaExtracao() } },
      system: INSTRUCOES,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: paraBase64(pdf) },
            },
            {
              type: "text",
              text: texto.trim()
                ? `Texto extraído do mesmo PDF (para conferência de números):\n\n${texto}`
                : "O PDF não possui texto selecionável; leia a imagem da fatura.",
            },
          ],
        },
      ],
    });

    if (resp.stop_reason === "refusal") {
      return { ok: false, motivo: "recusa", mensagem: "A IA não processou esta fatura." };
    }
    if (resp.stop_reason === "max_tokens") {
      return { ok: false, motivo: "resposta_invalida", mensagem: "Resposta da IA incompleta." };
    }
    const texto_resposta = resp.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(texto_resposta) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        motivo: "resposta_invalida",
        mensagem: "A IA retornou um formato inválido.",
      };
    }
    const observacoes = Array.isArray(json["observacoes"])
      ? json["observacoes"].filter((o): o is string => typeof o === "string")
      : [];
    return { ok: true, dados: normalizarDados(json), observacoes, modelo: resp.model };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, motivo: "falha", mensagem: "Chave da IA inválida (ANTHROPIC_API_KEY)." };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        motivo: "falha",
        mensagem: "Limite de uso da IA atingido. Tente novamente em instantes.",
      };
    }
    if (e instanceof Anthropic.APIError) {
      return { ok: false, motivo: "falha", mensagem: `Falha na IA (${e.status ?? "conexão"}).` };
    }
    return { ok: false, motivo: "falha", mensagem: "Não foi possível consultar a IA." };
  }
}
