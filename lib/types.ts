export type Role = 'user' | 'assistant' | 'system';

export type OutputFormat = 'text' | 'json' | 'xml' | 'custom';

export type ValidationMode = 'strict' | 'lenient' | 'fallback';

export type Message = {
  role: Role;
  content: string;
  metadata?: ResponseMetadata;
};

export interface ResponseMetadata {
  format?: OutputFormat;
  parsed?: ParsedResponse;
  validationError?: string;
  timestamp?: number;
}

export interface ParsedResponse {
  data: unknown;
  isValid: boolean;
  schema?: string;
  rawContent?: string;
  format?: OutputFormat;
}

export interface FormatTemplate {
  id: string;
  name: string;
  description: string;
  format: OutputFormat;
  schema: Record<string, unknown>;
  systemPrompt: string;
  exampleInput?: string;
  exampleOutput?: string;
  category?: 'analysis' | 'generation' | 'extraction' | 'custom';
}

export interface CustomFormat {
  id: string;
  name: string;
  description?: string;
  format: OutputFormat;
  systemPrompt: string;
  exampleFormat?: string; // Example of expected output
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FormatConfig {
  format: OutputFormat;
  systemPrompt: string; // Always required now
  exampleFormat?: string;
  validationMode?: ValidationMode;
  customFormatId?: string;
}

/**
 * LLM parameters for fine-tuning model behavior
 */
export interface LLMParameters {
  temperature?: number; // 0-2, controls randomness
  top_p?: number; // 0-1, nucleus sampling
  top_k?: number; // top-k sampling (mainly for some models)
  max_tokens?: number; // maximum tokens to generate
  seed?: number; // for reproducible outputs
  frequency_penalty?: number; // -2 to 2, penalize frequent tokens
  presence_penalty?: number; // -2 to 2, penalize present tokens
}

/**
 * Agent configuration - complete settings for an AI assistant
 */
export interface Agent {
  id: string;
  name: string;
  description?: string;

  // Model settings
  model: string;
  provider: 'zai' | 'openrouter';

  // Prompt settings
  systemPrompt: string;

  // LLM parameters
  parameters: LLMParameters;

  // Output format settings
  formatConfig: FormatConfig;

  // Metadata
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StreamChunk {
  type: 'meta' | 'token' | 'done' | 'error';
  content?: string;
  model?: string;
  message?: string;
  code?: string;
  startedAt?: number;
}

export interface ProviderAdapter {
  generateStream(args: {
    messages: Message[];
    signal?: AbortSignal;
    formatConfig?: FormatConfig;
    parameters?: LLMParameters;
  }): AsyncIterable<StreamChunk>;
}
