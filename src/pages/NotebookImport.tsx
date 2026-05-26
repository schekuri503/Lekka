// ============================================================================
// NotebookImport — /import. Batch-friendly OCR import from notebook photos.
// ----------------------------------------------------------------------------
// Pick/snap a page → OCR (Google Vision when keyed, else Tesseract) → parse
// into up to two candidates → review & save each one. Nothing is written to
// the DB until the user saves a reviewed entry.
// ============================================================================
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Loader2, ScanLine, Sparkles, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { OcrReviewForm } from '@/components/import/OcrReviewForm';
import { defaultEngine, hasVisionKey, runOcr, type OcrEngine } from '@/lib/ocr';
import { parseNotebookPage, type OcrCandidate } from '@/lib/ocr-parse';

export function NotebookImport() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<OcrEngine>(defaultEngine());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<OcrCandidate[]>([]);

  const visionKey = hasVisionKey();

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setCandidates([]);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function onScan() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      const text = await runOcr(file, engine, { onProgress: setProgress });
      const parsed = parseNotebookPage(text);
      setCandidates(parsed);
      if (parsed.length === 0) toast(t('import.no_candidates'), 'info');
      else toast(t('import.read_ok'), 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'OCR failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
          <ScanLine className="h-6 w-6 text-primary" />
          {t('import.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('import.subtitle')}</p>
      </header>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              {t('import.choose_photo')}
              <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
            </label>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <label className="cursor-pointer">
              <Camera className="h-4 w-4" />
              {t('import.take_photo')}
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
            <span>{t('import.engine')}:</span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as OcrEngine)}
              className="rounded-md border border-border bg-card px-2 py-1"
              disabled={busy}
            >
              <option value="vision" disabled={!visionKey}>
                Google Vision{visionKey ? ' (handwriting)' : ' (no key)'}
              </option>
              <option value="tesseract">Tesseract (printed)</option>
            </select>
          </div>
        </div>

        {preview ? (
          <div className="flex items-center gap-3">
            <img
              src={preview}
              alt={t('import.photo_alt')}
              className="h-16 w-16 rounded-md border border-border/60 object-cover"
            />
            <Button onClick={onScan} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy
                ? engine === 'tesseract'
                  ? `${t('import.reading')} ${progress}%`
                  : t('import.reading')
                : t('import.scan')}
            </Button>
          </div>
        ) : (
          <div className="grid place-items-center gap-2 rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            <Upload className="h-6 w-6" />
            <p>{t('import.empty')}</p>
          </div>
        )}
      </Card>

      {candidates.map((c, i) => (
        <OcrReviewForm key={i} candidate={c} imageSrc={preview ?? ''} index={i} />
      ))}

      {preview && candidates.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">{t('import.verify_hint')}</p>
      )}
    </div>
  );
}
