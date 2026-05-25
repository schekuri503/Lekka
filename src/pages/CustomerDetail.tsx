// ============================================================================
// CustomerDetail — full profile + active/closed accounts + installment history
// ============================================================================
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Phone, MapPin, Plus, Calendar, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { WhatsAppReminderButton } from '@/components/reminders/WhatsAppReminderButton';
import { InstallmentList } from '@/components/dashboard/InstallmentList';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { useCustomer } from '@/hooks/useCustomers';
import { useAccounts } from '@/hooks/useAccounts';
import { useInstallments } from '@/hooks/useDashboard';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/dates';
import type { InstallmentWithStatus } from '@/types/database';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: accounts } = useAccounts(id);
  const { data: installments } = useInstallments({ customerId: id });

  const [selected, setSelected] = useState<InstallmentWithStatus | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  function startPay(row: InstallmentWithStatus) {
    setSelected(row);
    setPayOpen(true);
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/40" />;
  }
  if (!customer) {
    return (
      <Card className="grid place-items-center p-12 text-muted-foreground">
        Customer not found.
      </Card>
    );
  }

  const active = (accounts ?? []).filter((a) => a.status === 'ACTIVE');
  const closed = (accounts ?? []).filter((a) => a.status !== 'ACTIVE');
  const open = (installments ?? []).filter((i) => i.effective_status !== 'PAID' && i.effective_status !== 'WAIVED');
  const paid = (installments ?? []).filter((i) => i.effective_status === 'PAID');

  // Sum balances for a "total outstanding for this customer" callout
  const totalOutstanding = open.reduce((s, r) => s + Number(r.balance ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Link>

      {/* Profile header */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-2xl font-semibold text-primary">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {customer.full_name}
              </h1>
              {customer.full_name_te && (
                <p className="text-base text-muted-foreground" lang="te">
                  {customer.full_name_te}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone_number}
                </span>
                {customer.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.address}
                  </span>
                )}
              </div>
              {customer.notes && (
                <p className="mt-2 text-sm text-muted-foreground">{customer.notes}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="rounded-md border border-border/60 bg-accent/40 px-4 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('dashboard.outstanding')}
              </p>
              <p className="font-display text-xl font-semibold tabular-money text-primary">
                {formatMoney(totalOutstanding)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={`tel:${customer.phone_number}`}>
                  <Phone className="mr-1.5 h-4 w-4" />
                  Call
                </a>
              </Button>
              {open.length > 0 && (
                <WhatsAppReminderButton
                  phone={customer.phone_number}
                  customerName={customer.full_name}
                  amount={totalOutstanding}
                  dueDate={open[0]!.due_date}
                  kind="due"
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={`/accounts/new?customer=${customer.id}&type=bc`}>
            <Plus className="mr-1.5 h-4 w-4" />
            <Calendar className="mr-1.5 h-4 w-4" />
            {t('accounts.type_bc')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/accounts/new?customer=${customer.id}&type=monthly`}>
            <Plus className="mr-1.5 h-4 w-4" />
            <TrendingUp className="mr-1.5 h-4 w-4" />
            {t('accounts.type_monthly')}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open dues ({open.length})</TabsTrigger>
          <TabsTrigger value="accounts">Accounts ({accounts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="history">History ({paid.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <InstallmentList
            rows={open}
            onPay={startPay}
            emptyMessage={t('common.empty')}
            reminderKind="due"
          />
        </TabsContent>

        <TabsContent value="accounts" className="mt-4 space-y-3">
          {[...active, ...closed].length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
              {t('common.empty')}
            </div>
          ) : (
            [...active, ...closed].map((a) => (
              <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">
                      {a.account_type === 'BC_WEEKLY' ? t('accounts.type_bc') : t('accounts.type_monthly')}
                    </span>
                    <StatusBadge status={a.status as never} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Started {formatDate(a.start_date)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:flex sm:gap-6 sm:text-right">
                  {a.account_type === 'BC_WEEKLY' ? (
                    <>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Given
                        </p>
                        <p className="tabular-money font-medium">{formatMoney(a.amount_given)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Total
                        </p>
                        <p className="tabular-money font-medium">{formatMoney(a.total_repayment_amount)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Principal
                        </p>
                        <p className="tabular-money font-medium">{formatMoney(a.principal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          APR
                        </p>
                        <p className="tabular-money font-medium">{a.apr}%</p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {paid.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
              {t('common.empty')}
            </div>
          ) : (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
              {paid.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      #{p.installment_number} · {p.account_type === 'BC_WEEKLY' ? 'BC' : 'Monthly'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(p.due_date)}
                      {p.paid_date ? ` · Paid ${formatDate(p.paid_date)}` : ''}
                    </p>
                  </div>
                  <p className="font-display text-base font-semibold tabular-money text-success">
                    {formatMoney(p.paid_amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <PaymentModal open={payOpen} onOpenChange={setPayOpen} installment={selected} />
    </div>
  );
}
