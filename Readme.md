# FTX Legal AI Chat Application

## Overview

The FTX Legal AI Chat Application is an enterprise-grade conversational AI system designed for legal document analysis and research. The platform enables secure document upload, intelligent processing, and contextual question-answering capabilities specifically tailored for FTX bankruptcy case documents.

## Architecture

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling and development
- Tailwind CSS for styling
- Heroicons for UI components

**Backend Services**
- Supabase for authentication and database management
- Supabase Edge Functions (Deno runtime) for serverless backend logic
- PostgreSQL with Row Level Security (RLS) for data isolation

**AI & Vector Processing**
- Zilliz Cloud for high-performance vector storage and similarity search
- OpenAI text-embedding-ada-002 for document vectorization
- Claude 3 Opus for natural language generation and response synthesis

**Document Processing**
- PDF parsing with enhanced text extraction
- Intelligent chunking with boilerplate filtering
- Client-side processing to optimize Edge Function performance

### System Components

1. **Authentication System**
   - Admin authentication with pre-configured credentials
   - Guest mode with session-based query limitations (7 queries per session)
   - Session management with persistent chat history for authenticated users

2. **Document Management**
   - Drag-and-drop PDF upload interface
   - Intelligent text extraction and chunking
   - Automatic boilerplate and header/footer filtering
   - Vector embedding generation and storage in Zilliz Cloud

3. **Chat Interface**
   - Real-time conversational interface
   - Citation-based responses with source document references
   - Modal popups for detailed document source viewing
   - Chat history persistence and management

4. **Data Security**
   - Row Level Security policies for multi-tenant data isolation
   - Secure session management for guest and authenticated users
   - API key management through Supabase secrets

## Installation and Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI (optional, for local development)
- Active accounts for:
  - Supabase
  - Zilliz Cloud
  - OpenAI
  - Anthropic (Claude)

### Environment Configuration

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL="your-supabase-project-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Zilliz Cloud Configuration
VITE_ZILLIZ_CLOUD_URI="your-zilliz-cluster-endpoint-uri"
VITE_ZILLIZ_CLOUD_API_KEY="your-zilliz-api-key"

# AI Services Configuration
VITE_OPENAI_API_KEY="your-openai-api-key"
VITE_CLAUDE_API_KEY="your-claude-api-key"
```

### Database Setup

1. **Create Supabase Project**
   - Initialize a new Supabase project
   - Note the project URL and anon key

2. **Run Database Migrations**
   
   Execute the following SQL files in order through the Supabase SQL Editor:
   
   ```sql
   -- 1. Initial schema setup
   supabase/migrations/20240730173300_initial_schema.sql
   
   -- 2. Authentication and UUID fixes
   supabase/migrations/20240801100000_chat_history_fix.sql
   
   -- 3. Vector database cleanup
   supabase/migrations/20240731121500_remove_vector_db.sql
   
   -- 4. Guest session RLS policies
   supabase/migrations/20240801120000_fix_guest_rls.sql
   ```

3. **Configure Supabase Secrets**
   
   In the Supabase Dashboard, navigate to Project Settings > Edge Functions and add:
   
   ```
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ZILLIZ_CLOUD_URI=your-zilliz-cluster-endpoint-uri
   ZILLIZ_CLOUD_API_KEY=your-zilliz-api-key
   OPENAI_API_KEY=your-openai-api-key
   CLAUDE_API_KEY=your-claude-api-key
   ```

### Zilliz Cloud Setup

1. **Create Collection**
   - Collection name: `ftx_documents`
   - Primary key: `primary_key` (auto-generated)
   - Vector field: `vector` (1536 dimensions)
   - Scalar fields: `text`, `document_name`, `page_number`
   - Dynamic Schema: OFF
   - Create AUTOINDEX on vector field

### Edge Functions Deployment

Deploy the serverless functions through the Supabase Dashboard:

1. **Chat Function** (`supabase/functions/chat/index.ts`)
   - Handles user queries and AI response generation
   - Manages session creation for both authenticated and guest users
   - Integrates vector search with Claude AI

2. **Process Document Function** (`supabase/functions/process-document/index.ts`)
   - Processes uploaded PDF documents
   - Generates embeddings and stores in Zilliz Cloud
   - Handles batch processing for large documents

### Frontend Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## User Modes

### Administrator Mode
- Full access to all features
- Document upload and management capabilities
- Persistent chat history across sessions
- Unlimited query capacity
- Access to all uploaded documents

**Default Admin Credentials:**
- Email: `jacob.goingss@gmail.com`
- Password: `ftx1234`

### Guest Mode
- Limited to 7 queries per browser session
- No persistent chat history
- Read-only access to existing document corpus
- Session-based token management

## Feature Documentation

### Document Processing Pipeline

1. **Upload**: Admin users drag and drop PDF files
2. **Parsing**: Client-side PDF text extraction using pdf-parse
3. **Chunking**: Intelligent text segmentation with boilerplate filtering
4. **Embedding**: OpenAI text-embedding-ada-002 vectorization
5. **Storage**: Vector storage in Zilliz Cloud with metadata

### Chat Functionality

1. **Query Processing**: User input vectorization and similarity search
2. **Context Retrieval**: Relevant document chunks from Zilliz Cloud
3. **Response Generation**: Claude 3 Opus synthesis with citation support
4. **History Management**: Session-based storage with RLS policies

### Security Implementation

- **Row Level Security**: Database-level access control
- **Session Management**: Secure token-based authentication
- **API Security**: Environment variable protection for sensitive keys
- **Guest Limitations**: Query throttling and session isolation

## Deployment Considerations

### Production Environment

- Configure proper CORS policies for production domains
- Implement rate limiting on Edge Functions
- Set up monitoring and logging for system health
- Consider CDN integration for static assets

### Scaling Considerations

- Zilliz Cloud provides automatic scaling for vector operations
- Supabase Edge Functions auto-scale based on demand
- Monitor OpenAI and Claude API rate limits and costs
- Implement document processing queues for high-volume uploads

## Troubleshooting

### Common Issues

1. **Module Import Errors**: Restart development server to clear module cache
2. **RLS Policy Violations**: Verify migration execution order and completeness
3. **Edge Function Timeouts**: Ensure document processing is client-side
4. **Vector Search Failures**: Verify Zilliz collection configuration and indexing

### Development Tools

- Browser Developer Tools for frontend debugging
- Supabase Dashboard for database and function monitoring
- Edge Function logs for backend error tracking
- Network tab for API request analysis

## API Documentation

### Edge Functions

**POST /functions/v1/chat**
```json
{
  "message": "string",
  "guest_token": "string (optional for guest sessions)"
}
```

**POST /functions/v1/process-document**
```json
{
  "chunks": ["string array"],
  "fileName": "string"
}
```

### Database Schema

Key tables:
- `chat_sessions`: User and guest session management
- `chat_messages`: Conversation history storage
- Authentication handled by Supabase Auth

## Contributing

When contributing to this project:

1. Follow TypeScript strict mode requirements
2. Maintain RLS policy integrity for security
3. Test both authenticated and guest user flows
4. Ensure Edge Function compatibility with Deno runtime
5. Document any new environment variables or setup requirements

## License

Enterprise deployment license. Contact system administrator for usage terms.