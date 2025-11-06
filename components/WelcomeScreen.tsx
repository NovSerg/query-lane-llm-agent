'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onSend: (message: string) => void;
  userName?: string;
  selectedModel?: string;
}

export function WelcomeScreen({
  onSend,
  userName = 'User',
  selectedModel = 'glm-4.5-flash'
}: WelcomeScreenProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const message = input.trim();
      console.log('[User Request] From welcome screen:', message);
      onSend(message);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] sm:min-h-[calc(100vh-180px)] px-3 sm:px-4 pb-8 sm:pb-12 md:pb-20">
      <div className="w-full max-w-2xl sm:max-w-3xl space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Greeting */}
        <div className="text-center space-y-1 sm:space-y-1.5 md:space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
            Привет!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Готов помочь с любым вопросом
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Чем могу помочь?"
              className={cn(
                "w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 pr-10 sm:pr-12 md:pr-14 text-sm sm:text-base rounded-lg sm:rounded-xl",
                "bg-card border border-border",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                "transition-all duration-200",
                "hover:border-muted-foreground/50"
              )}
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2",
                "rounded-lg h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10",
                "transition-all duration-200"
              )}
            >
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
