-- Fix transactions.type check constraint to allow types used by the app and backend functions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN (
  'deposit',
  'withdrawal',
  'investment',
  'investment_return',
  'daily_payout',
  'referral_bonus'
));