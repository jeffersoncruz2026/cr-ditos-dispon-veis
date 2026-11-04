import { useMemo } from "react";
import { Download, FileCode2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatBRL } from "@/lib/format";
import type { LeituraXml } from "./xml-nf3e";

const fmtQtd = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Exibe o conteúdo da NF3e lido do XML, para conferência lado a lado com os campos. */
export function VisualizadorXml({
  leitura,
  xml,
  nomeArquivo,
}: {
  leitura: LeituraXml | null;
  xml: string;
  nomeArquivo: string;
}) {
  const urlDownload = useMemo(
    () =>
      xml && typeof URL !== "undefined"
        ? URL.createObjectURL(new Blob([xml], { type: "text/xml;charset=utf-8" }))
        : null,
    [xml],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-sm font-semibold">
          XML da nota fiscal
          {leitura?.chave && (
            <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
              NF3e
            </span>
          )}
        </p>
        {urlDownload && (
          <a
            href={urlDownload}
            download={nomeArquivo}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Download className="h-3 w-3" /> Baixar XML
          </a>
        )}
      </div>
      <div className="h-[75vh] space-y-5 overflow-auto p-4">
        {!leitura ? (
          <EmptyState
            icon={FileCode2}
            title="XML indisponível"
            description="Não foi possível ler o conteúdo da nota fiscal."
            compact
          />
        ) : (
          <>
            {leitura.secoes.map((s) => (
              <section key={s.titulo}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {s.titulo}
                </h3>
                <dl className="divide-y rounded-lg border">
                  {s.linhas.map(([r, v]) => (
                    <div key={r} className="flex items-start justify-between gap-4 px-3 py-1.5">
                      <dt className="text-xs text-muted-foreground">{r}</dt>
                      <dd className="tabular break-all text-right text-xs font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            {leitura.itens.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Itens da fatura
                </h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Descrição</th>
                        <th className="px-3 py-1.5 text-right font-medium">Qtd.</th>
                        <th className="px-3 py-1.5 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leitura.itens.map((i, n) => (
                        <tr key={n}>
                          <td className="px-3 py-1.5">{i.descricao}</td>
                          <td className="tabular whitespace-nowrap px-3 py-1.5 text-right">
                            {i.quantidade === null
                              ? "—"
                              : `${fmtQtd.format(i.quantidade)} ${i.unidade}`}
                          </td>
                          <td className="tabular whitespace-nowrap px-3 py-1.5 text-right">
                            {i.valor === null ? "—" : formatBRL(i.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {leitura.infCpl && (
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Informações complementares
                </h3>
                <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed">
                  {leitura.infCpl.replace(/;\s*/g, ";\n")}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
