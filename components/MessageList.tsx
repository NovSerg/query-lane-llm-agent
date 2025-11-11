'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { MarkdownMessage } from './MarkdownMessage';
import { StructuredResponseViewer } from './StructuredResponseViewer';
import { MetricsDisplay } from './MetricsDisplay';
import { User, Bot } from 'lucide-react';
import Fab from '@mui/material/Fab';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface MessageListProps {
  messages: Message[];
  className?: string;
}

export function MessageList({ messages, className }: MessageListProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Проверить, находимся ли мы внизу
  const isNearBottom = () => {
    if (!scrollViewportRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
    const threshold = 100; // пикселей от низа
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Прокрутить вниз
  const scrollToBottom = (smooth = false) => {
    if (!scrollViewportRef.current) return;

    scrollViewportRef.current.scrollTo({
      top: scrollViewportRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Обработчик скролла
  const handleScroll = () => {
    const nearBottom = isNearBottom();
    setShowScrollButton(!nearBottom);
    setIsAutoScrollEnabled(nearBottom);
  };

  // Auto-scroll при новых сообщениях (только если был внизу)
  useEffect(() => {
    if (isAutoScrollEnabled) {
      scrollToBottom(false);
    }
  }, [messages, isAutoScrollEnabled]);

  // Прокрутить вниз при монтировании
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollViewportRef}
        onScroll={handleScroll}
        className={cn('h-full overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6', className)}
      >
        <div className="max-w-3xl sm:max-w-4xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-2 sm:gap-3 md:gap-4 group',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                ) : (
                  <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                )}
              </div>

              {/* Message content */}
              <div className="flex-1 min-w-0 space-y-2">
                <Card
                  className={cn(
                    'p-2 sm:p-3 md:p-4 shadow-sm transition-shadow hover:shadow-md',
                    message.role === 'user'
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-card'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownMessage content={message.content || '_Думаю..._'} />
                  ) : (
                    <div className="text-xs sm:text-sm md:text-base whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  )}
                </Card>

                {/* Structured Response Viewer */}
                {message.role === 'assistant' &&
                  message.metadata?.parsed &&
                  message.metadata.parsed.isValid && (
                    <StructuredResponseViewer
                      parsedResponse={message.metadata.parsed}
                    />
                  )}

                {/* Metrics Display */}
                {message.role === 'assistant' && message.metadata && (
                  <MetricsDisplay metadata={message.metadata} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Fab
          size="small"
          color="primary"
          onClick={() => scrollToBottom(true)}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: 3,
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: 6,
              transform: 'translateX(-50%) scale(1.1)',
            },
            '&:active': {
              transform: 'translateX(-50%) scale(0.95)',
            },
          }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      )}
    </div>
  );
}
