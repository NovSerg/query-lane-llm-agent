import { ParsedResponse } from './types';

const HISTORY_KEY = 'querylane.response-history.v1';
const MAX_HISTORY_ITEMS = 100;

export interface HistoryItem {
  id: string;
  timestamp: number;
  templateId?: string;
  templateName?: string;
  prompt: string;
  parsedResponse: ParsedResponse;
  model?: string;
}

export const responseHistory = {
  /**
   * Get all history items
   */
  getAll(): HistoryItem[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Add item to history
   */
  add(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
    if (typeof window === 'undefined') return;

    try {
      const history = this.getAll();
      const newItem: HistoryItem = {
        ...item,
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      // Add to beginning of array
      history.unshift(newItem);

      // Keep only MAX_HISTORY_ITEMS
      if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
      }

      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save response history:', error);
    }
  },

  /**
   * Get item by ID
   */
  getById(id: string): HistoryItem | undefined {
    const history = this.getAll();
    return history.find(item => item.id === id);
  },

  /**
   * Delete item by ID
   */
  deleteById(id: string): void {
    if (typeof window === 'undefined') return;

    try {
      const history = this.getAll();
      const filtered = history.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  },

  /**
   * Clear all history
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  },

  /**
   * Get history items by template ID
   */
  getByTemplateId(templateId: string): HistoryItem[] {
    const history = this.getAll();
    return history.filter(item => item.templateId === templateId);
  },

  /**
   * Get history items from date range
   */
  getByDateRange(startDate: Date, endDate: Date): HistoryItem[] {
    const history = this.getAll();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return history.filter(
      item => item.timestamp >= startTime && item.timestamp <= endTime
    );
  },

  /**
   * Export history to JSON
   */
  exportToJSON(): string {
    const history = this.getAll();
    return JSON.stringify(history, null, 2);
  },

  /**
   * Export history to CSV
   */
  exportToCSV(): string {
    const history = this.getAll();

    if (history.length === 0) {
      return '';
    }

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'Date',
      'Template',
      'Prompt',
      'Valid',
      'Data',
    ];

    // CSV rows
    const rows = history.map(item => {
      const date = new Date(item.timestamp).toISOString();
      const prompt = item.prompt.replace(/"/g, '""'); // Escape quotes
      const data = JSON.stringify(item.parsedResponse.data).replace(/"/g, '""');

      return [
        item.id,
        item.timestamp,
        date,
        item.templateName || 'None',
        `"${prompt}"`,
        item.parsedResponse.isValid,
        `"${data}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },

  /**
   * Download history as file
   */
  downloadAsFile(format: 'json' | 'csv'): void {
    if (typeof window === 'undefined') return;

    const content = format === 'json' ? this.exportToJSON() : this.exportToCSV();
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `querylane-history-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Get statistics about history
   */
  getStatistics(): {
    total: number;
    valid: number;
    invalid: number;
    byTemplate: Record<string, number>;
    recentCount: number;
  } {
    const history = this.getAll();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const stats = {
      total: history.length,
      valid: history.filter(item => item.parsedResponse.isValid).length,
      invalid: history.filter(item => !item.parsedResponse.isValid).length,
      byTemplate: {} as Record<string, number>,
      recentCount: history.filter(item => item.timestamp > oneDayAgo).length,
    };

    // Count by template
    history.forEach(item => {
      const template = item.templateName || 'None';
      stats.byTemplate[template] = (stats.byTemplate[template] || 0) + 1;
    });

    return stats;
  },

  /**
   * Import history from JSON
   */
  importFromJSON(jsonString: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const imported = JSON.parse(jsonString) as HistoryItem[];

      // Validate structure
      if (!Array.isArray(imported)) {
        return false;
      }

      // Merge with existing history
      const existing = this.getAll();
      const merged = [...imported, ...existing];

      // Remove duplicates by ID
      const unique = Array.from(
        new Map(merged.map(item => [item.id, item])).values()
      );

      // Keep only MAX_HISTORY_ITEMS
      if (unique.length > MAX_HISTORY_ITEMS) {
        unique.splice(MAX_HISTORY_ITEMS);
      }

      localStorage.setItem(HISTORY_KEY, JSON.stringify(unique));
      return true;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  },

  /**
   * Search history by prompt text
   */
  search(query: string): HistoryItem[] {
    const history = this.getAll();
    const lowerQuery = query.toLowerCase();

    return history.filter(item =>
      item.prompt.toLowerCase().includes(lowerQuery)
    );
  },
};
