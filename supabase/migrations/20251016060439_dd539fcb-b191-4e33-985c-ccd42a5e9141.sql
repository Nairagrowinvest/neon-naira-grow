-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to complete expired investments
CREATE OR REPLACE FUNCTION public.complete_expired_investments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  investment_record RECORD;
  profit_amount NUMERIC;
  total_return NUMERIC;
BEGIN
  -- Find all active investments that have reached their end date
  FOR investment_record IN
    SELECT * FROM investments
    WHERE status = 'active'
    AND end_date <= now()
  LOOP
    -- Calculate profit and total return
    profit_amount := investment_record.amount * (investment_record.profit_percentage / 100.0);
    total_return := investment_record.amount + profit_amount;
    
    -- Update investment status to completed
    UPDATE investments
    SET status = 'completed'
    WHERE id = investment_record.id;
    
    -- Add total return to user's balance
    UPDATE profiles
    SET 
      total_balance = total_balance + total_return,
      total_earnings = total_earnings + profit_amount
    WHERE id = investment_record.user_id;
    
    -- Create transaction record
    INSERT INTO transactions (user_id, type, amount, description, status, investment_id)
    VALUES (
      investment_record.user_id,
      'investment_return',
      total_return,
      'Investment completed - Principal + Profit',
      'completed',
      investment_record.id
    );
    
    -- Create notification
    INSERT INTO notifications (user_id, title, message)
    VALUES (
      investment_record.user_id,
      'Investment Completed!',
      'Your investment of ₦' || investment_record.amount || ' has been completed. ₦' || total_return || ' has been added to your balance.'
    );
  END LOOP;
END;
$$;