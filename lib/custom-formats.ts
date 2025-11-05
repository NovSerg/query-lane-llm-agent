import { CustomFormat, OutputFormat } from './types';

const STORAGE_KEY = 'querylane.custom-formats.v1';
const PINNED_KEY = 'querylane.pinned-format.v1';

/**
 * Default format templates for quick start
 */
export const DEFAULT_FORMATS: CustomFormat[] = [
  {
    id: 'json-simple',
    name: 'Simple JSON',
    description: 'Basic JSON response format',
    format: 'json',
    systemPrompt: `Return your response in valid JSON format only.

Example:
{
  "result": "your answer here",
  "details": "additional information"
}

CRITICAL RULES:
- Return ONLY valid JSON
- NO markdown code blocks
- NO explanatory text outside JSON
- Start with { and end with }`,
    exampleFormat: `{
  "result": "...",
  "details": "..."
}`,
    isPinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'xml-simple',
    name: 'Simple XML',
    description: 'Basic XML response format',
    format: 'xml',
    systemPrompt: `Return your response in valid XML format only.

Example:
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <result>your answer here</result>
  <details>additional information</details>
</response>

CRITICAL RULES:
- Return ONLY valid XML
- NO markdown code blocks
- NO explanatory text outside XML
- Include XML declaration
- Use proper closing tags`,
    exampleFormat: `<?xml version="1.0"?>
<response>
  <result>...</result>
  <details>...</details>
</response>`,
    isPinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'structured-analysis',
    name: 'Structured Analysis',
    description: 'Detailed analysis with conclusions',
    format: 'json',
    systemPrompt: `Analyze the input and return a structured JSON response:

{
  "summary": "brief summary",
  "key_points": ["point 1", "point 2"],
  "analysis": "detailed analysis",
  "conclusion": "final conclusion",
  "confidence": 0.95
}

Return ONLY valid JSON, no other text.`,
    exampleFormat: `{
  "summary": "...",
  "key_points": [...],
  "analysis": "...",
  "conclusion": "...",
  "confidence": 0.95
}`,
    isPinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const customFormats = {
  /**
   * Get all custom formats (including defaults)
   */
  getAll(): CustomFormat[] {
    if (typeof window === 'undefined') return DEFAULT_FORMATS;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const saved = data ? JSON.parse(data) : [];

      // Merge defaults with saved, avoiding duplicates
      const defaultIds = DEFAULT_FORMATS.map(f => f.id);
      const userFormats = saved.filter(
        (f: CustomFormat) => !defaultIds.includes(f.id)
      );

      return [...DEFAULT_FORMATS, ...userFormats];
    } catch {
      return DEFAULT_FORMATS;
    }
  },

  /**
   * Get format by ID
   */
  getById(id: string): CustomFormat | undefined {
    return this.getAll().find(f => f.id === id);
  },

  /**
   * Save/update a custom format
   */
  save(format: Omit<CustomFormat, 'id' | 'createdAt' | 'updatedAt'>): CustomFormat {
    if (typeof window === 'undefined') {
      throw new Error('Cannot save in SSR');
    }

    const existing = this.getAll();
    const newFormat: CustomFormat = {
      ...format,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...existing, newFormat];
    this.saveAll(updated);

    return newFormat;
  },

  /**
   * Update existing format
   */
  update(id: string, updates: Partial<CustomFormat>): boolean {
    if (typeof window === 'undefined') return false;

    const formats = this.getAll();
    const index = formats.findIndex(f => f.id === id);

    if (index === -1) return false;

    formats[index] = {
      ...formats[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveAll(formats);
    return true;
  },

  /**
   * Delete a format
   */
  delete(id: string): boolean {
    if (typeof window === 'undefined') return false;

    // Don't allow deleting default formats
    const isDefault = DEFAULT_FORMATS.some(f => f.id === id);
    if (isDefault) return false;

    const formats = this.getAll();
    const filtered = formats.filter(f => f.id !== id);

    this.saveAll(filtered);
    return true;
  },

  /**
   * Save all formats to storage
   */
  saveAll(formats: CustomFormat[]): void {
    if (typeof window === 'undefined') return;

    try {
      // Only save non-default formats
      const defaultIds = DEFAULT_FORMATS.map(f => f.id);
      const toSave = formats.filter(f => !defaultIds.includes(f.id));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save custom formats:', error);
    }
  },

  /**
   * Get pinned format
   */
  getPinned(): CustomFormat | null {
    if (typeof window === 'undefined') return null;

    try {
      const pinnedId = localStorage.getItem(PINNED_KEY);
      if (!pinnedId) return null;

      return this.getById(pinnedId) || null;
    } catch {
      return null;
    }
  },

  /**
   * Set pinned format
   */
  setPinned(id: string | null): void {
    if (typeof window === 'undefined') return;

    try {
      if (id === null) {
        localStorage.removeItem(PINNED_KEY);
      } else {
        localStorage.setItem(PINNED_KEY, id);
      }
    } catch (error) {
      console.error('Failed to set pinned format:', error);
    }
  },

  /**
   * Get formats by type
   */
  getByFormat(format: OutputFormat): CustomFormat[] {
    return this.getAll().filter(f => f.format === format);
  },

  /**
   * Duplicate a format
   */
  duplicate(id: string): CustomFormat | null {
    const original = this.getById(id);
    if (!original) return null;

    const duplicate = this.save({
      name: `${original.name} (Copy)`,
      description: original.description,
      format: original.format,
      systemPrompt: original.systemPrompt,
      exampleFormat: original.exampleFormat,
      isPinned: false,
    });

    return duplicate;
  },

  /**
   * Export formats to JSON
   */
  exportToJSON(): string {
    const formats = this.getAll();
    return JSON.stringify(formats, null, 2);
  },

  /**
   * Import formats from JSON
   */
  importFromJSON(jsonString: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const imported = JSON.parse(jsonString) as CustomFormat[];

      if (!Array.isArray(imported)) {
        return false;
      }

      const existing = this.getAll();
      const merged = [...existing, ...imported];

      // Remove duplicates by ID
      const unique = Array.from(
        new Map(merged.map(item => [item.id, item])).values()
      );

      this.saveAll(unique);
      return true;
    } catch (error) {
      console.error('Failed to import formats:', error);
      return false;
    }
  },

  /**
   * Search formats by name or description
   */
  search(query: string): CustomFormat[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      f =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.description?.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    byFormat: Record<OutputFormat, number>;
    defaults: number;
    custom: number;
  } {
    const formats = this.getAll();
    const defaultIds = DEFAULT_FORMATS.map(f => f.id);

    return {
      total: formats.length,
      byFormat: {
        text: formats.filter(f => f.format === 'text').length,
        json: formats.filter(f => f.format === 'json').length,
        xml: formats.filter(f => f.format === 'xml').length,
        custom: formats.filter(f => f.format === 'custom').length,
      },
      defaults: formats.filter(f => defaultIds.includes(f.id)).length,
      custom: formats.filter(f => !defaultIds.includes(f.id)).length,
    };
  },
};
