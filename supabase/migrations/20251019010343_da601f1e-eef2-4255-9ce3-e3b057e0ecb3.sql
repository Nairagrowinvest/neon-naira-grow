-- Fix existing active investments and improve the daily profit calculation trigger

-- First, update all existing active investments to calculate their daily profit amount
UPDATE investments
SET daily_profit_amount = (amount * (profit_percentage / 100.0)) / 7.0
WHERE status = 'active' AND daily_profit_amount = 0;

-- Drop and recreate the trigger function with better logic
DROP TRIGGER IF EXISTS calculate_daily_profit ON investments;
DROP FUNCTION IF EXISTS set_daily_profit_amount();

-- New improved function that handles both INSERT and UPDATE
CREATE OR REPLACE FUNCTION set_daily_profit_amount()
RETURNS TRIGGER AS $$
DECLARE
  total_profit NUMERIC;
BEGIN
  -- Calculate daily profit when status becomes 'active' (either on insert or update)
  IF NEW.status = 'active' AND (NEW.daily_profit_amount = 0 OR NEW.daily_profit_amount IS NULL) THEN
    total_profit := NEW.amount * (NEW.profit_percentage / 100.0);
    NEW.daily_profit_amount := total_profit / 7.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for both INSERT and UPDATE operations
CREATE TRIGGER calculate_daily_profit
BEFORE INSERT OR UPDATE ON investments
FOR EACH ROW
EXECUTE FUNCTION set_daily_profit_amount();

-- Also fix the referral bonus trigger to fire on UPDATE as well
DROP TRIGGER IF EXISTS on_first_investment ON investments;

CREATE TRIGGER on_first_investment
AFTER INSERT OR UPDATE ON investments
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_bonus();