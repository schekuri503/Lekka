// ============================================================================
// Customers — list & search customers, add new
// ============================================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronRight, Phone, MapPin, Mic } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { VoiceAddDialog } from '@/components/customers/VoiceAddDialog';
import { useCustomers } from '@/hooks/useCustomers';

export function Customers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const { data: customers, isLoading } = useCustomers(search);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {t('customers.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {customers ? `${customers.length}` : '—'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="lg" variant="outline" className="gap-2" onClick={() => setVoiceOpen(true)}>
            <Mic className="h-4 w-4" />
            {t('voice.button')}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('customers.add')}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('customers.add')}</DialogTitle>
              <DialogDescription>{t('customers.title')}</DialogDescription>
            </DialogHeader>
            <CustomerForm
              onDone={() => setDialogOpen(false)}
              onCancel={() => setDialogOpen(false)}
            />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <VoiceAddDialog open={voiceOpen} onOpenChange={setVoiceOpen} />

      <CustomerSearch value={search} onChange={setSearch} />

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : !customers || customers.length === 0 ? (
        <Card className="grid place-items-center p-12 text-center text-muted-foreground">
          <p>{t('customers.no_results')}</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {customers.map((c) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="group flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4 transition hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
                {c.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.full_name}</p>
                {c.full_name_te && (
                  <p className="truncate text-sm text-muted-foreground" lang="te">
                    {c.full_name_te}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {c.phone_number}
                  </span>
                  {c.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {c.address}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
