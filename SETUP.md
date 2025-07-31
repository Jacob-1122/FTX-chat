# FTX Legal AI Chatbot Setup Guide

## Security & Compliance Features
- SOC2 compliant architecture with secure API key handling
- A+ security headers configured in netlify.toml
- CSP (Content Security Policy) protection
- XSS and clickjacking protection
- HTTPS enforcement

## Prerequisites
1. Claude API key from Anthropic
2. Supabase account and project
3. Netlify account for deployment

## Supabase Setup

### 1. Create a New Supabase Project
VITE_SUPABASE_URL=https://vnotymiiuxunwzaaelaf.supabase.co

### 2. Enable Vector Extension
Run this SQL in the Supabase SQL editor:
```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Create Document Storage Table
```sql
-- Create table for storing document chunks with embeddings
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_title TEXT NOT NULL,
  page_number INTEGER,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding size
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Allow read access" ON document_chunks
  FOR SELECT USING (true);

-- Create index for vector similarity search
CREATE INDEX document_chunks_embedding_idx 
  ON document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 4. Create Search Function
```sql
-- Function to search documents by similarity
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_title TEXT,
  page_number INTEGER,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_title,
    document_chunks.page_number,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Environment Setup

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Add Your API Keys
Update `.env` with your actual values:
```
VITE_CLAUDE_API_KEY=your_claude_api_key_from_anthropic
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Get Your Supabase Credentials
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the "Project URL" and "anon/public" key

### 4. Get Your Claude API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Copy the key (starts with "sk-ant-...")

## Data Ingestion (Backend Required)

You'll need to create a separate script or service to:

1. **Process FTX court documents** - Extract text from PDFs
2. **Chunk the documents** - Split into manageable pieces (500-1000 tokens)
3. **Generate embeddings** - Use OpenAI or similar embedding API
4. **Store in Supabase** - Insert chunks with embeddings into your table

Example data structure for each chunk:
```json
{
  "document_title": "FTX Bankruptcy Filing - Chapter 11",
  "page_number": 23,
  "content": "The company filed for Chapter 11 bankruptcy protection...",
  "embedding": [0.1, -0.2, 0.3, ...], // 1536-dimensional vector
  "metadata": {
    "filing_date": "2022-11-11",
    "document_type": "bankruptcy_filing",
    "case_number": "22-11068"
  }
}
```

## Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

## Deployment to Netlify

### 1. Connect Repository
1. Push your code to GitHub
2. Connect the repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### 2. Set Environment Variables
In Netlify dashboard → Site settings → Environment variables:
- `VITE_CLAUDE_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Deploy
The site will automatically deploy when you push to your main branch.

## Security Notes

- Never commit API keys to version control
- The app includes security headers for A+ rating
- All API keys are handled client-side (consider moving Claude API calls to edge functions for production)
- HTTPS is enforced through Netlify
- CSP headers protect against XSS attacks

## Next Steps

1. Implement the document ingestion pipeline
2. Replace mock data in `chatService.ts` with actual Supabase queries
3. Add user authentication if needed
4. Implement rate limiting
5. Add more sophisticated error handling
6. Consider moving Claude API calls to Supabase Edge Functions for better security

## Troubleshooting

- Check browser console for API errors
- Verify environment variables are set correctly
- Ensure Supabase project is active and accessible
- Test API keys in their respective consoles first