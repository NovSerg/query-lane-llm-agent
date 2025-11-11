'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

const MODELS = [
  // Advanced models
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', description: 'Fast & affordable', provider: 'openrouter' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Reasoning (671B)', provider: 'openrouter' },
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', description: 'OpenAI MoE (117B)', provider: 'openrouter' },

  // Z.AI GLM models
  { id: 'glm-4.6', name: 'GLM-4.6', description: 'Latest flagship', provider: 'zai' },
  { id: 'glm-4.5', name: 'GLM-4.5', description: 'Balanced', provider: 'zai' },
  { id: 'glm-4.5-air', name: 'GLM-4.5-Air', description: 'Lightweight', provider: 'zai' },
  { id: 'glm-4.5-x', name: 'GLM-4.5-X', description: 'Extended', provider: 'zai' },
  { id: 'glm-4.5-airx', name: 'GLM-4.5-AirX', description: 'Air extended', provider: 'zai' },
  { id: 'glm-4.5-flash', name: 'GLM-4.5-Flash', description: 'Ultra-fast', provider: 'zai' },
  { id: 'glm-4-32b-0414-128k', name: 'GLM-4-32B', description: '128K context', provider: 'zai' },

  // Google models
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', description: 'Fast & affordable', provider: 'openrouter' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Advanced', provider: 'openrouter' },
  { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', description: 'Compact (9B)', provider: 'openrouter' },

  // Qwen models
  { id: 'qwen/qwen-4b-chat', name: 'Qwen 1.5 4B', description: 'Compact (4B)', provider: 'openrouter' },
  { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B', description: 'Balanced (7B)', provider: 'openrouter' },

  // Small models for comparison
  { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', description: 'Meta tiny (3B)', provider: 'openrouter' },
  { id: 'minimax/minimax-m2', name: 'MiniMax M2', description: 'Coding (10B)', provider: 'openrouter' },
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
  const [isDark, setIsDark] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModelData = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  // Check theme on mount and when it changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

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
        className={cn(
          'gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium cursor-pointer',
          'hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200'
        )}
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
        <div
          className="absolute top-full right-0 mt-1 w-48 sm:w-56 md:w-64 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            zIndex: 999999,
            backgroundColor: isDark ? '#18181b' : '#ffffff',
            border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
            opacity: 1,
          }}
        >
          <div className="p-1 sm:p-1.5">
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-start gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-left transition-all duration-150 cursor-pointer',
                  'hover:bg-secondary hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                  selectedModel === model.id && 'bg-secondary/80'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground truncate hidden sm:block">
                    {model.description}
                  </div>
                </div>
                {selectedModel === model.id && (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
