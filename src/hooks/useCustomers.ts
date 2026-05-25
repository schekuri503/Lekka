// ============================================================================
// useCustomers — read/write customer data via Supabase + TanStack Query
// ============================================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Customer } from '@/types/database';

const KEY = ['customers'] as const;

export function useCustomers(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, search ?? ''],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from('customers')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('full_name', { ascending: true });

      if (search && search.trim()) {
        // Match name or phone, case-insensitive.
        const term = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${term},phone_number.ilike.${term},full_name_te.ilike.${term}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Pick<Customer, 'full_name' | 'phone_number'> &
        Partial<Pick<Customer, 'full_name_te' | 'address' | 'notes'>>,
    ) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...input, owner_user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Customer> & { id: string }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('customers')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['customer', c.id] });
    },
  });
}
