import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { EffectiveStatus } from '@/types/database';

interface Props {
  status: EffectiveStatus;
  className?: string;
}

const STYLES: Record<EffectiveStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground border-muted-foreground/20',
  DUE_TODAY: 'bg-warning/15 text-warning-foreground border-warning/40',
  OVERDUE: 'bg-destructive/10 text-destructive border-destructive/30',
  PAID: 'bg-success/15 text-success border-success/30',
  PARTIAL: 'bg-secondary/15 text-secondary border-secondary/30',
  WAIVED: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

export function StatusBadge({ status, className }: Props) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STYLES[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
