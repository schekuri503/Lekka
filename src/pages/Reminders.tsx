// ============================================================================
// Reminders — today / overdue list with WhatsApp send buttons
// ============================================================================
import { useTranslation } from 'react-i18next';
import { Bell, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useDashboard } from '@/hooks/useDashboard';
import { WhatsAppReminderButton } from '@/components/reminders/WhatsAppReminderButton';
import { Card } from '@/components/ui/card';
import { formatDate, formatDateShort } from '@/lib/dates';
import { formatMoney } from '@/lib/currency';
import type { InstallmentWithStatus } from '@/types/database';

function Section({
  title,
  rows,
  empty,
  kind,
}: {
  title: string;
  rows: InstallmentWithStatus[];
  empty: string;
  kind: 'due' | 'late';
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {rows.length === 0 ? (
        <Card className="grid place-items-center p-8 text-sm text-muted-foreground">
          {empty}
        </Card>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  to={`/customers/${row.customer_id}`}
                  className="font-medium hover:text-primary"
                >
                  {row.customer_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatDateShort(row.due_date)} · {formatMoney(row.balance)} balance
                </p>
              </div>
              <WhatsAppReminderButton
                phone={row.customer_phone}
                customerName={row.customer_name}
                amount={row.balance}
                dueDate={row.due_date}
                kind={kind}
                size="default"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Reminders() {
  const { t } = useTranslation();
  const { data } = useDashboard();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
          <Bell className="h-5 w-5 text-primary" />
          {t('reminders.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate(data?.today)}</p>
      </header>

      <Card className="flex items-start gap-3 border-secondary/30 bg-secondary/5 p-4 text-sm">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
        <p className="text-muted-foreground">
          Tap a customer's WhatsApp button to open the message pre-filled. You'll send it manually
          from your phone — no API required.
        </p>
      </Card>

      <Section
        title={t('reminders.today')}
        rows={data?.dueToday ?? []}
        empty={t('dashboard.nothing_due')}
        kind="due"
      />

      <Section
        title={t('reminders.overdue')}
        rows={data?.overdue ?? []}
        empty={t('dashboard.nothing_overdue')}
        kind="late"
      />
    </div>
  );
}
