// ============================================================================
// VoiceAddDialog — speak to add a customer + BC weekly account in seconds
// ----------------------------------------------------------------------------
// Uses Web Speech API (Telugu / Indian English). Transcript is parsed into
// name + amount + date which the user reviews and edits before saving.
// Defaults: BC weekly, 10 installments, profit % from Settings, start = today.
// ============================================================================
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mic, Square } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { isVoiceSupported, startVoice, type VoiceController } from '@/lib/voice';
import { parseVoice } from '@/lib/voice-parse';
import { formatMoney, parseMoney } from '@/lib/currency';
import { getErrorMessage, normalizePhone, todayISO } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (customerId: string) => void;
}

export function VoiceAddDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const createCustomer = useCreateCustomer();
  const createAccount = useCreateBCAccount();

  const [lang, setLang] = useState<'te-IN' | 'en-IN'>('te-IN');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const controllerRef = useRef<VoiceController | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(todayISO());

  const supported = isVoiceSupported();
  const profitPct = settings?.default_bc_profit_pct ?? 11;
  const weeks = settings?.default_bc_term_weeks ?? 10;

  // Reset whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setTranscript('');
      setName('');
      setPhone('');
      setAmount('');
      setStartDate(todayISO());
    } else {
      controllerRef.current?.stop();
      controllerRef.current = null;
      setListening(false);
    }
  }, [open]);

  function applyTranscript(text: string) {
    setTranscript(text);
    const parsed = parseVoice(text);
    if (parsed.name) setName(parsed.name);
    if (parsed.amount > 0) setAmount(String(parsed.amount));
    if (parsed.date) setStartDate(parsed.date);
  }

  function toggleMic() {
    if (listening) {
      controllerRef.current?.stop();
      return;
    }
    if (!supported) {
      toast(t('voice.not_supported'), 'error');
      return;
    }
    const ctrl = startVoice({
      lang,
      onUpdate: setTranscript,
      onFinal: applyTranscript,
      onEnd: () => setListening(false),
      onError: (msg) => {
        toast(`${t('voice.error')}: ${msg}`, 'error');
        setListening(false);
      },
    });
    if (ctrl) {
      controllerRef.current = ctrl;
      setListening(true);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const given = parseMoney(amount);
    if (!name.trim()) return toast(t('voice.err_name'), 'error');
    if (given <= 0) return toast(t('voice.err_amount'), 'error');
    const total = Math.round(given * (1 + profitPct / 100));
    try {
      const customer = await createCustomer.mutateAsync({
        full_name: name.trim(),
        phone_number: phone.trim() ? normalizePhone(phone) : '',
      });
      await createAccount.mutateAsync({
        customer_id: customer.id,
        amount_given: given,
        total_repayment_amount: total,
        term_weeks: weeks,
        bc_frequency: 'WEEKLY',
        start_date: startDate,
        source: 'manual',
      });
      toast(t('customers.added'), 'success');
      onCreated?.(customer.id);
      onOpenChange(false);
    } catch (err: unknown) {
      toast(getErrorMessage(err, 'Save failed'), 'error');
    }
  }

  const total = (() => {
    const g = parseMoney(amount);
    return g > 0 ? Math.round(g * (1 + profitPct / 100)) : 0;
  })();
  const busy = createCustomer.isPending || createAccount.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('voice.title')}</DialogTitle>
          <DialogDescription>{t('voice.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="lg"
              variant={listening ? 'destructive' : 'default'}
              className="gap-2"
              onClick={toggleMic}
              disabled={!supported}
            >
              {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {listening ? t('voice.stop') : t('voice.start')}
            </Button>
            <Select value={lang} onValueChange={(v) => setLang(v as 'te-IN' | 'en-IN')} disabled={listening}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="te-IN">తెలుగు</SelectItem>
                <SelectItem value="en-IN">English (IN)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!supported && (
            <p className="rounded-md border border-secondary/40 bg-secondary/5 px-3 py-2 text-sm text-muted-foreground">
              {t('voice.not_supported')}
            </p>
          )}

          {transcript && (
            <div className="rounded-md bg-muted/40 p-3 text-sm" lang={lang.split('-')[0]}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('voice.heard')}
              </p>
              <p>{transcript}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="v_name">{t('customers.name')}</Label>
            <Input id="v_name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="v_phone">{t('customers.phone')} ({t('voice.optional')})</Label>
              <Input id="v_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v_start">{t('accounts.first_due_date')}</Label>
              <Input id="v_start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v_amount">{t('accounts.amount_given')}</Label>
            <Input
              id="v_amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular-money"
              placeholder="30000"
            />
          </div>

          <div className="rounded-md border border-border/60 bg-accent/40 px-3 py-2 text-sm text-muted-foreground">
            {t('voice.summary')}: <span className="font-medium text-foreground">{t('accounts.type_bc')}</span>
            {' · '}
            {weeks} {t('accounts.freq_WEEKLY').toLowerCase()}
            {' · '}
            {t('accounts.total_repayment')}: <span className="tabular-money font-medium text-foreground">{formatMoney(total)}</span>
            {' '}({profitPct}% {t('voice.profit')})
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
