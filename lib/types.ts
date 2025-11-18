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
  // Metrics
  model?: string;
  responseTime?: number; // milliseconds
  inputTokens?: number;
  outputTokens?: number;
  cost?: number; // USD
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
 * Compaction settings for dialog context management
 */
export interface CompactionSettings {
  /** Enable automatic compaction */
  enabled?: boolean;
  /** Threshold percentage (0-100) for triggering compaction */
  threshold?: number;
  /** Number of first messages to keep */
  keepFirstMessages?: number;
  /** Number of last messages to keep */
  keepLastMessages?: number;
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

  // Context compaction settings
  compactionSettings?: CompactionSettings;

  // Metadata
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StreamChunk {
  type: 'meta' | 'token' | 'tool_call' | 'done' | 'error';
  content?: string;
  model?: string;
  toolCall?: ToolCall;
  message?: string;
  code?: string;
  startedAt?: number;
  // Usage metrics (in done chunk)
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number; // Actual cost in USD from provider (OpenRouter)
  };
}

/**
 * OpenAI-compatible tool definition for function calling
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Tool call from AI model
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ProviderAdapter {
  generateStream(args: {
    messages: Message[];
    signal?: AbortSignal;
    formatConfig?: FormatConfig;
    parameters?: LLMParameters;
    tools?: OpenAITool[]; // Add tools support
  }): AsyncIterable<StreamChunk>;
}
