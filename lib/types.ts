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
  }): AsyncIterable<StreamChunk>;
}
