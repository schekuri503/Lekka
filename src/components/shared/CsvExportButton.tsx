import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface Props<T extends Record<string, unknown>> {
  rows: T[];
  filename: string;
  columns: { key: keyof T; header: string; format?: (v: T[keyof T], row: T) => string }[];
}

/** Simple, dependency-free CSV export. Handles quotes and commas safely. */
export function CsvExportButton<T extends Record<string, unknown>>({ rows, filename, columns }: Props<T>) {
  const { t } = useTranslation();

  const exportCsv = () => {
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = columns.map((c) => escape(c.header)).join(',');
    const body = rows
      .map((row) =>
        columns
          .map((c) => {
            const raw = row[c.key];
            const formatted = c.format ? c.format(raw, row) : raw;
            return escape(formatted);
          })
          .join(','),
      )
      .join('\n');

    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
      <Download className="h-4 w-4" />
      {t('reports.export_csv')}
    </Button>
  );
}
