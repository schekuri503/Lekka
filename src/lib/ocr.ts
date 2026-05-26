// ============================================================================
// OCR engine abstraction
// ----------------------------------------------------------------------------
// Two engines, both free at the volumes a small lender needs:
//   1. Google Cloud Vision — much better for *handwritten* Telugu.
//      Free tier: 1,000 pages/month. Enable with VITE_GOOGLE_VISION_API_KEY.
//   2. Tesseract.js — runs in the browser, no key needed. Used as the
//      fallback when no Vision key is configured.
//
// Both return raw recognised text. Parsing into structured candidates lives
// in ocr-parse.ts; the user always reviews before anything is saved.
// ============================================================================

export type OcrEngine = 'vision' | 'tesseract';

/** True when a Google Vision key is present in the environment. */
export function hasVisionKey(): boolean {
  return !!import.meta.env.VITE_GOOGLE_VISION_API_KEY;
}

/** The engine we should use by default — Vision when available, else Tesseract. */
export function defaultEngine(): OcrEngine {
  return hasVisionKey() ? 'vision' : 'tesseract';
}

interface RunOpts {
  /** Reports recognition progress 0–100 (Tesseract only). */
  onProgress?: (pct: number) => void;
}

/** Recognise text from an image file using the chosen engine. */
export async function runOcr(file: File, engine: OcrEngine, opts: RunOpts = {}): Promise<string> {
  if (engine === 'vision') return runVision(file);
  return runTesseract(file, opts.onProgress);
}

async function runTesseract(file: File, onProgress?: (pct: number) => void): Promise<string> {
  // Dynamic import keeps the 2-3 MB Tesseract bundle out of the initial payload.
  const Tesseract = await import('tesseract.js');
  const result = await Tesseract.recognize(file, 'tel+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100));
    },
  });
  return result.data.text;
}

async function runVision(file: File): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error('Google Vision key not set (VITE_GOOGLE_VISION_API_KEY).');

  const base64 = await fileToBase64(file);
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints: ['te', 'en'] },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Vision API: ${res.status}`);
  const json = await res.json();
  return json.responses?.[0]?.fullTextAnnotation?.text ?? '';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error('Read failed'));
    r.readAsDataURL(file);
  });
}
