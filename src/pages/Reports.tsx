// ============================================================================
// Reports — date-range reports + CSV export
// ============================================================================
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format, startOfMonth } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CsvExportButton } from '@/components/shared/CsvExportButton';
import {
  useDailyCollection,
  useInstallmentsRange,
  useOutstandingByCustomer,
  useProfitReport,
} from '@/hooks/useReports';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/dates';
import { todayISO } from '@/lib/utils';

function nameOf(rel: { full_name: string } | Array<{ full_name: string }> | undefined) {
  if (!rel) return '';
  const v = Array.isArray(rel) ? rel[0] : rel;
  return v?.full_name ?? '';
}

function phoneOf(
  rel: { phone_number?: string } | Array<{ phone_number?: string }> | undefined,
) {
  if (!rel) return '';
  const v = Array.isArray(rel) ? rel[0] : rel;
  return v?.phone_number ?? '';
}

export function Reports() {
  const { t } = useTranslation();

  // Default range: start of this month → today.
  const today = todayISO();
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const daily = useDailyCollection({ from, to });
  const installments = useInstallmentsRange({ from, to });
  const outstanding = useOutstandingByCustomer();
  const profit = useProfitReport({ from, to });

  const overdueRows = useMemo(
    () => (installments.data ?? []).filter((r) => r.effective_status === 'OVERDUE'),
    [installments.data],
  );
  const weekRows = useMemo(() => {
    const today = todayISO();
    const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    return (installments.data ?? []).filter(
      (r) => r.due_date >= today && r.due_date <= weekEnd && r.effective_status !== 'PAID',
    );
  }, [installments.data]);
  const monthlyInterestRows = useMemo(
    () => (installments.data ?? []).filter((r) => r.account_type === 'MONTHLY_INTEREST'),
    [installments.data],
  );

  const dailyTotal = (daily.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const weekTotal = weekRows.reduce((s, r) => s + Number(r.balance ?? 0), 0);
  const overdueTotal = overdueRows.reduce((s, r) => s + Number(r.balance ?? 0), 0);
  const monthInterestTotal = monthlyInterestRows.reduce(
    (s, r) => s + Number(r.due_amount),
    0,
  );
  const outstandingTotal = (outstanding.data ?? []).reduce(
    (s, r) => s + Number(r.outstanding),
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t('reports.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate(from)} → {formatDate(to)}</p>
      </header>

      <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="from">{t('reports.from')}</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">{t('reports.to')}</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <Tabs defaultValue="daily">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="daily">{t('reports.daily_collection')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('reports.weekly_expected')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('reports.monthly_interest')}</TabsTrigger>
          <TabsTrigger value="outstanding">{t('reports.outstanding')}</TabsTrigger>
          <TabsTrigger value="profit">{t('reports.profit')}</TabsTrigger>
          <TabsTrigger value="overdue">{t('reports.overdue')}</TabsTrigger>
        </TabsList>

        {/* ───────── Daily collection ───────── */}
        <TabsContent value="daily" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(daily.data ?? []).length} payments · Total{' '}
              <span className="tabular-money font-medium text-foreground">
                {formatMoney(dailyTotal)}
              </span>
            </p>
            <CsvExportButton
              rows={(daily.data ?? []).map((p) => ({
                date: p.payment_date,
                customer: nameOf(p.customers),
                phone: phoneOf(p.customers),
                method: p.payment_method,
                amount: p.amount,
              }))}
              filename={`daily-collection-${from}_to_${to}.csv`}
              columns={[
                { key: 'date', header: 'Date', format: (v) => formatDate(String(v)) },
                { key: 'customer', header: 'Customer' },
                { key: 'phone', header: 'Phone' },
                { key: 'method', header: 'Method' },
                { key: 'amount', header: 'Amount', format: (v) => String(v) },
              ]}
            />
          </div>
          <ReportTable
            rows={(daily.data ?? []).map((p) => ({
              left: formatDate(p.payment_date),
              mid: `${nameOf(p.customers)} · ${t(`method.${p.payment_method}`)}`,
              right: formatMoney(Number(p.amount)),
            }))}
          />
        </TabsContent>

        {/* ───────── Weekly expected ───────── */}
        <TabsContent value="weekly" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {weekRows.length} due · Total{' '}
              <span className="tabular-money font-medium text-foreground">
                {formatMoney(weekTotal)}
              </span>
            </p>
            <CsvExportButton
              rows={weekRows as unknown as Record<string, unknown>[]}
              filename={`weekly-expected-${from}.csv`}
              columns={[
                { key: 'due_date', header: 'Due', format: (v) => formatDate(String(v)) },
                { key: 'customer_name', header: 'Customer' },
                { key: 'customer_phone', header: 'Phone' },
                { key: 'due_amount', header: 'Due' },
                { key: 'balance', header: 'Balance' },
              ]}
            />
          </div>
          <ReportTable
            rows={weekRows.map((r) => ({
              left: formatDate(r.due_date),
              mid: r.customer_name,
              right: formatMoney(r.balance),
            }))}
          />
        </TabsContent>

        {/* ───────── Monthly interest ───────── */}
        <TabsContent value="monthly" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {monthlyInterestRows.length} entries · Total{' '}
              <span className="tabular-money font-medium text-foreground">
                {formatMoney(monthInterestTotal)}
              </span>
            </p>
            <CsvExportButton
              rows={monthlyInterestRows as unknown as Record<string, unknown>[]}
              filename={`monthly-interest-${from}_to_${to}.csv`}
              columns={[
                { key: 'due_date', header: 'Due', format: (v) => formatDate(String(v)) },
                { key: 'customer_name', header: 'Customer' },
                { key: 'due_amount', header: 'Interest due' },
                { key: 'paid_amount', header: 'Paid' },
                { key: 'effective_status', header: 'Status' },
              ]}
            />
          </div>
          <ReportTable
            rows={monthlyInterestRows.map((r) => ({
              left: formatDate(r.due_date),
              mid: r.customer_name,
              right: `${formatMoney(r.due_amount)} (${r.effective_status})`,
            }))}
          />
        </TabsContent>

        {/* ───────── Outstanding ───────── */}
        <TabsContent value="outstanding" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(outstanding.data ?? []).length} customers · Total{' '}
              <span className="tabular-money font-medium text-foreground">
                {formatMoney(outstandingTotal)}
              </span>
            </p>
            <CsvExportButton
              rows={(outstanding.data ?? []) as unknown as Record<string, unknown>[]}
              filename={`outstanding-by-customer.csv`}
              columns={[
                { key: 'customer_name', header: 'Customer' },
                { key: 'customer_phone', header: 'Phone' },
                { key: 'items', header: 'Open items' },
                { key: 'outstanding', header: 'Outstanding' },
              ]}
            />
          </div>
          <ReportTable
            rows={(outstanding.data ?? []).map((r) => ({
              left: r.customer_name,
              mid: `${r.items} open`,
              right: formatMoney(r.outstanding),
            }))}
          />
        </TabsContent>

        {/* ───────── Profit ───────── */}
        <TabsContent value="profit" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(profit.data ?? []).length} BC accounts started in range
            </p>
            <CsvExportButton
              rows={(profit.data ?? []).map((a) => ({
                start_date: a.start_date,
                customer: nameOf(a.customers),
                given: a.amount_given,
                total: a.total_repayment_amount,
                profit: a.profit_amount,
              }))}
              filename={`profit-${from}_to_${to}.csv`}
              columns={[
                { key: 'start_date', header: 'Started', format: (v) => formatDate(String(v)) },
                { key: 'customer', header: 'Customer' },
                { key: 'given', header: 'Given' },
                { key: 'total', header: 'Total repayment' },
                { key: 'profit', header: 'Profit' },
              ]}
            />
          </div>
          <ReportTable
            rows={(profit.data ?? []).map((a) => ({
              left: formatDate(a.start_date),
              mid: nameOf(a.customers),
              right: formatMoney(a.profit_amount),
            }))}
          />
        </TabsContent>

        {/* ───────── Overdue ───────── */}
        <TabsContent value="overdue" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {overdueRows.length} overdue · Total{' '}
              <span className="tabular-money font-medium text-foreground">
                {formatMoney(overdueTotal)}
              </span>
            </p>
            <CsvExportButton
              rows={overdueRows as unknown as Record<string, unknown>[]}
              filename={`overdue-${todayISO()}.csv`}
              columns={[
                { key: 'due_date', header: 'Due', format: (v) => formatDate(String(v)) },
                { key: 'customer_name', header: 'Customer' },
                { key: 'customer_phone', header: 'Phone' },
                { key: 'balance', header: 'Balance' },
              ]}
            />
          </div>
          <ReportTable
            rows={overdueRows.map((r) => ({
              left: formatDate(r.due_date),
              mid: `${r.customer_name} · ${r.customer_phone}`,
              right: formatMoney(r.balance),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportTable({ rows }: { rows: { left: string; mid: string; right: string }[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
        No data for this range.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="w-32 shrink-0 text-muted-foreground">{r.left}</span>
          <span className="flex-1 truncate">{r.mid}</span>
          <span className="font-display font-semibold tabular-money">{r.right}</span>
        </li>
      ))}
    </ul>
  );
}
