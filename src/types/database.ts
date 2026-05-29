// ============================================================================
// Database types
// ----------------------------------------------------------------------------
// Hand-written for clarity. If you want fully-generated types later, run:
//   npx supabase gen types typescript --project-id YOUR_REF > src/types/database.gen.ts
// and merge.
// ============================================================================

export type AccountType = 'BC_WEEKLY' | 'MONTHLY_INTEREST';
export type AccountStatus = 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
export type BcFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type AccountSource = 'manual' | 'notebook_import' | 'seed';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'WAIVED';
export type EffectiveStatus = InstallmentStatus | 'OVERDUE' | 'DUE_TODAY';
export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'PHONEPE'
  | 'PAYTM'
  | 'GPAY'
  | 'BANK'
  | 'OTHER';
export type ReminderStatus = 'PENDING' | 'SENT' | 'CANCELLED';
export type ReminderChannel = 'IN_APP' | 'WHATSAPP' | 'SMS';
export type Language = 'en' | 'te';

export interface Customer {
  id: string;
  owner_user_id: string;
  full_name: string;
  full_name_te: string | null;
  phone_number: string;
  phone_number_2: string | null;
  reference1_name: string | null;
  reference1_phone: string | null;
  reference1_relation: string | null;
  reference2_name: string | null;
  reference2_phone: string | null;
  reference2_relation: string | null;
  address: string | null;
  notes: string | null;
  notebook_ref: string | null;
  photo_url: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  owner_user_id: string;
  customer_id: string;
  account_type: AccountType;
  status: AccountStatus;
  amount_given: number | null;
  total_repayment_amount: number | null;
  profit_amount: number | null;
  term_weeks: number | null;
  bc_frequency: BcFrequency;
  source: AccountSource;
  principal_amount: number | null;
  apr: number | null;
  start_date: string;
  due_day: string | null;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  owner_user_id: string;
  account_id: string;
  installment_number: number;
  due_date: string;
  due_amount: number;
  paid_amount: number;
  status: InstallmentStatus;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallmentWithStatus extends Installment {
  effective_status: EffectiveStatus;
  balance: number;
  account_type: AccountType;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
}

export interface Payment {
  id: string;
  owner_user_id: string;
  account_id: string;
  installment_id: string | null;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  confirmed_by: string | null;
  notes: string | null;
  voided: boolean;
  voided_at: string | null;
  voided_reason: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  owner_user_id: string;
  customer_id: string;
  account_id: string | null;
  installment_id: string | null;
  reminder_type: string | null;
  scheduled_date: string | null;
  status: ReminderStatus;
  channel: ReminderChannel;
  message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  business_name: string;
  default_currency: string;
  default_bc_term_weeks: number;
  default_bc_profit_pct: number;
  default_apr: number;
  default_language: Language;
  reminder_template_due: string;
  reminder_template_late: string;
  reminder_template_reference: string;
  reminder_time_hhmm: string;
  created_at: string;
  updated_at: string;
}
