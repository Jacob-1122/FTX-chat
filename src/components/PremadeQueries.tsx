import React from 'react';

interface PremadeQueriesProps {
  onQuerySelect: (query: string) => void;
  disabled?: boolean;
}

const PremadeQueries: React.FC<PremadeQueriesProps> = ({ onQuerySelect, disabled }) => {
  const queries = [
    "What are the current market prices for FTX bankruptcy claims in both crypto and USD?",
    "Can you summarize the latest legal developments and important deadlines from recent FTX court filings?",
    "How do historical valuations of FTX claims compare to current prices, and what trends should clients be aware of?"
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-gray-700 text-gray-200 px-4 py-2 rounded-lg mb-2">
          <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold">Cherokee's FTX Agent</h3>
        </div>
        <p className="text-gray-400 text-sm">Choose a question to get started with professional legal analysis</p>
      </div>
      <div className="grid gap-3">
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQuerySelect(query)}
            disabled={disabled}
            className="group relative w-full text-left p-4 rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500 text-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                <span className="text-gray-300 font-medium text-sm">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-200 leading-relaxed text-sm">
                  {query}
                </p>
              </div>
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PremadeQueries;