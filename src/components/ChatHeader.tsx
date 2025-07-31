import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface ChatHeaderProps {
  onSettingsClick: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-200">FTX Legal AI Chat</h1>
        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Settings"
        >
          <Cog6ToothIcon className="w-6 h-6 text-gray-400" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
