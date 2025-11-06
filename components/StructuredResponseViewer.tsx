'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Copy, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { ParsedResponse } from '@/lib/types';
import { extractXML, formatXML } from '@/lib/xml-parser';

interface StructuredResponseViewerProps {
  parsedResponse: ParsedResponse;
}

export function StructuredResponseViewer({
  parsedResponse,
}: StructuredResponseViewerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'raw'>('tree');
  const isXML = parsedResponse.format === 'xml';

  const handleCopy = () => {
    let contentToCopy: string;

    if (isXML && parsedResponse.rawContent) {
      // For XML, copy the formatted XML
      const extracted = extractXML(parsedResponse.rawContent);
      contentToCopy = extracted ? formatXML(extracted) : parsedResponse.rawContent;
    } else {
      // For JSON, copy the JSON string
      contentToCopy = JSON.stringify(parsedResponse.data, null, 2);
    }

    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!parsedResponse.isValid) {
    return (
      <Card className="p-4 bg-amber-500/10 border-amber-500/30">
        <div className="text-sm text-amber-600 dark:text-amber-400">
          ⚠️ Валидация ответа не удалась. Показано как текст.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 bg-secondary/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Структурированный ответ
          </span>
          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
            Валиден
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Tabs */}
          <div className="flex gap-1 bg-background rounded-lg p-1">
            <button
              onClick={() => setActiveTab('tree')}
              className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'tree'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
            >
              Дерево
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'raw'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary'
              }`}
            >
              Исходный
            </button>
          </div>

          {/* Copy Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 sm:px-3 text-xs"
          >
            {copied ? (
              <Check className="h-3 w-3 sm:mr-1" />
            ) : (
              <Copy className="h-3 w-3 sm:mr-1" />
            )}
            <span className="hidden sm:inline">{copied ? 'Скопировано!' : 'Копировать'}</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        {activeTab === 'tree' ? (
          <JSONTree data={parsedResponse.data} isXML={isXML} />
        ) : (
          <pre className="text-xs bg-background p-2 sm:p-3 rounded-lg overflow-x-auto font-mono max-h-96 sm:max-h-none">
            {isXML && parsedResponse.rawContent
              ? (() => {
                  const extracted = extractXML(parsedResponse.rawContent);
                  return extracted ? formatXML(extracted) : parsedResponse.rawContent;
                })()
              : JSON.stringify(parsedResponse.data, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}

// JSON Tree Component
function JSONTree({ data, level = 0, isXML = false }: { data: unknown; level?: number; isXML?: boolean }) {
  if (data === null) {
    return <span className="text-purple-500">null</span>;
  }

  if (typeof data === 'undefined') {
    return <span className="text-gray-500">undefined</span>;
  }

  if (typeof data === 'string') {
    return <span className="text-green-600 dark:text-green-400">&quot;{data}&quot;</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-blue-600 dark:text-blue-400">{data}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-purple-600 dark:text-purple-400">{String(data)}</span>;
  }

  if (Array.isArray(data)) {
    return <JSONArray data={data} level={level} isXML={isXML} />;
  }

  if (typeof data === 'object') {
    return <JSONObject data={data as Record<string, unknown>} level={level} isXML={isXML} />;
  }

  return <span>{String(data)}</span>;
}

function JSONObject({
  data,
  level,
  isXML = false,
}: {
  data: Record<string, unknown>;
  level: number;
  isXML?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return <span className="text-muted-foreground">{isXML ? 'empty' : '{}'}</span>;
  }

  return (
    <div className="inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center hover:bg-secondary/50 rounded px-1 -mx-1"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 mr-1" />
        ) : (
          <ChevronRight className="h-3 w-3 mr-1" />
        )}
        {isXML ? (
          <span className="text-muted-foreground">...</span>
        ) : (
          <span className="text-muted-foreground">{'{'}...{'}'}</span>
        )}
        <span className="text-xs text-muted-foreground ml-2">
          {entries.length} {entries.length === 1 ? 'key' : 'keys'}
        </span>
      </button>

      {isOpen && (
        <div className="ml-4 border-l-2 border-border pl-3 mt-1">
          {entries.map(([key, value], index) => (
            <div key={key} className="py-0.5">
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                &quot;{key}&quot;
              </span>
              <span className="text-muted-foreground mx-2">:</span>
              <JSONTree data={value} level={level + 1} isXML={isXML} />
              {!isXML && index < entries.length - 1 && (
                <span className="text-muted-foreground">,</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JSONArray({ data, level, isXML = false }: { data: unknown[]; level: number; isXML?: boolean }) {
  const [isOpen, setIsOpen] = useState(level < 2);

  if (data.length === 0) {
    return <span className="text-muted-foreground">{isXML ? 'empty' : '[]'}</span>;
  }

  return (
    <div className="inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center hover:bg-secondary/50 rounded px-1 -mx-1"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 mr-1" />
        ) : (
          <ChevronRight className="h-3 w-3 mr-1" />
        )}
        {isXML ? (
          <span className="text-muted-foreground">...</span>
        ) : (
          <span className="text-muted-foreground">[...]</span>
        )}
        <span className="text-xs text-muted-foreground ml-2">
          {data.length} {data.length === 1 ? 'item' : 'items'}
        </span>
      </button>

      {isOpen && (
        <div className="ml-4 border-l-2 border-border pl-3 mt-1">
          {data.map((item, index) => (
            <div key={index} className="py-0.5">
              {!isXML && (
                <span className="text-muted-foreground text-xs mr-2">
                  [{index}]
                </span>
              )}
              <JSONTree data={item} level={level + 1} isXML={isXML} />
              {!isXML && index < data.length - 1 && (
                <span className="text-muted-foreground">,</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

