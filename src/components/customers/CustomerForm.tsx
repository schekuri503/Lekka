// ============================================================================
// CustomerForm — add/edit customer details
// ============================================================================
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useToast } from '@/components/ui/toast';
import { normalizePhone } from '@/lib/utils';
import type { Customer } from '@/types/database';

interface Props {
  /** Editing an existing customer — omit to create a new one. */
  customer?: Customer;
  onDone?: (c: Customer) => void;
  onCancel?: () => void;
}

export function CustomerForm({ customer, onDone, onCancel }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  const [fullName, setFullName] = useState(customer?.full_name ?? '');
  const [fullNameTe, setFullNameTe] = useState(customer?.full_name_te ?? '');
  const [phone, setPhone] = useState(customer?.phone_number ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');

  const submitting = create.isPending || update.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      full_name: fullName.trim(),
      full_name_te: fullNameTe.trim() || null,
      phone_number: normalizePhone(phone),
      address: address.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (customer) {
        const updated = await update.mutateAsync({ id: customer.id, ...payload });
        toast(t('customers.updated'), 'success');
        onDone?.(updated);
      } else {
        const created = await create.mutateAsync(payload);
        toast(t('customers.added'), 'success');
        onDone?.(created);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast(msg, 'error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          <Label htmlFor="address">{t('customers.address')}</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Village / area"
          />
        </div>
      </div>

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
