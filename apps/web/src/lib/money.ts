import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@freediving.ph/config";

const pesoFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  currencyDisplay: "symbol",
  maximumFractionDigits: 2,
});

export function formatPeso(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  return pesoFormatter.format(value);
}
