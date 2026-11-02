import { CAMPOS, dadosVazios, ehNumerico, type ChaveCampo, type DadosFatura } from "./campos";

export type Verificacao = "encontrado" | "nao_localizado" | "sem_texto" | "vazio";
export type Aviso = { nivel: "erro" | "atencao" | "info"; mensagem: string; campo?: ChaveCampo };

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const MESES_ABREV = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Converte "1.234,56" / "1234,56" / "1234.56" em número. */
export function numeroBR(s: string): number | null {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return null;
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Sequências numéricas do texto (aceita separadores . - / e espaço) reduzidas a dígitos. */
function sequenciasDeDigitos(texto: string): string[] {
  return (texto.match(/\d[\d.\-/ ]{3,}\d/g) ?? []).map((s) => s.replace(/\D/g, ""));
}

/** Identifica a unidade cadastrada cujo número de UC aparece na fatura. */
export function identificarUnidade<T extends { id: string; numero_uc: string }>(
  texto: string,
  unidades: T[],
  ucExtraida: string | null,
): { unidade: T | null; via: "texto" | "ia" | null; ambigua: boolean } {
  const seqs = sequenciasDeDigitos(texto);
  const noTexto = unidades.filter((u) => {
    const uc = u.numero_uc.replace(/\D/g, "");
    return uc.length >= 6 && seqs.some((s) => s === uc || s.includes(uc));
  });
  if (noTexto.length === 1) return { unidade: noTexto[0]!, via: "texto", ambigua: false };
  const ia = ucExtraida?.replace(/\D/g, "");
  if (ia) {
    const u = unidades.find((x) => x.numero_uc.replace(/\D/g, "") === ia);
    if (u) return { unidade: u, via: "ia", ambigua: noTexto.length > 1 };
  }
  return { unidade: null, via: null, ambigua: noTexto.length > 1 };
}

function formatosNumero(v: number): string[] {
  const out = new Set<string>();
  for (const casas of [0, 1, 2, 3]) {
    const fixo = v.toFixed(casas);
    if (Math.abs(Number(fixo) - v) > 1e-9) continue; // só formatos que representam o valor exato
    const [int, dec] = fixo.split(".");
    const intNeg = int!.replace("-", "");
    const sinal = int!.startsWith("-") ? "-" : "";
    const milhar = intNeg.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    for (const i of new Set([intNeg, milhar])) {
      out.add(sinal + (dec ? `${i},${dec}` : i));
      if (dec) out.add(sinal + `${i.replace(/\./g, "")}.${dec}`);
    }
  }
  return [...out];
}

function contemNumero(texto: string, v: number): boolean {
  return formatosNumero(Math.abs(v)).some((f) => {
    const esc = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\d,.])${esc}($|[^\\d]|[.,](?!\\d))`).test(texto);
  });
}

function contemData(texto: string, iso: string): boolean {
  const [y, m, d] = iso.split("-");
  return (
    [`${d}/${m}/${y}`, `${d}/${m}/${y!.slice(2)}`, `${d}.${m}.${y}`, `${d}-${m}-${y}`].some((f) =>
      texto.includes(f),
    ) || contemMes(texto, iso)
  ); // vencimento de créditos às vezes vem só como mês/ano
}

function contemMes(texto: string, iso: string): boolean {
  const [y, m] = iso.split("-");
  const i = Number(m) - 1;
  const t = semAcento(texto.toLowerCase());
  const nome = semAcento(MESES[i]!);
  return [
    `${m}/${y}`,
    `${m}/${y!.slice(2)}`,
    `${nome}/${y}`,
    `${nome} ${y}`,
    `${nome} de ${y}`,
    `${MESES_ABREV[i]}/${y}`,
    `${MESES_ABREV[i]}/${y!.slice(2)}`,
    `${MESES_ABREV[i]} ${y}`,
  ].some((f) => t.includes(f));
}

/** Confere se cada valor proposto aparece literalmente no texto do PDF. */
export function verificarDados(texto: string, dados: DadosFatura): Record<ChaveCampo, Verificacao> {
  const out = {} as Record<ChaveCampo, Verificacao>;
  const temTexto = texto.replace(/\s/g, "").length > 50;
  const tNorm = semAcento(texto.toLowerCase()).replace(/\s+/g, " ");
  for (const c of CAMPOS) {
    const v = dados[c.chave];
    if (v === null || v === "") {
      out[c.chave] = "vazio";
      continue;
    }
    if (!temTexto) {
      out[c.chave] = "sem_texto";
      continue;
    }
    let ok = false;
    if (ehNumerico(c.tipo)) ok = typeof v === "number" && contemNumero(texto, v);
    else if (c.tipo === "data") ok = contemData(texto, String(v));
    else if (c.tipo === "mes") ok = contemMes(texto, String(v));
    else if (c.tipo === "uc") ok = sequenciasDeDigitos(texto).some((s) => s.includes(String(v)));
    else {
      const alvo = semAcento(String(v).toLowerCase()).replace(/\s+/g, " ").trim();
      ok =
        tNorm.includes(alvo) ||
        alvo
          .split(" ")
          .filter((p) => p.length > 3)
          .every((p) => tNorm.includes(p));
    }
    out[c.chave] = ok ? "encontrado" : "nao_localizado";
  }
  return out;
}

/**
 * Extração básica, sem IA: apenas o que pode ser lido com segurança por padrões textuais.
 * Usada quando a IA não está configurada ou falha. Tudo o mais fica "Não informado".
 */
export function extrairBasico(texto: string): DadosFatura {
  const d = dadosVazios();
  const t = texto.replace(/[ \t]+/g, " ");

  const venc = t.match(/vencimento[^\d]{0,30}(\d{2}\/\d{2}\/\d{4})/i);
  if (venc) d.vencimento = isoDeBR(venc[1]!);

  const total = t.match(/total\s+a\s+pagar[^\d]{0,40}(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (total) d.valor_total = numeroBR(total[1]!);

  const ref =
    t.match(
      /(?:refer[êe]ncia|ref\.?|m[êe]s\s*\/\s*ano|compet[êe]ncia)[^\d\n]{0,25}(\d{2})\s*\/\s*(\d{4})/i,
    ) ?? null;
  if (ref) d.mes_referencia = `${ref[2]}-${ref[1]}-01`;
  else {
    const nome = semAcento(t.toLowerCase()).match(
      /(?:refer[e]ncia|ref\.?|compet[e]ncia)[^a-z\d\n]{0,10}(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s*[/ ]\s*(?:de\s+)?(\d{4})/,
    );
    if (nome) {
      const i = MESES_ABREV.indexOf(nome[1]!);
      d.mes_referencia = `${nome[2]}-${String(i + 1).padStart(2, "0")}-01`;
    }
  }
  return d;
}

function isoDeBR(s: string): string | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Avisos de conferência (não bloqueiam; a confirmação valida no banco). */
export function gerarAvisos(args: {
  dados: DadosFatura;
  verificacao: Record<ChaveCampo, Verificacao>;
  unidadeIdentificada: boolean;
  ucAmbigua: boolean;
  faturaExistente: boolean;
  semTexto: boolean;
  metodo: "ia" | "basica";
  erroIA?: string | null;
}): Aviso[] {
  const a: Aviso[] = [];
  if (args.erroIA) a.push({ nivel: "atencao", mensagem: args.erroIA });
  if (args.metodo === "basica")
    a.push({
      nivel: "info",
      mensagem:
        "Extração básica (sem IA): somente UC, competência, vencimento e total foram lidos automaticamente. Preencha os demais campos conferindo o PDF.",
    });
  if (args.semTexto)
    a.push({
      nivel: "atencao",
      mensagem:
        "O PDF não possui texto selecionável (provavelmente digitalizado). Os valores não puderam ser conferidos automaticamente.",
    });
  if (!args.unidadeIdentificada)
    a.push({
      nivel: "erro",
      campo: "numero_uc",
      mensagem: args.ucAmbigua
        ? "Mais de uma UC cadastrada aparece no PDF. Selecione a unidade correta."
        : "Nenhuma unidade cadastrada corresponde à UC desta fatura. Selecione a unidade ou cadastre-a.",
    });
  if (!args.dados.mes_referencia)
    a.push({ nivel: "erro", campo: "mes_referencia", mensagem: "Competência não identificada." });
  if (args.faturaExistente)
    a.push({
      nivel: "erro",
      mensagem: "Já existe fatura importada para esta unidade nesta competência.",
    });
  for (const c of CAMPOS) {
    if (args.verificacao[c.chave] === "nao_localizado")
      a.push({
        nivel: "atencao",
        campo: c.chave,
        mensagem: `${c.rotulo}: valor não localizado literalmente no texto do PDF — confira.`,
      });
  }
  const d = args.dados;
  if (
    typeof d.geracao_ciclo_kwh === "number" &&
    typeof d.energia_injetada_kwh === "number" &&
    d.geracao_ciclo_kwh === d.energia_injetada_kwh
  )
    a.push({
      nivel: "info",
      mensagem:
        "Geração do ciclo e energia injetada estão iguais. Confirme que a fatura informa ambos — injetada é medida na rede, não no inversor.",
    });
  return a;
}
