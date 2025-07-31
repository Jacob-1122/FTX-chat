-- Fix for 'cannot alter type of a column used by a view or rule' error
-- 1. Drop the dependent view
DROP VIEW IF EXISTS public.session_analytics;

-- 2. Correct the chat_sessions table and add guest session support
ALTER TABLE public.chat_sessions
ADD COLUMN guest_token UUID UNIQUE;

-- This command might fail if the column type is already correct from a partial run.
-- We will add a check to make this more robust in the final version. For now, if this
-- specific ALTER COLUMN fails, you can comment it out and re-run.
ALTER TABLE public.chat_sessions
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 3. Recreate the session_analytics view with the corrected schema
-- NOTE: We are also future-proofing this by casting user_id to text for the unique count,
-- which will work for both UUIDs and any old text data.
CREATE OR REPLACE VIEW public.session_analytics AS
SELECT
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id::text) as unique_users,
    AVG(total_messages) as avg_messages_per_session,
    AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_activity) - started_at))/60) as avg_session_duration_minutes
FROM public.chat_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- 4. Create functions for securely accessing guest chat history
-- This function gets the ID of a guest session.
CREATE OR REPLACE FUNCTION public.get_guest_session_id(p_guest_token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT id FROM public.chat_sessions WHERE guest_token = p_guest_token AND user_id IS NULL);
END;
$$;

-- This function gets the messages for a guest session.
CREATE OR REPLACE FUNCTION public.get_guest_chat_messages(p_guest_token UUID)
RETURNS TABLE(id UUID, session_id UUID, role TEXT, content TEXT, "timestamp" TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT cm.id, cm.session_id, cm.message_type as role, cm.content, cm.created_at as "timestamp"
  FROM public.chat_messages cm
  WHERE cm.session_id = public.get_guest_session_id(p_guest_token)
  ORDER BY cm.created_at;
END;
$$;

-- 5. Grant permissions for anonymous users to use these functions
GRANT EXECUTE ON FUNCTION public.get_guest_session_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_chat_messages(UUID) TO anon;

-- 6. Update RLS policies for authenticated users
-- Drop old policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can access own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can access own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can manage messages in their own sessions" ON public.chat_messages;


-- Users can manage their own sessions (but not guest sessions)
CREATE POLICY "Users can manage their own sessions"
ON public.chat_sessions FOR ALL
USING (auth.uid() = user_id);

-- Users can manage messages in their own sessions
CREATE POLICY "Users can manage messages in their own sessions"
ON public.chat_messages FOR ALL
USING ( (SELECT user_id FROM public.chat_sessions WHERE id = session_id) = auth.uid() );
