-- Allow 'rejected' status for investments
ALTER TABLE investments DROP CONSTRAINT IF EXISTS investments_status_check;
ALTER TABLE investments ADD CONSTRAINT investments_status_check 
  CHECK (status IN ('pending', 'active', 'completed', 'rejected'));