'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import { storage } from '@/lib/storage';
import { sendChatRequest, processNDJSONStream } from '@/lib/ndjson-client';
import { MessageList } from '@/components/MessageList';
import { Composer } from '@/components/Composer';
import { Toolbar } from '@/components/Toolbar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ModelSelector } from '@/components/ModelSelector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';

type ChatState = 'idle' | 'connecting' | 'streaming' | 'stopped' | 'error';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<ChatState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // default to dark
  const [selectedModel, setSelectedModel] = useState('glm-4.5-flash');
  const [mounted, setMounted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hydration-safe initialization
  useEffect(() => {
    // Load theme preference
    const savedTheme = localStorage.getItem('querylane.theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }

    // Load selected model
    const savedModel = localStorage.getItem('querylane.model');
    if (savedModel) {
      setSelectedModel(savedModel);
    }

    // Load messages from storage
    setMessages(storage.getThread());
    setMounted(true);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      storage.saveThread(messages);
    }
  }, [messages, mounted]);

  // Save theme preference and apply to document whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('querylane.theme', isDarkMode ? 'dark' : 'light');

      // Apply dark class to html element for proper theme switching
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode, mounted]);

  // Save selected model whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('querylane.model', selectedModel);
    }
  }, [selectedModel, mounted]);

  const handleSend = async (userMessage: string) => {
    if (state === 'streaming') return;

    const newMessage: Message = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setState('connecting');
    setError(null);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await sendChatRequest(
        updatedMessages,
        controller.signal,
        selectedModel
      );
      setState('streaming');

      // Add assistant message placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let assistantMessage = '';

      await processNDJSONStream(response, {
        onMeta: () => {
          // Handle metadata if needed
        },
        onToken: (chunk) => {
          if (chunk.content) {
            assistantMessage += chunk.content;
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantMessage,
              };
              return newMessages;
            });
          }
        },
        onDone: () => {
          setState('idle');
          abortControllerRef.current = null;
        },
        onError: (chunk) => {
          setError(chunk.message || 'Unknown error occurred');
          setState('error');
          abortControllerRef.current = null;
        },
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      setState('error');
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState('stopped');
      abortControllerRef.current = null;
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setState('idle');
    storage.clearThread();
  };

  const handleCopy = () => {
    const lastAssistantMessage = messages
      .filter((msg) => msg.role === 'assistant')
      .pop();

    if (lastAssistantMessage) {
      navigator.clipboard.writeText(lastAssistantMessage.content);
    }
  };

  const getStateMessage = () => {
    switch (state) {
      case 'connecting':
        return 'Connecting...';
      case 'streaming':
        return 'Receiving response...';
      case 'stopped':
        return 'Response stopped';
      case 'error':
        return error || 'An error occurred';
      default:
        return '';
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const hasMessages = messages.length > 0;

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold shadow-lg text-sm sm:text-base">
              QL
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold">QueryLane</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold shadow-lg text-sm sm:text-base">
            QL
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base sm:text-lg font-semibold">QueryLane</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-secondary/80 transition-colors h-8 w-8 sm:h-10 sm:w-10"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      {!hasMessages ? (
        <WelcomeScreen
          onSend={handleSend}
          userName="Neo"
          selectedModel={selectedModel}
        />
      ) : (
        <>
          {/* Messages */}
          <MessageList messages={messages} />

          {/* State Message */}
          {state !== 'idle' && (
            <div className="px-3 sm:px-4 py-2 text-center text-xs sm:text-sm text-muted-foreground">
              {getStateMessage()}
            </div>
          )}

          {/* Toolbar */}
          <Toolbar
            onStop={state === 'streaming' ? handleStop : undefined}
            onClear={messages.length > 0 ? handleClear : undefined}
            onCopy={
              messages.some((msg) => msg.role === 'assistant')
                ? handleCopy
                : undefined
            }
            disabled={state === 'connecting'}
          />

          {/* Composer */}
          <Composer
            onSend={handleSend}
            disabled={state === 'connecting' || state === 'streaming'}
          />
        </>
      )}
    </div>
  );
}
