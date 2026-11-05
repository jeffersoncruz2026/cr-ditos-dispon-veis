import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

/**
 * Visualizador do PDF original renderizado com pdf.js em canvas.
 * Funciona em qualquer navegador (inclusive celulares, que não exibem PDF em iframe).
 */
export function VisualizadorPdf({ url, loading }: { url: string | undefined; loading: boolean }) {
  const area = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [largura, setLargura] = useState(0);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
  const [paginas, setPaginas] = useState(0);
  const docRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.floor(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Carrega o documento.
  useEffect(() => {
    if (!url) return;
    let ativo = true;
    setEstado("carregando");
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const dados = await (await fetch(url)).arrayBuffer();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(dados) }).promise;
        if (!ativo) return;
        docRef.current = doc;
        setPaginas(doc.numPages);
        setEstado("pronto");
      } catch {
        if (ativo) setEstado("erro");
      }
    })();
    return () => {
      ativo = false;
    };
  }, [url]);

  // Renderiza as páginas na largura disponível × zoom.
  useEffect(() => {
    const doc = docRef.current;
    const el = area.current;
    if (estado !== "pronto" || !doc || !el || largura < 50) return;
    let cancelado = false;
    (async () => {
      const canvases = [...el.querySelectorAll<HTMLCanvasElement>("canvas[data-pagina]")];
      for (const canvas of canvases) {
        if (cancelado) return;
        const page = await doc.getPage(Number(canvas.dataset["pagina"]));
        const base = page.getViewport({ scale: 1 });
        const escala = ((largura - 24) / base.width) * zoom;
        const dpr = window.devicePixelRatio || 1;
        const vp = page.getViewport({ scale: escala * dpr });
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
        canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
        await page.render({ canvas, viewport: vp }).promise;
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [estado, largura, zoom, paginas]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-sm font-semibold">
          PDF original
          {paginas > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {paginas} página{paginas > 1 ? "s" : ""}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Diminuir zoom"
            onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="tabular w-10 text-center text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Aumentar zoom"
            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Abrir <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      <div ref={area} className="h-[75vh] overflow-auto bg-muted/60 p-3">
        {(loading || estado === "carregando") && url !== undefined ? (
          <Skeleton className="h-full w-full" />
        ) : estado === "erro" || (!loading && !url) ? (
          <EmptyState
            icon={FileText}
            title="PDF indisponível"
            description="Não foi possível carregar o arquivo."
            compact
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            {Array.from({ length: paginas }, (_, i) => (
              <canvas
                key={i}
                data-pagina={i + 1}
                aria-label={`Página ${i + 1} da fatura`}
                className="rounded-sm bg-white shadow-md"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
