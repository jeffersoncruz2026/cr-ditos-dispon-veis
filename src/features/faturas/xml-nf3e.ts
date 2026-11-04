/**
 * Leitura determinística do XML da NF3e (Nota Fiscal de Energia Elétrica Eletrônica, modelo 66)
 * emitida pela Equatorial Goiás. Todos os valores vêm de tags estruturadas do XML — sem IA e sem
 * heurísticas de layout. Os dados do SCEE que a distribuidora só publica em texto livre
 * (geração do ciclo, excedente, rateio) são lidos de `infCpl`.
 */
import { dadosVazios, type DadosFatura } from "./campos";

export type LinhaResumo = [rotulo: string, valor: string];
export type SecaoResumo = { titulo: string; linhas: LinhaResumo[] };
export type ItemNota = {
  codigo: string;
  descricao: string;
  classe: string;
  quantidade: number | null;
  unidade: string;
  valor: number | null;
};

export type LeituraXml = {
  dados: DadosFatura;
  chave: string | null;
  secoes: SecaoResumo[];
  itens: ItemNota[];
  infCpl: string;
  /** Texto legível (valores em pt-BR) usado na conferência dos campos e na identificação da UC. */
  texto: string;
  avisos: { nivel: "erro" | "atencao" | "info"; mensagem: string }[];
};

export class XmlInvalidoError extends Error {}

/** Decodifica o arquivo respeitando a codificação (as NF3e da Equatorial costumam vir em ISO-8859-1). */
export function decodificarXml(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const cabecalho = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
  const declarada = cabecalho.match(/encoding=["']([\w-]+)["']/i)?.[1]?.toLowerCase();
  if (declarada && !/utf-?8/.test(declarada)) {
    try {
      return new TextDecoder(declarada).decode(bytes);
    } catch {
      /* codificação desconhecida: tenta as alternativas abaixo */
    }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export const ehXml = (texto: string) => /^\s*(<\?xml|<nf3eProc|<NF3e)/i.test(texto);

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function filhos(el: Element | null | undefined, nome: string): Element[] {
  if (!el) return [];
  return [...el.children].filter((c) => c.localName === nome);
}
function filho(el: Element | null | undefined, ...caminho: string[]): Element | null {
  let atual: Element | null = el ?? null;
  for (const nome of caminho) {
    atual = filhos(atual, nome)[0] ?? null;
    if (!atual) return null;
  }
  return atual;
}
function txt(el: Element | null | undefined, ...caminho: string[]): string | null {
  const v = filho(el, ...caminho)?.textContent?.trim();
  return v ? v : null;
}
function num(el: Element | null | undefined, ...caminho: string[]): number | null {
  const v = txt(el, ...caminho);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function primeiro(raiz: Element, nome: string): Element | null {
  return raiz.getElementsByTagNameNS("*", nome)[0] ?? null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const soma = (ns: number[]) => (ns.length ? r2(ns.reduce((a, b) => a + b, 0)) : null);

/** "1.568,20" → 1568.2 */
function numeroTexto(s: string): number | null {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** AAAAMM → AAAA-MM-01 */
function competencia(v: string | null): string | null {
  const m = v?.match(/^(\d{4})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-01` : null;
}
function data(v: string | null): string | null {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const fmtNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtData = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);
const fmtMes = (iso: string | null) => (iso ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : null);
const kwh = (n: number | null) => (n === null ? null : `${fmtNumero.format(n)} kWh`);
const brl = (n: number | null) => (n === null ? null : `R$ ${fmtMoeda.format(n)}`);

const semZeros = (uc: string | null) =>
  uc ? uc.replace(/\D/g, "").replace(/^0+(?=\d)/, "") : null;

const NUM = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?`;

/**
 * Lê listas do tipo "RÓTULO KWH: UC 000123 : 621,00, UC 000456 : 10,00" do infCpl e devolve o valor
 * da UC desta nota (ou o único valor, quando a lista tem uma só UC).
 */
function valorPorUc(info: string, rotulo: string, uc: string | null, sep = ":"): number | null {
  const ini = info.search(new RegExp(rotulo));
  if (ini < 0) return null;
  const re = new RegExp(String.raw`\s*,?\s*UC\s*(\d+)\s*${sep}\s*(${NUM})\s*%?`, "y");
  const resto = info
    .slice(ini)
    .replace(new RegExp(String.raw`^${rotulo}[^:=]*?(?::|(?=\s*UC\b))`), "");
  const pares: [string, number][] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(resto))) {
    const v = numeroTexto(m[2]!);
    if (v !== null) pares.push([semZeros(m[1]!)!, v]);
  }
  if (!pares.length) return null;
  const proprio = pares.find(([u]) => u === uc);
  if (proprio) return proprio[1];
  return pares.length === 1 ? pares[0]![1] : null;
}

function valorSimples(info: string, rotulo: string): number | null {
  const m = info.match(new RegExp(String.raw`${rotulo}\s*(?:KWH)?\s*:?\s*(${NUM})`));
  return m ? numeroTexto(m[1]!) : null;
}

export function lerXmlNf3e(xml: string): LeituraXml {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new XmlInvalidoError("O arquivo não é um XML válido.");
  }
  const inf = primeiro(doc.documentElement, "infNF3e");
  if (!inf) {
    throw new XmlInvalidoError(
      "O XML não é uma NF3e (nota fiscal de energia elétrica). Envie o XML da fatura da Equatorial.",
    );
  }

  const avisos: LeituraXml["avisos"] = [];
  const d = dadosVazios();
  const ide = filho(inf, "ide");
  const emit = filho(inf, "emit");
  const dest = filho(inf, "dest");
  const acessante = filho(inf, "acessante");
  const gFat = filho(inf, "gFat");
  const total = filho(inf, "total");
  const scee = filho(inf, "gSCEE");
  const infCpl = semAcento(txt(inf, "infAdic", "infCpl") ?? "")
    .toUpperCase()
    .replace(/\s+/g, " ");
  const chave = inf.getAttribute("Id")?.replace(/^NF3e/, "") ?? null;

  // Identificação
  const uc = semZeros(txt(acessante, "idAcesso"));
  d.numero_uc = uc;
  d.titular = txt(dest, "xNome");
  d.mes_referencia = competencia(txt(gFat, "CompetFat"));
  d.vencimento = data(txt(gFat, "dVencFat"));
  d.proxima_leitura_data = data(txt(gFat, "dProxLeitura"));
  const gMed = filhos(inf, "gMed")[0] ?? null;
  d.leitura_anterior_data = data(txt(gMed, "dMedAnt"));
  d.leitura_atual_data = data(txt(gMed, "dMedAtu"));
  d.valor_total = num(total, "vNF");

  // Itens da nota
  const dets = filhos(filho(inf, "NFdet"), "det").map((det) => filho(det, "detItem"));
  const itens: (ItemNota & { el: Element | null })[] = dets.map((it) => {
    const prod = filho(it, "prod");
    return {
      el: it,
      codigo: txt(prod, "cProd") ?? "",
      descricao: txt(prod, "xProd") ?? "",
      classe: txt(prod, "cClass") ?? "",
      quantidade: num(prod, "qFaturada"),
      unidade: txt(prod, "uMed") === "2" ? "kWh" : txt(prod, "uMed") === "1" ? "kW" : "un",
      valor: num(prod, "vProd"),
    };
  });
  const desc = (i: ItemNota) => semAcento(i.descricao).toUpperCase();
  const emKwh = (i: ItemNota) => i.unidade === "kWh";

  // Consumo: itens "CONSUMO ..." em kWh, com a medição associada.
  const consumo = itens.filter((i) => emKwh(i) && /^CONSUMO/.test(desc(i)));
  if (consumo.length) {
    const medida = filho(filho(consumo[0]!.el, "prod"), "gMedicao", "gMedida");
    d.consumo_kwh = num(medida, "vMed") ?? consumo[0]!.quantidade;
    d.leitura_anterior = num(medida, "vMedAnt");
    d.leitura_atual = num(medida, "vMedAtu");
    d.valor_energia = soma(consumo.map((i) => i.valor ?? 0));
    if (consumo.length > 1) {
      d.consumo_kwh = soma(consumo.map((i) => i.quantidade ?? 0));
      avisos.push({
        nivel: "info",
        mensagem: `A nota tem ${consumo.length} itens de consumo; o consumo foi somado e as leituras do medidor são as do primeiro item.`,
      });
    }
  } else {
    // Sem item de consumo (ex.: consumo totalmente abatido): usa o histórico da competência.
    const hist = filhos(filho(filho(inf, "gANEEL"), "gHistFat"), "gGrandFat").find(
      (g) => txt(g, "CompetFat") === txt(gFat, "CompetFat"),
    );
    d.consumo_kwh = num(hist, "vFat");
  }

  // Energia compensada: itens de dedução por injeção (classe 56xxxxx) em kWh.
  const compensacao = itens.filter((i) => emKwh(i) && i.classe.startsWith("56"));
  d.energia_compensada_kwh = soma(compensacao.map((i) => i.quantidade ?? 0));

  // Encargos de GD (parcela da injetada sem desconto — Fio B / Lei 14.300).
  const gd = itens.filter((i) => /PARC\.? INJET|FIO B|14\.?300/.test(desc(i)));
  d.encargos_gd = soma(gd.map((i) => i.valor ?? 0));

  const ilum = itens.filter((i) => /ILUM/.test(desc(i)));
  d.contrib_iluminacao = soma(ilum.map((i) => i.valor ?? 0));

  const bandeiras = itens.filter((i) => /BANDEIRA|BAND\.|ADIC\.? BAND/.test(desc(i)));
  d.valor_bandeiras = soma(bandeiras.map((i) => i.valor ?? 0));
  const nomesBandeira = [
    ...new Set(
      bandeiras
        .map(
          (i) =>
            desc(i).match(
              /AMARELA|VERMELHA(?:\s*(?:P|PATAMAR)\s*\d)?|ESCASSEZ\s*HIDRICA|VERDE/,
            )?.[0],
        )
        .filter((x): x is string => !!x)
        .map((x) => x.charAt(0) + x.slice(1).toLowerCase()),
    ),
  ];
  d.bandeira_tarifaria = nomesBandeira.length ? nomesBandeira.join(" / ") : null;

  // Tributos (totais da nota)
  d.icms = num(total, "ICMSTot", "vICMS");
  d.pis = num(total, "vPIS");
  d.cofins = num(total, "vCOFINS");

  // SCEE estruturado
  const consumidores = filhos(scee, "gConsumidor");
  const proprio = consumidores.filter((c) => semZeros(txt(c, "idAcessGer")) === uc);
  d.energia_injetada_kwh = soma(proprio.map((c) => num(c, "enerInjet") ?? 0));
  const saldos = filhos(scee, "gSaldoCred");
  d.saldo_creditos_kwh = soma(saldos.map((s) => num(s, "vSaldAtual") ?? 0));
  d.creditos_a_expirar_kwh = soma(saldos.map((s) => num(s, "vCredExpirar") ?? 0));
  d.creditos_a_expirar_data = competencia(
    saldos.map((s) => txt(s, "CompetExpirar")).find((x) => !!x) ?? null,
  );

  // SCEE em texto livre (infCpl)
  d.geracao_ciclo_kwh = valorPorUc(infCpl, String.raw`GERACAO CICLO(?: \(\d{1,2}\/\d{4}\))?`, uc);
  d.excedente_recebido_kwh = valorPorUc(infCpl, "EXCEDENTE RECEBIDO", uc);
  d.creditos_recebidos_kwh = valorSimples(infCpl, String.raw`CREDITOS? RECEBIDOS?`);
  d.creditos_utilizados_kwh = valorSimples(
    infCpl,
    String.raw`CREDITOS? (?:UTILIZADOS?|CONSUMIDOS?)`,
  );
  d.percentual_rateio = valorPorUc(infCpl, "RATEIO", uc, "=");
  if (d.energia_injetada_kwh === null) {
    const somaAloc = soma(proprio.map((c) => num(c, "enerAloc") ?? 0));
    if (somaAloc !== null) {
      avisos.push({
        nivel: "info",
        mensagem: `Energia alocada pelo SCEE a esta UC: ${kwh(somaAloc)}.`,
      });
    }
  }

  // Situação da nota
  if (txt(ide, "tpAmb") === "2")
    avisos.push({ nivel: "atencao", mensagem: "XML de homologação (sem valor fiscal)." });
  const prot = primeiro(doc.documentElement, "infProt");
  const cStat = txt(prot, "cStat");
  if (!prot) avisos.push({ nivel: "info", mensagem: "XML sem protocolo de autorização da SEFAZ." });
  else if (cStat !== "100")
    avisos.push({
      nivel: "atencao",
      mensagem: `NF3e não autorizada (${cStat ?? "?"} — ${txt(prot, "xMotivo") ?? "sem motivo"}).`,
    });
  const emitente = txt(emit, "xNome");
  if (emitente && !/EQUATORIAL/i.test(emitente))
    avisos.push({ nivel: "info", mensagem: `Emitente da nota: ${emitente}.` });
  if (txt(ide, "finNF3e") && txt(ide, "finNF3e") !== "1")
    avisos.push({
      nivel: "atencao",
      mensagem: "Esta NF3e não é uma nota normal (substituição/ajuste). Confira antes de importar.",
    });

  // Resumo para a tela de conferência
  const linhas = (pares: [string, string | null][]): LinhaResumo[] =>
    pares.filter((p): p is LinhaResumo => !!p[1]);
  const secoes: SecaoResumo[] = [
    {
      titulo: "Nota fiscal",
      linhas: linhas([
        [
          "Número / série",
          txt(ide, "nNF") ? `${txt(ide, "nNF")} / ${txt(ide, "serie") ?? "0"}` : null,
        ],
        ["Emissão", fmtData(data(txt(ide, "dhEmi")))],
        ["Emitente", emitente],
        ["Chave de acesso", chave],
        ["Autorização", prot ? `${cStat ?? "?"} — ${txt(prot, "xMotivo") ?? ""}` : null],
      ]),
    },
    {
      titulo: "Unidade consumidora",
      linhas: linhas([
        ["UC", uc],
        ["Código do cliente", txt(acessante, "idCodCliente")],
        ["Titular", d.titular as string | null],
        ["Competência", fmtMes(d.mes_referencia as string | null)],
        ["Vencimento", fmtData(d.vencimento as string | null)],
        ["Total da nota", brl(d.valor_total as number | null)],
      ]),
    },
    {
      titulo: "Medição",
      linhas: linhas([
        ["Medidor", txt(gMed, "idMedidor")],
        ["Leitura anterior (data)", fmtData(d.leitura_anterior_data as string | null)],
        ["Leitura atual (data)", fmtData(d.leitura_atual_data as string | null)],
        ["Próxima leitura", fmtData(d.proxima_leitura_data as string | null)],
        [
          "Leitura anterior (medidor)",
          d.leitura_anterior === null ? null : fmtNumero.format(d.leitura_anterior as number),
        ],
        [
          "Leitura atual (medidor)",
          d.leitura_atual === null ? null : fmtNumero.format(d.leitura_atual as number),
        ],
        ["Consumo", kwh(d.consumo_kwh as number | null)],
      ]),
    },
    {
      titulo: "SCEE (geração distribuída)",
      linhas: linhas([
        ["Energia injetada", kwh(d.energia_injetada_kwh as number | null)],
        ["Energia alocada", kwh(soma(proprio.map((c) => num(c, "enerAloc") ?? 0)))],
        ["Energia compensada", kwh(d.energia_compensada_kwh as number | null)],
        ["Geração do ciclo", kwh(d.geracao_ciclo_kwh as number | null)],
        ["Excedente recebido", kwh(d.excedente_recebido_kwh as number | null)],
        ["Crédito recebido", kwh(d.creditos_recebidos_kwh as number | null)],
        ["Saldo anterior", kwh(soma(saldos.map((s) => num(s, "vSaldAnt") ?? 0)))],
        ["Créditos expirados", kwh(soma(saldos.map((s) => num(s, "vCredExpirado") ?? 0)))],
        ["Saldo atual", kwh(d.saldo_creditos_kwh as number | null)],
        [
          "Próximos a expirar",
          d.creditos_a_expirar_kwh === null
            ? null
            : `${kwh(d.creditos_a_expirar_kwh as number)}${d.creditos_a_expirar_data ? ` em ${fmtMes(d.creditos_a_expirar_data as string)}` : ""}`,
        ],
        [
          "Rateio",
          d.percentual_rateio === null
            ? null
            : `${fmtNumero.format(d.percentual_rateio as number)}%`,
        ],
      ]),
    },
    {
      titulo: "Tributos e encargos",
      linhas: linhas([
        ["ICMS", brl(d.icms as number | null)],
        ["PIS/PASEP", brl(d.pis as number | null)],
        ["COFINS", brl(d.cofins as number | null)],
        ["Iluminação pública", brl(d.contrib_iluminacao as number | null)],
        ["Encargos GD", brl(d.encargos_gd as number | null)],
        ["Bandeiras", brl(d.valor_bandeiras as number | null)],
      ]),
    },
  ].filter((s) => s.linhas.length);

  const itensSaida: ItemNota[] = itens.map(({ el: _el, ...i }) => i);
  const texto = [
    ...secoes.flatMap((s) => [s.titulo.toUpperCase(), ...s.linhas.map(([r, v]) => `${r}: ${v}`)]),
    "ITENS",
    ...itensSaida.map(
      (i) =>
        `${i.descricao}   ${i.quantidade === null ? "" : `${fmtNumero.format(i.quantidade)} ${i.unidade}`}   ${brl(i.valor) ?? ""}`,
    ),
    // valores sem formatação de unidade, para a conferência de campos editados
    `Bandeira: ${d.bandeira_tarifaria ?? ""}`,
    `Saldo a expirar em: ${fmtData(d.creditos_a_expirar_data as string | null) ?? ""}`,
    "INFORMAÇÕES COMPLEMENTARES",
    txt(inf, "infAdic", "infCpl") ?? "",
  ].join("\n");

  return {
    dados: d,
    chave,
    secoes,
    itens: itensSaida,
    infCpl: txt(inf, "infAdic", "infCpl") ?? "",
    texto,
    avisos,
  };
}
