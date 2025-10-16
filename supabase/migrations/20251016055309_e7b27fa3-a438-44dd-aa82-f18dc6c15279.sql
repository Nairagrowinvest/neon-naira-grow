-- Create trigger to handle referral bonus when first investment is made
CREATE OR REPLACE FUNCTION public.process_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
  bonus_amount NUMERIC;
BEGIN
  -- Only process for new investments
  IF NEW.status = 'active' THEN
    -- Check if this user was referred and hasn't completed first investment yet
    SELECT * INTO referral_record
    FROM referrals
    WHERE referred_id = NEW.user_id
    AND first_investment_completed = false;
    
    IF FOUND THEN
      -- Calculate 10% bonus
      bonus_amount := NEW.amount * 0.10;
      
      -- Update referral record
      UPDATE referrals
      SET 
        first_investment_completed = true,
        bonus_amount = bonus_amount
      WHERE id = referral_record.id;
      
      -- Add bonus to referrer's balance and total_referral_bonus
      UPDATE profiles
      SET 
        total_balance = total_balance + bonus_amount,
        total_referral_bonus = total_referral_bonus + bonus_amount
      WHERE id = referral_record.referrer_id;
      
      -- Create transaction record for the bonus
      INSERT INTO transactions (user_id, type, amount, description, status)
      VALUES (
        referral_record.referrer_id,
        'referral_bonus',
        bonus_amount,
        'Referral bonus from first investment',
        'completed'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on investments table
DROP TRIGGER IF EXISTS on_first_investment ON investments;
CREATE TRIGGER on_first_investment
  AFTER INSERT ON investments
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_bonus();

-- Create function to check if user is admin (for RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;