
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode } from '../utils/audio';
import { TranscriptionTurn } from '../types';
import { MicrophoneIcon, StopIcon, LoadingSpinner } from './IconComponents';

const LiveTranscriber: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, connecting, listening, error
  const [transcript, setTranscript] = useState<TranscriptionTurn[]>([]);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopListening = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
    setStatus('idle');
  }, []);

  const startListening = async () => {
    if (isListening) return;
    setStatus('connecting');
    setTranscript([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      // FIX: Use a cross-browser compatible AudioContext to satisfy TypeScript.
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsListening(true);
            setStatus('listening');

            const source = audioContextRef.current!.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setTranscript(prev => {
                const lastTurn = prev[prev.length - 1];
                if (lastTurn && lastTurn.speaker === 'You' && !lastTurn.isFinal) {
                  const updatedTurn = { ...lastTurn, text: currentInputTranscriptionRef.current };
                  return [...prev.slice(0, -1), updatedTurn];
                }
                return [...prev, { speaker: 'You', text: currentInputTranscriptionRef.current, isFinal: false, id: Date.now() }];
              });
            } else if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptionRef.current += text;
                setTranscript(prev => {
                    const lastTurn = prev[prev.length - 1];
                    if(lastTurn && lastTurn.speaker === 'Model' && !lastTurn.isFinal) {
                         const updatedTurn = { ...lastTurn, text: currentOutputTranscriptionRef.current };
                         return [...prev.slice(0, -1), updatedTurn];
                    }
                    return [...prev, { speaker: 'Model', text: currentOutputTranscriptionRef.current, isFinal: false, id: Date.now() }];
                });
            }

            if (message.serverContent?.turnComplete) {
              const finalInput = currentInputTranscriptionRef.current;
              const finalOutput = currentOutputTranscriptionRef.current;
              
              setTranscript(prev => prev.map(turn => {
                if ((turn.speaker === 'You' && turn.text === finalInput && !turn.isFinal) || (turn.speaker === 'Model' && turn.text === finalOutput && !turn.isFinal)) {
                    return {...turn, isFinal: true };
                }
                return turn;
              }));

              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setStatus('error');
            stopListening();
          },
          onclose: (e: CloseEvent) => {
            stopListening();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
        },
      });
    } catch (error) {
      console.error('Failed to start microphone:', error);
      setStatus('error');
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const renderStatus = () => {
    switch (status) {
      case 'idle':
        return 'Click the microphone to start live transcription.';
      case 'connecting':
        return 'Connecting to Gemini and accessing microphone...';
      case 'listening':
        return 'Listening... Speak into your microphone.';
      case 'error':
        return 'An error occurred. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto pr-2">
        {transcript.length > 0 ? (
          <div className="space-y-4">
            {transcript.map((turn) => (
              <div key={turn.id} className={`flex ${turn.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl p-3 rounded-lg ${turn.speaker === 'You' ? 'bg-blue-600' : 'bg-gray-700'} ${!turn.isFinal ? 'opacity-70' : ''}`}>
                  <p className="font-bold text-sm mb-1">{turn.speaker}</p>
                  <p>{turn.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg">{renderStatus()}</p>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 pt-6 flex flex-col items-center">
        {status === 'connecting' ? (
          <LoadingSpinner className="h-16 w-16 text-cyan-400" />
        ) : (
          <button
            onClick={isListening ? stopListening : startListening}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg
              ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-500 hover:bg-cyan-600'}
            `}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? (
              <StopIcon className="h-10 w-10 text-white" />
            ) : (
              <MicrophoneIcon className="h-10 w-10 text-white" />
            )}
          </button>
        )}
        <p className={`mt-4 text-sm ${status === 'listening' ? 'text-green-400 animate-pulse' : 'text-gray-400'}`}>
          {isListening ? 'Recording' : 'Ready'}
        </p>
      </div>
    </div>
  );
};

export default LiveTranscriber;
