import { describe, expect, it } from "vitest";
import {
  compareDecimalStrings,
  formatDecimalString,
  isValidDecimalString,
  normalizeDecimalString
} from "@/app/utils/decimal";

describe("decimal string helpers", () => {
  it("rejects exponent notation and excessive precision", () => {
    expect(isValidDecimalString("0.01")).toBe(true);
    expect(isValidDecimalString("1e3")).toBe(false);
    expect(isValidDecimalString("0.1234567")).toBe(false);
    expect(isValidDecimalString("-1.25", { allowNegative: true })).toBe(true);
    expect(isValidDecimalString("-1.25")).toBe(false);
  });

  it("normalizes only textual zeroes without converting through Number", () => {
    expect(normalizeDecimalString("000001.230000")).toBe("1.23");
    expect(normalizeDecimalString("-000.000")).toBe("0");
  });

  it("compares values exactly beyond floating-point safe integers", () => {
    expect(compareDecimalStrings("9007199254740993", "9007199254740992")).toBe(1);
    expect(compareDecimalStrings("-10.01", "-10.001")).toBe(-1);
    expect(compareDecimalStrings("1.20", "1.2")).toBe(0);
  });

  it("formats and rounds large decimals without floating-point conversion", () => {
    expect(formatDecimalString("9007199254740993.995", 2)).toBe("9007199254740994.00");
    expect(formatDecimalString("-0.004", 2)).toBe("0.00");
    expect(formatDecimalString("-0.005", 2)).toBe("-0.01");
  });

  it("uses two to six fraction digits by default so micro-debits remain visible", () => {
    expect(formatDecimalString("0.009511")).toBe("0.009511");
    expect(formatDecimalString("-0.000489")).toBe("-0.000489");
    expect(formatDecimalString("50")).toBe("50.00");
    expect(formatDecimalString("1.2")).toBe("1.20");
    expect(formatDecimalString("1.230000")).toBe("1.23");
    expect(formatDecimalString("1.2345678")).toBe("1.234568");
  });
});
