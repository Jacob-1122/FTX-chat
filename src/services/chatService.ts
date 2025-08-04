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

  async generateChatSummary(messages: { role: string; content: string }[]): Promise<string> {
    try {
      // Take first few messages to generate summary
      const messagesToSummarize = messages.slice(0, 5);
      
      if (messagesToSummarize.length === 0) {
        return 'New Chat Session';
      }
      
      // Create a prompt for summarization
      const conversationText = messagesToSummarize
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      const summaryPrompt = `Generate a concise 3-word summary for this chat conversation. The summary should capture the main topic or question being discussed. Focus on the key subject matter, not generic descriptions.

Conversation:
${conversationText}

Generate only the 3-word summary, nothing else.`;

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: summaryPrompt,
          settings: {
            model: 'claude-3-haiku-20240307', // Use faster model for summaries
            temperature: 0.3,
            max_tokens: 20
          }
        },
      });

      if (error) {
        console.error('Error generating AI summary:', error);
        throw error;
      }

      // Clean up the response to ensure it's just 3 words
      const summary = data.message.trim();
      const words = summary.split(/\s+/).slice(0, 3);
      
      return words.join(' ') || 'Chat Session';
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      // Fallback to simple summary
      const firstUserMessage = messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        const words = firstUserMessage.content
          .split(/\s+/)
          .filter(word => word.length > 3)
          .slice(0, 3);
        return words.join(' ') || 'Chat Session';
      }
      return 'Chat Session';
    }
  }
}

export const chatService = new ChatService();
