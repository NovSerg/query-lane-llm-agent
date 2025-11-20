'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, Agent } from '@/lib/types';
import { sendChatRequest, processNDJSONStream } from '@/lib/ndjson-client';
import { processResponse } from '@/lib/json-parser';
import { responseHistory } from '@/lib/response-history';
import { agentStorage } from '@/lib/agent-storage';
import { MessageList } from '@/components/MessageList';
import { Composer } from '@/components/Composer';
import { Toolbar } from '@/components/Toolbar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AgentManager } from '@/components/AgentManager';
import { ChatHistory } from '@/components/ChatHistory';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TokenCounter } from '@/components/TokenCounter';
import { CompactButton } from '@/components/CompactButton';
import { NotificationPanel } from '@/components/NotificationPanel';
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
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [mounted, setMounted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hydration-safe initialization
  useEffect(() => {
    const initialize = async () => {
      // Load theme preference
      const savedTheme = localStorage.getItem('querylane.theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
      }

      // Add missing default agents (for updates with new agents)
      const addedCount = await agentStorage.addMissingDefaults();

      // If new agents were added, reload the page to show them
      if (addedCount > 0) {
        window.location.reload();
        return;
      }

      // Initialize agent storage to ensure defaults exist
      await agentStorage.initialize();

      // Load active agent
      const agent = await agentStorage.getActiveAgent();
      if (agent) {
        setActiveAgent(agent);
      }

      // Load current chat or create new one
      const currentChat = await getCurrentOrCreateChat();
      setCurrentChatIdState(currentChat.id);
      setMessages(currentChat.messages);

      setMounted(true);
    };

    initialize();
  }, []);

  // NOTE: Removed real-time save on every message change
  // Now saving only after complete LLM response to avoid file conflicts during streaming

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

  const handleSend = async (userMessage: string) => {
    if (state === 'streaming' || !activeAgent) return;

    // Clear previous errors
    setError(null);

    const newMessage: Message = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newMessage];

    // Check context limit before sending
    const { shouldCompact: needsCompaction } = await import('@/lib/token-counter');
    if (needsCompaction(updatedMessages, activeAgent.systemPrompt, activeAgent.model, 90)) {
      setError('⚠️ Контекст почти заполнен (>90%). Сожмите диалог перед отправкой.');
      setState('error');
      return;
    }

    setMessages(updatedMessages);
    setState('connecting');

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // ВАЖНО: Перечитываем агента из storage перед запросом
      // чтобы гарантировать актуальные параметры
      const currentAgent = await agentStorage.getById(activeAgent.id) || activeAgent;

      console.log('[PAGE] Отправка с агентом:', {
        name: currentAgent.name,
        temperature: currentAgent.parameters?.temperature,
        model: currentAgent.model,
      });

      // Prepare messages with agent's system prompt
      let messagesToSend = [...updatedMessages];

      // Add agent's system prompt as first message if it exists and not already added
      if (currentAgent.systemPrompt && currentAgent.systemPrompt.trim()) {
        const hasSystemMessage = messagesToSend.some(msg => msg.role === 'system');

        if (!hasSystemMessage) {
          // Add system prompt at the beginning
          messagesToSend = [
            { role: 'system', content: currentAgent.systemPrompt },
            ...messagesToSend
          ];
        }
      }

      // Use agent's configuration (from freshly loaded agent)
      const response = await sendChatRequest(
        messagesToSend,
        controller.signal,
        currentAgent.model,
        currentAgent.formatConfig,
        currentAgent.parameters
      );
      setState('streaming');

      // Add assistant message placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let assistantMessage = '';
      const startTime = Date.now();

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
        onDone: (chunk) => {
          const responseTime = Date.now() - startTime;
          const usage = chunk.usage;

          // Parse response if format config is set
          const formatConfig = activeAgent.formatConfig;

          // Use cost from provider (OpenRouter provides actual cost)
          // For Z.AI, set cost to 0 (subscription-based)
          let cost: number | undefined;
          if (usage) {
            if (usage.cost !== undefined) {
              // OpenRouter provides actual cost
              cost = usage.cost;
            } else if (currentAgent.provider === 'zai') {
              // Z.AI - subscription, no per-request cost
              cost = 0;
            }
          }

          if (formatConfig && formatConfig.format !== 'text') {
            const parsed = processResponse(
              assistantMessage,
              formatConfig.format,
              formatConfig.validationMode || 'lenient'
            );

            // Update message with parsed data and metrics
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantMessage,
                metadata: {
                  format: formatConfig.format,
                  parsed,
                  timestamp: Date.now(),
                  model: currentAgent.model,
                  responseTime,
                  inputTokens: usage?.inputTokens,
                  outputTokens: usage?.outputTokens,
                  cost,
                },
              };

              // Save to storage after complete response
              if (currentChatId) {
                setTimeout(() => {
                  updateChat(currentChatId, { messages: newMessages });
                }, 100);
              }

              return newMessages;
            });

            // Save to history if valid
            if (parsed.isValid) {
              responseHistory.add({
                prompt: userMessage,
                parsedResponse: parsed,
                templateId: activeAgent.id,
                templateName: activeAgent.name,
                model: activeAgent.model,
              });
            }
          } else {
            // Update message with metrics even for text format
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantMessage,
                metadata: {
                  timestamp: Date.now(),
                  model: currentAgent.model,
                  responseTime,
                  inputTokens: usage?.inputTokens,
                  outputTokens: usage?.outputTokens,
                  cost,
                },
              };

              // Save to storage after complete response
              if (currentChatId) {
                setTimeout(() => {
                  updateChat(currentChatId, { messages: newMessages });
                }, 100);
              }

              return newMessages;
            });
          }

          setState('idle');
          abortControllerRef.current = null;
        },
        onError: (chunk) => {
          setError(chunk.message || 'Unknown error occurred');
          setState('error');
          abortControllerRef.current = null;

          // Save partial response even on error
          if (currentChatId) {
            setTimeout(() => {
              updateChat(currentChatId, { messages });
            }, 100);
          }
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

      // Save partial response
      if (currentChatId) {
        setTimeout(() => {
          updateChat(currentChatId, { messages });
        }, 100);
      }
    }
  };

  const handleClear = async () => {
    if (currentChatId) {
      await updateChat(currentChatId, { messages: [] });
      setMessages([]);
      setError(null);
      setState('idle');
    }
  };

  const handleNewChat = async () => {
    const newChat = await createChat();
    setCurrentChatIdState(newChat.id);
    setMessages([]);
    setError(null);
    setState('idle');
  };

  const handleSelectChat = async (chatId: string) => {
    const chat = await getChatById(chatId);
    if (chat) {
      setCurrentChatIdState(chat.id);
      await setCurrentChatId(chat.id); // Sync with storage
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

  const handleCompact = async () => {
    if (!activeAgent || !currentChatId) return;

    try {
      // Import compaction utilities
      const { applyCompactionSummary } = await import(
        '@/lib/message-compactor'
      );

      // Check if we have any messages to compact
      if (messages.length === 0) {
        console.log('Nothing to compact - no messages');
        return;
      }

      console.log(`Compacting ${messages.length} messages into a summary...`);

      // Call API to get summary of ALL messages
      const response = await fetch('/api/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
          model: activeAgent.model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.message
          ? `${errorData.error}: ${errorData.message}`
          : errorData.error || 'Compaction failed';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('Summary received:', data.summary.substring(0, 100) + '...');

      // Apply compaction - replaces all messages with summary
      const result = applyCompactionSummary(
        messages,
        data.summary,
        activeAgent.compactionSettings
      );

      // Update messages in state and storage
      setMessages(result.messages);
      await updateChat(currentChatId, { messages: result.messages });
      setError(null); // Clear any previous errors

      console.log(
        `Compaction complete: ${messages.length} messages → ${result.messages.length} message (summary)`
      );
    } catch (error) {
      console.error('Compaction error:', error);
      setError(
        error instanceof Error
          ? `Не удалось сжать диалог: ${error.message}`
          : 'Не удалось сжать диалог'
      );
    }
  };

  const hasMessages = messages.length > 0;

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider isDarkMode={isDarkMode}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 border-b border-border backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3">
            <ChatHistory
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              QL
            </div>
            <h1 className="text-lg sm:text-xl font-semibold">QueryLane</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <AgentManager activeAgent={activeAgent} onAgentChange={setActiveAgent} />
            <NotificationPanel />
            <IconButton
              onClick={toggleDarkMode}
              color="inherit"
              size="small"
              className="transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
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
          selectedModel={activeAgent?.model || 'glm-4.5-flash'}
        />
      ) : (
        <>
          {/* Messages */}
          <MessageList messages={messages} />

          {/* State Message or Error */}
          {(state !== 'idle' || error) && (
            <div className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-center text-xs sm:text-sm ${
              error ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {error || getStateMessage()}
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

          {/* Context Info and Compaction - aligned with composer */}
          {activeAgent && (
            <div className="px-2 sm:px-3 md:px-4 pb-2 pt-1">
              <div className="max-w-3xl sm:max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
                <TokenCounter
                  messages={messages}
                  systemPrompt={activeAgent.systemPrompt}
                  model={activeAgent.model}
                  className="flex-1 min-w-0"
                />
                <CompactButton
                  messages={messages}
                  systemPrompt={activeAgent.systemPrompt}
                  model={activeAgent.model}
                  onCompact={handleCompact}
                  config={activeAgent.compactionSettings}
                  disabled={state !== 'idle'}
                />
              </div>
            </div>
          )}

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
