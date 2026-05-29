// ============================================================================
// CustomerForm — add/edit customer details
// ----------------------------------------------------------------------------
// In create mode an optional "Also create a loan now" section lets the owner
// add a BC account in the same submit (customer → account, the same two-step
// pattern used by OcrReviewForm).
// ============================================================================
import { useState, type FormEvent } from 'react';
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
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useCreateBCAccount } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/toast';
import { formatMoney, parseMoney } from '@/lib/currency';
import { getErrorMessage, normalizePhone, todayISO } from '@/lib/utils';
import type { BcFrequency, Customer } from '@/types/database';

interface Props {
  /** Editing an existing customer — omit to create a new one. */
  customer?: Customer;
  onDone?: (c: Customer) => void;
  onCancel?: () => void;
}

const FREQUENCIES: BcFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
const phoneOrNull = (v: string) => (v.trim() ? normalizePhone(v) : null);
const textOrNull = (v: string) => v.trim() || null;

export function CustomerForm({ customer, onDone, onCancel }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const createAccount = useCreateBCAccount();

  const isEdit = !!customer;

  const [fullName, setFullName] = useState(customer?.full_name ?? '');
  const [fullNameTe, setFullNameTe] = useState(customer?.full_name_te ?? '');
  const [phone, setPhone] = useState(customer?.phone_number ?? '');
  const [phone2, setPhone2] = useState(customer?.phone_number_2 ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [notebookRef, setNotebookRef] = useState(customer?.notebook_ref ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');

  const [ref1Name, setRef1Name] = useState(customer?.reference1_name ?? '');
  const [ref1Phone, setRef1Phone] = useState(customer?.reference1_phone ?? '');
  const [ref1Rel, setRef1Rel] = useState(customer?.reference1_relation ?? '');
  const [ref2Name, setRef2Name] = useState(customer?.reference2_name ?? '');
  const [ref2Phone, setRef2Phone] = useState(customer?.reference2_phone ?? '');
  const [ref2Rel, setRef2Rel] = useState(customer?.reference2_relation ?? '');

  // Optional loan section (create mode only).
  const profitPct = settings?.default_bc_profit_pct ?? 11;
  const [addLoan, setAddLoan] = useState(false);
  const [amountGiven, setAmountGiven] = useState('');
  const [totalRepayment, setTotalRepayment] = useState('');
  const [weeks, setWeeks] = useState<number>(settings?.default_bc_term_weeks ?? 10);
  const [frequency, setFrequency] = useState<BcFrequency>('WEEKLY');
  const [startDate, setStartDate] = useState(todayISO());

  const given = parseMoney(amountGiven);
  const total = parseMoney(totalRepayment);

  function onGivenChange(value: string) {
    setAmountGiven(value);
    const g = parseMoney(value);
    if (g > 0) setTotalRepayment(String(Math.round(g * (1 + profitPct / 100))));
  }
  function onTotalChange(value: string) {
    setTotalRepayment(value);
    const tot = parseMoney(value);
    if (tot > 0) setAmountGiven(String(Math.round(tot / (1 + profitPct / 100))));
  }

  const submitting = create.isPending || update.isPending || createAccount.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      full_name: fullName.trim(),
      full_name_te: textOrNull(fullNameTe),
      phone_number: normalizePhone(phone),
      phone_number_2: phoneOrNull(phone2),
      address: textOrNull(address),
      notebook_ref: textOrNull(notebookRef),
      notes: textOrNull(notes),
      reference1_name: textOrNull(ref1Name),
      reference1_phone: phoneOrNull(ref1Phone),
      reference1_relation: textOrNull(ref1Rel),
      reference2_name: textOrNull(ref2Name),
      reference2_phone: phoneOrNull(ref2Phone),
      reference2_relation: textOrNull(ref2Rel),
    };

    if (!isEdit && addLoan && (given <= 0 || total <= 0)) {
      toast(t('accounts.enter_amounts'), 'error');
      return;
    }

    try {
      if (customer) {
        const updated = await update.mutateAsync({ id: customer.id, ...payload });
        toast(t('customers.updated'), 'success');
        onDone?.(updated);
        return;
      }

      const created = await create.mutateAsync(payload);
      if (addLoan) {
        await createAccount.mutateAsync({
          customer_id: created.id,
          amount_given: given,
          total_repayment_amount: total,
          term_weeks: weeks,
          bc_frequency: frequency,
          start_date: startDate,
          source: 'manual',
        });
      }
      toast(t('customers.added'), 'success');
      onDone?.(created);
    } catch (err: unknown) {
      toast(getErrorMessage(err, 'Save failed'), 'error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">{t('customers.name')}</Label>
          <Input
            id="full_name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ramesh Kumar"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="full_name_te">{t('customers.name_te')}</Label>
          <Input
            id="full_name_te"
            value={fullNameTe}
            onChange={(e) => setFullNameTe(e.target.value)}
            placeholder="రమేష్ కుమార్"
            lang="te"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t('customers.phone')}</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone2">{t('customers.phone_2')}</Label>
          <Input
            id="phone2"
            type="tel"
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
            placeholder="+91 …"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="address">{t('customers.address')}</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Village / area"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notebook_ref">{t('customers.notebook_ref')}</Label>
          <Input
            id="notebook_ref"
            value={notebookRef}
            onChange={(e) => setNotebookRef(e.target.value)}
            placeholder="174"
          />
        </div>
      </div>

      {/* References / guarantors */}
      <fieldset className="space-y-3 rounded-md border border-border/60 p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">
          {t('customers.references')}
        </legend>
        {[
          {
            n: 1,
            name: ref1Name,
            setName: setRef1Name,
            ph: ref1Phone,
            setPh: setRef1Phone,
            rel: ref1Rel,
            setRel: setRef1Rel,
          },
          {
            n: 2,
            name: ref2Name,
            setName: setRef2Name,
            ph: ref2Phone,
            setPh: setRef2Phone,
            rel: ref2Rel,
            setRel: setRef2Rel,
          },
        ].map((r) => (
          <div key={r.n} className="grid gap-3 sm:grid-cols-3">
            <Input
              value={r.name}
              onChange={(e) => r.setName(e.target.value)}
              placeholder={`${t('customers.reference')} ${r.n} · ${t('customers.name')}`}
            />
            <Input
              type="tel"
              value={r.ph}
              onChange={(e) => r.setPh(e.target.value)}
              placeholder={t('customers.phone')}
            />
            <Input
              value={r.rel}
              onChange={(e) => r.setRel(e.target.value)}
              placeholder={t('customers.relation')}
            />
          </div>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="notes">{t('common.notes')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything to remember about this customer…"
        />
      </div>

      {/* Optional loan section — create mode only */}
      {!isEdit && (
        <div className="rounded-md border border-border/60 p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={addLoan}
              onChange={(e) => setAddLoan(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t('customers.add_loan_now')}
          </label>

          {addLoan && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="given">{t('accounts.amount_given')}</Label>
                  <Input
                    id="given"
                    inputMode="decimal"
                    placeholder="27000"
                    value={amountGiven}
                    onChange={(e) => onGivenChange(e.target.value)}
                    className="tabular-money"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="total">{t('accounts.total_repayment')}</Label>
                  <Input
                    id="total"
                    inputMode="decimal"
                    placeholder="30000"
                    value={totalRepayment}
                    onChange={(e) => onTotalChange(e.target.value)}
                    className="tabular-money"
                  />
                </div>
              </div>
              <div className="flex items-baseline justify-between rounded-md border border-border/60 bg-accent/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t('accounts.profit_label')}</span>
                <span className="tabular-money font-medium text-primary">
                  {formatMoney(total - given)}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="weeks">{t('accounts.term_count')}</Label>
                  <Input
                    id="weeks"
                    type="number"
                    min={1}
                    max={104}
                    value={weeks}
                    onChange={(e) =>
                      setWeeks(Math.max(1, Math.min(104, Number(e.target.value) || 1)))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="freq">{t('accounts.frequency')}</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as BcFrequency)}>
                    <SelectTrigger id="freq">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {t(`accounts.freq_${f}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="start">{t('accounts.first_due_date')}</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
