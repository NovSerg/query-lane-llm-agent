import { ProviderAdapter } from '../../lib/types';
import { ZAIAdapter } from './zai';

/**
 * Creates Z.AI provider adapter
 * @param {string} apiKey - Z.AI API key
 * @param {string} [model] - Model identifier
 * @returns {ProviderAdapter} Provider adapter instance
 * @throws {Error} If API key is missing
 */
export function createProvider(
  apiKey: string,
  model?: string
): ProviderAdapter {
  if (!apiKey) {
    throw new Error('Z.AI API key is required');
  }
  return new ZAIAdapter(apiKey, model);
}
