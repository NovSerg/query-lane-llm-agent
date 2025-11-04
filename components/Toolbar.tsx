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
    <div className={cn('flex gap-2 p-3 sm:p-4 border-t bg-background justify-center', className)}>
      <div className="flex gap-2 max-w-4xl w-full">
        {onStop && (
          <Button
            onClick={onStop}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3"
          >
            <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Stop</span>
          </Button>
        )}

        {onClear && (
          <Button
            onClick={onClear}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Clear</span>
          </Button>
        )}

        {onCopy && (
          <Button
            onClick={onCopy}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3"
          >
            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Copy</span>
          </Button>
        )}
      </div>
    </div>
  );
}
