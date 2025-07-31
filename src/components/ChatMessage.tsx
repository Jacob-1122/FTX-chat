import React from 'react';
import { Message, Citation } from '../types';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/solid';
import CitationCard from './CitationCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCitationClick }) => {
  const isUser = message.role === 'user';

  const Avatar = () => (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${isUser ? 'bg-gray-600' : 'bg-blue-600'}`}>
      {isUser ? <UserIcon className="w-5 h-5" /> : <CpuChipIcon className="w-5 h-5" />}
    </div>
  );

  const Bubble = () => (
    <div className={`relative max-w-2xl px-5 py-3 rounded-2xl ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
        {message.isLoading ? (
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
        ) : (
            <div className="prose prose-invert prose-p:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
        )}
    </div>
  );

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar />
      <div className="flex flex-col">
        <Bubble />
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Sources:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {message.citations.map((citation, index) => (
                <CitationCard key={`${citation.id}-${index}`} citation={citation} onCitationClick={onCitationClick} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;