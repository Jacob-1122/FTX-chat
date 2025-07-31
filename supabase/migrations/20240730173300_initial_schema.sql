-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Main documents table
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT,
    document_type TEXT NOT NULL, -- 'bankruptcy_filing', 'sec_complaint', 'court_order', etc.
    filing_date DATE,
    case_number TEXT,
    total_pages INTEGER,
    file_size_bytes BIGINT,
    content_hash TEXT UNIQUE, -- SHA-256 hash to prevent duplicates
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks with embeddings
CREATE TABLE document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL, -- Order within document
    page_number INTEGER,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 embedding size
    token_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow read access for authenticated users)
CREATE POLICY "Allow read access to documents" ON documents
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to document_chunks" ON document_chunks
    FOR SELECT USING (true);

-- User sessions
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT, -- Optional user identifier
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    total_messages INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- Individual chat messages
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    token_count INTEGER,
    response_time_ms INTEGER, -- For assistant messages
    citations JSONB DEFAULT '[]', -- Array of citation objects
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message citations (for detailed tracking)
CREATE TABLE message_citations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id),
    chunk_id UUID REFERENCES document_chunks(id),
    similarity_score FLOAT NOT NULL,
    page_number INTEGER,
    excerpt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_citations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own sessions)
CREATE POLICY "Users can access own sessions" ON chat_sessions
    FOR ALL USING (session_token = current_setting('app.session_token', true));

CREATE POLICY "Users can access own messages" ON chat_messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM chat_sessions 
            WHERE session_token = current_setting('app.session_token', true)
        )
    );

CREATE POLICY "Users can access own citations" ON message_citations
    FOR ALL USING (
        message_id IN (
            SELECT cm.id FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.session_token = current_setting('app.session_token', true)
        )
    );

-- Vector similarity search index
CREATE INDEX document_chunks_embedding_idx 
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX documents_title_search_idx ON documents USING gin(to_tsvector('english', title));
CREATE INDEX document_chunks_content_search_idx ON document_chunks USING gin(to_tsvector('english', content));

-- Session and message indexes
CREATE INDEX chat_sessions_token_idx ON chat_sessions(session_token);
CREATE INDEX chat_sessions_started_at_idx ON chat_sessions(started_at);
CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX chat_messages_created_at_idx ON chat_messages(created_at);

-- Document metadata indexes
CREATE INDEX documents_document_type_idx ON documents(document_type);
CREATE INDEX documents_filing_date_idx ON documents(filing_date);
CREATE INDEX documents_case_number_idx ON documents(case_number);

-- Enhanced vector search with metadata filtering
CREATE OR REPLACE FUNCTION match_documents (
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    document_types text[] DEFAULT NULL,
    date_range daterange DEFAULT NULL
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title TEXT,
    document_type TEXT,
    page_number INTEGER,
    content TEXT,
    similarity float,
    filing_date DATE,
    case_number TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id as chunk_id,
        d.id as document_id,
        d.title as document_title,
        d.document_type,
        dc.page_number,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        d.filing_date,
        d.case_number
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 
        1 - (dc.embedding <=> query_embedding) > match_threshold
        AND (document_types IS NULL OR d.document_type = ANY(document_types))
        AND (date_range IS NULL OR d.filing_date <@ date_range)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Combine vector similarity with full-text search
CREATE OR REPLACE FUNCTION hybrid_search (
    query_text TEXT,
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    vector_weight float DEFAULT 0.7,
    text_weight float DEFAULT 0.3
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_title TEXT,
    page_number INTEGER,
    content TEXT,
    combined_score float,
    vector_similarity float,
    text_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH vector_search AS (
        SELECT
            dc.id,
            dc.document_id,
            d.title,
            dc.page_number,
            dc.content,
            1 - (dc.embedding <=> query_embedding) AS similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    ),
    text_search AS (
        SELECT
            dc.id,
            ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) AS rank
        FROM document_chunks dc
        WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
    )
    SELECT
        vs.id as chunk_id,
        vs.document_id,
        vs.title as document_title,
        vs.page_number,
        vs.content,
        (vector_weight * vs.similarity + text_weight * COALESCE(ts.rank, 0)) as combined_score,
        vs.similarity as vector_similarity,
        COALESCE(ts.rank, 0) as text_rank
    FROM vector_search vs
    LEFT JOIN text_search ts ON vs.id = ts.id
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

-- Create or get session
CREATE OR REPLACE FUNCTION create_or_get_session(
    p_session_token TEXT,
    p_user_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Try to get existing session
    SELECT id INTO session_id
    FROM chat_sessions
    WHERE session_token = p_session_token
    AND (ended_at IS NULL OR ended_at > NOW() - INTERVAL '24 hours');
    
    -- Create new session if not found
    IF session_id IS NULL THEN
        INSERT INTO chat_sessions (
            session_token,
            user_id,
            ip_address,
            user_agent
        ) VALUES (
            p_session_token,
            p_user_id,
            p_ip_address,
            p_user_agent
        ) RETURNING id INTO session_id;
    ELSE
        -- Update last activity
        UPDATE chat_sessions
        SET last_activity = NOW()
        WHERE id = session_id;
    END IF;
    
    RETURN session_id;
END;
$$;

-- Log chat message with citations
CREATE OR REPLACE FUNCTION log_chat_message(
    p_session_id UUID,
    p_message_type TEXT,
    p_content TEXT,
    p_citations JSONB DEFAULT '[]',
    p_response_time_ms INTEGER DEFAULT NULL,
    p_token_count INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    message_id UUID;
    citation JSONB;
BEGIN
    -- Insert message
    INSERT INTO chat_messages (
        session_id,
        message_type,
        content,
        token_count,
        response_time_ms,
        citations
    ) VALUES (
        p_session_id,
        p_message_type,
        p_content,
        p_token_count,
        p_response_time_ms,
        p_citations
    ) RETURNING id INTO message_id;
    
    -- Insert individual citations
    FOR citation IN SELECT * FROM jsonb_array_elements(p_citations)
    LOOP
        INSERT INTO message_citations (
            message_id,
            document_id,
            chunk_id,
            similarity_score,
            page_number,
            excerpt
        ) VALUES (
            message_id,
            (citation->>'document_id')::UUID,
            (citation->>'chunk_id')::UUID,
            (citation->>'similarity')::FLOAT,
            (citation->>'page_number')::INTEGER,
            citation->>'excerpt'
        );
    END LOOP;
    
    -- Update session message count
    UPDATE chat_sessions
    SET 
        total_messages = total_messages + 1,
        last_activity = NOW()
    WHERE id = p_session_id;
    
    RETURN message_id;
END;
$$;

-- Session analytics view
CREATE VIEW session_analytics AS
SELECT
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(total_messages) as avg_messages_per_session,
    AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_activity) - started_at))/60) as avg_session_duration_minutes
FROM chat_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Popular documents view
CREATE VIEW popular_documents AS
SELECT
    d.title,
    d.document_type,
    COUNT(mc.id) as citation_count,
    AVG(mc.similarity_score) as avg_similarity
FROM documents d
JOIN message_citations mc ON d.id = mc.document_id
GROUP BY d.id, d.title, d.document_type
ORDER BY citation_count DESC;

-- User query patterns
CREATE VIEW query_patterns AS
SELECT
    DATE(cm.created_at) as date,
    COUNT(*) as total_queries,
    AVG(LENGTH(cm.content)) as avg_query_length,
    COUNT(DISTINCT cm.session_id) as unique_sessions
FROM chat_messages cm
WHERE cm.message_type = 'user'
GROUP BY DATE(cm.created_at)
ORDER BY date DESC;

-- Function to clean old sessions (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_sessions(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old sessions and cascade to messages/citations
    DELETE FROM chat_sessions
    WHERE started_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Schedule cleanup (run daily)
SELECT cron.schedule('cleanup-old-sessions', '0 2 * * *', 'SELECT cleanup_old_sessions(90);');

-- Audit log table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id TEXT,
    session_id UUID,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        operation,
        old_data,
        new_data,
        user_id,
        session_id,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        current_setting('app.user_id', true),
        current_setting('app.session_id', true)::UUID,
        current_setting('app.ip_address', true)
    );
    RETURN NEW;
END;
$$;
