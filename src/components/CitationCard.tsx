import React from 'react';
import { Citation } from '../types';
import { DocumentTextIcon } from '@heroicons/react/24/solid';

interface CitationCardProps {
  citation: Citation;
  onCitationClick?: (citation: Citation) => void;
}

const CitationCard: React.FC<CitationCardProps> = ({ citation, onCitationClick }) => {
  const handleClick = () => {
    if (onCitationClick) {
      onCitationClick(citation);
    }
  };

  return (
    <div 
      className="bg-gray-700 p-3 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <DocumentTextIcon className="w-5 h-5 mt-1 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-200 truncate" title={citation.documentTitle}>
            {citation.documentTitle}
          </h4>
          <div className="flex justify-between items-baseline mt-1">
            <p className="text-xs text-gray-400">
              Page {citation.pageNumber || 'N/A'}
            </p>
            <span className="text-xs bg-gray-600 text-blue-300 font-medium px-2 py-0.5 rounded-full">
              {Math.round(citation.similarity * 100)}% match
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2 italic line-clamp-2">
            "{citation.excerpt}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default CitationCard;