import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names, deduping conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Today as 'YYYY-MM-DD' in local time. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Encode WhatsApp URL with a pre-filled message. Free. No API needed. */
export function whatsappUrl(phoneE164: string, message: string): string {
  // Strip + and spaces — wa.me expects digits only.
  const digits = phoneE164.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Render a reminder template with placeholders. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

/** Quick percentage of repayment progress. */
export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

/** Convert e.g. "+91 98765 43210" to "+919876543210". */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return '+91' + digits; // assume Indian if 10-digit
  return digits;
}
