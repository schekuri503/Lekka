// ============================================================================
// CustomerSearch — debounced search input
// ============================================================================
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Debounce delay in ms; default 200. */
  delay?: number;
}

export function CustomerSearch({ value, onChange, placeholder, delay = 200 }: Props) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const id = window.setTimeout(() => onChange(local), delay);
    return () => window.clearTimeout(id);
  }, [local, delay, onChange]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder ?? t('common.search')}
        className="pl-9 pr-9"
      />
      {local && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => setLocal('')}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
