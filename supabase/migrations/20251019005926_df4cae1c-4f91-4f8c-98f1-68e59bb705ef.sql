-- Transform investment system to daily payouts over 7 days with daily bonus

-- Add columns to track daily progress and payouts
ALTER TABLE investments
ADD COLUMN IF NOT EXISTS days_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payout_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS daily_profit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_bonus_claim_date TIMESTAMP WITH TIME ZONE;

-- Create table to track each day's payout
CREATE TABLE IF NOT EXISTS investment_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  profit_amount NUMERIC NOT NULL,
  bonus_amount NUMERIC DEFAULT 20,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(investment_id, day_number)
);

-- Enable RLS on investment_payouts
ALTER TABLE investment_payouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own payouts
CREATE POLICY "Users can view own payouts" ON investment_payouts
FOR SELECT USING (auth.uid() = user_id);

-- Users can create payouts (for claiming)
CREATE POLICY "Users can create own payouts" ON investment_payouts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts" ON investment_payouts
FOR SELECT USING (public.is_admin());

-- Function to calculate and set daily profit amount when investment becomes active
CREATE OR REPLACE FUNCTION set_daily_profit_amount()
RETURNS TRIGGER AS $$
DECLARE
  total_profit NUMERIC;
BEGIN
  -- Only calculate when status changes to 'active' and daily_profit_amount is not set
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') AND NEW.daily_profit_amount = 0 THEN
    total_profit := NEW.amount * (NEW.profit_percentage / 100.0);
    NEW.daily_profit_amount := total_profit / 7.0; -- Distribute profit over 7 days
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set daily profit amount
CREATE TRIGGER calculate_daily_profit
BEFORE INSERT OR UPDATE ON investments
FOR EACH ROW
EXECUTE FUNCTION set_daily_profit_amount();

-- Function for users to claim daily profit and bonus
CREATE OR REPLACE FUNCTION claim_daily_payout(p_investment_id UUID)
RETURNS JSON AS $$
DECLARE
  v_investment RECORD;
  v_current_day INTEGER;
  v_profit_amount NUMERIC;
  v_bonus_amount NUMERIC := 20;
  v_total_payout NUMERIC;
  v_can_claim_profit BOOLEAN;
  v_can_claim_bonus BOOLEAN;
  v_payout_exists BOOLEAN;
BEGIN
  -- Get investment details
  SELECT * INTO v_investment
  FROM investments
  WHERE id = p_investment_id AND user_id = auth.uid() AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investment not found or not active';
  END IF;
  
  -- Calculate which day we're on (1-7)
  v_current_day := EXTRACT(DAY FROM (now() - v_investment.start_date)) + 1;
  
  -- Can't claim if we haven't reached day 1 yet
  IF v_current_day < 1 THEN
    RAISE EXCEPTION 'Investment has not started yet';
  END IF;
  
  -- Can't claim beyond day 7
  IF v_current_day > 7 THEN
    RAISE EXCEPTION 'Investment period has ended';
  END IF;
  
  -- Check if payout for current day already exists
  SELECT EXISTS(
    SELECT 1 FROM investment_payouts 
    WHERE investment_id = p_investment_id AND day_number = v_current_day
  ) INTO v_payout_exists;
  
  IF v_payout_exists THEN
    RAISE EXCEPTION 'Daily payout already claimed for day %', v_current_day;
  END IF;
  
  -- Check if we can claim profit (once per day, based on last_payout_date)
  v_can_claim_profit := (
    v_investment.last_payout_date IS NULL OR 
    v_investment.last_payout_date < CURRENT_DATE
  );
  
  -- Check if we can claim bonus (once per day, based on last_bonus_claim_date)
  v_can_claim_bonus := (
    v_investment.last_bonus_claim_date IS NULL OR 
    v_investment.last_bonus_claim_date < CURRENT_DATE
  );
  
  -- Calculate amounts to pay
  v_profit_amount := CASE WHEN v_can_claim_profit THEN v_investment.daily_profit_amount ELSE 0 END;
  v_bonus_amount := CASE WHEN v_can_claim_bonus THEN v_bonus_amount ELSE 0 END;
  v_total_payout := v_profit_amount + v_bonus_amount;
  
  IF v_total_payout = 0 THEN
    RAISE EXCEPTION 'No payout available to claim today';
  END IF;
  
  -- Create payout record
  INSERT INTO investment_payouts (investment_id, user_id, day_number, profit_amount, bonus_amount)
  VALUES (p_investment_id, auth.uid(), v_current_day, v_profit_amount, v_bonus_amount);
  
  -- Update user balance
  UPDATE profiles
  SET total_balance = total_balance + v_total_payout,
      total_earnings = total_earnings + v_profit_amount
  WHERE id = auth.uid();
  
  -- Update investment tracking
  UPDATE investments
  SET days_completed = v_current_day,
      last_payout_date = CASE WHEN v_can_claim_profit THEN CURRENT_DATE ELSE last_payout_date END,
      last_bonus_claim_date = CASE WHEN v_can_claim_bonus THEN CURRENT_DATE ELSE last_bonus_claim_date END,
      status = CASE WHEN v_current_day >= 7 THEN 'completed' ELSE status END
  WHERE id = p_investment_id;
  
  -- Return investment to principal on completion (day 7)
  IF v_current_day >= 7 THEN
    UPDATE profiles
    SET total_balance = total_balance + v_investment.amount
    WHERE id = auth.uid();
    
    INSERT INTO transactions (user_id, type, amount, description, status, investment_id)
    VALUES (
      auth.uid(),
      'investment_return',
      v_investment.amount,
      'Investment completed - Principal returned',
      'completed',
      p_investment_id
    );
  END IF;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description, status, investment_id)
  VALUES (
    auth.uid(),
    'daily_payout',
    v_total_payout,
    'Day ' || v_current_day || ' payout: ₦' || v_profit_amount || ' profit + ₦' || v_bonus_amount || ' bonus',
    'completed',
    p_investment_id
  );
  
  RETURN json_build_object(
    'success', true,
    'day', v_current_day,
    'profit', v_profit_amount,
    'bonus', v_bonus_amount,
    'total', v_total_payout,
    'completed', v_current_day >= 7
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;