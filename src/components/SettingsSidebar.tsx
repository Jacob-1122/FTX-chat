import React, { useState, useEffect } from 'react';
import { XMarkIcon, Cog6ToothIcon, CpuChipIcon, DocumentTextIcon, AdjustmentsHorizontalIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface SettingsSidebarProps {
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  knowledgeBase: string;
  maxSources: number;
  systemPrompt: string;
  contextWindow: number;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ 
  settings, 
  onSettingsChange 
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<ChatSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const models = [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest responses' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Latest advanced model' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Latest fast model' }
  ];

  const knowledgeBases = [
    { id: 'ftx_documents', name: 'FTX Legal Documents', description: 'Primary bankruptcy court filings' },
    { id: 'ftx_documents_internet', name: 'FTX Documents + Internet', description: 'Comprehensive search with web access', disabled: true }
  ];

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-600 shadow-2xl flex flex-col">
      <div className="bg-gray-750 border-b border-gray-600 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
            Chat Settings
          </h2>
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
            <div className="relative">
              <button
                type="button"
                className="w-full flex justify-between items-center p-3 border border-gray-600 rounded-lg bg-gray-750 hover:border-gray-500 hover:bg-gray-700 transition-all duration-200"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              >
                <div>
                  <div className="text-gray-200 font-medium text-sm">{models.find(m => m.id === localSettings.model)?.name}</div>
                  <div className="text-gray-400 text-xs">{models.find(m => m.id === localSettings.model)?.description}</div>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isModelDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      className="p-3 hover:bg-gray-600 cursor-pointer"
                      onClick={() => {
                        onSettingsChange({ ...localSettings, model: model.id });
                        setIsModelDropdownOpen(false);
                      }}
                    >
                      <div className="text-gray-200 font-medium text-sm">{model.name}</div>
                      <div className="text-gray-400 text-xs">{model.description}</div>
                    </div>
                  ))}
                </div>
              )}
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
                onChange={(e) => onSettingsChange({ ...localSettings, temperature: parseFloat(e.target.value) })}
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
                onChange={(e) => onSettingsChange({ ...localSettings, maxTokens: parseInt(e.target.value) })}
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
                <label key={kb.id} className={`relative flex items-center p-3 border rounded-lg transition-all duration-200 ${
                  localSettings.knowledgeBase === kb.id 
                    ? 'border-gray-500 bg-gray-700' 
                    : kb.disabled
                    ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                    : 'border-gray-600 bg-gray-750 hover:border-gray-500 hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="knowledgeBase"
                    value={kb.id}
                    checked={localSettings.knowledgeBase === kb.id}
                    onChange={(e) => onSettingsChange({ ...localSettings, knowledgeBase: e.target.value })}
                    className="hidden"
                    disabled={kb.disabled}
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
                  {kb.disabled && (
                    <span className="bg-yellow-800 text-yellow-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>



          {/* Max Sources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">
                  Max Sources
                </label>
              </div>
              <div className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs font-medium">
                {localSettings.maxSources}
              </div>
            </div>
            <div className="bg-gray-750 p-3 rounded-lg border border-gray-600">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={localSettings.maxSources}
                onChange={(e) => onSettingsChange({ ...localSettings, maxSources: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 Source</span>
                <span>5 Sources</span>
                <span>10 Sources</span>
              </div>
            </div>
          </div>

          {/* Context Window */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CpuChipIcon className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">
                  Context Window
                </label>
              </div>
              <div className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs font-medium">
                {localSettings.contextWindow}
              </div>
            </div>
            <div className="bg-gray-750 p-3 rounded-lg border border-gray-600">
              <input
                type="range"
                min="1000"
                max="8000"
                step="500"
                value={localSettings.contextWindow}
                onChange={(e) => onSettingsChange({ ...localSettings, contextWindow: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Short (1K)</span>
                <span>Medium (4K)</span>
                <span>Long (8K)</span>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">
                System Prompt
              </label>
            </div>
            <div className="bg-gray-750 p-3 rounded-lg border border-gray-600">
              <textarea
                value={localSettings.systemPrompt}
                onChange={(e) => onSettingsChange({ ...localSettings, systemPrompt: e.target.value })}
                className="w-full h-20 bg-gray-700 text-gray-200 rounded border border-gray-600 p-2 text-xs resize-none focus:ring-2 focus:ring-gray-500 focus:outline-none"
                placeholder="Enter custom system prompt..."
              />
            </div>
          </div>



        </div>

        </div>
    </div>
  );
};

export default SettingsSidebar;