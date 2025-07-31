import React, { useState, useEffect } from 'react';
import { XMarkIcon, Cog6ToothIcon, CpuChipIcon, DocumentTextIcon, AdjustmentsHorizontalIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
}

import { ChatSettings } from './SettingsSidebar';

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange 
}) => {
  const [localSettings, setLocalSettings] = useState<ChatSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: ChatSettings = {
      model: 'claude-3-opus-20240229',
      temperature: 0.7,
      maxTokens: 1000,
      knowledgeBase: 'ftx_documents',
      maxSources: 4,
      systemPrompt: 'You are a helpful AI assistant specializing in legal document analysis.',
      contextWindow: 4000
    };
    setLocalSettings(defaultSettings);
  };

  const models = [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest responses' }
  ];

  const knowledgeBases = [
    { id: 'ftx_documents', name: 'FTX Legal Documents', description: 'Primary bankruptcy court filings' },
    { id: 'ftx_documents_internet', name: 'FTX Documents + Internet', description: 'Comprehensive search with web access' }
  ];

  return (
    <>
      {/* Backdrop overlay - only visible when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-gray-800 border-l border-gray-600 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* Expand Button - Always visible when closed */}
        {!isOpen && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-settings'))}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-gray-800 border border-gray-600 border-r-0 rounded-l-lg p-2 hover:bg-gray-700 transition-colors"
            title="Open Settings"
          >
            <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
          </button>
        )}
        
        <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-gray-750 border-b border-gray-600 p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
              Chat Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-600 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content - Full height with flex */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">

        <div className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CpuChipIcon className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">
                AI Model
              </label>
            </div>
            <div className="grid gap-2">
              {models.map((model) => (
                <label key={model.id} className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                  localSettings.model === model.id 
                    ? 'border-gray-500 bg-gray-700' 
                    : 'border-gray-600 bg-gray-750 hover:border-gray-500 hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="model"
                    value={model.id}
                    checked={localSettings.model === model.id}
                    onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    localSettings.model === model.id 
                      ? 'border-gray-400 bg-gray-400' 
                      : 'border-gray-500'
                  }`}>
                    {localSettings.model === model.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-200 font-medium text-sm">{model.name}</div>
                    <div className="text-gray-400 text-xs">{model.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">
                  Temperature
                </label>
              </div>
              <div className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs font-medium">
                {localSettings.temperature}
              </div>
            </div>
            <div className="bg-gray-750 p-3 rounded-lg border border-gray-600">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localSettings.temperature}
                onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer temperature-slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Focused (0.0)</span>
                <span>Balanced (0.5)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">
                  Max Response Length
                </label>
              </div>
              <div className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs font-medium">
                {localSettings.maxTokens} tokens
              </div>
            </div>
            <div className="bg-gray-750 p-3 rounded-lg border border-gray-600">
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={localSettings.maxTokens}
                onChange={(e) => setLocalSettings({ ...localSettings, maxTokens: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer tokens-slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Short (500)</span>
                <span>Medium (2000)</span>
                <span>Long (4000)</span>
              </div>
            </div>
          </div>

          {/* Knowledge Base */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <DocumentTextIcon className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">
                Knowledge Base
              </label>
            </div>
            <div className="grid gap-2">
              {knowledgeBases.map((kb) => (
                <label key={kb.id} className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                  localSettings.knowledgeBase === kb.id 
                    ? 'border-gray-500 bg-gray-700' 
                    : 'border-gray-600 bg-gray-750 hover:border-gray-500 hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="knowledgeBase"
                    value={kb.id}
                    checked={localSettings.knowledgeBase === kb.id}
                    onChange={(e) => setLocalSettings({ ...localSettings, knowledgeBase: e.target.value })}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    localSettings.knowledgeBase === kb.id 
                      ? 'border-gray-400 bg-gray-400' 
                      : 'border-gray-500'
                  }`}>
                    {localSettings.knowledgeBase === kb.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-200 font-medium text-sm">{kb.name}</div>
                    <div className="text-gray-400 text-xs">{kb.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-gray-750 border-t border-gray-600 p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-600 hover:border-gray-400 transition-all duration-200 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-600 hover:border-gray-400 transition-all duration-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-all duration-200 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </button>
          </div>
        </div>
        
        </div>
      </div>
    </>
  );
};

export default SettingsSidebar;