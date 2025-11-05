'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, FormatConfig } from '@/lib/types';
import { sendChatRequest, processNDJSONStream } from '@/lib/ndjson-client';
import { processResponse } from '@/lib/json-parser';
import { responseHistory } from '@/lib/response-history';
import { customFormats } from '@/lib/custom-formats';
import { MessageList } from '@/components/MessageList';
import { Composer } from '@/components/Composer';
import { Toolbar } from '@/components/Toolbar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ModelSelector } from '@/components/ModelSelector';
import { FormatConfigurator } from '@/components/FormatConfigurator';
import { ChatHistory } from '@/components/ChatHistory';
import { ThemeProvider } from '@/components/ThemeProvider';
import {
  getCurrentOrCreateChat,
  getChatById,
  updateChat,
  createChat,
  setCurrentChatId,
} from '@/lib/chat-storage';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

type ChatState = 'idle' | 'connecting' | 'streaming' | 'stopped' | 'error';

export default function ChatPage() {
  const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<ChatState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // default to dark
  const [selectedModel, setSelectedModel] = useState('glm-4.5-flash');
  const [formatConfig, setFormatConfig] = useState<FormatConfig | null>(null);
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

    // Load current chat or create new one
    const currentChat = getCurrentOrCreateChat();
    setCurrentChatIdState(currentChat.id);
    setMessages(currentChat.messages);

    setMounted(true);
  }, []);

  // Save messages to current chat whenever they change
  useEffect(() => {
    if (mounted && currentChatId) {
      updateChat(currentChatId, { messages });
    }
  }, [messages, mounted, currentChatId]);

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
        selectedModel,
        formatConfig || undefined
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
          // Parse response if format config is set
          if (formatConfig) {
            const parsed = processResponse(
              assistantMessage,
              formatConfig.format,
              formatConfig.validationMode || 'lenient'
            );

            // Update message with parsed data
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantMessage,
                metadata: {
                  format: formatConfig.format,
                  parsed,
                  timestamp: Date.now(),
                },
              };
              return newMessages;
            });

            // Save to history if valid
            if (parsed.isValid && formatConfig.customFormatId) {
              const customFormat = customFormats.getById(formatConfig.customFormatId);

              responseHistory.add({
                prompt: userMessage,
                parsedResponse: parsed,
                templateId: formatConfig.customFormatId,
                templateName: customFormat?.name,
                model: selectedModel,
              });
            }
          }

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
    if (currentChatId) {
      updateChat(currentChatId, { messages: [] });
      setMessages([]);
      setError(null);
      setState('idle');
    }
  };

  const handleNewChat = () => {
    const newChat = createChat();
    setCurrentChatIdState(newChat.id);
    setMessages([]);
    setError(null);
    setState('idle');
  };

  const handleSelectChat = (chatId: string) => {
    const chat = getChatById(chatId);
    if (chat) {
      setCurrentChatIdState(chat.id);
      setCurrentChatId(chat.id); // Sync with storage
      setMessages(chat.messages);
      setError(null);
      setState('idle');
    }
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
        return 'Подключение...';
      case 'streaming':
        return 'Получение ответа...';
      case 'stopped':
        return 'Ответ остановлен';
      case 'error':
        return error || 'Произошла ошибка';
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
    return null;
  }

  return (
    <ThemeProvider isDarkMode={isDarkMode}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid',
          borderColor: isDarkMode ? '#27272a' : '#e4e4e7',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ChatHistory
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}>
              QL
            </div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>QueryLane</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
            <FormatConfigurator
              onFormatChange={setFormatConfig}
              currentConfig={formatConfig}
            />
            <IconButton
              onClick={toggleDarkMode}
              color="inherit"
              sx={{
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: 2,
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </div>
        </header>

      {/* Main Content */}
      {!hasMessages ? (
        <WelcomeScreen
          onSend={handleSend}
          userName="Друг"
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
    </ThemeProvider>
  );
}
