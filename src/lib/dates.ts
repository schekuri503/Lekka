// ============================================================================
// Date helpers
// ----------------------------------------------------------------------------
// Thin wrappers around date-fns so the rest of the app stays readable.
// All dates from Supabase are 'YYYY-MM-DD' strings — we treat them as local
// dates (not UTC) because installment due-dates are calendar concepts, not
// timestamps.
// ============================================================================
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

/** 'YYYY-MM-DD' → '5 Jun 2025' */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

/** 'YYYY-MM-DD' → 'Mon, 5 Jun' (for compact tables) */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'EEE, d MMM');
  } catch {
    return iso;
  }
}

/** Positive = days until due. Negative = days overdue. */
export function daysUntil(iso: string): number {
  return differenceInCalendarDays(parseISO(iso), new Date());
}

/** Human-friendly: "today" / "in 3 days" / "5 days ago" */
export function relativeDueLabel(iso: string, t: (k: string, v?: Record<string, unknown>) => string): string {
  const diff = daysUntil(iso);
  if (diff === 0) return t('date.today');
  if (diff === 1) return t('date.tomorrow');
  if (diff === -1) return t('date.yesterday');
  if (diff > 1) return t('date.in_n_days', { n: diff });
  return t('date.n_days_ago', { n: Math.abs(diff) });
}
