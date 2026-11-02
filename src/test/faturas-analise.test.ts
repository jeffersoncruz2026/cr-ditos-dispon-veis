import { describe, expect, it } from "vitest";
import {
  extrairBasico,
  gerarAvisos,
  identificarUnidade,
  numeroBR,
  verificarDados,
} from "@/features/faturas/analise";
import { CAMPOS, dadosVazios, esquemaExtracao, normalizarDados } from "@/features/faturas/campos";

// Texto de teste no formato de uma fatura (valores ilustrativos, apenas para testar a lógica).
const TEXTO = `--- Página 1 ---
EQUATORIAL GOIÁS DISTRIBUIDORA DE ENERGIA S.A.
NOME DO CLIENTE   FULANO DE TAL
UNIDADE CONSUMIDORA   3217782012-28
REFERÊNCIA   OUT/2026      VENCIMENTO   20/11/2026      TOTAL A PAGAR   R$ 1.234,56
Leitura anterior 15/09/2026   Leitura atual 15/10/2026   Próxima leitura 14/11/2026
Consumo kWh 350   Energia injetada 612,5
Saldo de créditos 1.200,00 kWh`;

const unidades = [
  { id: "a", numero_uc: "321778201228" },
  { id: "b", numero_uc: "309275601274" },
];

describe("identificarUnidade", () => {
  it("encontra a UC no texto mesmo com separadores", () => {
    const r = identificarUnidade(TEXTO, unidades, null);
    expect(r.unidade?.id).toBe("a");
    expect(r.via).toBe("texto");
  });
  it("usa a UC extraída pela IA quando o texto não tem a UC", () => {
    const r = identificarUnidade("sem números", unidades, "309275601274");
    expect(r.unidade?.id).toBe("b");
    expect(r.via).toBe("ia");
  });
  it("retorna nulo quando não há correspondência", () => {
    expect(identificarUnidade("UC 999999999999", unidades, "111").unidade).toBeNull();
  });
});

describe("verificarDados", () => {
  it("localiza números pt-BR, datas e competência; aponta valores ausentes do PDF", () => {
    const d = dadosVazios();
    d.valor_total = 1234.56;
    d.consumo_kwh = 350;
    d.energia_injetada_kwh = 612.5;
    d.saldo_creditos_kwh = 1200;
    d.vencimento = "2026-11-20";
    d.mes_referencia = "2026-10-01";
    d.titular = "Fulano de Tal";
    d.geracao_ciclo_kwh = 700; // não está no texto
    const v = verificarDados(TEXTO, d);
    expect(v.valor_total).toBe("encontrado");
    expect(v.consumo_kwh).toBe("encontrado");
    expect(v.energia_injetada_kwh).toBe("encontrado");
    expect(v.saldo_creditos_kwh).toBe("encontrado");
    expect(v.vencimento).toBe("encontrado");
    expect(v.mes_referencia).toBe("encontrado");
    expect(v.titular).toBe("encontrado");
    expect(v.geracao_ciclo_kwh).toBe("nao_localizado");
    expect(v.icms).toBe("vazio");
  });
  it("não confunde 35 com 350", () => {
    const d = dadosVazios();
    d.consumo_kwh = 35;
    expect(verificarDados(TEXTO, d).consumo_kwh).toBe("nao_localizado");
  });
});

describe("extrairBasico", () => {
  it("lê competência, vencimento e total; o resto fica Não informado", () => {
    const d = extrairBasico(TEXTO);
    expect(d.mes_referencia).toBe("2026-10-01");
    expect(d.vencimento).toBe("2026-11-20");
    expect(d.valor_total).toBe(1234.56);
    expect(d.consumo_kwh).toBeNull();
    expect(d.energia_injetada_kwh).toBeNull();
  });
});

describe("normalizarDados e esquema", () => {
  it("normaliza formatos e descarta lixo", () => {
    const d = normalizarDados({
      numero_uc: "3217782012-28",
      mes_referencia: "2026-10-15",
      vencimento: "2026-11-20T00:00:00Z",
      valor_total: "1234.567",
      consumo_kwh: "abc",
      titular: "  ",
    });
    expect(d.numero_uc).toBe("321778201228");
    expect(d.mes_referencia).toBe("2026-10-01");
    expect(d.vencimento).toBe("2026-11-20");
    expect(d.valor_total).toBe(1234.57);
    expect(d.consumo_kwh).toBeNull();
    expect(d.titular).toBeNull();
  });
  it("esquema exige todos os campos, sem propriedades extras", () => {
    const s = esquemaExtracao();
    expect(s.additionalProperties).toBe(false);
    expect(s.required).toHaveLength(CAMPOS.length + 1);
    expect(Object.keys(s.properties)).toHaveLength(CAMPOS.length + 1);
  });
  it("numeroBR entende formatos brasileiros", () => {
    expect(numeroBR("1.234,56")).toBe(1234.56);
    expect(numeroBR("612,5")).toBe(612.5);
  });
});

describe("gerarAvisos", () => {
  it("sinaliza unidade não identificada, competência ausente e duplicidade", () => {
    const d = dadosVazios();
    const a = gerarAvisos({
      dados: d,
      verificacao: verificarDados(TEXTO, d),
      unidadeIdentificada: false,
      ucAmbigua: false,
      faturaExistente: true,
      semTexto: false,
      metodo: "ia",
    });
    const msgs = a.map((x) => x.mensagem).join(" | ");
    expect(msgs).toMatch(/Nenhuma unidade cadastrada/);
    expect(msgs).toMatch(/Competência não identificada/);
    expect(msgs).toMatch(/Já existe fatura/);
  });
});
