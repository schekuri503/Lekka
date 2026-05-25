// ============================================================================
// NotebookImport — OCR a notebook page (Telugu/English) and let user review
// ----------------------------------------------------------------------------
// Two engines, both completely free at the volumes a small lender needs:
//   1. Tesseract.js (default) — runs in the browser, works well for printed
//      Telugu text. No API key required.
//   2. Google Cloud Vision (optional) — much better for *handwritten* Telugu.
//      Free tier: 1,000 pages/month. Enable by setting VITE_GOOGLE_VISION_API_KEY.
//
// The output is intentionally raw text, displayed for the user to review and
// edit before saving. We never auto-create customers/accounts from OCR — the
// risk of mis-reading amounts is too high for a financial app.
// ============================================================================
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, Camera, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

type Engine = 'tesseract' | 'vision';

export function NotebookImport() {
  const { t: _t } = useTranslation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [engine, setEngine] = useState<Engine>('tesseract');

  const hasVisionKey = !!import.meta.env.VITE_GOOGLE_VISION_API_KEY;

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setText('');
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function runTesseract() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      // Dynamic import keeps the 2-3 MB Tesseract bundle out of the initial JS payload.
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'tel+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      setText(result.data.text);
      toast('Notebook page read. Review and edit before saving.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OCR failed';
      toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function runVision() {
    if (!file) return;
    const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      toast('Google Vision key not set in .env.local', 'error');
      return;
    }
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
        r.onerror = () => reject(new Error('Read failed'));
        r.readAsDataURL(file);
      });

      const res = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
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
        },
      );
      if (!res.ok) throw new Error(`Vision API: ${res.status}`);
      const json = await res.json();
      const extracted = json.responses?.[0]?.fullTextAnnotation?.text ?? '';
      setText(extracted);
      toast('Notebook page read via Google Vision.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OCR failed';
      toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" className="gap-2">
          <label className="cursor-pointer">
            <Upload className="h-4 w-4" />
            Choose photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPick}
              disabled={busy}
            />
          </label>
        </Button>

        <Button asChild variant="outline" className="gap-2">
          <label className="cursor-pointer">
            <Camera className="h-4 w-4" />
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPick}
              disabled={busy}
            />
          </label>
        </Button>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>Engine:</span>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as Engine)}
            className="rounded-md border border-border bg-card px-2 py-1"
          >
            <option value="tesseract">Tesseract (printed)</option>
            <option value="vision" disabled={!hasVisionKey}>
              Google Vision{!hasVisionKey ? ' (no key)' : ' (handwriting)'}
            </option>
          </select>
        </div>
      </div>

      {preview && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <img src={preview} alt="Notebook page" className="block max-h-96 w-full object-contain" />
          </Card>
          <div className="space-y-3">
            <Button
              onClick={engine === 'tesseract' ? runTesseract : runVision}
              disabled={busy || !file}
              className="w-full gap-2"
              size="lg"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy
                ? engine === 'tesseract'
                  ? `Reading… ${progress}%`
                  : 'Reading…'
                : 'Read text from photo'}
            </Button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Recognised text will appear here. Edit before copying into a customer or account."
              rows={14}
              lang="te"
              className="font-mono text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              OCR is a helper, not a source of truth. Always verify amounts against the original
              page before saving anything.
            </p>
          </div>
        </div>
      )}

      {!preview && (
        <Card className="grid place-items-center gap-2 p-12 text-center text-sm text-muted-foreground">
          <Upload className="h-6 w-6" />
          <p>Upload or take a photo of a notebook page to begin.</p>
        </Card>
      )}
    </div>
  );
}
