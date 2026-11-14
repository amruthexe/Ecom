/**
 * Money is always stored as integer paise (1 INR = 100 paise).
 * Prices are GST-inclusive (owner decision).
 */

const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrFractional = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/** ₹1,299 for whole rupees, ₹1.50 when paise are present. */
export function formatPaise(paise: number): string {
  return (paise % 100 === 0 ? inrWhole : inrFractional).format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Splits a GST-inclusive amount into its taxable value and GST component.
 * e.g. ₹118 at 18% → taxable ₹100, GST ₹18.
 */
export function splitInclusiveGst(totalPaise: number, ratePercent: number): { taxablePaise: number; gstPaise: number } {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) throw new RangeError("totalPaise must be a non-negative integer");
  if (ratePercent < 0) throw new RangeError("ratePercent must be >= 0");
  const taxablePaise = Math.round((totalPaise * 100) / (100 + ratePercent));
  return { taxablePaise, gstPaise: totalPaise - taxablePaise };
}

export function discountPercent(mrpPaise: number, salePaise: number): number {
  if (mrpPaise <= 0 || salePaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - salePaise) / mrpPaise) * 100);
}
