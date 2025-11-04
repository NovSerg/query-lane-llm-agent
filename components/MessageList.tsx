'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { MarkdownMessage } from './MarkdownMessage';
import { User, Bot } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  className?: string;
}

export function MessageList({ messages, className }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea ref={scrollAreaRef} className={cn('flex-1 p-3 sm:p-4 md:p-6', className)}>
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
            <Card
              className={cn(
                'flex-1 p-3 sm:p-4 shadow-sm transition-shadow hover:shadow-md',
                message.role === 'user'
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-card'
              )}
            >
              {message.role === 'assistant' ? (
                <MarkdownMessage content={message.content || '_Thinking..._'} />
              ) : (
                <div className="text-sm sm:text-base whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
