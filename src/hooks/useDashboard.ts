// ============================================================================
// useDashboard — Today's snapshot for the home screen
// ----------------------------------------------------------------------------
// Computes Due Today, Overdue, Paid Today, Outstanding, Week Expected,
// Month Interest from the v_installments_with_effective_status view.
// ============================================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { todayISO } from '@/lib/utils';
import type { InstallmentWithStatus } from '@/types/database';
import { addDays, format } from 'date-fns';

export function useDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = todayISO();
      const weekFromNow = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      // Pull everything once — it's all RLS-scoped and the row count for a
      // small lender is tiny (hundreds at most). Cheaper than 6 round-trips.
      const { data, error } = await supabase
        .from('v_installments_with_effective_status')
        .select('*');
      if (error) throw error;
      const rows = (data ?? []) as InstallmentWithStatus[];

      const dueToday = rows.filter((r) => r.due_date === today && r.effective_status !== 'PAID');
      const overdue = rows.filter((r) => r.effective_status === 'OVERDUE');
      const thisWeek = rows.filter(
        (r) => r.due_date > today && r.due_date <= weekFromNow && r.effective_status !== 'PAID',
      );
      const outstanding = rows.filter(
        (r) => r.effective_status !== 'PAID' && r.effective_status !== 'WAIVED',
      );

      // Paid today — pull payments table separately for accuracy
      const { data: paidData } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_date', today)
        .eq('voided', false);
      const paidTodayTotal = (paidData ?? []).reduce((s, p) => s + Number(p.amount), 0);

      // Recently paid (last 5)
      const { data: recentPaid } = await supabase
        .from('payments')
        .select('id,amount,payment_date,customer_id,payment_method,customers!inner(full_name,phone_number)')
        .eq('voided', false)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      // Active accounts count
      const { count: activeAccounts } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      const sumBalance = (arr: InstallmentWithStatus[]) => arr.reduce((s, r) => s + Number(r.balance ?? 0), 0);

      // Month interest expected = sum of due_amount for monthly installments due in current month
      const ym = today.slice(0, 7);
      const monthInterest = rows
        .filter((r) => r.account_type === 'MONTHLY_INTEREST' && r.due_date.startsWith(ym))
        .reduce((s, r) => s + Number(r.due_amount), 0);

      return {
        today,
        dueToday,
        overdue,
        thisWeek,
        outstanding,
        recentPaid: recentPaid ?? [],
        totals: {
          dueToday: sumBalance(dueToday),
          overdue: sumBalance(overdue),
          weekExpected: sumBalance(thisWeek),
          outstanding: sumBalance(outstanding),
          monthInterest,
          paidToday: paidTodayTotal,
          activeAccounts: activeAccounts ?? 0,
        },
      };
    },
    refetchInterval: 60_000, // keep dashboard fresh every minute
  });
}

/** All installments for a customer or account (used on customer detail page). */
export function useInstallments(filter: { accountId?: string; customerId?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['installments', filter],
    enabled: !!user && !!(filter.accountId || filter.customerId),
    queryFn: async () => {
      let q = supabase
        .from('v_installments_with_effective_status')
        .select('*')
        .order('due_date', { ascending: true });
      if (filter.accountId) q = q.eq('account_id', filter.accountId);
      if (filter.customerId) q = q.eq('customer_id', filter.customerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as InstallmentWithStatus[];
    },
  });
}

/** Used by the Dues page with filter modes. */
export function useDuesView(mode: 'due_today' | 'overdue' | 'this_week' | 'paid' | 'all') {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dues', mode],
    enabled: !!user,
    queryFn: async () => {
      const today = todayISO();
      const weekFromNow = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      let q = supabase
        .from('v_installments_with_effective_status')
        .select('*')
        .order('due_date', { ascending: true });

      if (mode === 'due_today') q = q.eq('due_date', today).neq('status', 'PAID');
      else if (mode === 'overdue') q = q.lt('due_date', today).in('status', ['PENDING', 'PARTIAL']);
      else if (mode === 'this_week') q = q.gte('due_date', today).lte('due_date', weekFromNow);
      else if (mode === 'paid') q = q.eq('status', 'PAID');

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as InstallmentWithStatus[];
    },
  });
}
