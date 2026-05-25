// ============================================================================
// Currency formatting
// ----------------------------------------------------------------------------
// Indian-style digit grouping by default (1,00,000 — not 100,000).
// Configurable via Settings page.
// ============================================================================

const DEFAULT_LOCALE = 'en-IN';
const DEFAULT_CURRENCY = 'INR';

interface FormatOpts {
  /** ISO 4217 code; default 'INR'. */
  currency?: string;
  /** Locale, default 'en-IN'. */
  locale?: string;
  /** Show fractional paise/cents. */
  showFraction?: boolean;
  /** Drop the currency symbol; useful inside table cells. */
  noSymbol?: boolean;
}

/** Format money as ₹50,000 or ₹1,23,456.78. */
export function formatMoney(value: number | null | undefined, opts: FormatOpts = {}): string {
  if (value == null || Number.isNaN(value)) return '—';

  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    showFraction = false,
    noSymbol = false,
  } = opts;

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: noSymbol ? 'decimal' : 'currency',
      currency,
      minimumFractionDigits: showFraction ? 2 : 0,
      maximumFractionDigits: showFraction ? 2 : 0,
    }).format(value);
    return formatted;
  } catch {
    return `${value}`;
  }
}

/** Parse user input like "₹50,000" or "50000" or "1,23,456.50" to a number. */
export function parseMoney(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
