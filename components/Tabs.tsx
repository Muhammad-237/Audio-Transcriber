
import React from 'react';
import { MicrophoneIcon, UploadIcon } from './IconComponents';

type Tab = 'live' | 'file';

interface TabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'live', name: 'Live Transcription', icon: MicrophoneIcon },
    { id: 'file', name: 'File Upload', icon: UploadIcon },
  ];

  return (
    <div className="flex justify-center border-b border-gray-700">
      <nav className="flex space-x-4 sm:space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`
              flex items-center gap-2 px-3 py-4 text-sm sm:text-base font-medium transition-colors duration-200
              ${
                activeTab === tab.id
                  ? 'border-b-2 border-cyan-400 text-cyan-400'
                  : 'border-b-2 border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
