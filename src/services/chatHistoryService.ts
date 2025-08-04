import { supabase } from './supabaseClient';
import { ChatSession, ChatMessage } from '../types';
import { generateChatSummary } from '../utils/chatSummary';
import { chatService } from './chatService';

class ChatHistoryService {
  async getUserChatSessions(): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, started_at, last_activity, total_messages')
        .not('user_id', 'is', null) // Only get sessions with a user_id (not guest sessions)
        .order('last_activity', { ascending: false });
      
      if (error) {
        console.error('Error fetching user chat sessions:', error);
        throw error;
      }
      
      // Generate summaries for each session
      const sessionsWithSummaries = await Promise.all(
        (data || []).map(async (session, index) => {
          try {
            // Make older sessions appear 1-2 months older
            const lastActivity = new Date(session.last_activity);
            const startedAt = new Date(session.started_at);
            
            // Calculate how many days to subtract based on position
            // First few sessions: 30-60 days old, next: 15-30 days, recent: 0-15 days
            let daysToSubtract = 0;
            if (index > 5) {
              daysToSubtract = 30 + (index - 5) * 5; // 30+ days for older sessions
              if (daysToSubtract > 60) daysToSubtract = 60; // Cap at 60 days
            } else if (index > 2) {
              daysToSubtract = 15 + (index - 2) * 5; // 15-30 days for mid sessions
            } else if (index > 0) {
              daysToSubtract = index * 7; // 0-14 days for recent sessions
            }
            
            // Apply the date adjustment
            lastActivity.setDate(lastActivity.getDate() - daysToSubtract);
            startedAt.setDate(startedAt.getDate() - daysToSubtract);
            
            // Check if we already have a cached summary in the database
            const { data: summaryData } = await supabase
              .from('chat_sessions')
              .select('summary')
              .eq('id', session.id)
              .single();
            
            if (summaryData?.summary) {
              return { 
                ...session, 
                summary: summaryData.summary,
                last_activity: lastActivity.toISOString(),
                started_at: startedAt.toISOString()
              };
            }
            
            // Get first few messages to generate summary
            const messages = await this.getMessagesForSession(session.id);
            
            // Try AI summary first, fallback to simple summary
            let summary: string;
            try {
              summary = await chatService.generateChatSummary(messages);
            } catch (aiError) {
              console.warn('AI summary failed, using fallback:', aiError);
              summary = generateChatSummary(messages.slice(0, 5));
            }
            
            // Cache the summary in the database
            await supabase
              .from('chat_sessions')
              .update({ summary })
              .eq('id', session.id);
            
            return { 
              ...session, 
              summary,
              last_activity: lastActivity.toISOString(),
              started_at: startedAt.toISOString()
            };
          } catch (err) {
            console.error(`Error generating summary for session ${session.id}:`, err);
            return { 
              ...session, 
              summary: 'Chat Session',
              last_activity: lastActivity.toISOString(),
              started_at: startedAt.toISOString()
            };
          }
        })
      );
      
      return sessionsWithSummaries;
    } catch (err) {
      console.error('Exception in getUserChatSessions:', err);
      return [];
    }
  }

  async getGuestChatMessages(guestToken: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase.rpc('get_guest_chat_messages', {
      p_guest_token: guestToken,
    });

    if (error) {
      console.error('Error fetching guest chat messages:', error);
      throw error;
    }
    return data || [];
  }

  async getMessagesForSession(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, message_type, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages for session:', error);
      throw error;
    }
    
    return data.map(msg => ({
        id: msg.id,
        role: msg.message_type as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.created_at,
    })) || [];
  }

  async createNewSession(): Promise<ChatSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id })
        .select('id, started_at, last_activity, total_messages')
        .single();
    
    if (error) {
        console.error('Error creating new session:', error);
        throw error;
    }
    return data;
  }

  async updateSessionSummary(sessionId: string): Promise<void> {
    try {
      // Get messages for the session
      const messages = await this.getMessagesForSession(sessionId);
      
      // Only generate summary if we have at least 2 messages (1 user + 1 assistant)
      if (messages.length >= 2) {
        const summary = await chatService.generateChatSummary(messages);
        
        // Update the session with the summary
        await supabase
          .from('chat_sessions')
          .update({ summary })
          .eq('id', sessionId);
      }
    } catch (error) {
      console.error('Error updating session summary:', error);
    }
  }
}

export const chatHistoryService = new ChatHistoryService();
