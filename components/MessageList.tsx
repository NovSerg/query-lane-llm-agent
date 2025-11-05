'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { MarkdownMessage } from './MarkdownMessage';
import { StructuredResponseViewer } from './StructuredResponseViewer';
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
        className={cn('h-full overflow-y-auto p-3 sm:p-4 md:p-6', className)}
      >
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-2 sm:gap-3 group',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>

              {/* Message content */}
              <div className="flex-1 space-y-2">
                <Card
                  className={cn(
                    'p-3 sm:p-4 shadow-sm transition-shadow hover:shadow-md',
                    message.role === 'user'
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-card'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownMessage content={message.content || '_Думаю..._'} />
                  ) : (
                    <div className="text-sm sm:text-base whitespace-pre-wrap break-words">
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
            bottom: 24,
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
