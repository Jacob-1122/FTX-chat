-- Disable the old token-based RLS policies
DROP POLICY "Users can access own sessions" ON chat_sessions;
DROP POLICY "Users can access own messages" ON chat_messages;
DROP POLICY "Users can access own citations" ON message_citations;

-- Alter the chat_sessions table to use Supabase Auth
-- First, drop the old columns that are no longer needed
ALTER TABLE chat_sessions DROP COLUMN session_token;
ALTER TABLE chat_sessions DROP COLUMN user_id;

-- Add a new user_id column that links to the auth.users table
ALTER TABLE chat_sessions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create new RLS policies based on the authenticated user
-- Users can only see and manage their own chat sessions
CREATE POLICY "Users can manage their own sessions"
ON chat_sessions
FOR ALL
USING (auth.uid() = user_id);

-- Users can only see and manage messages within their own sessions
CREATE POLICY "Users can manage their own messages"
ON chat_messages
FOR ALL
USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

-- Users can only see and manage citations linked to their own messages
CREATE POLICY "Users can manage their own citations"
ON message_citations
FOR ALL
USING (message_id IN (SELECT cm.id FROM chat_messages cm JOIN chat_sessions cs ON cm.session_id = cs.id WHERE cs.user_id = auth.uid()));

-- Allow read access for all authenticated users to documents and chunks
-- (This maintains the original read-only access from the first migration)
CREATE POLICY "Allow read access to authenticated users"
ON documents
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to authenticated users"
ON document_chunks
FOR SELECT
USING (auth.role() = 'authenticated');
