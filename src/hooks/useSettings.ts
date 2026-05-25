// ============================================================================
// useSettings — per-user app preferences
// ============================================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { UserSettings } from '@/types/database';

export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return (data ?? null) as UserSettings | null;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...patch })
        .select()
        .single();
      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
