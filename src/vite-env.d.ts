/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Comma-separated emails allowed to sign in. Empty = no allowlist gate. */
  readonly VITE_ADMIN_EMAILS?: string;
  /** Optional — only set if you want to use Google Cloud Vision for handwriting OCR. */
  readonly VITE_GOOGLE_VISION_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
