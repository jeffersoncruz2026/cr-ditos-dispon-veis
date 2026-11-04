import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodificarXml, ehXml, lerXmlNf3e, XmlInvalidoError } from "@/features/faturas/xml-nf3e";
import { identificarUnidade, verificarDados } from "@/features/faturas/analise";
import { CAMPOS } from "@/features/faturas/campos";

// NF3e real da Equatorial Goiás com dados pessoais substituídos; gravada em ISO-8859-1.
const bytes = readFileSync(path.join(__dirname, "fixtures/nf3e-equatorial.xml"));
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const xml = decodificarXml(buffer);

describe("decodificarXml", () => {
  it("decodifica XML em ISO-8859-1 preservando acentos", () => {
    expect(xml).toContain("EQUATORIAL GOIÁS");
    expect(xml).not.toContain("�");
    expect(ehXml(xml)).toBe(true);
  });
  it("decodifica UTF-8", () => {
    const u = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><a>Ação</a>');
    expect(decodificarXml(u.buffer)).toContain("Ação");
  });
});

describe("lerXmlNf3e", () => {
  const r = lerXmlNf3e(xml);
  const d = r.dados;

  it("lê identificação, datas e total", () => {
    expect(d.numero_uc).toBe("321778201228");
    expect(d.titular).toBe("FULANO DE TAL");
    expect(d.mes_referencia).toBe("2026-10-01");
    expect(d.leitura_anterior_data).toBe("2026-09-25");
    expect(d.leitura_atual_data).toBe("2026-10-27");
    expect(d.proxima_leitura_data).toBe("2026-11-25");
    expect(d.vencimento).toBe("2026-11-12");
    expect(d.valor_total).toBe(40.47);
    expect(r.chave).toBe("52261001543032000104660002137293821018367217");
  });

  it("lê consumo, medidor e compensação", () => {
    expect(d.consumo_kwh).toBe(165);
    expect(d.leitura_anterior).toBe(1003);
    expect(d.leitura_atual).toBe(1168);
    expect(d.energia_compensada_kwh).toBe(165);
    expect(d.valor_energia).toBe(131.76);
  });

  it("lê os dados do SCEE (estruturados e do infCpl)", () => {
    expect(d.energia_injetada_kwh).toBe(621);
    expect(d.geracao_ciclo_kwh).toBe(621);
    expect(d.excedente_recebido_kwh).toBe(228);
    expect(d.creditos_recebidos_kwh).toBe(165);
    expect(d.creditos_utilizados_kwh).toBeNull();
    expect(d.saldo_creditos_kwh).toBe(1568.2);
    expect(d.creditos_a_expirar_kwh).toBe(300.02);
    expect(d.creditos_a_expirar_data).toBe("2031-05-01");
    expect(d.percentual_rateio).toBe(50);
  });

  it("lê encargos e tributos", () => {
    expect(d.encargos_gd).toBe(29.11);
    expect(d.contrib_iluminacao).toBe(11.36);
    expect(d.icms).toBe(0);
    expect(d.pis).toBe(0);
    expect(d.cofins).toBe(0);
    expect(d.bandeira_tarifaria).toBeNull();
  });

  it("nota autorizada não gera avisos", () => {
    expect(r.avisos).toEqual([]);
  });

  it("todos os valores lidos são localizados no texto de conferência", () => {
    const v = verificarDados(r.texto, d);
    const naoLocalizados = CAMPOS.filter((c) => v[c.chave] === "nao_localizado").map(
      (c) => c.chave,
    );
    expect(naoLocalizados).toEqual([]);
  });

  it("identifica a unidade mesmo com zeros à esquerda na UC do XML", () => {
    const u = identificarUnidade(
      r.texto,
      [{ id: "a", numero_uc: "3217782012-28" }],
      d.numero_uc as string,
    );
    expect(u.unidade?.id).toBe("a");
  });

  it("rejeita XML que não é NF3e", () => {
    expect(() => lerXmlNf3e("<NFe><infNFe/></NFe>")).toThrow(XmlInvalidoError);
    expect(() => lerXmlNf3e("isto não é xml")).toThrow(XmlInvalidoError);
  });

  it("avisa sobre nota de homologação e não autorizada", () => {
    const h = xml
      .replace("<tpAmb>1</tpAmb>", "<tpAmb>2</tpAmb>")
      .replace("<cStat>100</cStat>", "<cStat>101</cStat>");
    const msgs = lerXmlNf3e(h)
      .avisos.map((a) => a.mensagem)
      .join(" | ");
    expect(msgs).toMatch(/homologação/);
    expect(msgs).toMatch(/não autorizada/);
  });
});
