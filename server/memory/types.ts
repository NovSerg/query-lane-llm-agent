/**
 * Types for external memory storage system
 * Supports persistent storage of chats, agents, and vector embeddings
 */

import { Message, Agent, LLMParameters, FormatConfig } from '@/lib/types';

/**
 * Stored chat with full metadata
 */
export interface StoredChat {
  id: string;
  title: string;
  messages: Message[];
  agentId: string; // Reference to the agent used
  createdAt: number;
  updatedAt: number;
  metadata: ChatMetadata;
}

/**
 * Chat metadata with aggregated statistics
 */
export interface ChatMetadata {
  messageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number; // USD
  lastModel?: string; // Last model used in this chat
  lastResponseTime?: number; // ms
}

/**
 * Stored agent configuration
 */
export interface StoredAgent {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: 'zai' | 'openrouter';
  systemPrompt: string;
  parameters: LLMParameters;
  formatConfig: FormatConfig;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
  usageStats: AgentUsageStats;
}

/**
 * Agent usage statistics
 */
export interface AgentUsageStats {
  totalChats: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number; // USD
  lastUsed?: number;
}

/**
 * Vector embedding for semantic search
 */
export interface StoredEmbedding {
  id: string;
  chatId: string;
  messageIndex: number; // Index in chat.messages array
  role: 'user' | 'assistant';
  text: string; // Original text content
  vector: number[]; // Embedding vector (384 dimensions for all-MiniLM-L6-v2)
  createdAt: number;
}

/**
 * Semantic search result
 */
export interface SearchResult {
  chatId: string;
  messageIndex: number;
  role: 'user' | 'assistant';
  text: string;
  similarity: number; // Cosine similarity (0-1)
  timestamp: number;
  chatTitle?: string;
}

/**
 * Main memory storage structure
 */
export interface MemoryData {
  version: string; // Schema version for migrations
  createdAt: number;
  updatedAt: number;

  chats: StoredChat[];
  agents: StoredAgent[];
  embeddings: StoredEmbedding[];

  metadata: MemoryMetadata;
}

/**
 * Global memory metadata
 */
export interface MemoryMetadata {
  totalChats: number;
  totalMessages: number;
  totalTokensUsed: number;
  totalCostUSD: number;
  totalEmbeddings: number;
  lastBackup?: number;
  lastCleanup?: number;
}

/**
 * Memory storage configuration
 */
export interface MemoryConfig {
  filePath: string;
  backupPath: string;
  backupInterval: number; // Operations between backups
  cacheEnabled: boolean;
  cacheTTL: number; // ms
  debounceSaveDelay: number; // ms
  autoCleanup: boolean;
  maxChats?: number;
  maxEmbeddings?: number;
}

/**
 * Operation result
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalChats: number;
  totalMessages: number;
  totalAgents: number;
  totalEmbeddings: number;
  totalTokensUsed: number;
  totalCostUSD: number;
  fileSize: number; // bytes
  lastUpdated: number;
  oldestChat?: number;
  newestChat?: number;
}
