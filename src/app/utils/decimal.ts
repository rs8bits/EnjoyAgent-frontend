interface DecimalOptions {
  allowNegative?: boolean;
  maxIntegerDigits?: number;
  maxFractionDigits?: number;
}

export function isValidDecimalString(value: string, options: DecimalOptions = {}) {
  const {
    allowNegative = false,
    maxIntegerDigits = 12,
    maxFractionDigits = 6
  } = options;
  const sign = allowNegative ? "-?" : "";
  return new RegExp(`^${sign}\\d{1,${maxIntegerDigits}}(?:\\.\\d{1,${maxFractionDigits}})?$`).test(String(value).trim());
}

export function normalizeDecimalString(value: string) {
  const trimmed = String(value).trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integerPart, fractionPart] = unsigned.split(".");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fractionPart?.replace(/0+$/, "");
  const normalized = normalizedFraction ? `${normalizedInteger}.${normalizedFraction}` : normalizedInteger;
  return negative && normalized !== "0" ? `-${normalized}` : normalized;
}

export function compareDecimalStrings(left: string, right: string) {
  const normalizeParts = (value: string) => {
    const normalized = normalizeDecimalString(value);
    const negative = normalized.startsWith("-");
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [integer = "0", fraction = ""] = unsigned.split(".");
    return { negative, integer, fraction };
  };
  const a = normalizeParts(left);
  const b = normalizeParts(right);
  if (a.negative !== b.negative) {
    return a.negative ? -1 : 1;
  }
  const direction = a.negative ? -1 : 1;
  if (a.integer.length !== b.integer.length) {
    return a.integer.length > b.integer.length ? direction : -direction;
  }
  if (a.integer !== b.integer) {
    return a.integer > b.integer ? direction : -direction;
  }
  const width = Math.max(a.fraction.length, b.fraction.length);
  const aFraction = a.fraction.padEnd(width, "0");
  const bFraction = b.fraction.padEnd(width, "0");
  if (aFraction === bFraction) {
    return 0;
  }
  return aFraction > bFraction ? direction : -direction;
}

export function formatDecimalString(value: string | null | undefined, fractionDigits?: number) {
  const raw = String(value ?? "0").trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
    return raw;
  }
  if (fractionDigits !== undefined && (fractionDigits < 0 || !Number.isInteger(fractionDigits))) {
    return raw;
  }

  const formatted = formatFixedDecimal(raw, fractionDigits ?? 6);
  return fractionDigits === undefined ? trimFraction(formatted, 2) : formatted;
}

function formatFixedDecimal(raw: string, fractionDigits: number) {
  const normalized = normalizeDecimalString(raw);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, fractionPart = ""] = unsigned.split(".");
  const paddedFraction = fractionPart.padEnd(fractionDigits + 1, "0");
  const retainedFraction = paddedFraction.slice(0, fractionDigits);
  const shouldRound = paddedFraction[fractionDigits] >= "5";
  const unscaled = BigInt(`${integerPart}${retainedFraction}` || "0") + (shouldRound ? 1n : 0n);
  const paddedUnscaled = unscaled.toString().padStart(fractionDigits + 1, "0");
  const formatted = fractionDigits === 0
    ? paddedUnscaled
    : `${paddedUnscaled.slice(0, -fractionDigits)}.${paddedUnscaled.slice(-fractionDigits)}`;
  return negative && unscaled !== 0n ? `-${formatted}` : formatted;
}

function trimFraction(value: string, minimumFractionDigits: number) {
  const [integerPart, fractionPart = ""] = value.split(".");
  const retainedFraction = fractionPart
    .replace(/0+$/, "")
    .padEnd(minimumFractionDigits, "0");
  return `${integerPart}.${retainedFraction}`;
}
