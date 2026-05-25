// ============================================================================
// DashboardCards — the row of headline metrics
// ============================================================================
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Totals {
  dueToday: number;
  overdue: number;
  paidToday: number;
  outstanding: number;
  weekExpected: number;
  monthInterest: number;
  activeAccounts: number;
}

interface MetricProps {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone?: 'default' | 'warning' | 'destructive' | 'success' | 'secondary';
}

const TONES: Record<NonNullable<MetricProps['tone']>, string> = {
  default: 'bg-card border-border/60',
  warning: 'bg-warning/10 border-warning/30',
  destructive: 'bg-destructive/10 border-destructive/30',
  success: 'bg-success/10 border-success/30',
  secondary: 'bg-secondary/10 border-secondary/30',
};

const ICON_TONES: Record<NonNullable<MetricProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  warning: 'bg-warning/20 text-warning-foreground',
  destructive: 'bg-destructive/15 text-destructive',
  success: 'bg-success/20 text-success',
  secondary: 'bg-secondary/20 text-secondary',
};

function Metric({ label, value, icon: Icon, tone = 'default' }: MetricProps) {
  return (
    <Card className={cn('flex items-center gap-4 border p-4', TONES[tone])}>
      <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-md', ICON_TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-semibold tabular-money">{value}</p>
      </div>
    </Card>
  );
}

export function DashboardCards({ totals }: { totals: Totals }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Metric
        label={t('dashboard.due_today')}
        value={formatMoney(totals.dueToday)}
        icon={CalendarClock}
        tone="warning"
      />
      <Metric
        label={t('dashboard.overdue')}
        value={formatMoney(totals.overdue)}
        icon={AlertTriangle}
        tone="destructive"
      />
      <Metric
        label={t('dashboard.paid_today')}
        value={formatMoney(totals.paidToday)}
        icon={CheckCircle2}
        tone="success"
      />
      <Metric
        label={t('dashboard.outstanding')}
        value={formatMoney(totals.outstanding)}
        icon={Wallet}
      />
      <Metric
        label={t('dashboard.week_expected')}
        value={formatMoney(totals.weekExpected)}
        icon={CircleDollarSign}
        tone="secondary"
      />
      <Metric
        label={t('dashboard.month_interest')}
        value={formatMoney(totals.monthInterest)}
        icon={TrendingUp}
        tone="secondary"
      />
      <Metric
        label={t('dashboard.active_accounts')}
        value={String(totals.activeAccounts)}
        icon={Users}
      />
    </div>
  );
}
