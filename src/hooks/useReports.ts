// ============================================================================
// useReports — fetches data for the Reports page
// ----------------------------------------------------------------------------
// Each function takes a date range and returns flat row arrays for CSV export.
// ============================================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { InstallmentWithStatus } from '@/types/database';

interface Range {
  from: string; // YYYY-MM-DD
  to: string;
}

/** Daily collection: payments grouped by day (filtered to range). */
export function useDailyCollection({ from, to }: Range) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['report', 'daily', from, to, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount,payment_date,payment_method,customers!inner(full_name,phone_number)')
        .eq('voided', false)
        .gte('payment_date', from)
        .lte('payment_date', to)
        .order('payment_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        amount: number;
        payment_date: string;
        payment_method: string;
        customers: { full_name: string; phone_number: string } | Array<{ full_name: string; phone_number: string }>;
      }>;
    },
  });
}

/** Installments due in a range with their current effective status. */
export function useInstallmentsRange({ from, to }: Range) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['report', 'installments', from, to, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_installments_with_effective_status')
        .select('*')
        .gte('due_date', from)
        .lte('due_date', to)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as InstallmentWithStatus[];
    },
  });
}

/** Outstanding by customer — sum of all unpaid balances. */
export function useOutstandingByCustomer() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['report', 'outstanding', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_installments_with_effective_status')
        .select('*')
        .neq('status', 'PAID')
        .neq('status', 'WAIVED');
      if (error) throw error;
      const rows = (data ?? []) as InstallmentWithStatus[];

      const byCustomer = new Map<string, {
        customer_id: string;
        customer_name: string;
        customer_phone: string;
        outstanding: number;
        items: number;
      }>();

      for (const r of rows) {
        const prev = byCustomer.get(r.customer_id);
        if (prev) {
          prev.outstanding += Number(r.balance ?? 0);
          prev.items += 1;
        } else {
          byCustomer.set(r.customer_id, {
            customer_id: r.customer_id,
            customer_name: r.customer_name,
            customer_phone: r.customer_phone,
            outstanding: Number(r.balance ?? 0),
            items: 1,
          });
        }
      }

      return Array.from(byCustomer.values()).sort((a, b) => b.outstanding - a.outstanding);
    },
  });
}

/** Profit/service fee by BC account that closed (or all if not closed). */
export function useProfitReport({ from, to }: Range) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['report', 'profit', from, to, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id,start_date,amount_given,total_repayment_amount,profit_amount,customers!inner(full_name)')
        .eq('account_type', 'BC_WEEKLY')
        .gte('start_date', from)
        .lte('start_date', to)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        start_date: string;
        amount_given: number;
        total_repayment_amount: number;
        profit_amount: number;
        customers: { full_name: string } | Array<{ full_name: string }>;
      }>;
    },
  });
}
