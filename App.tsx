
import React, { useState } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import LiveTranscriber from './components/LiveTranscriber';
import FileUploadTranscriber from './components/FileUploadTranscriber';

type Tab = 'live' | 'file';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('live');

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <div className="container mx-auto max-w-4xl p-4 sm:p-6">
        <Header />
        <main className="mt-8">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 sm:p-8 min-h-[60vh]">
            {activeTab === 'live' ? <LiveTranscriber /> : <FileUploadTranscriber />}
          </div>
        </main>
        <footer className="text-center text-gray-500 mt-8 text-sm">
          <p>&copy; {new Date().getFullYear()} Gemini Audio Transcriber. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
