import { describe, it, expect } from "vitest";
import { normalizeThicknessMm } from "./normalizeThicknessMm";

describe("normalizeThicknessMm", () => {
  it('parses "16mm"', () => {
    expect(normalizeThicknessMm("16mm")).toEqual({ valueMm: 16, unit: "mm" });
  });

  it('parses "16 mm"', () => {
    expect(normalizeThicknessMm("16 mm")).toEqual({ valueMm: 16, unit: "mm" });
  });

  it('parses "14mm"', () => {
    expect(normalizeThicknessMm("14mm")).toEqual({ valueMm: 14, unit: "mm" });
  });

  it('parses "0.63 in" to mm', () => {
    const r = normalizeThicknessMm("0.63 in");
    expect(r).not.toBeNull();
    expect(r!.unit).toBe("in");
    expect(r!.valueMm).toBeCloseTo(16, 0);
  });

  it("returns null for empty input", () => {
    expect(normalizeThicknessMm("")).toBeNull();
    expect(normalizeThicknessMm(null)).toBeNull();
    expect(normalizeThicknessMm(undefined)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(normalizeThicknessMm("abc")).toBeNull();
    expect(normalizeThicknessMm("5mm")).toBeNull();
  });

  it("returns null for out-of-range mm", () => {
    expect(normalizeThicknessMm("9mm")).toBeNull();
    expect(normalizeThicknessMm("26mm")).toBeNull();
  });

  it("parses bare number in valid range as mm", () => {
    expect(normalizeThicknessMm("16")).toEqual({ valueMm: 16, unit: "mm" });
  });
});
