const kwhFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactFmt = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatKwh = (v: number) => kwhFmt.format(v);
export const formatBRL = (v: number) => brlFmt.format(v);
export const formatCompact = (v: number) => compactFmt.format(v);

/** "2026-10-01" → "out/26" */
export function formatMesCurto(iso: string) {
  const [y = 1970, m = 1] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const mes = d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
  return `${mes}/${String(y).slice(2)}`;
}

/** "2026-10-01" → "outubro de 2026" */
export function formatMesLongo(iso: string) {
  const [y = 1970, m = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Normaliza qualquer data para o primeiro dia do mês (chave de competência). */
export const mesKey = (iso: string) => `${iso.slice(0, 7)}-01`;

/** Primeira letra maiúscula, preservando o restante ("segunda-feira, 2 de novembro"). */
export const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
