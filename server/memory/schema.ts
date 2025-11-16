/**
 * Zod schemas for memory storage validation
 */

import { z } from 'zod';
import { MessageSchema, LLMParametersSchema, FormatConfigSchema } from '@/server/schema';

/**
 * Chat metadata schema
 */
export const ChatMetadataSchema = z.object({
  messageCount: z.number().int().min(0),
  totalInputTokens: z.number().int().min(0),
  totalOutputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  totalCost: z.number().min(0),
  lastModel: z.string().optional(),
  lastResponseTime: z.number().int().min(0).optional(),
});

/**
 * Stored chat schema
 */
export const StoredChatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  messages: z.array(MessageSchema).max(1000),
  agentId: z.string().min(1),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  metadata: ChatMetadataSchema,
});

/**
 * Agent usage statistics schema
 */
export const AgentUsageStatsSchema = z.object({
  totalChats: z.number().int().min(0),
  totalMessages: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  totalCost: z.number().min(0),
  lastUsed: z.number().int().positive().optional(),
});

/**
 * Stored agent schema
 */
export const StoredAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  model: z.string().min(1),
  provider: z.enum(['zai', 'openrouter']),
  systemPrompt: z.string().max(10000),
  parameters: LLMParametersSchema,
  formatConfig: FormatConfigSchema,
  isPinned: z.boolean().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  usageStats: AgentUsageStatsSchema,
});

/**
 * Stored embedding schema
 */
export const StoredEmbeddingSchema = z.object({
  id: z.string().min(1),
  chatId: z.string().min(1),
  messageIndex: z.number().int().min(0),
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(50000),
  vector: z.array(z.number()).length(384), // all-MiniLM-L6-v2 dimension
  createdAt: z.number().int().positive(),
});

/**
 * Search result schema
 */
export const SearchResultSchema = z.object({
  chatId: z.string().min(1),
  messageIndex: z.number().int().min(0),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  similarity: z.number().min(0).max(1),
  timestamp: z.number().int().positive(),
  chatTitle: z.string().optional(),
});

/**
 * Memory metadata schema
 */
export const MemoryMetadataSchema = z.object({
  totalChats: z.number().int().min(0),
  totalMessages: z.number().int().min(0),
  totalTokensUsed: z.number().int().min(0),
  totalCostUSD: z.number().min(0),
  totalEmbeddings: z.number().int().min(0),
  lastBackup: z.number().int().positive().optional(),
  lastCleanup: z.number().int().positive().optional(),
});

/**
 * Memory data schema (entire storage file)
 */
export const MemoryDataSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semver format
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  chats: z.array(StoredChatSchema),
  agents: z.array(StoredAgentSchema),
  embeddings: z.array(StoredEmbeddingSchema),
  metadata: MemoryMetadataSchema,
});

/**
 * Memory stats schema
 */
export const MemoryStatsSchema = z.object({
  totalChats: z.number().int().min(0),
  totalMessages: z.number().int().min(0),
  totalAgents: z.number().int().min(0),
  totalEmbeddings: z.number().int().min(0),
  totalTokensUsed: z.number().int().min(0),
  totalCostUSD: z.number().min(0),
  fileSize: z.number().int().min(0),
  lastUpdated: z.number().int().positive(),
  oldestChat: z.number().int().positive().optional(),
  newestChat: z.number().int().positive().optional(),
});

/**
 * Partial schemas for updates
 */
export const UpdateChatSchema = StoredChatSchema.partial().omit({ id: true, createdAt: true });
export const UpdateAgentSchema = StoredAgentSchema.partial().omit({ id: true, createdAt: true });

/**
 * Create chat request schema
 */
export const CreateChatRequestSchema = z.object({
  title: z.string().min(1).max(200),
  messages: z.array(MessageSchema).max(50).optional().default([]),
  agentId: z.string().min(1),
});

/**
 * Create agent request schema
 */
export const CreateAgentRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  model: z.string().min(1),
  provider: z.enum(['zai', 'openrouter']),
  systemPrompt: z.string().max(10000),
  parameters: LLMParametersSchema,
  formatConfig: FormatConfigSchema,
  isPinned: z.boolean().optional(),
});

/**
 * Semantic search request schema
 */
export const SemanticSearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(50).optional().default(5),
  chatId: z.string().optional(), // Optional: search within specific chat
  minSimilarity: z.number().min(0).max(1).optional().default(0.3),
});

/**
 * Helper to validate and parse data
 */
export function validateMemoryData(data: unknown): MemoryData | null {
  const result = MemoryDataSchema.safeParse(data);
  if (result.success) {
    return result.data as any;
  } else {
    console.error('[Memory Validation Error]', result.error.issues);
    return null;
  }
}

/**
 * Type exports from schemas
 */
export type MemoryData = z.infer<typeof MemoryDataSchema>;
export type StoredChat = z.infer<typeof StoredChatSchema>;
export type StoredAgent = z.infer<typeof StoredAgentSchema>;
export type StoredEmbedding = z.infer<typeof StoredEmbeddingSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;
export type AgentUsageStats = z.infer<typeof AgentUsageStatsSchema>;
export type MemoryMetadata = z.infer<typeof MemoryMetadataSchema>;
export type MemoryStats = z.infer<typeof MemoryStatsSchema>;
