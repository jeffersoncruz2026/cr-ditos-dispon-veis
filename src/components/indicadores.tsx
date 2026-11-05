import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const tonsIcone = {
  esmeralda: "bg-accent text-accent-foreground",
  azul: "bg-info-soft text-info",
  solar: "bg-solar/15 text-solar-foreground",
  neutro: "bg-muted text-muted-foreground",
  alerta: "bg-destructive/10 text-destructive",
} as const;
export type TomIcone = keyof typeof tonsIcone;

const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Variação percentual entre dois períodos. `melhorQuandoSobe` define a cor:
 * verde quando a mudança é favorável, vermelho quando desfavorável.
 */
export function Tendencia({
  atual,
  anterior,
  melhorQuandoSobe = true,
  rotulo,
}: {
  atual: number | null | undefined;
  anterior: number | null | undefined;
  melhorQuandoSobe?: boolean;
  rotulo?: string | undefined;
}) {
  if (typeof atual !== "number" || typeof anterior !== "number" || anterior === 0) {
    return <span className="text-muted-foreground">Sem comparação anterior</span>;
  }
  const delta = ((atual - anterior) / Math.abs(anterior)) * 100;
  const estavel = Math.abs(delta) < 0.05;
  const favoravel = estavel ? null : delta > 0 === melhorQuandoSobe;
  const Icone = estavel ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
          favoravel === null && "bg-muted text-muted-foreground",
          favoravel === true && "bg-accent text-accent-foreground",
          favoravel === false && "bg-destructive/10 text-destructive",
        )}
      >
        <Icone className="h-3 w-3" />
        {estavel ? "0%" : `${delta > 0 ? "+" : "−"}${pctFmt.format(Math.abs(delta))}%`}
      </span>
      {rotulo && <span className="text-muted-foreground">{rotulo}</span>}
    </span>
  );
}

/** Card compacto de indicador: ícone discreto, título, valor, unidade e rodapé. */
export function KpiCard({
  icon: Icon,
  titulo,
  valor,
  unidade,
  rodape,
  ajuda,
  tom = "azul",
  loading,
  destaque,
}: {
  icon: LucideIcon;
  titulo: string;
  valor: string | null;
  unidade?: string | undefined;
  rodape?: ReactNode;
  ajuda?: string;
  tom?: TomIcone;
  loading?: boolean;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col rounded-xl border bg-card p-3.5 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:p-4",
        destaque && "ring-1 ring-destructive/25",
      )}
    >
      <div className="flex items-start gap-2 sm:items-center">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            tonsIcone[tom],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="line-clamp-2 min-w-0 flex-1 self-center text-[12px] font-medium leading-tight text-muted-foreground sm:truncate sm:text-[12.5px]">
          {titulo}
        </p>
        {ajuda && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="-m-1 rounded p-1 text-muted-foreground/60 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`Sobre: ${titulo}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs leading-relaxed">
              {ajuda}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p className="tabular mt-2.5 truncate text-xl font-bold leading-tight tracking-tight sm:text-[22px]">
          {valor ?? <span className="text-muted-foreground/45">—</span>}
          {valor && unidade && (
            <span className="ml-1 text-[13px] font-medium text-muted-foreground">{unidade}</span>
          )}
        </p>
      )}
      <div className="mt-2 min-h-[20px] text-[11.5px]">
        {loading ? <Skeleton className="h-4 w-28" /> : rodape}
      </div>
    </div>
  );
}

/** Controle segmentado compacto (ex.: período 6/12/24 meses). */
export function Segmentos<T extends string | number>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex rounded-lg bg-muted p-0.5">
      {opcoes.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150",
            valor === o.valor
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Barra de progresso fina (0–100). */
export function BarraProgresso({
  valor,
  cor = "var(--primary)",
  className,
}: {
  valor: number;
  cor?: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${v}%`, background: cor }}
      />
    </div>
  );
}
