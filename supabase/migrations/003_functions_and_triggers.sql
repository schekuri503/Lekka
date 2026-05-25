-- ============================================================================
-- Migration 003: Functions and triggers
-- ----------------------------------------------------------------------------
-- Business logic that's easier to keep in the DB than re-implement in clients:
--   1. Auto-generate weekly installments when a BC_WEEKLY account is inserted.
--   2. Auto-generate the first monthly interest installment for
--      MONTHLY_INTEREST accounts; subsequent ones are created by the
--      `generate_monthly_interest_installments` function (called on demand).
--   3. Update installment paid_amount/status when a payment is inserted/voided.
--   4. Touch `updated_at` on row updates.
--   5. Auto-create user_settings row when a new auth user is created.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Generic updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger trg_installments_updated_at
  before update on public.installments
  for each row execute function public.set_updated_at();

create trigger trg_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

create trigger trg_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 2) Generate BC_WEEKLY installments on account insert
-- ----------------------------------------------------------------------------
-- Example: total_repayment_amount=50000, term_weeks=10 → 10 rows of ₹5,000,
--          due_date = start_date + (n-1) * 7 days.
create or replace function public.generate_bc_weekly_installments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  weekly_due numeric(14,2);
  n int;
begin
  if new.account_type <> 'BC_WEEKLY' then
    return new;
  end if;

  -- Round to 2 decimals; the final installment absorbs the rounding remainder
  -- so the total exactly matches total_repayment_amount.
  weekly_due := round(new.total_repayment_amount / new.term_weeks, 2);

  for n in 1..new.term_weeks loop
    insert into public.installments (
      owner_user_id, account_id, installment_number, due_date, due_amount
    )
    values (
      new.owner_user_id,
      new.id,
      n,
      new.start_date + ((n - 1) * 7),
      case
        when n = new.term_weeks
          then new.total_repayment_amount - (weekly_due * (new.term_weeks - 1))
        else weekly_due
      end
    );
  end loop;

  return new;
end;
$$;

create trigger trg_generate_bc_installments
  after insert on public.accounts
  for each row execute function public.generate_bc_weekly_installments();


-- ----------------------------------------------------------------------------
-- 3) Generate MONTHLY_INTEREST first installment on insert
-- ----------------------------------------------------------------------------
-- monthly_interest = principal * apr / 12 / 100
-- For monthly accounts, we create the first interest installment immediately.
-- Subsequent months are generated on demand via
-- public.generate_monthly_interest_installments(account_id).
create or replace function public.generate_first_monthly_installment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  monthly_due numeric(14,2);
  first_due  date;
begin
  if new.account_type <> 'MONTHLY_INTEREST' then
    return new;
  end if;

  monthly_due := round(new.principal_amount * new.apr / 1200, 2);

  -- If due_day is numeric (e.g. "5"), schedule for that day of next month;
  -- otherwise, one month after start_date.
  if new.due_day ~ '^\d+$' then
    first_due := make_date(
      extract(year  from new.start_date)::int,
      extract(month from new.start_date)::int,
      least(new.due_day::int, 28)
    ) + interval '1 month';
  else
    first_due := new.start_date + interval '1 month';
  end if;

  insert into public.installments (
    owner_user_id, account_id, installment_number, due_date, due_amount
  )
  values (new.owner_user_id, new.id, 1, first_due::date, monthly_due);

  return new;
end;
$$;

create trigger trg_generate_first_monthly
  after insert on public.accounts
  for each row execute function public.generate_first_monthly_installment();


-- ----------------------------------------------------------------------------
-- 4) Function: roll forward monthly interest installments
-- ----------------------------------------------------------------------------
-- Call this when the user opens an account / dashboard. It checks the
-- last installment and creates any missing months up to the current month.
-- Safe to call repeatedly; uses the unique (account_id, installment_number).
create or replace function public.generate_monthly_interest_installments(p_account_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_last public.installments;
  v_next_num int;
  v_next_date date;
  v_monthly_due numeric(14,2);
  v_created int := 0;
begin
  select * into v_account from public.accounts where id = p_account_id;
  if not found or v_account.account_type <> 'MONTHLY_INTEREST' or v_account.status <> 'ACTIVE' then
    return 0;
  end if;
  if v_account.owner_user_id <> auth.uid() then
    return 0;
  end if;

  v_monthly_due := round(v_account.principal_amount * v_account.apr / 1200, 2);

  select * into v_last
  from public.installments
  where account_id = p_account_id
  order by installment_number desc
  limit 1;

  if not found then
    return 0;
  end if;

  v_next_num  := v_last.installment_number + 1;
  v_next_date := (v_last.due_date + interval '1 month')::date;

  -- Generate up to current month
  while v_next_date <= current_date loop
    insert into public.installments(owner_user_id, account_id, installment_number, due_date, due_amount)
    values (v_account.owner_user_id, p_account_id, v_next_num, v_next_date, v_monthly_due)
    on conflict (account_id, installment_number) do nothing;

    v_created   := v_created + 1;
    v_next_num  := v_next_num + 1;
    v_next_date := (v_next_date + interval '1 month')::date;
  end loop;

  return v_created;
end;
$$;

grant execute on function public.generate_monthly_interest_installments(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 5) Update installment when a payment is inserted or voided
-- ----------------------------------------------------------------------------
create or replace function public.apply_payment_to_installment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst public.installments;
  v_total_paid numeric(14,2);
begin
  -- INSERT new payment → add to installment paid_amount
  if (tg_op = 'INSERT') then
    if new.installment_id is null then
      return new;
    end if;
    select * into v_inst from public.installments where id = new.installment_id for update;
    if not found then return new; end if;

    select coalesce(sum(amount), 0) into v_total_paid
    from public.payments
    where installment_id = new.installment_id and voided = false;

    update public.installments
      set paid_amount = v_total_paid,
          status = case
            when v_total_paid >= due_amount then 'PAID'
            when v_total_paid > 0           then 'PARTIAL'
            else 'PENDING'
          end,
          paid_date = case
            when v_total_paid >= due_amount then new.payment_date
            else paid_date
          end
      where id = new.installment_id;

    return new;
  end if;

  -- UPDATE (voided) → recompute paid amount
  if (tg_op = 'UPDATE') then
    if new.installment_id is null then return new; end if;

    select coalesce(sum(amount), 0) into v_total_paid
    from public.payments
    where installment_id = new.installment_id and voided = false;

    update public.installments
      set paid_amount = v_total_paid,
          status = case
            when v_total_paid >= due_amount then 'PAID'
            when v_total_paid > 0           then 'PARTIAL'
            else 'PENDING'
          end,
          paid_date = case
            when v_total_paid < due_amount then null
            else paid_date
          end
      where id = new.installment_id;

    return new;
  end if;

  return new;
end;
$$;

create trigger trg_payment_applies_to_installment
  after insert or update on public.payments
  for each row execute function public.apply_payment_to_installment();


-- ----------------------------------------------------------------------------
-- 6) Auto-create user_settings on signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 7) Lightweight audit logger (called explicitly from app code or other triggers)
-- ----------------------------------------------------------------------------
create or replace function public.log_audit(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_old jsonb,
  p_new jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs(
    owner_user_id, entity_type, entity_id, action, old_value, new_value, created_by
  ) values (
    auth.uid(), p_entity_type, p_entity_id, p_action, p_old, p_new, auth.uid()
  );
end;
$$;

grant execute on function public.log_audit(text, uuid, text, jsonb, jsonb) to authenticated;
