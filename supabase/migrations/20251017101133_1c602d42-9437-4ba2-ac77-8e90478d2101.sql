-- Drop the insecure policy that allows any user to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a new restricted policy that prevents regular users from creating notifications
-- Only the service role (backend functions) can now create notifications
CREATE POLICY "Only backend can create notifications" ON public.notifications
FOR INSERT 
WITH CHECK (false);

-- Users can still view and update their own notifications
-- (existing policies remain unchanged)