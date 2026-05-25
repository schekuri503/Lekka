// ============================================================================
// InstallmentPreviewTable — shows the schedule before saving an account
// ============================================================================
import { addDays, format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/lib/currency';
import { formatDateShort } from '@/lib/dates';

interface Props {
  startDate: string; // YYYY-MM-DD, used as the first due date
  weeks: number;
  totalAmount: number;
}

export function InstallmentPreviewTable({ startDate, weeks, totalAmount }: Props) {
  const { t } = useTranslation();

  if (!startDate || !weeks || weeks < 1 || !totalAmount) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        Fill in the fields above to preview the schedule.
      </div>
    );
  }

  let parsed: Date;
  try {
    parsed = parseISO(startDate);
  } catch {
    return null;
  }

  // Round to 2 decimals, last row absorbs the remainder so it always sums to total.
  const weekly = Math.round((totalAmount / weeks) * 100) / 100;
  const rows = Array.from({ length: weeks }, (_, i) => {
    const isLast = i === weeks - 1;
    const due = isLast ? Math.round((totalAmount - weekly * (weeks - 1)) * 100) / 100 : weekly;
    return {
      n: i + 1,
      date: format(addDays(parsed, i * 7), 'yyyy-MM-dd'),
      amount: due,
    };
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('accounts.preview')} · {weeks} weeks
      </div>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">#</th>
              <th className="px-4 py-2 text-left font-medium">{t('common.date')}</th>
              <th className="px-4 py-2 text-right font-medium">{t('common.amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.n}>
                <td className="px-4 py-2 text-muted-foreground">{r.n}</td>
                <td className="px-4 py-2">{formatDateShort(r.date)}</td>
                <td className="px-4 py-2 text-right tabular-money">{formatMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30 text-sm font-medium">
              <td colSpan={2} className="px-4 py-2 text-right">
                Total
              </td>
              <td className="px-4 py-2 text-right tabular-money">{formatMoney(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
