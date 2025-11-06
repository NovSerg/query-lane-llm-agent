import { ProviderAdapter } from '../../lib/types';
import { ZAIAdapter } from './zai';
import { OpenRouterAdapter } from './openrouter';

/**
 * Determines provider from model ID
 * @param {string} modelId - Model identifier
 * @returns {string} Provider name ('openrouter' or 'zai')
 */
function getProviderFromModel(modelId: string): 'openrouter' | 'zai' {
  if (modelId.includes('claude') || modelId.includes('anthropic') || modelId.includes('/')) {
    return 'openrouter';
  }
  return 'zai';
}

/**
 * Creates appropriate provider adapter based on model
 * @param {string} zaiKey - Z.AI API key
 * @param {string} openRouterKey - OpenRouter API key
 * @param {string} [model] - Model identifier
 * @returns {ProviderAdapter} Provider adapter instance
 * @throws {Error} If required API key is missing
 */
export function createProvider(
  zaiKey: string,
  openRouterKey: string,
  model?: string
): ProviderAdapter {
  const provider = getProviderFromModel(model || 'glm-4.5-flash');

  if (provider === 'openrouter') {
    if (!openRouterKey) {
      throw new Error('OpenRouter API key is required for this model');
    }
    return new OpenRouterAdapter(openRouterKey, model || 'anthropic/claude-haiku-4.5');
  }

  if (!zaiKey) {
    throw new Error('Z.AI API key is required for this model');
  }
  return new ZAIAdapter(zaiKey, model);
}
