-- Add citations column back to chat_messages table
-- This was removed in a previous migration but is needed for the chat functionality

ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]';

-- Add comment to explain the column
COMMENT ON COLUMN chat_messages.citations IS 'Array of citation objects containing document references and excerpts';