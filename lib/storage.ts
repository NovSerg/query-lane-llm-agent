import { Message } from './types';

const STORAGE_KEY = 'querylane.thread.v1';

export const storage = {
  getThread(): Message[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveThread(messages: Message[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Silent fail for storage issues
    }
  },

  clearThread(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silent fail for storage issues
    }
  },
};
