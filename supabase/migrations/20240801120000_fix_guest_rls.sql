-- Fix RLS policies to allow guest sessions

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;

-- Create new policies that allow both authenticated users and guest sessions
CREATE POLICY "Users can manage their own sessions"
ON public.chat_sessions FOR ALL
USING (
  -- Allow if user owns the session
  auth.uid() = user_id 
  OR 
  -- Allow if it's a guest session and user is anonymous
  (user_id IS NULL AND auth.uid() IS NULL AND guest_token IS NOT NULL)
);

-- Also need to update the messages policy to allow guest messages
DROP POLICY IF EXISTS "Users can manage messages in their own sessions" ON public.chat_messages;

CREATE POLICY "Users can manage messages in their own sessions"
ON public.chat_messages FOR ALL
USING (
  -- Allow if user owns the session
  (SELECT user_id FROM public.chat_sessions WHERE id = session_id) = auth.uid()
  OR
  -- Allow if it's a guest session and user is anonymous
  (
    auth.uid() IS NULL 
    AND 
    (SELECT user_id FROM public.chat_sessions WHERE id = session_id) IS NULL
    AND
    (SELECT guest_token FROM public.chat_sessions WHERE id = session_id) IS NOT NULL
  )
);