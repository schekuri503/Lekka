// ============================================================================
// Dashboard — today's collection summary
// ============================================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

import { useDashboard } from '@/hooks/useDashboard';
import { DashboardCards } from '@/components/dashboard/DashboardCards';
import { InstallmentList } from '@/components/dashboard/InstallmentList';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/dates';
import type { InstallmentWithStatus } from '@/types/database';

export function Dashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboard();
  const [selected, setSelected] = useState<InstallmentWithStatus | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  function startPay(row: InstallmentWithStatus) {
    setSelected(row);
    setPayOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            {t('dashboard.subtitle')}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(data?.today)}</p>
        </div>
      </header>

      {/* Metrics */}
      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : (
        <DashboardCards totals={data.totals} />
      )}

      {/* Due today */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t('dashboard.due_today_list')}
          </h2>
          <Link to="/dues" className="text-sm text-primary hover:underline">
            {t('dues.title')} →
          </Link>
        </div>
        <InstallmentList
          rows={data?.dueToday ?? []}
          onPay={startPay}
          emptyMessage={t('dashboard.nothing_due')}
          reminderKind="due"
        />
      </section>

      {/* Overdue */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t('dashboard.overdue_list')}
        </h2>
        <InstallmentList
          rows={data?.overdue ?? []}
          onPay={startPay}
          emptyMessage={t('dashboard.nothing_overdue')}
          reminderKind="late"
        />
      </section>

      {/* Recently paid */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t('dashboard.recently_paid')}
        </h2>
        {!data?.recentPaid || data.recentPaid.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            {t('common.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
            {data.recentPaid.map((p: any) => {
              const c = Array.isArray(p.customers) ? p.customers[0] : p.customers;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{c?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.payment_date)} · {t(`method.${p.payment_method}`)}
                    </p>
                  </div>
                  <p className="font-display text-base font-semibold tabular-money text-success">
                    {formatMoney(Number(p.amount))}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PaymentModal open={payOpen} onOpenChange={setPayOpen} installment={selected} />
    </div>
  );
}
