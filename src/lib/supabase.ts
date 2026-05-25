// ============================================================================
// Supabase client
// ----------------------------------------------------------------------------
// Uses the public anon key. Row Level Security policies (see migration 002)
// enforce per-user data access; without a valid auth session, queries return
// zero rows. NEVER put the service_role key here.
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced loudly so misconfiguration is obvious during local dev.
  // The login screen also shows a friendly message in this case.
  // eslint-disable-next-line no-console
  console.error(
    '[Lekka] Missing Supabase env vars. Copy .env.example → .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
