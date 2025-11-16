/**
 * Storage Adapter - Unified interface for localStorage and external memory
 */

import { Message } from './types';
import * as localStorage from './chat-storage';
import { externalMemory, StoredChat } from './external-memory';

export type StorageType = 'localStorage' | 'externalMemory';

/**
 * Unified storage interface
 */
export class StorageAdapter {
  private storageType: StorageType;

  constructor(storageType: StorageType = 'localStorage') {
    this.storageType = storageType;
  }

  /**
   * Set storage type
   */
  setStorageType(type: StorageType) {
    this.storageType = type;
  }

  /**
   * Get current storage type
   */
  getStorageType(): StorageType {
    return this.storageType;
  }

  /**
   * Create new chat
   */
  async createChat(title: string, agentId: string, messages: Message[] = []): Promise<string> {
    if (this.storageType === 'localStorage') {
      const chat = await localStorage.createChat(messages);
      return chat.id;
    } else {
      const chat = await externalMemory.createChat(title, agentId, messages);

      // Generate embeddings for messages in background
      if (messages.length > 0) {
        const messagesToEmbed = messages
          .map((msg, idx) => ({ index: idx, role: msg.role, text: msg.content }))
          .filter(m => m.role === 'user' || m.role === 'assistant') as Array<{
            index: number;
            role: 'user' | 'assistant';
            text: string;
          }>;

        if (messagesToEmbed.length > 0) {
          externalMemory.generateEmbeddingsBatch(chat.id, messagesToEmbed).catch(err => {
            console.error('[StorageAdapter] Failed to generate embeddings:', err);
          });
        }
      }

      return chat.id;
    }
  }

  /**
   * Get chat by ID
   */
  async getChat(id: string): Promise<{ id: string; title: string; messages: Message[] } | null> {
    if (this.storageType === 'localStorage') {
      return await localStorage.getChatById(id);
    } else {
      const chat = await externalMemory.getChat(id);
      if (!chat) return null;
      return {
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
      };
    }
  }

  /**
   * Update chat messages
   */
  async updateChat(id: string, messages: Message[]): Promise<void> {
    if (this.storageType === 'localStorage') {
      await localStorage.updateChat(id, { messages });
    } else {
      await externalMemory.updateChat(id, { messages });

      // Generate embedding for the last message if it's new
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const lastIdx = messages.length - 1;

        if (lastMsg.role === 'user' || lastMsg.role === 'assistant') {
          externalMemory.generateEmbedding(
            id,
            lastIdx,
            lastMsg.role,
            lastMsg.content
          ).catch(err => {
            console.error('[StorageAdapter] Failed to generate embedding:', err);
          });
        }
      }
    }
  }

  /**
   * List all chats
   */
  async listChats(limit?: number): Promise<Array<{ id: string; title: string; updatedAt: number }>> {
    if (this.storageType === 'localStorage') {
      const chats = await localStorage.getAllChats();
      const sorted = chats.sort((a, b) => b.updatedAt - a.updatedAt);
      return limit ? sorted.slice(0, limit) : sorted;
    } else {
      const chats = await externalMemory.listChats(limit);
      return chats.map(c => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
      }));
    }
  }

  /**
   * Delete chat
   */
  async deleteChat(id: string): Promise<void> {
    if (this.storageType === 'localStorage') {
      await localStorage.deleteChat(id);
    } else {
      await externalMemory.deleteChat(id);
    }
  }

  /**
   * Get or create current chat
   */
  async getCurrentOrCreateChat(agentId?: string): Promise<{ id: string; title: string; messages: Message[] }> {
    if (this.storageType === 'localStorage') {
      return await localStorage.getCurrentOrCreateChat();
    } else {
      // For external memory, we'll use localStorage to track current chat ID
      // but fetch the actual chat from external storage
      const currentId = await localStorage.getCurrentChatId();

      if (currentId) {
        const chat = await this.getChat(currentId);
        if (chat) return chat;
      }

      // Create new chat with provided agentId or a placeholder
      const defaultAgentId = agentId || 'agent_unknown';
      const newChatId = await this.createChat('Новый чат', defaultAgentId, []);
      await localStorage.setCurrentChatId(newChatId);

      return {
        id: newChatId,
        title: 'Новый чат',
        messages: [],
      };
    }
  }

  /**
   * Set current chat ID
   */
  async setCurrentChatId(id: string): Promise<void> {
    await localStorage.setCurrentChatId(id);
  }

  /**
   * Get current chat ID
   */
  async getCurrentChatId(): Promise<string | null> {
    return await localStorage.getCurrentChatId();
  }
}

// Export singleton instance
export const storageAdapter = new StorageAdapter();

// Helper to get storage type from localStorage
export function getStorageTypePreference(): StorageType {
  if (typeof window === 'undefined') return 'localStorage';
  const pref = window.localStorage.getItem('querylane.storage-type');
  return (pref as StorageType) || 'localStorage';
}

// Helper to save storage type preference
export function setStorageTypePreference(type: StorageType): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('querylane.storage-type', type);
}
