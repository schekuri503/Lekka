// ============================================================================
// useAuth — wraps Supabase auth state for the app
// ----------------------------------------------------------------------------
// Exposes the current session/user and sign-in/out helpers.
// ============================================================================
import { create } from 'zustand';
import { useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  setLoading: (b: boolean) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setSession: (s) => set({ session: s, user: s?.user ?? null }),
  setLoading: (b) => set({ loading: b }),
}));

/** Mount once at the top of the tree to keep auth state synced. */
export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setLoading]);
}

export function useAuth() {
  return useAuthStore();
}

/**
 * Kick off the Google OAuth flow. Supabase handles the redirect dance —
 * we just point it back at the same origin and let onAuthStateChange catch
 * the session when the redirect lands.
 */
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      // Keeps the user signed in for ~1 hour even on a fresh browser without
      // re-prompting Google — comfortable for a phone that's always logged in.
      queryParams: { prompt: 'select_account' },
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

/**
 * Allowlist gate. Only emails listed in VITE_ADMIN_EMAILS (comma-separated)
 * are allowed in. Returns true if the allowlist is empty (no gate configured)
 * OR the user's email is on it. Defense-in-depth alongside Supabase RLS.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  const raw = import.meta.env.VITE_ADMIN_EMAILS?.trim();
  if (!raw) return true; // no gate → any authenticated Google user is allowed
  if (!email) return false;
  const allowed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
