import { useState, useCallback, useEffect } from 'react';
import { Message, ChatMessage, ChatSession } from '../types';
import { chatService } from '../services/chatService';
import { chatHistoryService } from '../services/chatHistoryService';

const GUEST_TOKEN_KEY = 'ftx_guest_token';

const welcomeMessage: Message = {
    id: '1',
    content: 'Hello! I\'m your FTX Legal AI assistant. I can help you analyze and understand the FTX court case documents. What would you like to know?',
    role: 'assistant',
    timestamp: new Date(),
};

export const useChat = (authMode: 'admin' | 'guest') => {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | undefined>(() => {
    return sessionStorage.getItem(GUEST_TOKEN_KEY) || undefined;
  });

  useEffect(() => {
    if (guestToken) {
      sessionStorage.setItem(GUEST_TOKEN_KEY, guestToken);
    } else {
      sessionStorage.removeItem(GUEST_TOKEN_KEY);
    }
  }, [guestToken]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, { ...welcomeMessage, id: 'loading', isLoading: true }]);
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(content, authMode === 'guest' ? guestToken : undefined);
      
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: response.message,
        role: 'assistant',
        timestamp: new Date(),
        citations: response.citations,
      };

      setMessages(prev => prev.slice(0, -1).concat(assistantMessage));
      if (authMode === 'guest' && response.guest_token) {
        setGuestToken(response.guest_token);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'I apologize, but I encountered an error. Please try again later.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => prev.slice(0, -1).concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [authMode, guestToken]);

  const loadMessages = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const pastMessages = await chatHistoryService.getMessagesForSession(sessionId);
      const formattedMessages: Message[] = pastMessages.map((msg: ChatMessage) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(formattedMessages);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error("Failed to load messages for session", sessionId, error);
      setMessages([ { ...welcomeMessage, id: 'error', content: "Failed to load chat history."} ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([welcomeMessage]);
    setCurrentSessionId(null);
    // Don't clear guest token for new chats - guests should keep their session
  }, [authMode]);

  return {
    messages,
    isLoading,
    sendMessage,
    startNewChat,
    loadMessages,
    currentSessionId,
    setCurrentSessionId,
  };
};