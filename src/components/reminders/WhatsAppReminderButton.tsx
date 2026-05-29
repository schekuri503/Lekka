import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { renderTemplate, whatsappUrl } from '@/lib/utils';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/dates';
import { useSettings } from '@/hooks/useSettings';

interface Props {
  phone: string;
  customerName: string;
  amount: number;
  dueDate: string;
  kind: 'due' | 'late';
  size?: 'sm' | 'default';
  /** When set, message a reference/guarantor about this customer instead. */
  referenceName?: string;
  /** Optional custom label for the button. */
  label?: string;
}

/** Opens WhatsApp with a pre-filled reminder. No third-party API. Completely free. */
export function WhatsAppReminderButton({
  phone,
  customerName,
  amount,
  dueDate,
  kind,
  size,
  referenceName,
  label,
}: Props) {
  const { t } = useTranslation();
  const { data: settings } = useSettings();

  let template: string;
  if (referenceName) {
    template =
      settings?.reminder_template_reference ??
      "Namaste {referenceName}, this is regarding {customerName}'s pending payment of ₹{amount}. Please remind them to pay. Thank you.";
  } else if (kind === 'due') {
    template =
      settings?.reminder_template_due ??
      'Hi {customerName}, this is a reminder that ₹{amount} is due today. Thank you.';
  } else {
    template =
      settings?.reminder_template_late ??
      'Hi {customerName}, ₹{amount} was due on {dueDate}. Please update once paid. Thank you.';
  }

  const msg = renderTemplate(template, {
    customerName,
    referenceName: referenceName ?? '',
    amount: formatMoney(amount, { noSymbol: true }),
    dueDate: formatDate(dueDate),
  });

  return (
    <Button
      asChild
      variant="outline"
      size={size ?? 'sm'}
      className="gap-2 border-success/40 text-success hover:bg-success/10 hover:text-success"
    >
      <a href={whatsappUrl(phone, msg)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        <span>{label ?? t('dues.whatsapp')}</span>
      </a>
    </Button>
  );
}
