'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index';
import { instructions } from './constants';

export default function Home() {
  const [items, setItems] = useState<ItemType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const apiKey = process.env.OPENAI_API_KEY;
  const wavRecorderRef = useRef<WavRecorder>(new WavRecorder({ sampleRate: 24000 }));
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(new WavStreamPlayer({ sampleRate: 24000 }));
  const clientRef = useRef<RealtimeClient>(new RealtimeClient({
    apiKey: apiKey,
    dangerouslyAllowAPIKeyInBrowser: true,
  }));

  const connectConversation = useCallback(async () => {
    if (!clientRef.current || !wavRecorderRef.current || !wavStreamPlayerRef.current) return;

    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    setIsConnected(true);
    setItems(client.conversation.getItems());

    try {
      console.log('Attempting to connect...');
      console.log('Connecting with client configuration:', {
        apiKey: apiKey?.substring(0, 10) + '...', // Log only the first 10 characters of the API key
        dangerouslyAllowAPIKeyInBrowser: true,
      });

      await wavRecorder.begin();
      console.log('WavRecorder begun');
      await wavStreamPlayer.connect();
      console.log('WavStreamPlayer connected');
      await client.connect();
      console.log('Client connected');
      console.log('Connected to conversation');
    } catch (error) {
      console.error('Error connecting:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnectConversation = useCallback(async () => {
    if (!clientRef.current || !wavRecorderRef.current || !wavStreamPlayerRef.current) return;

    setIsConnected(false);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();

    const deleteConversationItem = useCallback(async (id: string) => {
      const client = clientRef.current;
      client?.deleteItem(id);
    }, []);
    console.log('Disconnected from conversation');
  }, []);

  const startRecording = async () => {
    if (!clientRef.current || !wavRecorderRef.current || !wavStreamPlayerRef.current) {
      console.error('Client, WavRecorder, or WavStreamPlayer is not initialized when starting recording');
      return;
    }

    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }

    try {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
      console.log('Started recording');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!clientRef.current || !wavRecorderRef.current || !wavStreamPlayerRef.current) {
      console.error('Client, WavRecorder, or WavStreamPlayer is not initialized when stopping recording');
      return;
    }

    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    console.log('Recording paused');
    console.log('Creating response...');
    client.createResponse();
    console.log('Response created');
  };

  useEffect(() => {
    if (!clientRef.current || !wavStreamPlayerRef.current) {
      console.error('Client or WavStreamPlayer is not initialized when setting up event listeners');
      return;
    }

    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set instructions
    client.updateSession({ instructions: instructions });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    client.on('error', (event: any) => console.error(event));

    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    
    client.on('conversation.updated', async ({ item, delta }: any) => {
      console.log('Conversation update event received');
      const items = client.conversation.getItems();
      if (delta?.audio) {
        console.log('Audio delta received, adding to player');
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      console.log('Cleaning up client');
      client.reset();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 bg-white">
      <div className="w-full max-w-2xl border border-gray-200 rounded-lg p-4 mb-8 overflow-y-auto max-h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">Conversation</h2>
        {items.map((item, index) => (
          <div key={index} className="mb-2">
            <strong>{item.role}: </strong>
            {item.formatted.text || item.formatted.transcript || '(No content)'}
          </div>
        ))}
      </div>
      <div className="fixed bottom-8 left-0 right-0 flex justify-center space-x-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full text-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          onClick={isConnected ? disconnectConversation : connectConversation}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
        {isConnected && (
          <button
            className={`${
              isRecording ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'
            } text-white font-bold py-3 px-6 rounded-full text-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
          >
            {isRecording ? 'Release to Send' : 'Push to Talk'}
          </button>
        )}
      </div>
    </main>
  );
}
