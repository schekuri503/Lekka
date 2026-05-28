// ============================================================================
// CustomerDetail — full profile + active/closed accounts + installment history
// ============================================================================
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Phone, MapPin, Plus, Calendar, TrendingUp, Trash2, Pencil, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { AccountEditDialog } from '@/components/accounts/AccountEditDialog';
import { WhatsAppReminderButton } from '@/components/reminders/WhatsAppReminderButton';
import { InstallmentList } from '@/components/dashboard/InstallmentList';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { useCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts';
import { useInstallments } from '@/hooks/useDashboard';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/dates';
import { getErrorMessage } from '@/lib/utils';
import type { Account, InstallmentWithStatus } from '@/types/database';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: accounts } = useAccounts(id);
  const { data: installments } = useInstallments({ customerId: id });
  const deleteCustomer = useDeleteCustomer();
  const deleteAccount = useDeleteAccount();

  const [selected, setSelected] = useState<InstallmentWithStatus | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmCustomerDelete, setConfirmCustomerDelete] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  function startPay(row: InstallmentWithStatus) {
    setSelected(row);
    setPayOpen(true);
  }

  async function onDeleteCustomer() {
    if (!customer) return;
    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast(t('customers.deleted'), 'success');
      navigate('/customers');
    } catch (err: unknown) {
      toast(getErrorMessage(err, 'Delete failed'), 'error');
    }
  }

  async function onDeleteAccount() {
    if (!accountToDelete) return;
    try {
      await deleteAccount.mutateAsync(accountToDelete.id);
      toast(t('accounts.deleted'), 'success');
      setAccountToDelete(null);
    } catch (err: unknown) {
      toast(getErrorMessage(err, 'Delete failed'), 'error');
    }
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

  const references = [
    {
      name: customer.reference1_name,
      phone: customer.reference1_phone,
      relation: customer.reference1_relation,
    },
    {
      name: customer.reference2_name,
      phone: customer.reference2_phone,
      relation: customer.reference2_relation,
    },
  ].filter((r) => r.name || r.phone);

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
                {customer.phone_number_2 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone_number_2}
                  </span>
                )}
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

              {references.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {t('customers.references')}
                  </p>
                  {references.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium">{r.name || '—'}</span>
                      {r.relation && (
                        <span className="text-xs text-muted-foreground">· {r.relation}</span>
                      )}
                      {r.phone && <span className="text-muted-foreground">· {r.phone}</span>}
                      {r.phone && (
                        <WhatsAppReminderButton
                          phone={r.phone}
                          referenceName={r.name || ''}
                          customerName={customer.full_name}
                          amount={totalOutstanding}
                          dueDate={open[0]?.due_date ?? ''}
                          kind="late"
                          label={t('reminders.message_reference')}
                        />
                      )}
                    </div>
                  ))}
                </div>
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
              <Button size="sm" variant="outline" onClick={() => setEditCustomerOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                {t('common.edit')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmCustomerDelete(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t('common.delete')}
              </Button>
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
                <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-6 sm:text-right">
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-2 justify-self-end text-destructive hover:bg-destructive/10 sm:col-auto"
                    aria-label={t('common.delete')}
                    onClick={() => setAccountToDelete(a)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      <ConfirmDialog
        open={confirmCustomerDelete}
        onOpenChange={setConfirmCustomerDelete}
        title={t('customers.delete_title')}
        description={t('customers.delete_confirm', {
          name: customer.full_name,
          count: accounts?.length ?? 0,
        })}
        confirmLabel={t('common.delete')}
        destructive
        pending={deleteCustomer.isPending}
        onConfirm={onDeleteCustomer}
      />

      <ConfirmDialog
        open={!!accountToDelete}
        onOpenChange={(o) => !o && setAccountToDelete(null)}
        title={t('accounts.delete_title')}
        description={t('accounts.delete_confirm')}
        confirmLabel={t('common.delete')}
        destructive
        pending={deleteAccount.isPending}
        onConfirm={onDeleteAccount}
      />

      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('customers.edit')}</DialogTitle>
            <DialogDescription>{customer.full_name}</DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onDone={() => setEditCustomerOpen(false)}
            onCancel={() => setEditCustomerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AccountEditDialog
        account={accountToEdit}
        onOpenChange={(o) => !o && setAccountToEdit(null)}
      />
    </div>
  );
}
