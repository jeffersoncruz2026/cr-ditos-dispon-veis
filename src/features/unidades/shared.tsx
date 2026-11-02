import { Home, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const situacoes = {
  ativa: { label: "Ativa", cls: "bg-success/12 text-accent-foreground ring-success/25" },
  aguardando_rateio: {
    label: "Aguardando inclusão no rateio",
    cls: "bg-warning/15 text-warning-foreground ring-warning/30",
  },
  inativa: { label: "Inativa", cls: "bg-muted text-muted-foreground ring-border" },
} as const;
export type Situacao = keyof typeof situacoes;

export const ligacoes: Record<string, string> = {
  monofasico: "Monofásico",
  bifasico: "Bifásico",
  trifasico: "Trifásico",
};
export const classes = ["Residencial", "Comercial", "Rural", "Industrial", "Poder público"];
export const DISTRIBUIDORA_PADRAO = "Equatorial Goiás";

const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
export const formatPct = (v: number) => `${pctFmt.format(v)}%`;

/** Cor categórica fixa por posição de cadastro (a cor segue a unidade). */
export const UNIT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
export const corDaUnidade = (index: number) =>
  UNIT_COLORS[index % UNIT_COLORS.length] ?? "var(--muted-foreground)";

export function SituacaoBadge({ situacao }: { situacao: string }) {
  const s = situacoes[situacao as Situacao] ?? situacoes.ativa;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

export function TipoBadge({ geradora }: { geradora: boolean }) {
  return geradora ? (
    <Badge className="gap-1 bg-success text-success-foreground hover:bg-success">
      <Sun className="h-3 w-3" /> Geradora
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <Home className="h-3 w-3" /> Recebedora
    </Badge>
  );
}

export function UnidadeIcon({ geradora, className }: { geradora: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        geradora ? "bg-accent text-accent-foreground" : "bg-primary/[0.07] text-primary",
        className ?? "h-10 w-10",
      )}
    >
      {geradora ? <Sun className="h-[18px] w-[18px]" /> : <Home className="h-[18px] w-[18px]" />}
    </div>
  );
}

/** Converte "50,5" ou "50.5" em número; retorna null se inválido. */
export function parseDecimal(v: string): number | null {
  const s = v.trim();
  const t = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Data ISO (yyyy-mm-dd) ↔ valor de <input type="month"> (yyyy-mm). */
export const isoParaMes = (iso: string | null | undefined) => (iso ? iso.slice(0, 7) : "");
export const mesParaIso = (mes: string) => (mes ? `${mes}-01` : null);
