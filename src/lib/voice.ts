// ============================================================================
// Voice recognition wrapper — Web Speech API (free, native, no server)
// ----------------------------------------------------------------------------
// Works in Chrome/Edge (desktop + Android) and Safari (iOS ≥ 14.5).
// Supports Telugu (te-IN) and Indian English (en-IN).
// ============================================================================

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: { [index: number]: SpeechRecognitionResult; length: number };
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return !!getCtor();
}

export interface VoiceController {
  stop(): void;
}

interface StartOpts {
  lang: string;
  onUpdate: (interim: string) => void;
  onFinal: (transcript: string) => void;
  onEnd: () => void;
  onError: (msg: string) => void;
}

export function startVoice(opts: StartOpts): VoiceController | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = opts.lang;
  rec.interimResults = true;
  rec.continuous = true;

  let finalText = '';
  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i]!;
      if (r.isFinal) finalText += r[0]!.transcript;
      else interim += r[0]!.transcript;
    }
    if (interim) opts.onUpdate((finalText + ' ' + interim).trim());
    else opts.onFinal(finalText.trim());
  };
  rec.onerror = (ev) => opts.onError(ev.error || 'speech error');
  rec.onend = () => {
    opts.onFinal(finalText.trim());
    opts.onEnd();
  };

  try {
    rec.start();
  } catch (e: unknown) {
    opts.onError(e instanceof Error ? e.message : 'failed to start');
    return null;
  }
  return { stop: () => rec.stop() };
}
