import { Tiktoken, encodingForModel } from 'js-tiktoken';
import type { Message } from './types';

/**
 * Context window limits for different models (in tokens)
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Z.AI GLM models
  'glm-4.5': 128000,
  'glm-4.5-flash': 128000,
  'glm-4.6': 128000,
  'glm-4-air': 128000,
  'glm-4-airx': 128000,
  'glm-4-flash': 128000,
  'glm-4-plus': 128000,
  'glm-4': 128000,

  // OpenRouter - GPT models
  'openai/gpt-4-turbo': 128000,
  'openai/gpt-4o': 128000,
  'openai/gpt-4o-mini': 128000,
  'openai/gpt-4.1': 1000000,
  'openai/gpt-4.1-mini': 1000000,

  // OpenRouter - Claude models
  'anthropic/claude-opus-4-20250514': 200000,
  'anthropic/claude-sonnet-4-20250514': 200000,
  'anthropic/claude-haiku-4.5-20250415': 200000,
  'anthropic/claude-3.5-sonnet': 200000,
  'anthropic/claude-3-opus': 200000,

  // Default fallback
  default: 128000,
};

let encoder: Tiktoken | null = null;
let encoderInitialized = false;
let encoderError: Error | null = null;

/**
 * Get or initialize the token encoder
 */
function getEncoder(): Tiktoken | null {
  if (encoderInitialized) {
    return encoder;
  }

  try {
    // Use cl100k_base encoding (GPT-4, GPT-3.5-turbo)
    // This works reasonably well for most models including GLM and Claude
    encoder = encodingForModel('gpt-4');
    encoderInitialized = true;
    return encoder;
  } catch (error) {
    encoderError = error instanceof Error ? error : new Error('Failed to initialize encoder');
    encoderInitialized = true; // Don't try again
    console.warn('Token encoder initialization failed, using fallback estimation');
    return null;
  }
}

/**
 * Count tokens in a text string
 */
export function countTokens(text: string): number {
  if (!text) return 0;

  const enc = getEncoder();
  if (enc) {
    try {
      return enc.encode(text).length;
    } catch (error) {
      console.error('Error counting tokens:', error);
    }
  }

  // Fallback: rough estimate (1 token ≈ 4 characters)
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a message
 * Includes overhead for role and formatting
 */
export function countMessageTokens(message: Message): number {
  // OpenAI format: each message has ~4 tokens overhead
  // <|start|>role<|message|>content<|end|>
  const contentTokens = countTokens(message.content);
  const roleTokens = countTokens(message.role);
  const overhead = 4; // Format overhead
  return contentTokens + roleTokens + overhead;
}

/**
 * Estimate total tokens for messages array including system prompt
 */
export function estimateMessagesTokens(
  messages: Message[],
  systemPrompt?: string
): number {
  let total = 0;

  // System prompt tokens
  if (systemPrompt) {
    total += countMessageTokens({
      role: 'system',
      content: systemPrompt,
    });
  }

  // Message tokens
  for (const message of messages) {
    total += countMessageTokens(message);
  }

  // Add overhead for request/response framing (~3 tokens)
  total += 3;

  return total;
}

/**
 * Get context limit for a model
 */
export function getModelContextLimit(model: string): number {
  // Try exact match first
  if (MODEL_CONTEXT_LIMITS[model]) {
    return MODEL_CONTEXT_LIMITS[model];
  }

  // Try prefix match for models like "glm-4.5-flash-custom"
  for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (model.startsWith(key)) {
      return limit;
    }
  }

  // Default fallback
  return MODEL_CONTEXT_LIMITS.default;
}

/**
 * Calculate context usage percentage
 */
export function getContextUsage(
  messages: Message[],
  systemPrompt: string,
  model: string
): {
  usedTokens: number;
  totalTokens: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
} {
  const usedTokens = estimateMessagesTokens(messages, systemPrompt);
  const totalTokens = getModelContextLimit(model);
  const percentage = (usedTokens / totalTokens) * 100;

  let status: 'safe' | 'warning' | 'danger';
  if (percentage < 60) {
    status = 'safe';
  } else if (percentage < 85) {
    status = 'warning';
  } else {
    status = 'danger';
  }

  return {
    usedTokens,
    totalTokens,
    percentage,
    status,
  };
}

/**
 * Check if messages are close to context limit
 */
export function shouldCompact(
  messages: Message[],
  systemPrompt: string,
  model: string,
  threshold = 85 // % of context limit
): boolean {
  const usage = getContextUsage(messages, systemPrompt, model);
  return usage.percentage >= threshold;
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return `${(count / 1000000).toFixed(1)}M`;
  }
}
