/**
 * Model pricing data (USD per million tokens)
 * Based on OpenRouter pricing, March 2025
 *
 * NOTE: For OpenRouter models, actual costs come from the API (usage.cost field).
 * This is reference data only. For Z.AI models with subscription, cost is always 0.
 */

interface ModelPrice {
  input: number;
  output: number;
}

const PRICING: Record<string, ModelPrice> = {
  // OpenAI
  'openai/gpt-4.1': { input: 10, output: 30 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },

  // Anthropic
  'anthropic/claude-opus-4': { input: 15, output: 75 },
  'anthropic/claude-sonnet-4': { input: 3, output: 15 },
  'anthropic/claude-sonnet-4.5': { input: 3, output: 15 },
  'anthropic/claude-haiku-4.5': { input: 1, output: 5 },

  // DeepSeek
  'deepseek/deepseek-r1': { input: 0.30, output: 1.20 },

  // OpenAI Open Source
  'openai/gpt-oss-120b': { input: 0.04, output: 0.40 },

  // Google
  'google/gemini-flash-1.5': { input: 0.075, output: 0.30 },
  'google/gemini-pro-1.5': { input: 1.25, output: 5.00 },
  'google/gemma-2-9b-it': { input: 0.03, output: 0.09 },

  // Meta
  'meta-llama/llama-3.2-3b-instruct': { input: 0.02, output: 0.02 },

  // Qwen
  'qwen/qwen-4b-chat': { input: 0.02, output: 0.06 },
  'qwen/qwen-2.5-7b-instruct': { input: 0.04, output: 0.10 },

  // MiniMax
  'minimax/minimax-m2': { input: 0.255, output: 1.02 },

  // Z.AI
  'glm-4.6': { input: 0.1, output: 0.1 },
  'glm-4.5': { input: 0.1, output: 0.1 },
  'glm-4.5-air': { input: 0.05, output: 0.05 },
  'glm-4.5-x': { input: 0.15, output: 0.15 },
  'glm-4.5-airx': { input: 0.075, output: 0.075 },
  'glm-4.5-flash': { input: 0.01, output: 0.01 },
  'glm-4-32b-0414-128k': { input: 0.1, output: 0.1 },
};

/**
 * Calculate cost for a request
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const price = PRICING[model];
  if (!price) return 0;

  const inputCost = (inputTokens / 1_000_000) * price.input;
  const outputCost = (outputTokens / 1_000_000) * price.output;

  return inputCost + outputCost;
}

/**
 * Format cost as string
 */
export function formatCost(cost: number): string {
  if (cost === 0) return 'FREE';

  // For very small costs, show with enough decimal places
  if (cost < 0.000001) return `$${cost.toFixed(9)}`; // 9 decimals for tiny costs
  if (cost < 0.0001) return `$${cost.toFixed(7)}`; // 7 decimals for very small costs
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Estimate tokens from text (rough)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if model is free
 */
export function isFreeModel(model: string): boolean {
  const price = PRICING[model];
  return !price || (price.input === 0 && price.output === 0);
}
