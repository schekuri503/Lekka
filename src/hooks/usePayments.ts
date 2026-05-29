// ============================================================================
// usePayments — record payments and void them
// ----------------------------------------------------------------------------
// The DB trigger apply_payment_to_installment handles updating
// installment paid_amount/status, so the client just inserts the row.
// ============================================================================
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { PaymentMethod } from '@/types/database';

interface PaymentInput {
  installment_id: string;
  account_id: string;
  customer_id: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  reference_number?: string | null;
  notes?: string | null;
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...input, owner_user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['dues'] });
    },
  });
}

export function useCarryForwardShortfall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (installmentId: string) => {
      const { error } = await supabase.rpc('carry_forward_shortfall', {
        p_installment_id: installmentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['dues'] });
    },
  });
}

export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update({ voided: true, voided_at: new Date().toISOString(), voided_reason: reason })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['dues'] });
    },
  });
}
