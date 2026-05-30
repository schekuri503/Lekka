// ============================================================================
// Voice transcript → { name, amount, date }
// ----------------------------------------------------------------------------
// Heuristic parser for short Telugu/English add-customer utterances like:
//   "Motte Narasimha thirty thousand today"     -> name, 30000, today
//   "Ramesh 30000 June 1"                       -> name, 30000, 2026-06-01
//   "మోటే నర్సింహ ముప్పయి వేలు"                       -> name, 30000, today
// Always returns SOMETHING — the user reviews & edits before saving.
// ============================================================================

import { todayISO } from '@/lib/utils';

export interface VoiceParsed {
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

const EN_UNITS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const EN_NUM_TOKEN = new RegExp(
  '\\b(' + Object.keys(EN_UNITS).join('|') + '|hundred|thousand|lakh|crore)\\b',
  'gi',
);
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

/** Convert spoken English number-words to an integer. */
function parseEnglishNumber(text: string): number {
  const tokens = text.toLowerCase().match(EN_NUM_TOKEN);
  if (!tokens) return 0;
  let total = 0;
  let chunk = 0;
  for (const tok of tokens) {
    if (tok === 'hundred') chunk = (chunk || 1) * 100;
    else if (tok === 'thousand') { total += (chunk || 1) * 1000; chunk = 0; }
    else if (tok === 'lakh') { total += (chunk || 1) * 100000; chunk = 0; }
    else if (tok === 'crore') { total += (chunk || 1) * 10000000; chunk = 0; }
    else chunk += EN_UNITS[tok] ?? 0;
  }
  return total + chunk;
}

function applyMultiplierWords(amount: number, lower: string): number {
  // If a numeric amount was small and a multiplier word is present, scale it.
  if (amount > 0 && amount < 1000 && /\bthousand\b|వేలు|వెయ్యి/.test(lower)) amount *= 1000;
  if (amount > 0 && amount < 1000 && /\blakh|లక్ష/.test(lower)) amount *= 100000;
  return amount;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function findDate(text: string): string {
  const lower = text.toLowerCase();
  if (/\btoday\b|ఈరోజు/.test(lower)) return todayISO();
  if (/\btomorrow\b|రేపు/.test(lower)) return isoOf(addDays(new Date(), 1));
  if (/\byesterday\b|నిన్న/.test(lower)) return isoOf(addDays(new Date(), -1));

  // Numeric dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const dm = text.match(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?\b/);
  if (dm) {
    const d = Number(dm[1]); const m = Number(dm[2]);
    let y = dm[3] ? Number(dm[3]) : new Date().getFullYear();
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
  }

  // "June 1" or "1 June"
  const mwords = Object.keys(MONTHS).join('|');
  const mre = new RegExp('\\b(' + mwords + ')\\s+(\\d{1,2})\\b|\\b(\\d{1,2})\\s+(' + mwords + ')\\b', 'i');
  const mm = text.match(mre);
  if (mm) {
    const month = MONTHS[(mm[1] ?? mm[4] ?? '').toLowerCase()];
    const day = Number(mm[2] ?? mm[3]);
    const year = new Date().getFullYear();
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }
  return '';
}

function findAmount(text: string): { value: number; matched: string } {
  const lower = text.toLowerCase();

  // 1. Plain digits (with optional commas)
  const dm = text.match(/\b(\d{1,3}(?:,\d{2,3})+|\d{3,})\b/);
  if (dm) {
    const n = Number(dm[1].replace(/,/g, ''));
    return { value: applyMultiplierWords(n, lower), matched: dm[0] };
  }

  // 2. English number-words
  const enText = lower.match(new RegExp('((?:' + EN_NUM_TOKEN.source.slice(2,-2) + ')(?:\\s+|-)?)+', 'i'));
  if (enText) {
    const n = parseEnglishNumber(enText[0]);
    if (n > 0) return { value: n, matched: enText[0] };
  }

  return { value: 0, matched: '' };
}

/** Strip date/amount tokens out of the text to leave the name. */
function extractName(text: string, amountMatched: string, dateStr: string): string {
  let s = ' ' + text + ' ';
  if (amountMatched) s = s.replace(amountMatched, ' ');

  // Remove date words & numeric dates
  s = s.replace(/\b(today|tomorrow|yesterday|rupees?|ఈరోజు|రేపు|నిన్న|రూపాయలు|వేలు|వెయ్యి|లక్ష|hundred|thousand|lakh|crore)\b/gi, ' ');
  s = s.replace(/\b\d{1,2}\s*[\/\-.]\s*\d{1,2}(?:\s*[\/\-.]\s*\d{2,4})?\b/g, ' ');
  const mwords = Object.keys(MONTHS).join('|');
  s = s.replace(new RegExp('\\b(' + mwords + ')\\s+\\d{1,2}\\b', 'gi'), ' ');
  s = s.replace(new RegExp('\\b\\d{1,2}\\s+(' + mwords + ')\\b', 'gi'), ' ');

  // Remove leftover English number words and any digit runs.
  s = s.replace(EN_NUM_TOKEN, ' ');
  s = s.replace(/\d+/g, ' ');

  // Tidy
  return s.replace(/\s+/g, ' ').trim();
  // (date string is unused for stripping; included in signature for future tweaks)
  void dateStr;
}

export function parseVoice(text: string): VoiceParsed {
  const cleaned = (text || '').trim();
  if (!cleaned) return { name: '', amount: 0, date: todayISO() };
  const { value: amount, matched } = findAmount(cleaned);
  const date = findDate(cleaned) || todayISO();
  const name = extractName(cleaned, matched, date);
  return { name, amount, date };
}
