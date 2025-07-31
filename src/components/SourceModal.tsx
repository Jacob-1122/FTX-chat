import React from 'react';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Citation } from '../types';

interface SourceModalProps {
  citation: Citation | null;
  isOpen: boolean;
  onClose: () => void;
}

const SourceModal: React.FC<SourceModalProps> = ({ citation, isOpen, onClose }) => {
  if (!isOpen || !citation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-200">{citation.documentTitle}</h2>
              <p className="text-sm text-gray-400">
                Page {citation.pageNumber || 'N/A'} • {Math.round(citation.similarity * 100)}% match
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">Relevant Excerpt:</h3>
            <p className="text-gray-200 italic">"{citation.excerpt}"</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Full Document Content:</h3>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {/* For now, we'll show the excerpt expanded. In a real implementation,
                  you'd fetch the full document content from your database */}
              <p className="mb-4">{citation.excerpt}</p>
              <p className="text-gray-500 italic">
                Note: This is a preview of the document. The full content would be loaded from the database in a production environment.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Document ID: {citation.id}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceModal; 