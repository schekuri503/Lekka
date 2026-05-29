-- ============================================================================
-- Migration 008: notebook serial reference + partial-payment carry-forward
-- ----------------------------------------------------------------------------
-- Run in Supabase → SQL Editor → New query → paste → Run. Idempotent.
--
--   1. customers.notebook_ref — the serial/page number from the paper notebook,
--      for cross-referencing.
--   2. carry_forward_shortfall(installment_id) — when a customer underpays an
--      installment, close it at the amount actually paid and move the shortfall
--      to the next installment. If it was the last installment, create a new
--      one at the end (spaced by the account's frequency).
-- ============================================================================

alter table public.customers
  add column if not exists notebook_ref text;

create or replace function public.carry_forward_shortfall(p_installment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst      public.installments;
  v_acct      public.accounts;
  v_shortfall numeric(14,2);
  v_next      public.installments;
  v_step      interval;
  v_max       int;
begin
  select * into v_inst from public.installments where id = p_installment_id;
  if not found then
    raise exception 'Installment not found';
  end if;

  select * into v_acct from public.accounts where id = v_inst.account_id;
  if v_acct.owner_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  v_shortfall := v_inst.due_amount - v_inst.paid_amount;
  if v_shortfall <= 0 then
    return;
  end if;

  -- Close the current installment at the amount actually paid.
  update public.installments
     set due_amount = paid_amount,
         status     = 'PAID',
         paid_date  = coalesce(paid_date, current_date)
   where id = p_installment_id;

  -- Carry the shortfall to the next installment, if one exists.
  select * into v_next
    from public.installments
   where account_id = v_inst.account_id
     and installment_number > v_inst.installment_number
   order by installment_number asc
   limit 1;

  if found then
    update public.installments
       set due_amount = due_amount + v_shortfall
     where id = v_next.id;
  else
    -- No next installment — append a new one spaced by the account frequency.
    v_step := case coalesce(v_acct.bc_frequency, 'WEEKLY')
                when 'BIWEEKLY' then interval '14 days'
                when 'MONTHLY'  then interval '1 month'
                else                 interval '7 days'
              end;
    select max(installment_number) into v_max
      from public.installments where account_id = v_inst.account_id;
    insert into public.installments (
      owner_user_id, account_id, installment_number, due_date, due_amount
    )
    values (
      v_acct.owner_user_id, v_inst.account_id, v_max + 1,
      (v_inst.due_date + v_step)::date, v_shortfall
    );
  end if;
end;
$$;

grant execute on function public.carry_forward_shortfall(uuid) to authenticated;
