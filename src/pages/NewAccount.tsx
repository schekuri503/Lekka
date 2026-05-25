// ============================================================================
// NewAccount — picks between BC Weekly or Monthly Interest
// ============================================================================
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Calendar } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BCWeeklyForm } from '@/components/accounts/BCWeeklyForm';
import { MonthlyInterestForm } from '@/components/accounts/MonthlyInterestForm';

export function NewAccount() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const customerId = params.get('customer') ?? undefined;
  const defaultTab = params.get('type') === 'monthly' ? 'monthly' : 'bc';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t('accounts.title')}
        </h1>
        <p className="text-sm text-muted-foreground">Pick the account type to set up.</p>
      </header>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bc" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t('accounts.type_bc')}
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('accounts.type_monthly')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bc" className="mt-6">
          <Card className="p-6">
            <BCWeeklyForm defaultCustomerId={customerId} />
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-6">
          <Card className="p-6">
            <MonthlyInterestForm defaultCustomerId={customerId} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
