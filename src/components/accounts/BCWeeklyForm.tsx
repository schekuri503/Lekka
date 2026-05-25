// ============================================================================
// BCWeeklyForm — create a BC (chit) weekly installment account
// ----------------------------------------------------------------------------
// Example: owner gives ₹45,000, customer repays ₹50,000 over 10 weeks.
// Profit (₹5,000) is auto-computed as total − given.
// Installments are created by a DB trigger after insert (see migration 003).
// ============================================================================
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateBCAccount } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { InstallmentPreviewTable } from './InstallmentPreviewTable';
import { formatMoney, parseMoney } from '@/lib/currency';
import { todayISO } from '@/lib/utils';

interface Props {
  /** Preselect a customer (e.g. when opened from CustomerDetail). */
  defaultCustomerId?: string;
  onCreated?: (id: string) => void;
}

export function BCWeeklyForm({ defaultCustomerId, onCreated }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customers } = useCustomers();
  const { data: settings } = useSettings();
  const create = useCreateBCAccount();

  const [customerId, setCustomerId] = useState(defaultCustomerId ?? '');
  const [amountGiven, setAmountGiven] = useState('');
  const [totalRepayment, setTotalRepayment] = useState('');
  const [weeks, setWeeks] = useState<number>(settings?.default_bc_term_weeks ?? 10);
  const [startDate, setStartDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const given = parseMoney(amountGiven);
  const total = parseMoney(totalRepayment);
  const profit = total - given;

  const weeklyAmount = useMemo(() => {
    if (!total || !weeks) return 0;
    return Math.round((total / weeks) * 100) / 100;
  }, [total, weeks]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerId) {
      toast(t('accounts.select_customer'), 'error');
      return;
    }
    if (total <= 0 || given <= 0) {
      toast('Enter both amounts.', 'error');
      return;
    }
    try {
      const acct = await create.mutateAsync({
        customer_id: customerId,
        amount_given: given,
        total_repayment_amount: total,
        term_weeks: weeks,
        start_date: startDate,
        notes: notes.trim() || null,
      });
      toast(t('accounts.created'), 'success');
      if (onCreated) onCreated(acct.id);
      else navigate(`/customers/${acct.customer_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast(msg, 'error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>{t('accounts.customer')}</Label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger>
            <SelectValue placeholder={t('accounts.select_customer')} />
          </SelectTrigger>
          <SelectContent>
            {(customers ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name} · {c.phone_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="amount_given">{t('accounts.amount_given')}</Label>
          <Input
            id="amount_given"
            inputMode="decimal"
            placeholder="45000"
            value={amountGiven}
            onChange={(e) => setAmountGiven(e.target.value)}
            className="tabular-money"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="total_repayment">{t('accounts.total_repayment')}</Label>
          <Input
            id="total_repayment"
            inputMode="decimal"
            placeholder="50000"
            value={totalRepayment}
            onChange={(e) => setTotalRepayment(e.target.value)}
            className="tabular-money"
          />
        </div>
      </div>

      {/* Live computed profit */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border/60 bg-accent/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">{t('accounts.profit_label')}</span>
        <span className="font-display text-lg font-semibold tabular-money text-primary">
          {formatMoney(profit)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="weeks">{t('accounts.term_weeks')}</Label>
          <Input
            id="weeks"
            type="number"
            min={1}
            max={104}
            value={weeks}
            onChange={(e) => setWeeks(Math.max(1, Math.min(104, Number(e.target.value) || 1)))}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="start_date">{t('accounts.first_due_date')}</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground">
        Weekly due: <span className="tabular-money font-medium text-foreground">{formatMoney(weeklyAmount)}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">{t('common.notes')}</Label>
        <Textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <InstallmentPreviewTable startDate={startDate} weeks={weeks} totalAmount={total} />

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={create.isPending}>
          {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('accounts.create')}
        </Button>
      </div>
    </form>
  );
}
