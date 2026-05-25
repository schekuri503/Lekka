-- ============================================================================
-- Migration 004 (optional): Seed sample data
-- ----------------------------------------------------------------------------
-- Run this AFTER you have created a user in Auth → Users.
-- Replace 'YOUR_USER_UUID' below with that user's id.
--
-- You can find your user id in: Authentication → Users → click your user → copy "User UID"
-- ============================================================================

do $$
declare
  v_uid uuid := 'YOUR_USER_UUID';  -- ← replace this
  v_cust1 uuid;
  v_cust2 uuid;
  v_cust3 uuid;
  v_acct1 uuid;
  v_acct2 uuid;
begin
  -- Sample customers
  insert into public.customers (owner_user_id, full_name, full_name_te, phone_number, address, notes)
  values
    (v_uid, 'Ramesh Kumar', 'రమేష్ కుమార్',  '+919876543210', 'Village A, near temple',     'Regular customer, pays on time'),
    (v_uid, 'Lakshmi Devi', 'లక్ష్మి దేవి',   '+919876543211', 'Village B, main road',       'Sometimes delays a week, but always pays'),
    (v_uid, 'Suresh Babu',  'సురేష్ బాబు',   '+919876543212', 'Town C, market street',      NULL)
  returning id into v_cust1;

  -- Capture all three ids
  select id into v_cust1 from public.customers where owner_user_id = v_uid and full_name = 'Ramesh Kumar';
  select id into v_cust2 from public.customers where owner_user_id = v_uid and full_name = 'Lakshmi Devi';
  select id into v_cust3 from public.customers where owner_user_id = v_uid and full_name = 'Suresh Babu';

  -- BC Weekly: ₹50,000 over 10 weeks, gave ₹45,000, started 3 weeks ago
  insert into public.accounts (
    owner_user_id, customer_id, account_type,
    amount_given, total_repayment_amount, term_weeks,
    start_date, due_day, notes
  ) values (
    v_uid, v_cust1, 'BC_WEEKLY',
    45000, 50000, 10,
    current_date - interval '21 days', 'SUNDAY',
    'Standard 10-week BC'
  ) returning id into v_acct1;

  -- Monthly Interest: ₹100,000 principal at 24% APR, started 2 months ago
  insert into public.accounts (
    owner_user_id, customer_id, account_type,
    principal_amount, apr,
    start_date, due_day, notes
  ) values (
    v_uid, v_cust2, 'MONTHLY_INTEREST',
    100000, 24,
    current_date - interval '60 days', '5',
    'Monthly interest, principal open-ended'
  ) returning id into v_acct2;

  -- Mark a couple of installments paid on the BC account
  insert into public.payments (owner_user_id, account_id, installment_id, customer_id,
                                amount, payment_date, payment_method)
  select v_uid, v_acct1, i.id, v_cust1, i.due_amount, i.due_date, 'UPI'
  from public.installments i
  where i.account_id = v_acct1 and i.installment_number <= 2;

  -- One partial payment on installment 3
  insert into public.payments (owner_user_id, account_id, installment_id, customer_id,
                                amount, payment_date, payment_method, notes)
  select v_uid, v_acct1, i.id, v_cust1, 3000, current_date - interval '5 days', 'CASH', 'Said will pay rest soon'
  from public.installments i
  where i.account_id = v_acct1 and i.installment_number = 3;

  raise notice 'Seed complete. Customers, accounts, installments and a few payments created.';
end $$;
