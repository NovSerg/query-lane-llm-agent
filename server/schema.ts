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
 * Zod schema for validating chat requests
 */
export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).max(50),
  model: z.enum(AVAILABLE_MODELS).optional().default(DEFAULT_MODEL),
  formatConfig: FormatConfigSchema.optional(),
});

/**
 * Maximum total characters allowed in input
 */
export const MAX_INPUT_CHARS = 10000;

/**
 * Validates that total message length doesn't exceed limit
 * @param {Message[]} messages - Array of messages to validate
 * @returns {boolean} True if within limit, false otherwise
 */
export function validateInputLength(messages: Message[]): boolean {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return totalChars <= MAX_INPUT_CHARS;
}
