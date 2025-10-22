
import React from 'react';
import { WaveformIcon } from './IconComponents';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-4">
        <WaveformIcon className="h-12 w-12 text-cyan-400" />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          Audio Transcriber
        </h1>
      </div>
      <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
        Harnessing the power of Gemini for seamless real-time and file-based audio transcription.
      </p>
    </header>
  );
};

export default Header;
