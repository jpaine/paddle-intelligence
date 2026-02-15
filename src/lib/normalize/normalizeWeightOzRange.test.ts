import { describe, it, expect } from "vitest";
import { normalizeWeightOzRange } from "./normalizeWeightOzRange";

describe("normalizeWeightOzRange", () => {
  it('parses "8 oz"', () => {
    expect(normalizeWeightOzRange("8 oz")).toEqual({
      weightMinOz: 8,
      weightMaxOz: 8,
    });
  });

  it('parses "7.8-8.2 oz"', () => {
    expect(normalizeWeightOzRange("7.8-8.2 oz")).toEqual({
      weightMinOz: 7.8,
      weightMaxOz: 8.2,
    });
  });

  it('parses "7.8 – 8.2 oz" (en-dash)', () => {
    expect(normalizeWeightOzRange("7.8 – 8.2 oz")).toEqual({
      weightMinOz: 7.8,
      weightMaxOz: 8.2,
    });
  });

  it("returns null for empty input", () => {
    expect(normalizeWeightOzRange("")).toBeNull();
    expect(normalizeWeightOzRange(null)).toBeNull();
    expect(normalizeWeightOzRange(undefined)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(normalizeWeightOzRange("abc")).toBeNull();
  });

  it("returns null for out-of-range", () => {
    expect(normalizeWeightOzRange("5 oz")).toBeNull();
    expect(normalizeWeightOzRange("13 oz")).toBeNull();
  });

  it('parses "8.0 ounces"', () => {
    expect(normalizeWeightOzRange("8.0 ounces")).toEqual({
      weightMinOz: 8,
      weightMaxOz: 8,
    });
  });

  it("reverses min/max when range is given reversed", () => {
    expect(normalizeWeightOzRange("8.2-7.8 oz")).toEqual({
      weightMinOz: 7.8,
      weightMaxOz: 8.2,
    });
  });
});
