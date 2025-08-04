import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  onFileUpload?: (files: FileList) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, disabled, onFileUpload }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files);
      // Reset file input
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // Increased max height for better expansion
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  return (
    <div className="bg-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.json"
          />
          <button
            type="button"
            onClick={handleFileClick}
            disabled={isLoading || disabled}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <PlusIcon className="w-5 h-5 text-gray-400" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Query limit reached for guest session." : "Ask a question about the FTX court documents..."}
            className="w-full resize-none bg-gray-700 text-gray-200 rounded-lg pr-12 pl-14 py-3 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none overflow-hidden"
            disabled={isLoading || disabled}
            rows={1}
            style={{ minHeight: '52px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
