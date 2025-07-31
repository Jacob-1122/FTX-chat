import { supabase } from './supabaseClient';
import { ChatResponse } from '../types';
import { ChatSettings } from '../components/SettingsSidebar';

class ChatService {
  async sendMessage(message: string, guestToken?: string, settings?: ChatSettings, newSession?: boolean): Promise<ChatResponse> {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { 
        message, 
        guest_token: guestToken,
        new_session: newSession,
        settings: settings ? {
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          knowledge_base: settings.knowledgeBase
        } : undefined
      },
    });

    if (error) {
      console.error('Error calling chat function:', error);
      throw new Error('Failed to get a response from the AI assistant.');
    }

    return data;
  }
}

export const chatService = new ChatService();
