// ============================================================================
// Dues — filter installments and take action on each
// ============================================================================
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

import { useDuesView } from '@/hooks/useDashboard';
import { InstallmentList } from '@/components/dashboard/InstallmentList';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { CsvExportButton } from '@/components/shared/CsvExportButton';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/dates';
import type { InstallmentWithStatus } from '@/types/database';

type Mode = 'due_today' | 'overdue' | 'this_week' | 'paid' | 'all';
const MODES: Mode[] = ['due_today', 'overdue', 'this_week', 'paid', 'all'];

export function Dues() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('due_today');
  const { data, isLoading } = useDuesView(mode);

  const [selected, setSelected] = useState<InstallmentWithStatus | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  function startPay(row: InstallmentWithStatus) {
    setSelected(row);
    setPayOpen(true);
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t('dues.title')}</h1>
          <p className="text-sm text-muted-foreground">{rows.length} item(s)</p>
        </div>
        <CsvExportButton
          rows={rows as unknown as Record<string, unknown>[]}
          filename={`dues-${mode}-${new Date().toISOString().slice(0, 10)}.csv`}
          columns={[
            { key: 'customer_name', header: t('dues.customer') },
            { key: 'customer_phone', header: t('dues.phone') },
            { key: 'account_type', header: t('dues.account') },
            {
              key: 'due_date',
              header: t('dues.due_date'),
              format: (v) => formatDate(String(v ?? '')),
            },
            {
              key: 'due_amount',
              header: t('dues.due_amount'),
              format: (v) => formatMoney(Number(v), { noSymbol: true }),
            },
            {
              key: 'paid_amount',
              header: t('dues.paid'),
              format: (v) => formatMoney(Number(v), { noSymbol: true }),
            },
            {
              key: 'balance',
              header: t('common.balance'),
              format: (v) => formatMoney(Number(v), { noSymbol: true }),
            },
            { key: 'effective_status', header: t('common.status') },
          ]}
        />
      </header>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition',
              mode === m
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {t(`dues.filter.${m}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : (
        <InstallmentList
          rows={rows}
          onPay={startPay}
          emptyMessage={t('common.empty')}
          reminderKind={mode === 'overdue' ? 'late' : 'due'}
        />
      )}

      <PaymentModal open={payOpen} onOpenChange={setPayOpen} installment={selected} />
    </div>
  );
}
