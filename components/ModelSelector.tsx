'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

const MODELS = [
  { id: 'glm-4.6', name: 'GLM-4.6', description: 'Latest flagship model' },
  { id: 'glm-4.5', name: 'GLM-4.5', description: 'Balanced performance' },
  { id: 'glm-4.5-air', name: 'GLM-4.5-Air', description: 'Lightweight & fast' },
  { id: 'glm-4.5-x', name: 'GLM-4.5-X', description: 'Extended capabilities' },
  { id: 'glm-4.5-airx', name: 'GLM-4.5-AirX', description: 'Air extended' },
  { id: 'glm-4.5-flash', name: 'GLM-4.5-Flash', description: 'Ultra-fast responses' },
  { id: 'glm-4-32b-0414-128k', name: 'GLM-4-32B', description: '128K context' },
] as const;

/**
 * Props for ModelSelector component
 */
interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  className?: string;
}

/**
 * Dropdown selector for AI models
 * @param {ModelSelectorProps} props - Component props
 * @returns {JSX.Element} Model selector component
 */
export function ModelSelector({
  selectedModel,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModelData = MODELS.find((m) => m.id === selectedModel) || MODELS[5];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium"
      >
        <span className="hidden sm:inline">{selectedModelData.name}</span>
        <span className="sm:hidden">{selectedModelData.name.replace('GLM-', '')}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 sm:h-4 sm:w-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 sm:w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-1.5">
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-start gap-2 px-3 py-2 rounded-md text-left transition-colors',
                  'hover:bg-secondary',
                  selectedModel === model.id && 'bg-secondary/80'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {model.description}
                  </div>
                </div>
                {selectedModel === model.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
