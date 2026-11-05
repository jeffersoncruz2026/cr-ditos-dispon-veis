import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Ordem<K extends string> = { chave: K; direcao: "asc" | "desc" };
type Valor = string | number | null | undefined;

const colador = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

/**
 * Ordenação e paginação no cliente para tabelas (não altera os dados, só a apresentação).
 * `valores` informa o valor de cada coluna ordenável; nulos ficam sempre no fim.
 */
export function useTabela<T, K extends string>(
  linhas: T[],
  {
    valores,
    ordemInicial,
    porPagina = 10,
  }: {
    valores: Record<K, (l: T) => Valor>;
    ordemInicial?: Ordem<NoInfer<K>>;
    porPagina?: number;
  },
) {
  const [ordem, setOrdem] = useState<Ordem<K> | null>(ordemInicial ?? null);
  const [pagina, setPagina] = useState(1);

  const ordenadas = useMemo(() => {
    if (!ordem) return linhas;
    const f = valores[ordem.chave];
    const sinal = ordem.direcao === "asc" ? 1 : -1;
    return [...linhas].sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      if (va == null || va === "") return vb == null || vb === "" ? 0 : 1;
      if (vb == null || vb === "") return -1;
      const c =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : colador.compare(String(va), String(vb));
      return c * sinal;
    });
    // `valores` é estável por definição de coluna; reordena quando linhas ou ordem mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);
  const atual = Math.min(pagina, totalPaginas);
  const visiveis = ordenadas.slice((atual - 1) * porPagina, atual * porPagina);

  const alternar = (chave: K) => {
    setPagina(1);
    setOrdem((o) =>
      o?.chave !== chave
        ? { chave, direcao: "asc" }
        : o.direcao === "asc"
          ? { chave, direcao: "desc" }
          : null,
    );
  };

  return {
    visiveis,
    ordem,
    alternar,
    pagina: atual,
    setPagina,
    totalPaginas,
    total: ordenadas.length,
    porPagina,
  };
}

/** Cabeçalho de coluna clicável que alterna a ordenação (crescente → decrescente → padrão). */
export function CabecalhoOrdenavel<K extends string>({
  chave,
  ordem,
  onOrdenar,
  children,
  className,
  alinhar = "esquerda",
}: {
  chave: K;
  ordem: Ordem<K> | null;
  onOrdenar: (k: K) => void;
  children: ReactNode;
  className?: string;
  alinhar?: "esquerda" | "direita";
}) {
  const ativa = ordem?.chave === chave;
  const Icone = !ativa ? ArrowUpDown : ordem.direcao === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(alinhar === "direita" && "text-right", className)}
      aria-sort={ativa ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onOrdenar(chave)}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase tracking-wider transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          ativa && "text-foreground",
          alinhar === "direita" && "flex-row-reverse",
        )}
      >
        {children}
        <Icone className={cn("h-3 w-3", !ativa && "opacity-40")} />
      </button>
    </TableHead>
  );
}

/** Rodapé de paginação: "1–10 de 34" e navegação anterior/próxima. */
export function Paginacao({
  pagina,
  totalPaginas,
  total,
  porPagina,
  onPagina,
}: {
  pagina: number;
  totalPaginas: number;
  total: number;
  porPagina: number;
  onPagina: (p: number) => void;
}) {
  if (total === 0) return null;
  const ini = (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return (
    <div className="flex items-center justify-between gap-3 border-t px-3 py-2.5 text-xs text-muted-foreground sm:px-4">
      <span className="tabular">
        {ini}–{fim} de {total}
      </span>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={pagina <= 1}
            onClick={() => onPagina(pagina - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular px-1.5">
            {pagina} / {totalPaginas}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={pagina >= totalPaginas}
            onClick={() => onPagina(pagina + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Campo de busca padrão das tabelas. */
export function BuscaTabela({
  valor,
  onChange,
  placeholder,
  className,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 bg-background pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
