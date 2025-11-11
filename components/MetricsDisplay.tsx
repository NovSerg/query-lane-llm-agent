'use client';

import { ResponseMetadata } from '@/lib/types';
import { formatCost } from '@/lib/pricing';

interface MetricsDisplayProps {
  metadata?: ResponseMetadata;
}

export function MetricsDisplay({ metadata }: MetricsDisplayProps) {
  if (!metadata) return null;

  const { model, responseTime, inputTokens, outputTokens, cost } = metadata;

  // Only show if we have at least one metric
  const hasMetrics = model || responseTime || inputTokens || outputTokens;
  if (!hasMetrics) return null;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTokens = (tokens: number) => {
    return tokens.toLocaleString();
  };

  return (
    <details className="mt-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none hover:text-foreground transition-colors">
        📊 Метрики
      </summary>
      <div className="mt-2 pl-4 space-y-1 text-[11px] font-mono">
        {model && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">Модель:</span>
            <span className="text-foreground/80">{model}</span>
          </div>
        )}
        {responseTime !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">Время:</span>
            <span className="text-foreground/80">{formatTime(responseTime)}</span>
          </div>
        )}
        {inputTokens !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">Входные токены:</span>
            <span className="text-foreground/80">{formatTokens(inputTokens)}</span>
          </div>
        )}
        {outputTokens !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">Выходные токены:</span>
            <span className="text-foreground/80">{formatTokens(outputTokens)}</span>
          </div>
        )}
        {inputTokens !== undefined && outputTokens !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">Всего токенов:</span>
            <span className="text-foreground/80">
              {formatTokens(inputTokens + outputTokens)}
            </span>
          </div>
        )}
        {cost !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">Стоимость:</span>
            <span className="text-foreground/80 font-semibold">
              {formatCost(cost)}
            </span>
          </div>
        )}
        {outputTokens !== undefined && responseTime !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/60">Скорость:</span>
            <span className="text-foreground/80">
              {((outputTokens / responseTime) * 1000).toFixed(1)} токенов/с
            </span>
          </div>
        )}
      </div>
    </details>
  );
}
