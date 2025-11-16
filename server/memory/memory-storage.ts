/**
 * Memory Storage Module
 * Manages persistent storage of chats, agents, and embeddings in JSON file
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  MemoryData,
  StoredChat,
  StoredAgent,
  StoredEmbedding,
  MemoryStats,
  SearchResult,
  ChatMetadata,
  AgentUsageStats,
} from './types';
import { validateMemoryData, MemoryDataSchema } from './schema';

const DEFAULT_CONFIG = {
  filePath: path.join(process.cwd(), 'data', 'memory.json'),
  backupPath: path.join(process.cwd(), 'data', 'memory.backup.json'),
  backupInterval: 100, // Operations between backups
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  debounceSaveDelay: 500, // 500ms
  autoCleanup: false,
  maxChats: undefined,
  maxEmbeddings: undefined,
};

/**
 * Main memory storage class
 * Thread-safe singleton with caching and debounced writes
 */
export class MemoryStorage {
  private static instance: MemoryStorage | null = null;
  private config: typeof DEFAULT_CONFIG;
  private cache: MemoryData | null = null;
  private cacheTimestamp: number = 0;
  private saveTimeout: NodeJS.Timeout | null = null;
  private operationCount: number = 0;
  private isWriting: boolean = false;
  private operationQueue: Promise<any> = Promise.resolve();

  private constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<typeof DEFAULT_CONFIG>): MemoryStorage {
    if (!MemoryStorage.instance) {
      MemoryStorage.instance = new MemoryStorage(config);
    }
    return MemoryStorage.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    MemoryStorage.instance = null;
  }

  /**
   * Queue an operation to ensure serial execution
   * Prevents race conditions on concurrent load-modify-save operations
   */
  private async queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const prevOperation = this.operationQueue;
    let resolver!: (value: T) => void;
    let rejecter!: (error: any) => void;

    // Create new promise for this operation
    const currentOperation = new Promise<T>((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });

    // Update queue to point to current operation
    this.operationQueue = currentOperation;

    // Wait for previous operation, then execute current one
    try {
      await prevOperation;
    } catch {
      // Ignore errors from previous operations
    }

    try {
      const result = await operation();
      resolver(result);
      return result;
    } catch (error) {
      rejecter(error);
      throw error;
    }
  }

  /**
   * Initialize storage (ensure file exists)
   */
  async init(): Promise<void> {
    try {
      await fs.access(this.config.filePath);
    } catch {
      // File doesn't exist, create it
      await this.createEmptyStorage();
    }
  }

  /**
   * Create empty storage file
   */
  private async createEmptyStorage(): Promise<void> {
    const emptyData: MemoryData = {
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chats: [],
      agents: [],
      embeddings: [],
      metadata: {
        totalChats: 0,
        totalMessages: 0,
        totalTokensUsed: 0,
        totalCostUSD: 0,
        totalEmbeddings: 0,
      },
    };

    await this.writeAtomic(this.config.filePath, JSON.stringify(emptyData, null, 2));
  }

  /**
   * Load data from file (with caching)
   */
  async load(): Promise<MemoryData> {
    // Check cache
    if (
      this.config.cacheEnabled &&
      this.cache &&
      Date.now() - this.cacheTimestamp < this.config.cacheTTL
    ) {
      return this.cache;
    }

    // Read from file
    try {
      const content = await fs.readFile(this.config.filePath, 'utf-8');
      const data = JSON.parse(content);
      const validated = validateMemoryData(data);

      if (!validated) {
        throw new Error('Invalid memory data structure');
      }

      // Update cache
      this.cache = validated;
      this.cacheTimestamp = Date.now();

      return validated;
    } catch (error) {
      console.error('[MemoryStorage] Load error:', error);
      // If file is corrupted, try backup
      return this.loadBackup();
    }
  }

  /**
   * Load from backup file
   */
  private async loadBackup(): Promise<MemoryData> {
    try {
      const content = await fs.readFile(this.config.backupPath, 'utf-8');
      const data = JSON.parse(content);
      const validated = validateMemoryData(data);

      if (validated) {
        console.log('[MemoryStorage] Restored from backup');
        // Restore to main file
        await this.save(validated, false);
        return validated;
      }
    } catch (error) {
      console.error('[MemoryStorage] Backup load error:', error);
    }

    // Last resort: create new empty storage
    console.warn('[MemoryStorage] Creating new empty storage');
    await this.createEmptyStorage();
    return this.load();
  }

  /**
   * Save data to file (debounced, atomic)
   */
  async save(data: MemoryData, debounce: boolean = true): Promise<void> {
    // Update metadata
    data.updatedAt = Date.now();

    // Update cache
    this.cache = data;
    this.cacheTimestamp = Date.now();

    // Debounce if requested
    if (debounce) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }

      this.saveTimeout = setTimeout(() => {
        this.performSave(data);
      }, this.config.debounceSaveDelay);
    } else {
      await this.performSave(data);
    }
  }

  /**
   * Perform actual save operation
   */
  private async performSave(data: MemoryData): Promise<void> {
    if (this.isWriting) {
      // Wait for current write to finish
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.performSave(data);
    }

    this.isWriting = true;

    try {
      // Atomic write
      await this.writeAtomic(this.config.filePath, JSON.stringify(data, null, 2));

      // Increment operation count
      this.operationCount++;

      // Auto-backup
      if (this.operationCount >= this.config.backupInterval) {
        await this.backup();
        this.operationCount = 0;
      }
    } catch (error) {
      console.error('[MemoryStorage] Save error:', error);
      throw error;
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Atomic file write (prevents corruption)
   */
  private async writeAtomic(filePath: string, content: string): Promise<void> {
    const tmpPath = `${filePath}.tmp`;

    try {
      // Write to temp file
      await fs.writeFile(tmpPath, content, 'utf-8');

      // Rename to target (atomic on most filesystems)
      await fs.rename(tmpPath, filePath);
    } catch (error) {
      // Cleanup temp file on error
      try {
        await fs.unlink(tmpPath);
      } catch {}
      throw error;
    }
  }

  /**
   * Create backup
   */
  async backup(): Promise<void> {
    try {
      const data = await this.load();
      data.metadata.lastBackup = Date.now();
      await this.writeAtomic(this.config.backupPath, JSON.stringify(data, null, 2));
      console.log('[MemoryStorage] Backup created');
    } catch (error) {
      console.error('[MemoryStorage] Backup error:', error);
    }
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
    messages: any[] = []
  ): Promise<StoredChat> {
    return this.queueOperation(async () => {
      // Invalidate cache to force fresh load
      this.cache = null;

      const data = await this.load();

      const chat: StoredChat = {
        id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title,
        messages,
        agentId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: this.calculateChatMetadata(messages),
      };

      console.log(`[MemoryStorage] Creating chat ${chat.id}, current chats: ${data.chats.length}`);
      data.chats.push(chat);
      data.metadata.totalChats = data.chats.length;

      await this.save(data, false); // Immediate save, no debounce
      console.log(`[MemoryStorage] Chat ${chat.id} saved, total chats: ${data.chats.length}`);
      return chat;
    });
  }

  /**
   * Get chat by ID
   */
  async getChat(id: string): Promise<StoredChat | null> {
    const data = await this.load();
    return data.chats.find(c => c.id === id) || null;
  }

  /**
   * List chats (sorted by updatedAt, newest first)
   */
  async listChats(limit?: number): Promise<StoredChat[]> {
    const data = await this.load();
    const sorted = [...data.chats].sort((a, b) => b.updatedAt - a.updatedAt);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Update chat
   */
  async updateChat(id: string, updates: Partial<StoredChat>): Promise<void> {
    return this.queueOperation(async () => {
      // Invalidate cache to force fresh load
      this.cache = null;

      const data = await this.load();
      const index = data.chats.findIndex(c => c.id === id);

      console.log(`[MemoryStorage] Updating chat ${id}, found at index: ${index}, total chats: ${data.chats.length}`);

      if (index === -1) {
        console.error(`[MemoryStorage] Chat ${id} not found. Available chats:`, data.chats.map(c => c.id));
        throw new Error(`Chat ${id} not found`);
      }

      // Apply updates
      data.chats[index] = {
        ...data.chats[index],
        ...updates,
        updatedAt: Date.now(),
      };

      // Recalculate metadata if messages changed
      if (updates.messages) {
        data.chats[index].metadata = this.calculateChatMetadata(updates.messages);
      }

      await this.save(data);
      console.log(`[MemoryStorage] Chat ${id} updated successfully`);
    });
  }

  /**
   * Delete chat
   */
  async deleteChat(id: string): Promise<void> {
    return this.queueOperation(async () => {
      // Invalidate cache to force fresh load
      this.cache = null;

      const data = await this.load();
      const initialLength = data.chats.length;
      data.chats = data.chats.filter(c => c.id !== id);

      if (data.chats.length === initialLength) {
        throw new Error(`Chat ${id} not found`);
      }

      // Also delete associated embeddings
      data.embeddings = data.embeddings.filter(e => e.chatId !== id);

      // Update metadata
      data.metadata.totalChats = data.chats.length;
      data.metadata.totalEmbeddings = data.embeddings.length;

      await this.save(data);
    });
  }

  /**
   * Calculate chat metadata from messages
   */
  private calculateChatMetadata(messages: any[]): ChatMetadata {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let lastModel: string | undefined;
    let lastResponseTime: number | undefined;

    for (const msg of messages) {
      if (msg.metadata) {
        totalInputTokens += msg.metadata.inputTokens || 0;
        totalOutputTokens += msg.metadata.outputTokens || 0;
        totalCost += msg.metadata.cost || 0;
        if (msg.metadata.model) lastModel = msg.metadata.model;
        if (msg.metadata.responseTime) lastResponseTime = msg.metadata.responseTime;
      }
    }

    return {
      messageCount: messages.length,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      lastModel,
      lastResponseTime,
    };
  }

  // ========================================
  // AGENT OPERATIONS
  // ========================================

  /**
   * Create new agent
   */
  async createAgent(agent: Omit<StoredAgent, 'id' | 'createdAt' | 'updatedAt' | 'usageStats'>): Promise<StoredAgent> {
    return this.queueOperation(async () => {
      this.cache = null;
      const data = await this.load();

      const newAgent: StoredAgent = {
        ...agent,
        id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageStats: {
          totalChats: 0,
          totalMessages: 0,
          totalTokens: 0,
          totalCost: 0,
        },
      };

      data.agents.push(newAgent);
      await this.save(data);
      return newAgent;
    });
  }

  /**
   * Get agent by ID
   */
  async getAgent(id: string): Promise<StoredAgent | null> {
    const data = await this.load();
    return data.agents.find(a => a.id === id) || null;
  }

  /**
   * List all agents
   */
  async listAgents(): Promise<StoredAgent[]> {
    const data = await this.load();
    return data.agents;
  }

  /**
   * Update agent
   */
  async updateAgent(id: string, updates: Partial<StoredAgent>): Promise<void> {
    return this.queueOperation(async () => {
      this.cache = null;
      const data = await this.load();
      const index = data.agents.findIndex(a => a.id === id);

      if (index === -1) {
        throw new Error(`Agent ${id} not found`);
      }

      data.agents[index] = {
        ...data.agents[index],
        ...updates,
        updatedAt: Date.now(),
      };

      await this.save(data);
    });
  }

  /**
   * Delete agent
   */
  async deleteAgent(id: string): Promise<void> {
    return this.queueOperation(async () => {
      this.cache = null;
      const data = await this.load();
      const initialLength = data.agents.length;
      data.agents = data.agents.filter(a => a.id !== id);

      if (data.agents.length === initialLength) {
        throw new Error(`Agent ${id} not found`);
      }

      await this.save(data);
    });
  }

  // ========================================
  // EMBEDDING OPERATIONS
  // ========================================

  /**
   * Add embedding
   */
  async addEmbedding(embedding: Omit<StoredEmbedding, 'id' | 'createdAt'>): Promise<StoredEmbedding> {
    return this.queueOperation(async () => {
      this.cache = null;
      const data = await this.load();

      const newEmbedding: StoredEmbedding = {
        ...embedding,
        id: `emb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
      };

      data.embeddings.push(newEmbedding);
      data.metadata.totalEmbeddings = data.embeddings.length;

      await this.save(data);
      return newEmbedding;
    });
  }

  /**
   * Search by vector similarity
   */
  async searchByVector(
    queryVector: number[],
    limit: number = 5,
    minSimilarity: number = 0.3,
    chatId?: string
  ): Promise<SearchResult[]> {
    const data = await this.load();

    // Filter embeddings
    let embeddings = data.embeddings;
    if (chatId) {
      embeddings = embeddings.filter(e => e.chatId === chatId);
    }

    // Calculate similarities
    const results: SearchResult[] = embeddings.map(emb => {
      const similarity = this.cosineSimilarity(queryVector, emb.vector);
      return {
        chatId: emb.chatId,
        messageIndex: emb.messageIndex,
        role: emb.role,
        text: emb.text,
        similarity,
        timestamp: emb.createdAt,
      };
    });

    // Filter by min similarity and sort
    return results
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get embeddings for a chat
   */
  async getChatEmbeddings(chatId: string): Promise<StoredEmbedding[]> {
    const data = await this.load();
    return data.embeddings.filter(e => e.chatId === chatId);
  }

  // ========================================
  // STATISTICS
  // ========================================

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const data = await this.load();
    const fileStats = await fs.stat(this.config.filePath);

    const chatTimestamps = data.chats.map(c => c.createdAt);

    return {
      totalChats: data.chats.length,
      totalMessages: data.metadata.totalMessages,
      totalAgents: data.agents.length,
      totalEmbeddings: data.embeddings.length,
      totalTokensUsed: data.metadata.totalTokensUsed,
      totalCostUSD: data.metadata.totalCostUSD,
      fileSize: fileStats.size,
      lastUpdated: data.updatedAt,
      oldestChat: chatTimestamps.length > 0 ? Math.min(...chatTimestamps) : undefined,
      newestChat: chatTimestamps.length > 0 ? Math.max(...chatTimestamps) : undefined,
    };
  }

  /**
   * Cleanup old data
   */
  async cleanup(maxChats?: number, maxEmbeddings?: number): Promise<void> {
    return this.queueOperation(async () => {
      this.cache = null;
      const data = await this.load();

      // Remove oldest chats if over limit
      if (maxChats && data.chats.length > maxChats) {
        const sorted = [...data.chats].sort((a, b) => b.updatedAt - a.updatedAt);
        data.chats = sorted.slice(0, maxChats);
      }

      // Remove oldest embeddings if over limit
      if (maxEmbeddings && data.embeddings.length > maxEmbeddings) {
        const sorted = [...data.embeddings].sort((a, b) => b.createdAt - a.createdAt);
        data.embeddings = sorted.slice(0, maxEmbeddings);
      }

      data.metadata.totalChats = data.chats.length;
      data.metadata.totalEmbeddings = data.embeddings.length;
      data.metadata.lastCleanup = Date.now();

      await this.save(data, false);
    });
  }
}

// Export singleton instance
export const memoryStorage = MemoryStorage.getInstance();
