-- ============================================================================
-- Migration 002: Row Level Security policies
-- ----------------------------------------------------------------------------
-- Enables RLS on every table and adds policies so each user can only
-- access their own rows (rows where owner_user_id = auth.uid()).
--
-- This means the anon key can be safely shipped to the browser:
-- without a valid auth.uid() the user sees zero rows.
-- ============================================================================

-- Enable RLS
alter table public.customers     enable row level security;
alter table public.accounts      enable row level security;
alter table public.installments  enable row level security;
alter table public.payments      enable row level security;
alter table public.reminders     enable row level security;
alter table public.audit_logs    enable row level security;
alter table public.user_settings enable row level security;

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create policy "customers: owner can read"
  on public.customers for select
  using (auth.uid() = owner_user_id);

create policy "customers: owner can insert"
  on public.customers for insert
  with check (auth.uid() = owner_user_id);

create policy "customers: owner can update"
  on public.customers for update
  using (auth.uid() = owner_user_id);

create policy "customers: owner can delete"
  on public.customers for delete
  using (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- accounts
-- ----------------------------------------------------------------------------
create policy "accounts: owner can read"
  on public.accounts for select
  using (auth.uid() = owner_user_id);

create policy "accounts: owner can insert"
  on public.accounts for insert
  with check (auth.uid() = owner_user_id);

create policy "accounts: owner can update"
  on public.accounts for update
  using (auth.uid() = owner_user_id);

create policy "accounts: owner can delete"
  on public.accounts for delete
  using (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- installments
-- ----------------------------------------------------------------------------
create policy "installments: owner can read"
  on public.installments for select
  using (auth.uid() = owner_user_id);

create policy "installments: owner can insert"
  on public.installments for insert
  with check (auth.uid() = owner_user_id);

create policy "installments: owner can update"
  on public.installments for update
  using (auth.uid() = owner_user_id);

create policy "installments: owner can delete"
  on public.installments for delete
  using (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- payments
-- ----------------------------------------------------------------------------
create policy "payments: owner can read"
  on public.payments for select
  using (auth.uid() = owner_user_id);

create policy "payments: owner can insert"
  on public.payments for insert
  with check (auth.uid() = owner_user_id);

-- Payments are not edited; only voided (which is a column update).
create policy "payments: owner can void"
  on public.payments for update
  using (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- reminders
-- ----------------------------------------------------------------------------
create policy "reminders: owner full access"
  on public.reminders for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- audit_logs (insert + read only — never updated or deleted)
-- ----------------------------------------------------------------------------
create policy "audit_logs: owner can read"
  on public.audit_logs for select
  using (auth.uid() = owner_user_id);

create policy "audit_logs: owner can insert"
  on public.audit_logs for insert
  with check (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- user_settings
-- ----------------------------------------------------------------------------
create policy "user_settings: self read"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings: self upsert"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings: self update"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Grant the view to authenticated users (it inherits RLS from base tables)
-- ----------------------------------------------------------------------------
grant select on public.v_installments_with_effective_status to authenticated;

-- ============================================================================
-- PHASE 2 NOTE — multi-user (staff) support
-- ----------------------------------------------------------------------------
-- When you add staff users, create a `business_members` table linking
-- multiple auth.users to a single "business owner". Then change the policies
-- above to check membership instead of direct ownership, e.g.:
--
--   using (
--     exists (
--       select 1 from public.business_members m
--       where m.business_owner_id = owner_user_id and m.user_id = auth.uid()
--     )
--   )
-- ============================================================================
