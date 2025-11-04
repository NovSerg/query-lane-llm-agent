export type Role = 'user' | 'assistant' | 'system';

export type Message = {
  role: Role;
  content: string;
};

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
  }): AsyncIterable<StreamChunk>;
}
