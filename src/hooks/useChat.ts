import { useState, useCallback, useEffect } from 'react';
import { Message, ChatMessage, ChatSession } from '../types';
import { chatService } from '../services/chatService';
import { chatHistoryService } from '../services/chatHistoryService';
import { ChatSettings } from '../components/SettingsSidebar';

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
  const [needsNewSession, setNeedsNewSession] = useState(false);
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

  const sendMessage = useCallback(async (content: string, settings?: ChatSettings) => {
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
      const response = await chatService.sendMessage(
        content, 
        authMode === 'guest' ? guestToken : undefined,
        settings,
        needsNewSession || !currentSessionId // Create new session if needed or if no current session
      );
      
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: response.message,
        role: 'assistant',
        timestamp: new Date(),
        citations: response.citations,
      };

      setMessages(prev => prev.slice(0, -1).concat(assistantMessage));
      
      // Update session tracking
      if (response.session_id) {
        setCurrentSessionId(response.session_id);
      }
      if (authMode === 'guest' && response.guest_token) {
        setGuestToken(response.guest_token);
      }
      
      // Reset new session flag after first message
      if (needsNewSession) {
        setNeedsNewSession(false);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
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
  }, [authMode, guestToken, needsNewSession, currentSessionId]);

  const loadMessages = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const pastMessages = await chatHistoryService.getMessagesForSession(sessionId);
      const formattedMessages: Message[] = pastMessages.map((msg: ChatMessage) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp),
        citations: msg.citations,
      }));
      setMessages(formattedMessages);
      setCurrentSessionId(sessionId);
      setNeedsNewSession(false); // Reset new session flag when loading existing session
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
    setNeedsNewSession(true); // Flag that next message should create new session
    // Don't clear guest token for new chats - guests should keep their session
  }, []);

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