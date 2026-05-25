// ============================================================================
// Settings — business preferences + reminder templates + notebook OCR
// ============================================================================
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ScanLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { NotebookImport } from '@/components/import/NotebookImport';
import type { Language } from '@/types/database';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [bcWeeks, setBcWeeks] = useState(10);
  const [apr, setApr] = useState(24);
  const [language, setLanguage] = useState<Language>('en');
  const [templateDue, setTemplateDue] = useState('');
  const [templateLate, setTemplateLate] = useState('');
  const [reminderTime, setReminderTime] = useState('10:00');

  // Hydrate form from settings once they arrive.
  useEffect(() => {
    if (!settings) return;
    setBusinessName(settings.business_name ?? '');
    setCurrency(settings.default_currency ?? 'INR');
    setBcWeeks(settings.default_bc_term_weeks ?? 10);
    setApr(settings.default_apr ?? 24);
    setLanguage((settings.default_language as Language) ?? 'en');
    setTemplateDue(settings.reminder_template_due ?? '');
    setTemplateLate(settings.reminder_template_late ?? '');
    setReminderTime(settings.reminder_time_hhmm ?? '10:00');
  }, [settings]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        business_name: businessName.trim(),
        default_currency: currency,
        default_bc_term_weeks: bcWeeks,
        default_apr: apr,
        default_language: language,
        reminder_template_due: templateDue,
        reminder_template_late: templateLate,
        reminder_time_hhmm: reminderTime,
      });
      // Switch the live UI language to match the new default.
      if (i18n.language !== language) await i18n.changeLanguage(language);
      toast(t('settings.save_success'), 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast(msg, 'error');
    }
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/40" />;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t('settings.title')}
        </h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">Business</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="business_name">{t('settings.business_name')}</Label>
              <Input
                id="business_name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">{t('settings.default_currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR — ₹</SelectItem>
                  <SelectItem value="USD">USD — $</SelectItem>
                  <SelectItem value="EUR">EUR — €</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bc_weeks">{t('settings.default_bc_weeks')}</Label>
              <Input
                id="bc_weeks"
                type="number"
                min={1}
                max={104}
                value={bcWeeks}
                onChange={(e) => setBcWeeks(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apr">{t('settings.default_apr')}</Label>
              <Input
                id="apr"
                type="number"
                min={0}
                max={120}
                step="0.1"
                value={apr}
                onChange={(e) => setApr(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language">{t('settings.default_language')}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="te">తెలుగు</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminder_time">{t('settings.reminder_time')}</Label>
              <Input
                id="reminder_time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t('reminders.title')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('reminders.placeholder_hint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl_due">{t('reminders.template_due')}</Label>
            <Textarea
              id="tpl_due"
              rows={3}
              value={templateDue}
              onChange={(e) => setTemplateDue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl_late">{t('reminders.template_late')}</Label>
            <Textarea
              id="tpl_late"
              rows={3}
              value={templateLate}
              onChange={(e) => setTemplateLate(e.target.value)}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </form>

      {/* OCR section is below the save button — it doesn't write anything to the DB. */}
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <ScanLine className="h-5 w-5 text-primary" />
            {t('settings.import')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('settings.import_desc')}</p>
        </div>
        <NotebookImport />
      </Card>
    </div>
  );
}
