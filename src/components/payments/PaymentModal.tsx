// ============================================================================
// PaymentModal — record a payment against an installment
// ----------------------------------------------------------------------------
// The DB trigger apply_payment_to_installment updates the installment's
// paid_amount + status when this insert lands.
// ============================================================================
import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useRecordPayment } from '@/hooks/usePayments';
import { parseMoney, formatMoney } from '@/lib/currency';
import { todayISO } from '@/lib/utils';
import type { InstallmentWithStatus, PaymentMethod } from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: InstallmentWithStatus | null;
}

const METHODS: PaymentMethod[] = ['CASH', 'UPI', 'PHONEPE', 'PAYTM', 'GPAY', 'BANK', 'OTHER'];

export function PaymentModal({ open, onOpenChange, installment }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const record = useRecordPayment();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-fill amount with the installment balance whenever the modal opens.
  useEffect(() => {
    if (open && installment) {
      setAmount(String(installment.balance ?? installment.due_amount));
      setDate(todayISO());
      setMethod('CASH');
      setReference('');
      setNotes('');
    }
  }, [open, installment]);

  if (!installment) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!installment) return;
    const amt = parseMoney(amount);
    if (amt <= 0) {
      toast('Enter a payment amount.', 'error');
      return;
    }
    try {
      await record.mutateAsync({
        installment_id: installment.id,
        account_id: installment.account_id,
        customer_id: installment.customer_id,
        amount: amt,
        payment_date: date,
        payment_method: method,
        reference_number: reference.trim() || null,
        notes: notes.trim() || null,
      });
      toast(t('payment.saved'), 'success');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast(msg, 'error');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('payment.title')}</DialogTitle>
          <DialogDescription>
            {installment.customer_name} · Due {formatMoney(installment.due_amount)} ·
            Balance {formatMoney(installment.balance)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t('payment.amount')}</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tabular-money"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">{t('payment.date')}</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('payment.method')}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`method.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">{t('payment.reference')}</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI ID / Txn #"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('payment.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
