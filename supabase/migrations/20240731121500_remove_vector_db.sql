-- First, drop the functions and views that depend on the tables to be removed.
DROP FUNCTION IF EXISTS match_documents(vector, float, int, text[], daterange);
DROP FUNCTION IF EXISTS hybrid_search(text, vector, float, int, float, float);
DROP VIEW IF EXISTS popular_documents;
DROP VIEW IF EXISTS query_patterns;

-- Drop the RLS policies on the tables that will be removed.
DROP POLICY IF EXISTS "Allow read access to documents" ON documents;
DROP POLICY IF EXISTS "Allow read access to document_chunks" ON document_chunks;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON documents;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON document_chunks;

-- Now, drop the tables. Using CASCADE will handle related indexes and constraints.
DROP TABLE IF EXISTS message_citations;
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS documents;

-- The 'log_chat_message' function tried to insert into 'message_citations',
-- and the 'chat_messages' table has a 'citations' column. We need to update both.

-- First, remove the citations column from chat_messages.
ALTER TABLE chat_messages DROP COLUMN IF EXISTS citations;

-- Now, redefine the log_chat_message function without any citation logic.
CREATE OR REPLACE FUNCTION log_chat_message(
    p_session_id UUID,
    p_message_type TEXT,
    p_content TEXT,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_token_count INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    message_id UUID;
BEGIN
    -- Insert message
    INSERT INTO chat_messages (
        session_id,
        message_type,
        content,
        token_count,
        response_time_ms
    ) VALUES (
        p_session_id,
        p_message_type,
        p_content,
        p_token_count,
        p_response_time_ms
    ) RETURNING id INTO message_id;

    -- Update session message count
    UPDATE chat_sessions
    SET
        total_messages = total_messages + 1,
        last_activity = NOW()
    WHERE id = p_session_id;

    RETURN message_id;
END;
$$;
