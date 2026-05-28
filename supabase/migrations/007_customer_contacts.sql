-- ============================================================================
-- Migration 007: secondary phone + reference/guarantor contacts on customers
-- ----------------------------------------------------------------------------
-- Run in Supabase → SQL Editor → New query → paste → Run. Idempotent.
--
-- A borrower can have one extra phone and up to two reference/guarantor
-- contacts (name + phone + relation) the owner can message if the borrower
-- stops paying. customers.notes and accounts.notes already exist (migration
-- 001) and need no change.
-- ============================================================================

alter table public.customers
  add column if not exists phone_number_2     text,
  add column if not exists reference1_name    text,
  add column if not exists reference1_phone   text,
  add column if not exists reference1_relation text,
  add column if not exists reference2_name    text,
  add column if not exists reference2_phone   text,
  add column if not exists reference2_relation text;

-- Reference/guarantor reminder template (placeholders: {referenceName}, {customerName}, {amount})
alter table public.user_settings
  add column if not exists reminder_template_reference text
  default 'Namaste {referenceName}, this is regarding {customerName}''s pending payment of ₹{amount}. Please remind them to pay. Thank you.';
