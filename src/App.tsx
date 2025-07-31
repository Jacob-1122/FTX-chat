import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService } from './services/authService';
import { chatHistoryService } from './services/chatHistoryService';
import LoginPage from './components/LoginPage';
import ChatHeader from './components/ChatHeader';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { CombinedSidebar } from './components/CombinedSidebar';
import SourceModal from './components/SourceModal';
import PremadeQueries from './components/PremadeQueries';
import SettingsSidebar, { ChatSettings } from './components/SettingsSidebar';
import { useChat } from './hooks/useChat';
import { ChatSession, Citation } from './types';

type UserMode = 'admin' | 'guest' | 'loggedOut';

const GUEST_QUERY_LIMIT = 7;

function App() {
  const [userMode, setUserMode] = useState<UserMode>('loggedOut');
  const [session, setSession] = useState<Session | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [queryCount, setQueryCount] = useState(0);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    model: 'claude-3-opus-20240229',
    temperature: 0.7,
    maxTokens: 1000,
    knowledgeBase: 'ftx_documents',
    maxSources: 4,
    systemPrompt: 'You are a helpful AI assistant specializing in legal document analysis.',
    contextWindow: 4000
  });

  const { messages, isLoading, sendMessage, startNewChat, loadMessages, currentSessionId } = useChat(userMode as 'admin' | 'guest');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentSession = authService.getSessionSync();
    setSession(currentSession);
    if (currentSession) {
      setUserMode('admin');
    }
    // Don't automatically set to 'loggedOut' here - let the user choose guest mode

    const { data: authListener } = authService.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // Only change userMode for explicit auth events, not initial session checks
      if (_event === 'SIGNED_IN') {
        setUserMode('admin');
      } else if (_event === 'SIGNED_OUT') {
        setUserMode('loggedOut');
        startNewChat();
      }
      // Ignore INITIAL_SESSION events - they shouldn't override user choice
    });

    return () => authListener.subscription.unsubscribe();
  }, [startNewChat]);

  useEffect(() => {
    if (userMode === 'admin') {
      chatHistoryService.getUserChatSessions().then(setChatSessions);
    }
  }, [userMode, messages]); // Refreshes sessions when a new message is sent

  useEffect(() => {
    if (userMode === 'guest') {
      const storedCount = sessionStorage.getItem('queryCount') || '0';
      setQueryCount(parseInt(storedCount, 10));
    }
  }, [userMode]);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to ensure all new parameters exist
        setChatSettings({
          model: 'claude-3-opus-20240229',
          temperature: 0.7,
          maxTokens: 1000,
          knowledgeBase: 'ftx_documents',
          maxSources: 4,
          systemPrompt: 'You are a helpful AI assistant specializing in legal document analysis.',
          contextWindow: 4000,
          ...parsed 
        });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const handleSettingsChange = (newSettings: ChatSettings) => {
    setChatSettings(newSettings);
    localStorage.setItem('chatSettings', JSON.stringify(newSettings));
  };

  const handleSendMessage = (message: string) => {
    if (userMode === 'guest' && queryCount >= GUEST_QUERY_LIMIT) return;
    if (userMode === 'guest') {
      const newCount = queryCount + 1;
      setQueryCount(newCount);
      sessionStorage.setItem('queryCount', newCount.toString());
    }
    sendMessage(message, chatSettings);
  };

  const handlePremadeQuery = (query: string) => {
    handleSendMessage(query);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCitation(null);
  };

  if (userMode === 'loggedOut') {
    return <LoginPage onEnterGuestMode={() => setUserMode('guest')} />;
  }

  const isGuestQueryLimitReached = userMode === 'guest' && queryCount >= GUEST_QUERY_LIMIT;

  const handleGuestLogout = () => {
    setUserMode('loggedOut');
    setQueryCount(0);
    sessionStorage.removeItem('queryCount');
    startNewChat();
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <CombinedSidebar
        userEmail={session?.user?.email ?? null}
        sessions={chatSessions}
        onSelectSession={loadMessages}
        onNewChat={startNewChat}
        activeSessionId={currentSessionId}
        userMode={userMode as 'admin' | 'guest'}
        onGuestLogout={handleGuestLogout}
      />
      <div className="flex-1 flex flex-col">
        <ChatHeader />
        <main className="flex-1 overflow-y-auto p-4 bg-gray-800 custom-scrollbar">
          <div className="max-w-4xl mx-auto h-full">
            {messages.length === 0 && (
              <div className="flex items-center justify-center min-h-full">
                <div className="max-w-3xl w-full">
                  <PremadeQueries 
                    onQuerySelect={handlePremadeQuery}
                    disabled={isGuestQueryLimitReached}
                  />
                </div>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onCitationClick={handleCitationClick} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={isGuestQueryLimitReached}
        />
        {isGuestQueryLimitReached && (
          <div className="text-center text-sm text-yellow-400 bg-yellow-900 p-2 border-t border-yellow-700">
            You have reached the 7-query limit. Please sign in for unlimited access.
          </div>
        )}
      </div>
      <SourceModal 
        citation={selectedCitation}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
      
      <SettingsSidebar
        settings={chatSettings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}

export default App;