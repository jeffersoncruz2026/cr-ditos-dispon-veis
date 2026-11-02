import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-b from-muted/50 to-transparent px-6 text-center",
        compact ? "py-8" : "py-14",
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-3 rounded-full bg-accent/60 blur-md" aria-hidden />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-accent-foreground shadow-card ring-1 ring-border">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-success">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-[28px]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-card md:p-6",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export type ModuleFeature = { title: string; description: string; ready?: boolean };

/**
 * Página de módulo ainda sem dados: mostra o estado vazio e o escopo previsto do módulo,
 * sem nenhum número fictício.
 */
export function ModulePage({
  icon,
  title,
  description,
  eyebrow,
  emptyTitle,
  emptyText,
  action,
  columns,
  features,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow: string;
  emptyTitle: string;
  emptyText: string;
  action?: ReactNode;
  columns?: string[];
  features: ModuleFeature[];
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {action}
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Registros" description="Os dados deste módulo aparecerão aqui.">
          {columns && (
            <div className="mb-4 hidden overflow-hidden rounded-lg border sm:block">
              <div
                className="grid bg-muted/60"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
              >
                {columns.map((c) => (
                  <div
                    key={c}
                    className="truncate px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}
          <EmptyState icon={icon} title={emptyTitle} description={emptyText} />
        </Panel>
        <Panel
          title="Escopo do módulo"
          description="Funcionalidades planejadas para as próximas etapas."
        >
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3">
                {f.ready ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                )}
                <div>
                  <p className="text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-success" /> Estrutura de dados pronta
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Próximas etapas
            </span>
          </div>
        </Panel>
      </div>
    </>
  );
}
