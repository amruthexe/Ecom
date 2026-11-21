import { describe, expect, it } from "vitest";
import { cleanMoneyInput, discountPercent, formatPaise, formatPercent, rupeesToPaise, splitInclusiveGst } from "@/lib/money";
import { slugify } from "@/lib/utils";

describe("money", () => {
  it("formats paise as INR", () => {
    expect(formatPaise(129900)).toBe("₹1,299");
    expect(formatPaise(150)).toBe("₹1.50");
  });

  it("converts rupees to paise without float errors", () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it("splits GST-inclusive amounts", () => {
    expect(splitInclusiveGst(11800, 18)).toEqual({ taxablePaise: 10000, gstPaise: 1800 });
    expect(splitInclusiveGst(10000, 0)).toEqual({ taxablePaise: 10000, gstPaise: 0 });
    const { taxablePaise, gstPaise } = splitInclusiveGst(99999, 12);
    expect(taxablePaise + gstPaise).toBe(99999);
  });

  it("rejects invalid GST input", () => {
    expect(() => splitInclusiveGst(10.5, 18)).toThrow(RangeError);
    expect(() => splitInclusiveGst(-1, 18)).toThrow(RangeError);
  });

  it("computes discount percent", () => {
    expect(discountPercent(200000, 150000)).toBe(25);
    expect(discountPercent(100000, 89550)).toBe(10.45); // ₹1,000 → ₹895.50
    expect(discountPercent(100000, 89500)).toBe(10.5);
    expect(discountPercent(30000, 19900)).toBe(33.67); // 33.666… → 2 decimals
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(0, 0)).toBe(0);
  });
});

describe("slugify", () => {
  it("creates url-safe slugs", () => {
    expect(slugify("  Men's Café T-Shirt  ")).toBe("men-s-cafe-t-shirt");
  });
});

describe("cleanMoneyInput (admin price boxes)", () => {
  it("keeps digits and one decimal point, max 2 decimals", () => {
    expect(cleanMoneyInput("300")).toBe("300");
    expect(cleanMoneyInput("150")).toBe("150");
    expect(cleanMoneyInput("0")).toBe("0");
    expect(cleanMoneyInput("1,299.50")).toBe("1299.50");
    expect(cleanMoneyInput("₹ 895.505")).toBe("895.50");
    expect(cleanMoneyInput("1.2.3")).toBe("1.23");
    expect(cleanMoneyInput("abc")).toBe("");
  });
});

describe("formatPercent", () => {
  it("shows up to 2 decimals without trailing zeros", () => {
    expect(formatPercent(10.45)).toBe("10.45%");
    expect(formatPercent(10.5)).toBe("10.5%");
    expect(formatPercent(10)).toBe("10%");
  });
});
