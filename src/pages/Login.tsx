// ============================================================================
// Login — Google OAuth via Supabase
// ----------------------------------------------------------------------------
// Single-button flow. Supabase handles the OAuth dance; on return,
// useAuthListener picks up the session and the auth gate in App.tsx
// redirects to /dashboard.
//
// Optional email allowlist via VITE_ADMIN_EMAILS keeps strangers out even if
// the Google project is left open to any account during early setup.
// ============================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { isAllowedEmail, signInWithGoogle, signOut, useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { LanguageToggle } from '@/components/shared/LanguageToggle';

/** Google "G" logomark. Rendered as SVG so we don't load a remote asset. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.3 5.2c-.4.4 6.7-4.9 6.7-14.8 0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);

  const envMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  // When the OAuth redirect lands and useAuthListener picks up a session,
  // either send the user in (if allowed) or sign them right back out.
  useEffect(() => {
    if (loading || !user) return;

    if (isAllowedEmail(user.email)) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Allowlist failed — sign them out and show a clear message.
    setDenied(user.email ?? 'this account');
    void signOut();
  }, [user, loading, navigate]);

  async function onGoogle() {
    if (envMissing) return;
    setSubmitting(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast(error.message, 'error');
        setSubmitting(false);
      }
      // On success, the browser navigates away to Google and back.
      // No need to setSubmitting(false) — the page will reload.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      toast(msg, 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-xl font-bold">ల</span>
            </div>
            <div className="leading-tight">
              <p className="font-display text-2xl font-semibold tracking-tight text-primary">
                {t('app.name')}
              </p>
              <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <h1 className="mb-1 font-display text-xl font-semibold">{t('auth.sign_in')}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{t('auth.google_subtitle')}</p>

          {envMissing && (
            <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
              {t('auth.missing_env')}
            </div>
          )}

          {denied && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t('auth.not_allowed', { email: denied })}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full gap-3 border-border bg-card text-foreground hover:bg-accent/50"
            onClick={onGoogle}
            disabled={submitting || envMissing}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('auth.signing_in')}
              </>
            ) : (
              <>
                <GoogleMark className="h-5 w-5" />
                {t('auth.continue_with_google')}
              </>
            )}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('auth.google_hint')}
        </p>
      </div>
    </div>
  );
}
