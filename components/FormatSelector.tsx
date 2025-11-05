'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { FileJson2, FileText, Settings2, X } from 'lucide-react';
import { FORMAT_TEMPLATES, getTemplateCategories } from '@/lib/format-templates';
import { FormatConfig, FormatTemplate, OutputFormat } from '@/lib/types';

interface FormatSelectorProps {
  onFormatChange: (config: FormatConfig | null) => void;
  currentFormat?: FormatConfig | null;
}

export function FormatSelector({
  onFormatChange,
  currentFormat,
}: FormatSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('text');
  const [selectedTemplate, setSelectedTemplate] = useState<FormatTemplate | null>(null);

  const handleFormatSelect = (format: OutputFormat) => {
    setSelectedFormat(format);
    setSelectedTemplate(null);

    if (format === 'text') {
      onFormatChange(null);
    } else {
      onFormatChange({
        format,
        validationMode: 'lenient',
      });
    }
  };

  const handleTemplateSelect = (template: FormatTemplate) => {
    setSelectedTemplate(template);
    setSelectedFormat(template.format);

    onFormatChange({
      format: template.format,
      schema: template.schema,
      templateId: template.id,
      customPrompt: template.systemPrompt,
      validationMode: 'lenient',
    });

    setIsOpen(false);
  };

  const categories = getTemplateCategories();

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant={currentFormat ? 'default' : 'ghost'}
        size="icon"
        className="rounded-xl hover:bg-secondary/80 transition-colors h-8 w-8 sm:h-10 sm:w-10"
        title="Format Settings"
      >
        {currentFormat?.format === 'json' || currentFormat?.format === 'structured' ? (
          <FileJson2 className="h-4 w-4 sm:h-5 sm:w-5" />
        ) : (
          <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <Card className="absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)] p-4 shadow-2xl border-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Output Format</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Format Type Selection */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-muted-foreground">
                Base Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedFormat === 'text' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleFormatSelect('text')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button
                  variant={selectedFormat === 'json' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleFormatSelect('json')}
                >
                  <FileJson2 className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Template Selection */}
            {selectedFormat !== 'text' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  Templates
                </label>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {categories.map(category => {
                    const templates = FORMAT_TEMPLATES.filter(
                      t => (t.category || 'custom') === category
                    );

                    return (
                      <div key={category} className="space-y-2">
                        <div className="text-xs font-semibold uppercase text-muted-foreground px-2">
                          {category}
                        </div>
                        {templates.map(template => (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:border-primary/50 ${
                              selectedTemplate?.id === template.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border'
                            }`}
                          >
                            <div className="font-medium text-sm">
                              {template.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {template.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current Selection Info */}
            {selectedTemplate && (
              <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Selected
                </div>
                <div className="text-sm font-semibold">
                  {selectedTemplate.name}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
