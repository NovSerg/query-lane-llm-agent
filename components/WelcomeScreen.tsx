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
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] px-3 sm:px-4 pb-12 sm:pb-20">
      <div className="w-full max-w-3xl space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Greeting */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            Привет!
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
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
                "w-full px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-14 text-sm sm:text-base rounded-xl",
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
                "rounded-lg h-8 w-8 sm:h-10 sm:w-10",
                "transition-all duration-200"
              )}
            >
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
