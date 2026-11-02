/**
 * Catálogo dos dados extraídos de uma fatura da Equatorial Goiás.
 * Fonte única para: esquema JSON enviado à IA, formulário de conferência e gravação.
 * Valor `null` = "Não informado" na fatura.
 */
export type TipoCampo = "texto" | "uc" | "mes" | "data" | "kwh" | "brl" | "percentual" | "leitura";
export type Secao = "identificacao" | "consumo" | "geracao" | "financeiro";

export type Campo = {
  chave: string;
  rotulo: string;
  secao: Secao;
  tipo: TipoCampo;
  /** Orientação para a IA e dica no formulário. */
  ajuda: string;
};

export const SECOES: { id: Secao; titulo: string }[] = [
  { id: "identificacao", titulo: "Identificação" },
  { id: "consumo", titulo: "Consumo" },
  { id: "geracao", titulo: "Geração e créditos" },
  { id: "financeiro", titulo: "Financeiro" },
];

export const CAMPOS = [
  // Identificação
  {
    chave: "numero_uc",
    rotulo: "Número da UC",
    secao: "identificacao",
    tipo: "uc",
    ajuda: "Número da unidade consumidora (UC / conta contrato / instalação), somente dígitos.",
  },
  {
    chave: "titular",
    rotulo: "Titular",
    secao: "identificacao",
    tipo: "texto",
    ajuda: "Nome do cliente titular impresso na fatura.",
  },
  {
    chave: "mes_referencia",
    rotulo: "Competência",
    secao: "identificacao",
    tipo: "mes",
    ajuda: "Mês/ano de referência da fatura (não use a data de leitura). Formato AAAA-MM-01.",
  },
  {
    chave: "leitura_anterior_data",
    rotulo: "Data da leitura anterior",
    secao: "identificacao",
    tipo: "data",
    ajuda: "Data da leitura anterior desta UC.",
  },
  {
    chave: "leitura_atual_data",
    rotulo: "Data da leitura atual",
    secao: "identificacao",
    tipo: "data",
    ajuda: "Data da leitura atual desta UC.",
  },
  {
    chave: "proxima_leitura_data",
    rotulo: "Próxima leitura",
    secao: "identificacao",
    tipo: "data",
    ajuda: "Data prevista da próxima leitura, se impressa.",
  },
  {
    chave: "vencimento",
    rotulo: "Vencimento",
    secao: "identificacao",
    tipo: "data",
    ajuda: "Data de vencimento da fatura.",
  },
  {
    chave: "valor_total",
    rotulo: "Valor total",
    secao: "identificacao",
    tipo: "brl",
    ajuda: "Total a pagar da fatura, em R$.",
  },
  // Consumo
  {
    chave: "consumo_kwh",
    rotulo: "Consumo",
    secao: "consumo",
    tipo: "kwh",
    ajuda: "Energia consumida da rede no ciclo (kWh), conforme a fatura.",
  },
  {
    chave: "energia_compensada_kwh",
    rotulo: "Energia compensada",
    secao: "consumo",
    tipo: "kwh",
    ajuda: "kWh compensados com créditos/energia injetada (itens de compensação SCEE).",
  },
  {
    chave: "energia_nao_compensada_kwh",
    rotulo: "Energia não compensada",
    secao: "consumo",
    tipo: "kwh",
    ajuda: "kWh faturados sem compensação, se a fatura discriminar.",
  },
  {
    chave: "leitura_anterior",
    rotulo: "Leitura anterior (medidor)",
    secao: "consumo",
    tipo: "leitura",
    ajuda: "Leitura anterior do medidor de consumo.",
  },
  {
    chave: "leitura_atual",
    rotulo: "Leitura atual (medidor)",
    secao: "consumo",
    tipo: "leitura",
    ajuda: "Leitura atual do medidor de consumo.",
  },
  // Geração e créditos
  {
    chave: "energia_injetada_kwh",
    rotulo: "Energia injetada",
    secao: "geracao",
    tipo: "kwh",
    ajuda:
      "kWh injetados NA REDE por esta UC, medidos pela distribuidora. Não é a geração do inversor.",
  },
  {
    chave: "geracao_ciclo_kwh",
    rotulo: "Geração do ciclo (informada na fatura)",
    secao: "geracao",
    tipo: "kwh",
    ajuda: "Somente se a fatura imprimir explicitamente a geração da usina no ciclo.",
  },
  {
    chave: "excedente_recebido_kwh",
    rotulo: "Excedente recebido",
    secao: "geracao",
    tipo: "kwh",
    ajuda:
      "Excedente de energia recebido/alocado para esta UC no ciclo (rateio). Não é crédito utilizado.",
  },
  {
    chave: "creditos_recebidos_kwh",
    rotulo: "Créditos recebidos",
    secao: "geracao",
    tipo: "kwh",
    ajuda: "Créditos recebidos no ciclo, como impresso na fatura.",
  },
  {
    chave: "creditos_utilizados_kwh",
    rotulo: "Créditos utilizados",
    secao: "geracao",
    tipo: "kwh",
    ajuda: "Somente se a fatura informar explicitamente os créditos utilizados/consumidos.",
  },
  {
    chave: "saldo_creditos_kwh",
    rotulo: "Saldo de créditos",
    secao: "geracao",
    tipo: "kwh",
    ajuda: "Saldo de créditos acumulado após este ciclo.",
  },
  {
    chave: "creditos_a_expirar_kwh",
    rotulo: "Créditos próximos do vencimento",
    secao: "geracao",
    tipo: "kwh",
    ajuda: "kWh de créditos a expirar informados na fatura.",
  },
  {
    chave: "creditos_a_expirar_data",
    rotulo: "Vencimento desses créditos",
    secao: "geracao",
    tipo: "data",
    ajuda: "Data (ou mês) em que esses créditos expiram.",
  },
  {
    chave: "percentual_rateio",
    rotulo: "Percentual de rateio",
    secao: "geracao",
    tipo: "percentual",
    ajuda: "Percentual de rateio desta UC impresso na fatura (0 a 100).",
  },
  // Financeiro
  {
    chave: "valor_energia",
    rotulo: "Valor da energia",
    secao: "financeiro",
    tipo: "brl",
    ajuda: "Valor dos itens de energia (TUSD + TE / consumo), antes de tributos não destacados.",
  },
  {
    chave: "encargos_gd",
    rotulo: "Encargos de geração distribuída",
    secao: "financeiro",
    tipo: "brl",
    ajuda:
      "Valores cobrados pela GD (ex.: TUSD fio B / Lei 14.300 / custo de disponibilidade da GD).",
  },
  {
    chave: "contrib_iluminacao",
    rotulo: "Iluminação pública",
    secao: "financeiro",
    tipo: "brl",
    ajuda: "Contribuição de iluminação pública (CIP/COSIP).",
  },
  {
    chave: "bandeira_tarifaria",
    rotulo: "Bandeira tarifária",
    secao: "financeiro",
    tipo: "texto",
    ajuda: "Bandeira(s) vigente(s) no ciclo, ex.: Verde, Amarela, Vermelha P1.",
  },
  {
    chave: "valor_bandeiras",
    rotulo: "Valor das bandeiras",
    secao: "financeiro",
    tipo: "brl",
    ajuda: "Valor cobrado de adicional de bandeira, se discriminado.",
  },
  { chave: "icms", rotulo: "ICMS", secao: "financeiro", tipo: "brl", ajuda: "Valor do ICMS." },
  {
    chave: "pis",
    rotulo: "PIS/PASEP",
    secao: "financeiro",
    tipo: "brl",
    ajuda: "Valor do PIS/PASEP.",
  },
  {
    chave: "cofins",
    rotulo: "COFINS",
    secao: "financeiro",
    tipo: "brl",
    ajuda: "Valor da COFINS.",
  },
  {
    chave: "tributos_total",
    rotulo: "Total de tributos",
    secao: "financeiro",
    tipo: "brl",
    ajuda: "Total de tributos, se a fatura informar o total.",
  },
] as const satisfies readonly Campo[];

export type ChaveCampo = (typeof CAMPOS)[number]["chave"];
export type ValorCampo = string | number | null;
export type DadosFatura = Record<ChaveCampo, ValorCampo>;

export const NUMERICOS: TipoCampo[] = ["kwh", "brl", "percentual", "leitura"];
export const ehNumerico = (t: TipoCampo) => NUMERICOS.includes(t);

export function dadosVazios(): DadosFatura {
  return Object.fromEntries(CAMPOS.map((c) => [c.chave, null])) as DadosFatura;
}

/** Garante o formato canônico: números como number, datas AAAA-MM-DD, competência AAAA-MM-01. */
export function normalizarDados(bruto: Record<string, unknown>): DadosFatura {
  const out = dadosVazios();
  for (const c of CAMPOS) {
    const v = bruto[c.chave];
    if (v === null || v === undefined || v === "") continue;
    if (ehNumerico(c.tipo)) {
      const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, ""));
      out[c.chave] = Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
    } else if (c.tipo === "data") {
      const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
      out[c.chave] = m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    } else if (c.tipo === "mes") {
      const m = String(v).match(/^(\d{4})-(\d{2})/);
      out[c.chave] = m ? `${m[1]}-${m[2]}-01` : null;
    } else if (c.tipo === "uc") {
      const d = String(v).replace(/\D/g, "");
      out[c.chave] = d || null;
    } else {
      const t = String(v).trim();
      out[c.chave] = t || null;
    }
  }
  return out;
}

/** Esquema JSON (structured outputs) para a resposta da IA. */
export function esquemaExtracao() {
  const nul = { type: "null" } as const;
  const props: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    const base = ehNumerico(c.tipo)
      ? { type: "number" }
      : c.tipo === "data"
        ? { type: "string", format: "date" }
        : { type: "string" };
    props[c.chave] = { anyOf: [base, nul], description: `${c.rotulo}. ${c.ajuda}` };
  }
  props["observacoes"] = {
    type: "array",
    items: { type: "string" },
    description:
      "Avisos curtos em português sobre ambiguidades ou campos que exigem conferência humana. Lista vazia se não houver.",
  };
  return {
    type: "object",
    properties: props,
    required: [...CAMPOS.map((c) => c.chave), "observacoes"],
    additionalProperties: false,
  };
}
