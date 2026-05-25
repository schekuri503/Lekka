// ============================================================================
// InstallmentList — shared compact list of installment rows
// ----------------------------------------------------------------------------
// Used by Dashboard (due today/overdue) and Dues page.
// ============================================================================
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { WhatsAppReminderButton } from '@/components/reminders/WhatsAppReminderButton';
import { formatMoney } from '@/lib/currency';
import { formatDateShort, relativeDueLabel } from '@/lib/dates';
import type { InstallmentWithStatus } from '@/types/database';

interface Props {
  rows: InstallmentWithStatus[];
  onPay: (row: InstallmentWithStatus) => void;
  emptyMessage: string;
  reminderKind: 'due' | 'late';
}

export function InstallmentList({ rows, onPay, emptyMessage, reminderKind }: Props) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Left: customer + due */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link
                to={`/customers/${row.customer_id}`}
                className="truncate font-medium hover:text-primary"
              >
                {row.customer_name}
              </Link>
              <StatusBadge status={row.effective_status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>
                {row.account_type === 'BC_WEEKLY' ? 'BC' : 'Monthly'} · #{row.installment_number}
              </span>
              <span>· {formatDateShort(row.due_date)}</span>
              <span>· {relativeDueLabel(row.due_date, t)}</span>
            </div>
          </div>

          {/* Middle: amount */}
          <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-6">
            <div className="text-left sm:text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('dues.due_amount')}
              </p>
              <p className="font-display text-base font-semibold tabular-money">
                {formatMoney(row.due_amount)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('common.balance')}
              </p>
              <p className="font-display text-base font-semibold tabular-money text-primary">
                {formatMoney(row.balance)}
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => onPay(row)}>
              {t('dues.mark_paid')}
            </Button>
            <WhatsAppReminderButton
              phone={row.customer_phone}
              customerName={row.customer_name}
              amount={row.balance}
              dueDate={row.due_date}
              kind={reminderKind}
            />
            <Button asChild variant="ghost" size="icon" aria-label="Call">
              <a href={`tel:${row.customer_phone}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
