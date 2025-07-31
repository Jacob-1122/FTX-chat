import { supabase } from './supabaseClient';
import { ChatResponse } from '../types';

class ChatService {
  async sendMessage(message: string, guestToken?: string): Promise<ChatResponse> {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { message, guest_token: guestToken },
    });

    if (error) {
      console.error('Error calling chat function:', error);
      throw new Error('Failed to get a response from the AI assistant.');
    }

    return data;
  }
}

export const chatService = new ChatService();
