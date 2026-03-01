import { describe, expect, it } from "vitest";

import { buildFallbackDrawingCode, parseDrawingFilename, parseDrawingMetadataFromText } from "./filename-parser";

describe("drawing filename parser", () => {
  it("tach metadata day du tu ten file 7 truong", () => {
    const parsed = parseDrawingFilename("2201.CYSAPA-A79-AA-KS-BS-L1-M2.pdf");

    expect(parsed).not.toBeNull();
    expect(parsed?.projectCode).toBe("2201.CYSAPA");
    expect(parsed?.unitCode).toBe("A79");
    expect(parsed?.disciplineCode).toBe("AA");
    expect(parsed?.buildingCode).toBe("KS");
    expect(parsed?.buildingPartCode).toBe("BS");
    expect(parsed?.floorCode).toBe("L1");
    expect(parsed?.fileTypeCode).toBe("M2");
    expect(parsed?.drawingCode).toBe("2201.CYSAPA-A79-AA-KS-BS-L1");
    expect(parsed?.tagNames).toContain("discipline:aa");
    expect(parsed?.tagNames).toContain("project:2201.cysapa");
  });

  it("chap nhan ten file 6 truong va bo qua fileType", () => {
    const parsed = parseDrawingFilename("2201.CYSAPA-A79-EM-KS-TY-B1.pdf");

    expect(parsed).not.toBeNull();
    expect(parsed?.fileTypeCode).toBeUndefined();
    expect(parsed?.suggestedName).toBe("2201.CYSAPA-A79-EM-KS-TY-B1");
  });

  it("tra null khi ten file qua ngan khong du 6 segment", () => {
    expect(parseDrawingFilename("ban-ve-tong-hop.pdf")).toBeNull();
  });

  it("parse duoc ten file gan chuan co nhieu segment phia sau", () => {
    const parsed = parseDrawingFilename("22024-BRL-AR-LH-AN-XO-500000-0100-5-07-V.pdf");
    expect(parsed).not.toBeNull();
    expect(parsed?.projectCode).toBe("22024");
    expect(parsed?.unitCode).toBe("BRL");
    expect(parsed?.disciplineCode).toBe("AR");
    expect(parsed?.buildingCode).toBe("LH");
    expect(parsed?.buildingPartCode).toBe("AN");
    expect(parsed?.floorCode).toBe("XO");
    expect(parsed?.fileTypeCode).toBe("V");
    expect(parsed?.drawingCode).toBe("22024-BRL-AR-LH-AN-XO");
  });

  it("tach duoc metadata khi ten file dung dau gach duoi va khoang trang", () => {
    const parsed = parseDrawingFilename("2201.CYSAPA_A79 AA KS BS OG1 M2.pdf");
    expect(parsed).not.toBeNull();
    expect(parsed?.projectCode).toBe("2201.CYSAPA");
    expect(parsed?.unitCode).toBe("A79");
    expect(parsed?.disciplineCode).toBe("AA");
    expect(parsed?.buildingCode).toBe("KS");
    expect(parsed?.buildingPartCode).toBe("BS");
    expect(parsed?.floorCode).toBe("OG1");
    expect(parsed?.fileTypeCode).toBe("M2");
  });

  it("khong nhan dien sai voi ten file vo nghia", () => {
    const parsed = parseDrawingFilename("4-.-GZ-GS-S-F-270.pdf");
    expect(parsed).toBeNull();
  });

  it("ho tro ma tang va loai ban ve mo rong", () => {
    const parsed = parseDrawingFilename("22024-BRL-ELT-KS-GR-DG-SM.pdf");
    expect(parsed).not.toBeNull();
    expect(parsed?.disciplineCode).toBe("ELT");
    expect(parsed?.buildingPartCode).toBe("GR");
    expect(parsed?.floorCode).toBe("DG");
    expect(parsed?.fileTypeCode).toBe("SM");
  });

  it("trich xuat ma ban ve tu OCR text", () => {
    const parsed = parseDrawingMetadataFromText("Ban ve tong hop: 2201.CYSAPA-A79-AA-KS-BS-L1-M2 ngay 01/01");
    expect(parsed).not.toBeNull();
    expect(parsed?.drawingCode).toBe("2201.CYSAPA-A79-AA-KS-BS-L1");
    expect(parsed?.fileTypeCode).toBe("M2");
  });

  it("sinh fallback drawing code on dinh", () => {
    expect(buildFallbackDrawingCode("Mat bang tang 1", "raw.pdf")).toBe("MAT-BANG-TANG-1");
    expect(buildFallbackDrawingCode("", "2201.CYSAPA-A79-AA.pdf")).toBe("2201-CYSAPA-A79-AA");
  });
});
