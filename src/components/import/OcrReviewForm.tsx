// ============================================================================
// OcrReviewForm — review one OCR'd customer before saving
// ----------------------------------------------------------------------------
// Photo on the left, an editable form on the right. Saving creates the
// customer and a BC account (source: notebook_import) in one go. OCR is only
// a starting point — every field is editable and validated here.
// ============================================================================
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { useCreateBCAccount } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney, parseMoney } from '@/lib/currency';
import { getErrorMessage, todayISO } from '@/lib/utils';
import type { BcFrequency } from '@/types/database';
import type { OcrCandidate } from '@/lib/ocr-parse';

const FREQUENCIES: BcFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 10000000;

interface Props {
  candidate: OcrCandidate;
  imageSrc: string;
  index: number;
  onDismiss?: () => void;
}

export function OcrReviewForm({ candidate, imageSrc, index, onDismiss }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const createCustomer = useCreateCustomer();
  const createAccount = useCreateBCAccount();

  const profitPct = settings?.default_bc_profit_pct ?? 11;
  const seededTotal = candidate.amount > 0 ? Math.round(candidate.amount * (1 + profitPct / 100)) : 0;

  const [fullName, setFullName] = useState(latinOrEmpty(candidate));
  const [nameTe, setNameTe] = useState(candidate.name_te);
  const [phone, setPhone] = useState(candidate.phone);
  const [amountGiven, setAmountGiven] = useState(candidate.amount ? String(candidate.amount) : '');
  const [totalRepayment, setTotalRepayment] = useState(seededTotal ? String(seededTotal) : '');
  const [weeks, setWeeks] = useState<number>(settings?.default_bc_term_weeks ?? 10);
  const [frequency, setFrequency] = useState<BcFrequency>('WEEKLY');
  const [startDate, setStartDate] = useState(candidate.start_date || todayISO());
  const [saved, setSaved] = useState(false);

  const given = parseMoney(amountGiven);
  const total = parseMoney(totalRepayment);
  const profit = total - given;

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

  const phoneDigits = useMemo(() => phone.replace(/[^0-9]/g, ''), [phone]);
  const phoneValid = /^[6-9]\d{9}$/.test(phoneDigits);
  const amountValid = given >= MIN_AMOUNT && given <= MAX_AMOUNT && total >= MIN_AMOUNT && total <= MAX_AMOUNT;
  const nameValid = fullName.trim().length > 0 || nameTe.trim().length > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nameValid) return toast(t('import.err_name'), 'error');
    if (!phoneValid) return toast(t('import.err_phone'), 'error');
    if (!amountValid) return toast(t('import.err_amount'), 'error');

    try {
      const customer = await createCustomer.mutateAsync({
        full_name: fullName.trim() || nameTe.trim(),
        full_name_te: nameTe.trim() || null,
        phone_number: phoneDigits,
      });
      await createAccount.mutateAsync({
        customer_id: customer.id,
        amount_given: given,
        total_repayment_amount: total,
        term_weeks: weeks,
        bc_frequency: frequency,
        start_date: startDate,
        source: 'notebook_import',
      });
      setSaved(true);
      toast(t('import.saved'), 'success');
    } catch (err: unknown) {
      toast(getErrorMessage(err, 'Save failed'), 'error');
    }
  }

  const busy = createCustomer.isPending || createAccount.isPending;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>
          {t('import.entry')} {index + 1}
        </span>
        {onDismiss && !saved && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            {t('import.dismiss')}
          </button>
        )}
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div className="space-y-2">
          <img
            src={imageSrc}
            alt={t('import.photo_alt')}
            className="block max-h-80 w-full rounded-md border border-border/60 object-contain"
          />
          {candidate.raw && (
            <pre
              lang="te"
              className="max-h-32 overflow-auto rounded-md bg-muted/40 p-2 text-xs leading-relaxed text-muted-foreground"
            >
              {candidate.raw}
            </pre>
          )}
        </div>

        {saved ? (
          <div className="grid place-items-center gap-2 rounded-md border border-success/40 bg-success/5 p-6 text-center">
            <Check className="h-8 w-8 text-success" />
            <p className="font-medium">{t('import.saved')}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${index}`}>{t('customers.name')}</Label>
                <Input
                  id={`name-${index}`}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`name-te-${index}`}>{t('customers.name_te')}</Label>
                <Input
                  id={`name-te-${index}`}
                  lang="te"
                  value={nameTe}
                  onChange={(e) => setNameTe(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`phone-${index}`}>{t('customers.phone')}</Label>
              <Input
                id={`phone-${index}`}
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={!phone || phoneValid ? '' : 'border-destructive'}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`given-${index}`}>{t('accounts.amount_given')}</Label>
                <Input
                  id={`given-${index}`}
                  inputMode="decimal"
                  value={amountGiven}
                  onChange={(e) => onGivenChange(e.target.value)}
                  className="tabular-money"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`total-${index}`}>{t('accounts.total_repayment')}</Label>
                <Input
                  id={`total-${index}`}
                  inputMode="decimal"
                  value={totalRepayment}
                  onChange={(e) => onTotalChange(e.target.value)}
                  className="tabular-money"
                />
              </div>
            </div>

            <div className="flex items-baseline justify-between rounded-md border border-border/60 bg-accent/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t('accounts.profit_label')}</span>
              <span className="tabular-money font-medium text-primary">{formatMoney(profit)}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`weeks-${index}`}>{t('accounts.term_count')}</Label>
                <Input
                  id={`weeks-${index}`}
                  type="number"
                  min={1}
                  max={104}
                  value={weeks}
                  onChange={(e) => setWeeks(Math.max(1, Math.min(104, Number(e.target.value) || 1)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`freq-${index}`}>{t('accounts.frequency')}</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as BcFrequency)}>
                  <SelectTrigger id={`freq-${index}`}>
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
                <Label htmlFor={`start-${index}`}>{t('accounts.first_due_date')}</Label>
                <Input
                  id={`start-${index}`}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('import.save_entry')}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}

/** Use the latin/parsed name only when it isn't itself the Telugu run. */
function latinOrEmpty(c: OcrCandidate): string {
  if (!c.name) return '';
  return c.name === c.name_te ? '' : c.name;
}
