import { useCallback, useEffect, useSyncExternalStore } from "react";

/** Preferência de tema do usuário. "sistema" segue o sistema operacional. */
export type Tema = "claro" | "escuro" | "sistema";

const CHAVE = "solargest-tema";

/**
 * Script executado antes da pintura (no <head>) para aplicar o tema salvo
 * e evitar o "flash" de tema claro ao carregar no modo escuro.
 */
export const scriptTema = `(function(){try{var t=localStorage.getItem("${CHAVE}");var d=t==="escuro"||((!t||t==="sistema")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

const ouvintes = new Set<() => void>();

function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE);
    return t === "claro" || t === "escuro" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

function sistemaEscuro() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function aplicar(tema: Tema) {
  const escuro = tema === "escuro" || (tema === "sistema" && sistemaEscuro());
  const raiz = document.documentElement;
  raiz.classList.toggle("dark", escuro);
  raiz.style.colorScheme = escuro ? "dark" : "light";
}

function assinar(cb: () => void) {
  ouvintes.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const aoMudar = () => {
    if (lerTema() === "sistema") aplicar("sistema");
    cb();
  };
  mq.addEventListener("change", aoMudar);
  return () => {
    ouvintes.delete(cb);
    mq.removeEventListener("change", aoMudar);
  };
}

/** Tema atual e função para alterá-lo (persistido no navegador). */
export function useTema() {
  const tema = useSyncExternalStore(assinar, lerTema, () => "sistema" as Tema);
  const escuro = useSyncExternalStore(
    assinar,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  useEffect(() => aplicar(tema), [tema]);

  const definir = useCallback((t: Tema) => {
    try {
      localStorage.setItem(CHAVE, t);
    } catch {
      /* armazenamento indisponível: aplica só nesta sessão */
    }
    aplicar(t);
    ouvintes.forEach((cb) => cb());
  }, []);

  return { tema, escuro, definir, alternar: () => definir(escuro ? "claro" : "escuro") };
}
