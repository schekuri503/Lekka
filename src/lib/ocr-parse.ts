// ============================================================================
// OCR text → structured candidates
// ----------------------------------------------------------------------------
// Uncle's notebook holds two customers per page. OCR returns raw text; this
// module makes a best-effort split into up to two candidates and pulls out a
// Telugu name, phone, amount and (optional) start date from each.
//
// This is a *helper*, never a source of truth — every field is editable in the
// review form and amounts must always be verified against the original page.
// ============================================================================

export interface OcrCandidate {
  /** Best-guess display name (Telugu if found, else first non-empty line). */
  name: string;
  /** Telugu name run, if any Telugu characters were detected. */
  name_te: string;
  /** 10-digit Indian mobile, or '' if none found. */
  phone: string;
  /** Amount in rupees (the largest in-range number), or 0 if none found. */
  amount: number;
  /** First date found, normalised to YYYY-MM-DD, or '' if none. */
  start_date: string;
  /** The raw text block this candidate came from (for reference). */
  raw: string;
}

const TELUGU = /[ఀ-౿]/;
const TELUGU_RUN = /[ఀ-౿][ఀ-౿\s]*[ఀ-౿]|[ఀ-౿]/;
const PHONE = /([6-9]\d{9})/; // Indian mobile after digits-only collapse
const DATE = /(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/;

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 10000000; // ₹1,00,00,000

/** Parse a full OCR page into up to two candidates. */
export function parseNotebookPage(text: string): OcrCandidate[] {
  const blocks = splitIntoBlocks(text);
  return blocks.map(parseBlock).slice(0, 2);
}

/**
 * Split a page into customer blocks. We anchor on phone numbers (one per
 * customer); if two are found we cut the text between them. With zero or one
 * phone we treat the whole page as a single block.
 */
function splitIntoBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const phoneLines: number[] = [];
  lines.forEach((line, i) => {
    const collapsed = line.replace(/[^0-9]/g, '');
    if (PHONE.test(collapsed)) phoneLines.push(i);
  });

  if (phoneLines.length >= 2) {
    const cut = Math.floor((phoneLines[0]! + phoneLines[1]!) / 2) + 1;
    return [lines.slice(0, cut).join('\n'), lines.slice(cut).join('\n')];
  }
  return [text];
}

function parseBlock(block: string): OcrCandidate {
  return {
    name: pickName(block),
    name_te: pickTeluguName(block),
    phone: pickPhone(block),
    amount: pickAmount(block),
    start_date: pickDate(block),
    raw: block.trim(),
  };
}

function pickTeluguName(block: string): string {
  for (const line of block.split(/\r?\n/)) {
    if (TELUGU.test(line)) {
      const run = line.match(TELUGU_RUN);
      if (run) return run[0].trim();
    }
  }
  return '';
}

function pickName(block: string): string {
  const te = pickTeluguName(block);
  if (te) return te;
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    // First line with letters that isn't mostly digits.
    if (/[A-Za-z]/.test(trimmed) && trimmed.replace(/[^0-9]/g, '').length < trimmed.length / 2) {
      return trimmed;
    }
  }
  return '';
}

function pickPhone(block: string): string {
  for (const line of block.split(/\r?\n/)) {
    const collapsed = line.replace(/[^0-9]/g, '');
    const m = collapsed.match(PHONE);
    if (m) return m[1]!;
  }
  return '';
}

function pickAmount(block: string): number {
  // "Strong" candidates are written like money: Indian comma grouping (30,000)
  // or a trailing money marker (/-, ), |, —). "Weak" candidates are bare runs
  // of digits, which on these pages are usually years or day/month numbers.
  const strong: number[] = [];
  const weak: number[] = [];
  // number (optional Indian grouping) followed by an optional money marker
  const re = /(\d{1,3}(?:,\d{2,3})+|\d+)\s*(\/-|\/|\)|\||—|–)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const raw = m[1]!;
    const hasComma = raw.includes(',');
    const hasMarker = !!m[2];
    const n = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < MIN_AMOUNT || n > MAX_AMOUNT) continue;
    if (hasComma || hasMarker) strong.push(n);
    else weak.push(n);
  }
  if (strong.length) return Math.max(...strong);
  // Among bare numbers, skip anything that looks like a year before falling back.
  const notYears = weak.filter((n) => !(n >= 1900 && n <= 2099));
  if (notYears.length) return Math.max(...notYears);
  return weak.length ? Math.max(...weak) : 0;
}

function pickDate(block: string): string {
  const m = block.match(DATE);
  if (!m) return '';
  const [, d, mo, y] = m;
  let year = Number(y);
  if (year < 100) year += 2000;
  const day = String(Number(d)).padStart(2, '0');
  const month = String(Number(mo)).padStart(2, '0');
  if (Number(day) < 1 || Number(day) > 31 || Number(month) < 1 || Number(month) > 12) return '';
  return `${year}-${month}-${day}`;
}
