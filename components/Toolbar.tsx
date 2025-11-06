'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Square, Copy, Trash2 } from 'lucide-react';

interface ToolbarProps {
  onStop?: () => void;
  onClear?: () => void;
  onCopy?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Toolbar({
  onStop,
  onClear,
  onCopy,
  disabled = false,
  className,
}: ToolbarProps) {
  return (
    <div className={cn('flex gap-1 sm:gap-2 p-2 sm:p-3 md:p-4 border-t bg-background justify-center', className)}>
      <div className="flex gap-1 sm:gap-2 max-w-3xl sm:max-w-4xl w-full">
        {onStop && (
          <Button
            onClick={onStop}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 sm:gap-1.5 md:gap-2 h-7 sm:h-8 md:h-9 px-2 sm:px-2.5 md:px-3 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Square className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            <span className="text-xs sm:text-xs md:text-sm">Остановить</span>
          </Button>
        )}

        {onClear && (
          <Button
            onClick={onClear}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 sm:gap-1.5 md:gap-2 h-7 sm:h-8 md:h-9 px-2 sm:px-2.5 md:px-3 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            <span className="text-xs sm:text-xs md:text-sm">Очистить</span>
          </Button>
        )}

        {onCopy && (
          <Button
            onClick={onCopy}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 sm:gap-1.5 md:gap-2 h-7 sm:h-8 md:h-9 px-2 sm:px-2.5 md:px-3 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            <span className="text-xs sm:text-xs md:text-sm">Копировать</span>
          </Button>
        )}
      </div>
    </div>
  );
}
