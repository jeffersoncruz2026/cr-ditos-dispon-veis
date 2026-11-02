import { describe, expect, it } from "vitest";
import { validarRateio } from "@/features/unidades/rateio-dialog";
import { parseDecimal } from "@/features/unidades/shared";
import type { RateioConfiguracao, UnidadeComRateio } from "@/features/unidades/api";

const u = (id: string, situacao = "ativa") => ({ id, nome: id, situacao }) as UnidadeComRateio;
const ultima = { vigencia_inicio: "2025-11-01" } as RateioConfiguracao;

describe("validarRateio", () => {
  it("aceita distribuição que soma 100%", () => {
    const r = validarRateio(
      [
        { unidade: u("a"), valor: 50 },
        { unidade: u("b"), valor: 25 },
        { unidade: u("c"), valor: 25 },
        { unidade: u("d", "aguardando_rateio"), valor: 0 },
      ],
      "2026-12",
      ultima,
    );
    expect(r.erros).toEqual([]);
    expect(r.soma).toBe(100);
  });

  it("aceita decimais sem erro de arredondamento (33,33 + 33,33 + 33,34)", () => {
    const r = validarRateio(
      [
        { unidade: u("a"), valor: 33.33 },
        { unidade: u("b"), valor: 33.33 },
        { unidade: u("c"), valor: 33.34 },
      ],
      "2026-12",
      ultima,
    );
    expect(r.erros).toEqual([]);
  });

  it("rejeita soma diferente de 100%", () => {
    const r = validarRateio([{ unidade: u("a"), valor: 90 }], "2026-12", ultima);
    expect(r.erros.join()).toMatch(/soma deve ser exatamente 100%/);
  });

  it("rejeita percentual em unidade inativa e fora de 0–100", () => {
    const r = validarRateio(
      [
        { unidade: u("a", "inativa"), valor: 10 },
        { unidade: u("b"), valor: 120 },
      ],
      "2026-12",
      ultima,
    );
    expect(r.erros.join()).toMatch(/inativas/);
    expect(r.erros.join()).toMatch(/entre 0% e 100%/);
  });

  it("rejeita vigência anterior à última configuração", () => {
    const r = validarRateio([{ unidade: u("a"), valor: 100 }], "2025-10", ultima);
    expect(r.erros.join()).toMatch(/vigência deve ser igual ou posterior/);
  });
});

describe("parseDecimal", () => {
  it("entende vírgula e ponto decimal", () => {
    expect(parseDecimal("5,44")).toBe(5.44);
    expect(parseDecimal("5.44")).toBe(5.44);
    expect(parseDecimal("1.234,5")).toBe(1234.5);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });
});
