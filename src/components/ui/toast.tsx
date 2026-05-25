// Minimal toast: a thin wrapper around a React context for ephemeral messages.
// Keeps the dependency footprint small; no need for a full toast library.
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  toast: (msg: string, kind?: ToastKind) => void;
}

const Ctx = React.createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-fade-in pointer-events-auto flex items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg',
              t.kind === 'success' && 'border-success/40',
              t.kind === 'error' && 'border-destructive/40',
              t.kind === 'info' && 'border-secondary/40',
            )}
          >
            <span className="mt-0.5">
              {t.kind === 'success' && <CheckCircle2 className="h-5 w-5 text-success" />}
              {t.kind === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
              {t.kind === 'info' && <Info className="h-5 w-5 text-secondary" />}
            </span>
            <p className="text-sm font-medium">{t.message}</p>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
