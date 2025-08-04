export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  citations?: Citation[];
  isLoading?: boolean;
}

export interface Citation {
  id: string;
  documentTitle: string;
  pageNumber?: number;
  excerpt: string;
  similarity: number;
  url?: string;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  guest_token?: string;
  session_id?: string;
}

export interface ChatSession {
    id: string;
    started_at: string;
    last_activity: string;
    total_messages: number;
    summary?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    citations?: Citation[];
}
