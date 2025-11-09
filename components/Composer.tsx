'use client';

import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function Composer({
  onSend,
  disabled = false,
  className,
}: ComposerProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className={cn('flex gap-1 sm:gap-2 p-2 sm:p-3 md:p-4 border-t', className)}>
      <div className="relative flex-1 max-w-3xl sm:max-w-4xl mx-auto w-full">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          disabled={disabled}
          className="flex-1 min-h-[44px] sm:min-h-[52px] md:min-h-[60px] max-h-[200px] resize-none pr-10 sm:pr-12 text-xs sm:text-sm md:text-base"
          rows={1}
        />
        <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2">
          <Button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-full hover:scale-110 hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
