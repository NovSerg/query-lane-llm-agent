import { CustomFormat, OutputFormat } from './types';

const STORAGE_KEY = 'querylane.custom-formats.v1';
const PINNED_KEY = 'querylane.pinned-format.v1';

/**
 * No default formats - all formats are user-created
 */
export const DEFAULT_FORMATS: CustomFormat[] = [];

/**
 * IDs of old default formats to be removed
 */
const OLD_DEFAULT_IDS = ['json-simple', 'xml-simple', 'structured-analysis'];

/**
 * Clean up old default formats from localStorage
 */
function cleanupOldDefaults(): void {
  if (typeof window === 'undefined') return;

  try {
    // Clean up formats list
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const formats: CustomFormat[] = JSON.parse(data);
      const cleaned = formats.filter(f => !OLD_DEFAULT_IDS.includes(f.id));

      // Only save if something was removed
      if (cleaned.length !== formats.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
    }

    // Clean up pinned format if it's an old default
    const pinnedId = localStorage.getItem(PINNED_KEY);
    if (pinnedId && OLD_DEFAULT_IDS.includes(pinnedId)) {
      localStorage.removeItem(PINNED_KEY);
    }
  } catch (error) {
    // Cleanup failed
  }
}

// Run cleanup on module load
if (typeof window !== 'undefined') {
  cleanupOldDefaults();
}

export const customFormats = {
  /**
   * Get all custom formats
   */
  getAll(): CustomFormat[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
    } catch (error) {
      // Save failed
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
      // Failed to set pinned
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
  } {
    const formats = this.getAll();

    return {
      total: formats.length,
      byFormat: {
        text: formats.filter(f => f.format === 'text').length,
        json: formats.filter(f => f.format === 'json').length,
        xml: formats.filter(f => f.format === 'xml').length,
        custom: formats.filter(f => f.format === 'custom').length,
      },
    };
  },
};
