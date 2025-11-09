import { z } from 'zod';
import { Message } from '../lib/types';

/**
 * Zod schema for validating chat messages
 */
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z
    .object({
      format: z.enum(['text', 'json', 'xml', 'custom']).optional(),
      parsed: z.any().optional(),
      validationError: z.string().optional(),
      timestamp: z.number().optional(),
    })
    .optional(),
});

/**
 * Available AI models
 */
export const AVAILABLE_MODELS = [
  // OpenAI models (via OpenRouter)
  'openai/gpt-4.1',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  // Anthropic models (via OpenRouter)
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-opus-4',
  // Z.AI GLM models
  'glm-4.6',
  'glm-4.5',
  'glm-4.5-air',
  'glm-4.5-x',
  'glm-4.5-airx',
  'glm-4.5-flash',
  'glm-4-32b-0414-128k',
] as const;

/**
 * Default AI model
 */
export const DEFAULT_MODEL = 'glm-4.5-flash';

/**
 * Output format schema
 */
export const OutputFormatSchema = z.enum(['text', 'json', 'xml', 'custom']);

/**
 * Validation mode schema
 */
export const ValidationModeSchema = z.enum(['strict', 'lenient', 'fallback']);

/**
 * Format configuration schema
 */
export const FormatConfigSchema = z.object({
  format: OutputFormatSchema,
  systemPrompt: z.string(),
  exampleFormat: z.string().optional(),
  validationMode: ValidationModeSchema.optional().default('lenient'),
  customFormatId: z.string().optional(),
});

/**
 * LLM parameters schema
 */
export const LLMParametersSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().positive().optional(),
  max_tokens: z.number().int().positive().optional(),
  seed: z.number().int().optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
});

/**
 * Zod schema for validating chat requests
 */
export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).max(50),
  model: z.enum(AVAILABLE_MODELS).optional().default(DEFAULT_MODEL),
  formatConfig: FormatConfigSchema.optional(),
  parameters: LLMParametersSchema.optional(),
});

/**
 * Maximum total characters allowed in input
 */
export const MAX_INPUT_CHARS = 10000000; // 10 миллионов символов

/**
 * Validates that total message length doesn't exceed limit
 * @param {Message[]} messages - Array of messages to validate
 * @returns {boolean} True if within limit, false otherwise
 */
export function validateInputLength(messages: Message[]): boolean {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return totalChars <= MAX_INPUT_CHARS;
}
