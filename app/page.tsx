'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index';
import { instructions } from './constants';

import { Mic, Phone, PhoneOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

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

  const chatEndRef = useRef<HTMLDivElement>(null);

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

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [items])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 flex flex-col h-[calc(100vh-4rem)]">
          <ScrollArea className="flex-grow mb-4 pr-4">
            {items.map((item, index) => (
              <div
                key={index}
                className={`mb-4 p-3 rounded-lg ${
                  item.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                } max-w-[80%] ${item.role === "user" ? "ml-auto" : "mr-auto"}`}
              >
                <p className="text-sm font-medium mb-1">{item.role === "user" ? "You" : "AI"}</p>
                <p>{item.formatted.text || item.formatted.transcript || "(No content)"}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </ScrollArea>
          <div className="flex justify-center space-x-4">
            <Button
              size="lg"
              variant={isConnected ? "destructive" : "default"}
              className="rounded-full text-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
              onClick={isConnected ? disconnectConversation : connectConversation}
            >
              {isConnected ? (
                  <>
                    <PhoneOff className="mr-2 h-5 w-5" />
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-5 w-5" />
                    Connect
                  </>
                )}
            </Button>
            {isConnected && (
              <Button
                size="lg"
                className={`rounded-full text-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 ${
                  isRecording ? "animate-pulse" : ""
                }`}
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
              >
                {isRecording ? (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Release to Send
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Push to Talk
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
