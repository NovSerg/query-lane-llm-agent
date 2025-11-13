'use client';

import { useMemo } from 'react';
import { Message } from '@/lib/types';
import { getContextUsage, formatTokenCount } from '@/lib/token-counter';

interface TokenCounterProps {
  messages: Message[];
  systemPrompt: string;
  model: string;
  className?: string;
}

export function TokenCounter({
  messages,
  systemPrompt,
  model,
  className = '',
}: TokenCounterProps) {
  const usage = useMemo(() => {
    return getContextUsage(messages, systemPrompt, model);
  }, [messages, systemPrompt, model]);

  // Color based on status
  const getColorClasses = () => {
    switch (usage.status) {
      case 'safe':
        return {
          bar: 'bg-green-500',
          text: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-500/10',
        };
      case 'warning':
        return {
          bar: 'bg-yellow-500',
          text: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-500/10',
        };
      case 'danger':
        return {
          bar: 'bg-red-500',
          text: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-500/10',
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`text-xs ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">Контекст:</span>
        <span className={`font-mono ${colors.text}`}>
          {formatTokenCount(usage.usedTokens)} / {formatTokenCount(usage.totalTokens)}
        </span>
      </div>
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-300 ${colors.bar}`}
          style={{ width: `${Math.min(usage.percentage, 100)}%` }}
        />
      </div>
      {usage.percentage >= 85 && (
        <div className={`mt-1 text-[10px] ${colors.text}`}>
          ⚠️ Приближение к лимиту контекста
        </div>
      )}
    </div>
  );
}
