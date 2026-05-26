// ============================================================================
// NotebookPrint — /print. A print-friendly "notebook style" ledger.
// ----------------------------------------------------------------------------
// Uses the browser's native print → "Save as PDF". No PDF library or font
// bundling: Noto Sans Telugu already loads via index.html, so Telugu renders
// cleanly on the printed page. @media print CSS sets an A4 layout with two
// customers per page mirroring uncle's notebook format.
// ============================================================================
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/dates';
import type { Account, Customer, InstallmentWithStatus } from '@/types/database';

interface PrintEntry {
  account: Account;
  customer: Customer | undefined;
  installments: InstallmentWithStatus[];
}

function usePrintData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['print-notebook', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PrintEntry[]> => {
      const [{ data: accounts, error: aErr }, { data: customers, error: cErr }, { data: insts, error: iErr }] =
        await Promise.all([
          supabase
            .from('accounts')
            .select('*')
            .eq('account_type', 'BC_WEEKLY')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: true }),
          supabase.from('customers').select('*'),
          supabase
            .from('v_installments_with_effective_status')
            .select('*')
            .order('installment_number', { ascending: true }),
        ]);
      if (aErr) throw aErr;
      if (cErr) throw cErr;
      if (iErr) throw iErr;

      const customerById = new Map((customers ?? []).map((c) => [c.id, c as Customer]));
      return (accounts ?? []).map((a) => ({
        account: a as Account,
        customer: customerById.get((a as Account).customer_id),
        installments: ((insts ?? []) as InstallmentWithStatus[]).filter((i) => i.account_id === a.id),
      }));
    },
  });
}

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  .no-print { display: none !important; }
  body { background: #fff; }
  .print-sheet { display: block; }
  .print-entry {
    break-inside: avoid;
    page-break-inside: avoid;
    box-sizing: border-box;
    min-height: 128mm; /* ~half an A4 page → two entries per sheet */
    border: 1px solid #000;
    color: #000;
  }
  .print-entry:nth-child(even) { page-break-after: always; }
}
`;

export function NotebookPrint() {
  const { t } = useTranslation();
  const { data: entries, isLoading } = usePrintData();
  const { data: settings } = useSettings();

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/40" />;
  }

  const list = entries ?? [];

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>

      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t('print.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('print.subtitle')}</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2" disabled={list.length === 0}>
          <Printer className="h-4 w-4" />
          {t('print.print')}
        </Button>
      </header>

      {list.length === 0 ? (
        <div className="no-print rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('print.empty')}
        </div>
      ) : (
        <div className="print-sheet space-y-4">
          {list.map(({ account, customer, installments }) => (
            <div key={account.id} className="print-entry rounded-lg border border-border/60 bg-card p-5">
              <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
                <div>
                  <p className="font-display text-lg font-semibold" lang="te">
                    {customer?.full_name_te || customer?.full_name || '—'}
                  </p>
                  {customer?.full_name_te && customer?.full_name && (
                    <p className="text-xs text-muted-foreground">{customer.full_name}</p>
                  )}
                  {customer?.phone_number && (
                    <p className="text-xs text-muted-foreground">{customer.phone_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-semibold tabular-money">
                    {formatMoney(account.total_repayment_amount)}/-
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`accounts.freq_${account.bc_frequency}`)} · {t('print.start')} {formatDate(account.start_date)}
                  </p>
                </div>
              </div>

              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                {installments.map((inst) => {
                  const paid = inst.status === 'PAID' || inst.status === 'WAIVED';
                  return (
                    <li key={inst.id} className="flex items-center justify-between border-b border-dotted border-border/60 py-0.5">
                      <span className="tabular-nums text-muted-foreground">
                        {inst.installment_number}. {formatDate(inst.due_date)}
                      </span>
                      <span className={paid ? 'font-medium' : 'text-muted-foreground'}>
                        {paid ? '✓' : '○'} {formatMoney(inst.due_amount, { noSymbol: true })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {settings?.business_name && (
        <p className="no-print text-center text-xs text-muted-foreground">{settings.business_name}</p>
      )}
    </div>
  );
}
