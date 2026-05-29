// ============================================================================
// AccountEditDialog — edit safe account fields (status, dates, notes)
// ----------------------------------------------------------------------------
// Amounts/term are intentionally NOT editable: installments + payments are
// generated from them at insert time. To change an amount, delete & re-create.
// ============================================================================
import { useEffect, useState, type FormEvent } from 'react';
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
import { useUpdateAccount } from '@/hooks/useAccounts';
import { getErrorMessage } from '@/lib/utils';
import type { Account, AccountStatus } from '@/types/database';

interface Props {
  account: Account | null;
  onOpenChange: (open: boolean) => void;
}

const STATUSES: AccountStatus[] = ['ACTIVE', 'CLOSED', 'DEFAULTED'];

export function AccountEditDialog({ account, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const update = useUpdateAccount();

  const [status, setStatus] = useState<AccountStatus>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (account) {
      setStatus(account.status);
      setStartDate(account.start_date);
      setDueDay(account.due_day ?? '');
      setNotes(account.notes ?? '');
    }
  }, [account]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    try {
      await update.mutateAsync({
        id: account.id,
        status,
        start_date: startDate,
        due_day: dueDay.trim() || null,
        notes: notes.trim() || null,
      });
      toast(t('accounts.updated'), 'success');
      onOpenChange(false);
    } catch (err: unknown) {
      toast(getErrorMessage(err, 'Save failed'), 'error');
    }
  }

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accounts.edit_title')}</DialogTitle>
          <DialogDescription>{t('accounts.edit_hint')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('accounts.status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_start">{t('accounts.start_date')}</Label>
              <Input
                id="edit_start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_due_day">{t('accounts.due_weekday')}</Label>
            <Input
              id="edit_due_day"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="MONDAY / 5"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_notes">{t('common.notes')}</Label>
            <Textarea
              id="edit_notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
