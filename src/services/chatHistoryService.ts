import { supabase } from './supabaseClient';
import { ChatSession, ChatMessage } from '../types';

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
      return data || [];
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
}

export const chatHistoryService = new ChatHistoryService();
