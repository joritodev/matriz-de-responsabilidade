import { describe, expect, it } from "vitest";
import { cell, csvBody } from "./csv";

describe("cell", () => {
  it("prefixa apóstrofo em fórmulas (=, +, -, @), mesmo com tab/espaço antes", () => {
    expect(cell("=1+1")).toBe("'=1+1");
    expect(cell("-cmd")).toBe("'-cmd");
    expect(cell("@user")).toBe("'@user");
    expect(cell("+551199999")).toBe("'+551199999");
    expect(cell("\t=1+1")).toBe("\"'\t=1+1\"");
    expect(cell(" =cmd")).toBe("' =cmd");
  });

  it("cita aspas, ponto-e-vírgula e quebras de linha, incluindo tab e \\r", () => {
    expect(cell("a;b")).toBe('"a;b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(cell("a\rb")).toBe('"a\rb"');
    expect(cell("a\tb")).toBe('"a\tb"');
  });

  it("valor simples passa direto", () => {
    expect(cell("Bianca Torres")).toBe("Bianca Torres");
  });
});

describe("csvBody", () => {
  it("junta com BOM e quebras CRLF", () => {
    expect(csvBody([["A", "b"], ["C", "d"]])).toBe("\uFEFFA;b\r\nC;d");
  });
});
