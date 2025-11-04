import { describe, it, expect } from 'vitest';
import {
  ChatRequestSchema,
  MessageSchema,
  validateInputLength,
  MAX_INPUT_CHARS,
} from '../server/schema';
import { Message } from '../lib/types';

describe('API Chat Validation', () => {
  describe('ChatRequestSchema', () => {
    it('should validate valid request', () => {
      const validRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      };

      const result = ChatRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate request with model', () => {
      const validRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'glm-4.5-flash',
      };

      const result = ChatRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('glm-4.5-flash');
      }
    });

    it('should use default model when not specified', () => {
      const validRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = ChatRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('glm-4.5-flash');
      }
    });

    it('should reject invalid model', () => {
      const invalidRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'invalid-model',
      };

      const result = ChatRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalidRequest = {
        messages: [{ role: 'invalid', content: 'Hello' }],
      };

      const result = ChatRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject too many messages', () => {
      const tooManyMessages = Array(51).fill({
        role: 'user' as const,
        content: 'test',
      });

      const result = ChatRequestSchema.safeParse({
        messages: tooManyMessages,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('MessageSchema', () => {
    it('should validate user message', () => {
      const userMessage = { role: 'user', content: 'Hello' };
      const result = MessageSchema.safeParse(userMessage);
      expect(result.success).toBe(true);
    });

    it('should validate assistant message', () => {
      const assistantMessage = { role: 'assistant', content: 'Hi there!' };
      const result = MessageSchema.safeParse(assistantMessage);
      expect(result.success).toBe(true);
    });

    it('should validate system message', () => {
      const systemMessage = { role: 'system', content: 'You are helpful' };
      const result = MessageSchema.safeParse(systemMessage);
      expect(result.success).toBe(true);
    });
  });

  describe('validateInputLength', () => {
    it('should accept valid input length', () => {
      const messages: Message[] = [{ role: 'user', content: 'a'.repeat(100) }];
      expect(validateInputLength(messages)).toBe(true);
    });

    it('should reject input exceeding max length', () => {
      const messages: Message[] = [
        { role: 'user', content: 'a'.repeat(MAX_INPUT_CHARS + 1) },
      ];
      expect(validateInputLength(messages)).toBe(false);
    });

    it('should handle multiple messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'a'.repeat(5000) },
        { role: 'assistant', content: 'b'.repeat(4000) },
        { role: 'user', content: 'c'.repeat(1000) },
      ];
      expect(validateInputLength(messages)).toBe(true);
    });

    it('should reject multiple messages exceeding max length', () => {
      const messages: Message[] = [
        { role: 'user', content: 'a'.repeat(6000) },
        { role: 'assistant', content: 'b'.repeat(5000) },
      ];
      expect(validateInputLength(messages)).toBe(false);
    });
  });
});
