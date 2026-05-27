-- ============================================================================
-- Migration 006: cascade-delete RPCs for accounts and customers
-- ----------------------------------------------------------------------------
-- Run in Supabase → SQL Editor → New query → paste → Run.
--
-- payments.account_id / payments.customer_id use ON DELETE RESTRICT, and there
-- is no RLS delete policy on payments (they're only voided in normal use). So
-- deleting a customer/account from the client can't cascade on its own.
--
-- These SECURITY DEFINER functions run the deletes in dependency order with an
-- explicit ownership check, so a user can only delete their own data.
-- Installments and reminders are removed automatically via ON DELETE CASCADE.
-- ============================================================================

create or replace function public.delete_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_user_id into v_owner from public.accounts where id = p_account_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Not authorized to delete this account';
  end if;

  delete from public.payments where account_id = p_account_id;
  -- installments and reminders cascade via their ON DELETE CASCADE FKs
  delete from public.accounts where id = p_account_id;
end;
$$;

grant execute on function public.delete_account(uuid) to authenticated;


create or replace function public.delete_customer(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_user_id into v_owner from public.customers where id = p_customer_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Not authorized to delete this customer';
  end if;

  delete from public.payments where customer_id = p_customer_id;
  -- installments + reminders cascade when their accounts go
  delete from public.accounts where customer_id = p_customer_id;
  delete from public.customers where id = p_customer_id;
end;
$$;

grant execute on function public.delete_customer(uuid) to authenticated;
