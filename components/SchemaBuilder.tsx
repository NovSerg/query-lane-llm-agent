'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Plus, X, Save } from 'lucide-react';
import { FormatConfig } from '@/lib/types';

interface SchemaBuilderProps {
  onSave: (config: FormatConfig) => void;
  onCancel: () => void;
}

interface SchemaField {
  key: string;
  type: string;
  description: string;
}

export function SchemaBuilder({ onSave, onCancel }: SchemaBuilderProps) {
  const [fields, setFields] = useState<SchemaField[]>([
    { key: 'result', type: 'string', description: 'The main result' },
  ]);

  const addField = () => {
    setFields([
      ...fields,
      { key: '', type: 'string', description: '' },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (
    index: number,
    field: Partial<SchemaField>
  ) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...field };
    setFields(updated);
  };

  const handleSave = () => {
    const schema: Record<string, unknown> = {};

    fields.forEach(field => {
      if (field.key) {
        schema[field.key] = `${field.type} - ${field.description || 'no description'}`;
      }
    });

    const config: FormatConfig = {
      format: 'json',
      systemPrompt: 'Return a structured JSON response based on the schema',
      validationMode: 'lenient',
    };

    onSave(config);
  };

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-semibold text-sm sm:text-base">Custom Schema Builder</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {fields.map((field, index) => (
          <div key={index} className="grid grid-cols-12 gap-1 sm:gap-2 items-start">
            <input
              type="text"
              placeholder="Key"
              value={field.key}
              onChange={e =>
                updateField(index, { key: e.target.value })
              }
              className="col-span-3 sm:col-span-3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg bg-background"
            />
            <select
              value={field.type}
              onChange={e =>
                updateField(index, { type: e.target.value })
              }
              className="col-span-2 sm:col-span-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg bg-background"
              aria-label="Field type"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="array">array</option>
              <option value="object">object</option>
            </select>
            <input
              type="text"
              placeholder="Description"
              value={field.description}
              onChange={e =>
                updateField(index, { description: e.target.value })
              }
              className="col-span-5 sm:col-span-6 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg bg-background"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeField(index)}
              className="col-span-1 sm:col-span-1"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={addField}
          className="flex-1"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Add Field</span>
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          className="flex-1"
        >
          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Save Schema</span>
        </Button>
      </div>
    </Card>
  );
}
