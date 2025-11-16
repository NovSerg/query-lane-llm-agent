/**
 * External Memory Client
 * Client-side interface for working with server-side persistent memory
 */

import { Message } from './types';

export interface StoredChat {
  id: string;
  title: string;
  messages: Message[];
  agentId: string;
  createdAt: number;
  updatedAt: number;
  metadata: {
    messageCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCost: number;
    lastModel?: string;
    lastResponseTime?: number;
  };
}

export interface SearchResult {
  chatId: string;
  messageIndex: number;
  role: 'user' | 'assistant';
  text: string;
  similarity: number;
  timestamp: number;
  chatTitle?: string;
}

export interface MemoryStats {
  totalChats: number;
  totalMessages: number;
  totalAgents: number;
  totalEmbeddings: number;
  totalTokensUsed: number;
  totalCostUSD: number;
  fileSize: number;
  lastUpdated: number;
  oldestChat?: number;
  newestChat?: number;
}

/**
 * External memory client class
 */
export class ExternalMemoryClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/memory') {
    this.baseUrl = baseUrl;
  }

  // ========================================
  // CHAT OPERATIONS
  // ========================================

  /**
   * Create new chat
   */
  async createChat(
    title: string,
    agentId: string,
    messages: Message[] = []
  ): Promise<StoredChat> {
    const response = await fetch(`${this.baseUrl}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, agentId, messages }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create chat');
    }

    return data.chat;
  }

  /**
   * Get chat by ID
   */
  async getChat(id: string): Promise<StoredChat | null> {
    const response = await fetch(`${this.baseUrl}/chats/${id}`);
    const data = await response.json();

    if (!data.success) {
      if (response.status === 404) return null;
      throw new Error(data.error || 'Failed to get chat');
    }

    return data.chat;
  }

  /**
   * List all chats
   */
  async listChats(limit?: number): Promise<StoredChat[]> {
    const url = new URL(`${this.baseUrl}/chats`, window.location.origin);
    if (limit) url.searchParams.set('limit', limit.toString());

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to list chats');
    }

    return data.chats;
  }

  /**
   * Update chat
   */
  async updateChat(id: string, updates: Partial<StoredChat>): Promise<StoredChat> {
    const response = await fetch(`${this.baseUrl}/chats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to update chat');
    }

    return data.chat;
  }

  /**
   * Delete chat
   */
  async deleteChat(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/chats/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to delete chat');
    }
  }

  // ========================================
  // EMBEDDING OPERATIONS
  // ========================================

  /**
   * Generate embedding for a single message
   */
  async generateEmbedding(
    chatId: string,
    messageIndex: number,
    role: 'user' | 'assistant',
    text: string
  ): Promise<{ id: string; dimensions: number }> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, messageIndex, role, text }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate embedding');
    }

    return data.embedding;
  }

  /**
   * Generate embeddings for multiple messages (batch)
   */
  async generateEmbeddingsBatch(
    chatId: string,
    messages: Array<{
      index: number;
      role: 'user' | 'assistant';
      text: string;
    }>
  ): Promise<{ count: number; averageTime: number }> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, messages }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate embeddings');
    }

    return {
      count: data.count,
      averageTime: data.metadata.averageTimePerMessage,
    };
  }

  // ========================================
  // SEARCH OPERATIONS
  // ========================================

  /**
   * Semantic search across chat history
   */
  async search(
    query: string,
    options: {
      limit?: number;
      chatId?: string;
      minSimilarity?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 5, chatId, minSimilarity = 0.3 } = options;

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, chatId, minSimilarity }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Search failed');
    }

    return data.results;
  }

  // ========================================
  // STATISTICS
  // ========================================

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const response = await fetch(`${this.baseUrl}/stats`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get stats');
    }

    return data.stats;
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Save message with auto-embedding generation
   */
  async saveMessageWithEmbedding(
    chatId: string,
    message: Message,
    messageIndex: number
  ): Promise<void> {
    // Generate embedding in background (don't await)
    if (message.role !== 'system') {
      this.generateEmbedding(
        chatId,
        messageIndex,
        message.role,
        message.content
      ).catch(error => {
        console.error('[ExternalMemory] Failed to generate embedding:', error);
      });
    }
  }

  /**
   * Import chat from localStorage format
   */
  async importFromLocalStorage(
    chat: {
      id: string;
      title: string;
      messages: Message[];
    },
    agentId: string
  ): Promise<StoredChat> {
    const stored = await this.createChat(chat.title, agentId, chat.messages);

    // Generate embeddings for all messages
    const messagesToEmbed = chat.messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map((msg, index) => ({
        index,
        role: msg.role as 'user' | 'assistant',
        text: msg.content,
      }));

    if (messagesToEmbed.length > 0) {
      await this.generateEmbeddingsBatch(stored.id, messagesToEmbed);
    }

    return stored;
  }
}

// Export singleton instance
export const externalMemory = new ExternalMemoryClient();

// Export utility functions
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}
