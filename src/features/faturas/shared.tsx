import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Aviso } from "./analise";

export const STATUS_IMPORTACAO: Record<string, { rotulo: string; cls: string }> = {
  processando: { rotulo: "Processando", cls: "bg-info-soft text-info ring-primary/20" },
  aguardando_conferencia: {
    rotulo: "Aguardando conferência",
    cls: "bg-warning/15 text-warning-foreground ring-warning/30",
  },
  importada: { rotulo: "Importada", cls: "bg-accent text-accent-foreground ring-success/25" },
  descartada: { rotulo: "Descartada", cls: "bg-muted text-muted-foreground ring-border" },
  erro: { rotulo: "Erro", cls: "bg-destructive/10 text-destructive ring-destructive/25" },
};

export function StatusImportacao({ status }: { status: string }) {
  const s = STATUS_IMPORTACAO[status] ?? STATUS_IMPORTACAO["processando"]!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        s.cls,
      )}
    >
      {status === "processando" && <Loader2 className="h-3 w-3 animate-spin" />}
      {s.rotulo}
    </span>
  );
}

export function MetodoBadge({ metodo, arquivo }: { metodo: string | null; arquivo?: string }) {
  if (!metodo) return null;
  // Importações por XML são gravadas com o método "basica"; a origem é identificada pelo arquivo.
  const xml = !!arquivo && arquivo.toLowerCase().endsWith(".xml");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        metodo === "ia" || xml
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {xml ? "XML" : metodo === "ia" ? "IA" : "Básica"}
    </span>
  );
}

export function listaAvisos(v: unknown): Aviso[] {
  return Array.isArray(v) ? (v as Aviso[]) : [];
}

export function ResumoAvisos({ avisos }: { avisos: Aviso[] }) {
  const erros = avisos.filter((a) => a.nivel === "erro").length;
  const atencao = avisos.filter((a) => a.nivel === "atencao").length;
  if (!erros && !atencao)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-accent-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" /> Sem pendências
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      {erros > 0 && (
        <span className="inline-flex items-center gap-1 font-medium text-destructive">
          <XCircle className="h-3.5 w-3.5" /> {erros} pendência{erros > 1 ? "s" : ""}
        </span>
      )}
      {atencao > 0 && (
        <span className="inline-flex items-center gap-1 font-medium text-warning-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> {atencao} para conferir
        </span>
      )}
    </span>
  );
}

export function AvisoLinha({ aviso }: { aviso: Aviso }) {
  const Icon = aviso.nivel === "erro" ? XCircle : aviso.nivel === "atencao" ? AlertTriangle : Info;
  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed",
        aviso.nivel === "erro"
          ? "bg-destructive/[0.06] text-destructive"
          : aviso.nivel === "atencao"
            ? "bg-warning/10 text-warning-foreground"
            : "bg-muted/60 text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{aviso.mensagem}</span>
    </li>
  );
}

export const tamanhoArquivo = (b: number | null) =>
  b === null
    ? "—"
    : b > 1024 * 1024
      ? `${(b / 1024 / 1024).toFixed(1)} MB`
      : `${Math.ceil(b / 1024)} KB`;
