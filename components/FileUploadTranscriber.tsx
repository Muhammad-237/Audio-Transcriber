
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UploadIcon, LoadingSpinner, DocumentTextIcon } from './IconComponents';

const FileUploadTranscriber: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTranscription('');
      setError('');
    }
  };
  
  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  // FIX: Removed useCallback to fix confusing scope-related errors from the linter.
  const handleTranscribe = async () => {
    if (!file) {
      setError('Please select an audio file first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setTranscription('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const audioPart = await fileToGenerativePart(file);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { text: "Transcribe the following audio. Provide only the text of the transcription, without any additional commentary." },
            audioPart
          ],
        },
      });
      
      setTranscription(response.text);

    } catch (err: any) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe the audio. Please check the console for details. The file might be too large or in an unsupported format.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <label htmlFor="audio-upload" className="block text-sm font-medium text-gray-300 mb-2">
          Upload Audio File
        </label>
        <div className="flex items-center justify-center w-full">
          <label htmlFor="audio-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700/50 hover:bg-gray-700/80 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">MP3, WAV, M4A, FLAC, etc.</p>
              {file && <p className="text-xs text-green-400 mt-2 truncate max-w-xs">{file.name}</p>}
            </div>
            <input id="audio-upload" type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Note: While the model is powerful, web browser limitations may affect uploads of very large files (e.g., &gt;100MB).
        </p>

        <div className="mt-6">
          <button
            onClick={handleTranscribe}
            disabled={!file || isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white bg-cyan-600 rounded-md shadow-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="w-5 h-5" />
                <span>Transcribing...</span>
              </>
            ) : (
              'Transcribe Audio'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 text-sm text-red-300 bg-red-800/50 border border-red-700 rounded-md">
            {error}
          </div>
        )}

        {transcription && (
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
              <DocumentTextIcon className="w-6 h-6 text-cyan-400" />
              Transcription Result
            </h3>
            <div className="mt-2 p-4 bg-gray-900 border border-gray-700 rounded-md text-gray-300 whitespace-pre-wrap">
              {transcription}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadTranscriber;
