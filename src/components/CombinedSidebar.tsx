import React from 'react';
import {
  ChatBubbleLeftRightIcon,
  PlusCircleIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { authService } from '../services/authService';
import { ChatSession } from '../types';
import AdminDashboard from './AdminDashboard';

interface CombinedSidebarProps {
  userEmail: string | null;
  sessions: ChatSession[];
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  activeSessionId: string | null;
  userMode: 'admin' | 'guest';
  onGuestLogout?: () => void;
}

export const CombinedSidebar: React.FC<CombinedSidebarProps> = ({
  userEmail,
  sessions,
  onSelectSession,
  onNewChat,
  activeSessionId,
  userMode,
  onGuestLogout,
}) => {
  return (
    <div className="flex flex-col w-80 bg-gray-800 text-gray-200">
      {/* User Info and Logout */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center">
          <UserCircleIcon className="h-8 w-8 mr-3" />
          <div>
            <p className="font-semibold">{userMode === 'admin' ? 'Admin User' : 'Guest'}</p>
            {userEmail && <p className="text-xs text-gray-400">{userEmail}</p>}
          </div>
        </div>
        {userMode === 'admin' ? (
          <button
            onClick={() => authService.signOut()}
            title="Sign Out"
            className="p-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        ) : userMode === 'guest' && onGuestLogout ? (
          <button
            onClick={onGuestLogout}
            title="Exit Guest Mode"
            className="p-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      {/* Admin: Document Upload */}
      {userMode === 'admin' && (
        <div className="p-4">
          <AdminDashboard />
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <h2 className="text-lg font-bold mb-2">Chat History</h2>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center p-2 mb-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <PlusCircleIcon className="h-6 w-6 mr-2" />
          New Chat
        </button>
        
        {userMode === 'admin' ? (
          <div>
            {sessions.length > 0 ? (
              <ul>
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className={`p-2 my-1 rounded-lg cursor-pointer transition-colors ${
                      activeSessionId === session.id ? 'bg-gray-700' : 'hover:bg-gray-600'
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex items-center">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 mr-3" />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium truncate">
                          {session.summary || 'Chat Session'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {new Date(session.last_activity).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No chat history yet. Start a conversation!</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sign in to see your chat history.</p>
        )}
      </div>
    </div>
  );
};