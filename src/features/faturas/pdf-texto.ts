/**
 * Extração de texto real do PDF no navegador (pdf.js), preservando a ordem das linhas
 * para que tabelas da fatura fiquem legíveis para a conferência e para a IA.
 */
export type TextoPdf = { texto: string; paginas: number };

type Item = { str: string; x: number; y: number; w: number };

export async function extrairTextoPdf(dados: ArrayBuffer): Promise<TextoPdf> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const tarefa = pdfjs.getDocument({ data: new Uint8Array(dados.slice(0)) });
  const doc = await tarefa.promise;
  const paginas: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const itens: Item[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      itens.push({
        str: it.str,
        x: it.transform[4] as number,
        y: it.transform[5] as number,
        w: it.width,
      });
    }
    // Agrupa por linha (mesma coordenada Y, com tolerância) e ordena da esquerda para a direita.
    itens.sort((a, b) => b.y - a.y || a.x - b.x);
    const linhas: Item[][] = [];
    for (const it of itens) {
      const linha = linhas.find((l) => Math.abs(l[0]!.y - it.y) < 3);
      if (linha) linha.push(it);
      else linhas.push([it]);
    }
    const texto = linhas
      .map((l) =>
        l
          .sort((a, b) => a.x - b.x)
          .reduce((acc, it, i, arr) => {
            if (i === 0) return it.str;
            const prev = arr[i - 1]!;
            const gap = it.x - (prev.x + prev.w);
            return acc + (gap > 12 ? "   " : gap > 1 ? " " : "") + it.str;
          }, ""),
      )
      .join("\n");
    paginas.push(`--- Página ${p} ---\n${texto}`);
  }
  const total = doc.numPages;
  await tarefa.destroy();
  return { texto: paginas.join("\n\n"), paginas: total };
}

export async function sha256Hex(dados: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", dados);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
