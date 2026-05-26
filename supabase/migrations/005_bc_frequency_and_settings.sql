-- ============================================================================
-- Migration 005: BC frequency, account source, settings profit %
-- ----------------------------------------------------------------------------
-- Run in Supabase → SQL Editor → New query → paste → Run.
--   1. accounts.bc_frequency   WEEKLY (default) | BIWEEKLY | MONTHLY
--   2. accounts.source         manual (default) | notebook_import | seed
--   3. user_settings.default_bc_profit_pct  (default 11)
--   4. Make the BC installment generator frequency-aware.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) BC repayment frequency
-- ----------------------------------------------------------------------------
alter table public.accounts
  add column if not exists bc_frequency text not null default 'WEEKLY'
    check (bc_frequency in ('WEEKLY','BIWEEKLY','MONTHLY'));

-- Backfill any pre-existing rows to WEEKLY (the default already covers new rows).
update public.accounts set bc_frequency = 'WEEKLY' where bc_frequency is null;

-- ----------------------------------------------------------------------------
-- 2) Where the account came from
-- ----------------------------------------------------------------------------
alter table public.accounts
  add column if not exists source text not null default 'manual'
    check (source in ('manual','notebook_import','seed'));

-- ----------------------------------------------------------------------------
-- 3) Default profit % used to auto-fill BC amounts
-- ----------------------------------------------------------------------------
alter table public.user_settings
  add column if not exists default_bc_profit_pct numeric(6,3) not null default 11;

-- ----------------------------------------------------------------------------
-- 4) Frequency-aware BC installment generator
-- ----------------------------------------------------------------------------
-- Replaces the weekly-only version from migration 003. The due-date step now
-- depends on bc_frequency: 7 days, 14 days, or 1 calendar month.
create or replace function public.generate_bc_weekly_installments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  weekly_due numeric(14,2);
  n int;
  freq text;
  due date;
begin
  if new.account_type <> 'BC_WEEKLY' then
    return new;
  end if;

  freq := coalesce(new.bc_frequency, 'WEEKLY');

  -- Round to 2 decimals; the final installment absorbs the rounding remainder
  -- so the total exactly matches total_repayment_amount.
  weekly_due := round(new.total_repayment_amount / new.term_weeks, 2);

  for n in 1..new.term_weeks loop
    due := case freq
      when 'BIWEEKLY' then new.start_date + ((n - 1) * 14)
      when 'MONTHLY'  then (new.start_date + ((n - 1) || ' month')::interval)::date
      else                 new.start_date + ((n - 1) * 7)
    end;

    insert into public.installments (
      owner_user_id, account_id, installment_number, due_date, due_amount
    )
    values (
      new.owner_user_id,
      new.id,
      n,
      due,
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
