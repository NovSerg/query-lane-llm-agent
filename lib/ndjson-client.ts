import { StreamChunk } from './types';

/**
 * Callback functions for processing NDJSON stream chunks
 */
export interface NDJSONClientCallbacks {
  onMeta?: (chunk: StreamChunk & { type: 'meta' }) => void;
  onToken?: (chunk: StreamChunk & { type: 'token' }) => void;
  onDone?: (chunk: StreamChunk & { type: 'done' }) => void;
  onError?: (chunk: StreamChunk & { type: 'error' }) => void;
}

/**
 * Processes an NDJSON stream from the chat API
 * @param {Response} response - Fetch response with NDJSON stream
 * @param {NDJSONClientCallbacks} callbacks - Callback functions for different chunk types
 * @returns {Promise<void>}
 */
export async function processNDJSONStream(
  response: Response,
  callbacks: NDJSONClientCallbacks
): Promise<void> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk: StreamChunk = JSON.parse(line);

            switch (chunk.type) {
              case 'meta':
                callbacks.onMeta?.(chunk as StreamChunk & { type: 'meta' });
                break;
              case 'token':
                callbacks.onToken?.(chunk as StreamChunk & { type: 'token' });
                break;
              case 'done':
                callbacks.onDone?.(chunk as StreamChunk & { type: 'done' });
                return;
              case 'error':
                callbacks.onError?.(chunk as StreamChunk & { type: 'error' });
                return;
              default:
                console.warn('Unknown chunk type:', chunk);
            }
          } catch (error) {
            console.error('Failed to parse NDJSON line:', line, error);
          }
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
      try {
        const chunk: StreamChunk = JSON.parse(buffer);
        if (chunk.type === 'done') {
          callbacks.onDone?.(chunk as StreamChunk & { type: 'done' });
        } else if (chunk.type === 'error') {
          callbacks.onError?.(chunk as StreamChunk & { type: 'error' });
        }
      } catch (error) {
        console.error('Failed to parse final NDJSON buffer:', buffer, error);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Sends a chat request to the API
 * @param {Array<{role: string, content: string}>} messages - Array of chat messages
 * @param {AbortSignal} [signal] - Optional abort signal for cancelling the request
 * @param {string} [model] - Optional model identifier
 * @param {import('./types').FormatConfig} [formatConfig] - Optional format configuration
 * @param {import('./types').LLMParameters} [parameters] - Optional LLM parameters
 * @returns {Promise<Response>} Fetch response with NDJSON stream
 */
export async function sendChatRequest(
  messages: { role: string; content: string }[],
  signal?: AbortSignal,
  model?: string,
  formatConfig?: import('./types').FormatConfig,
  parameters?: import('./types').LLMParameters
): Promise<Response> {
  return fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, model, formatConfig, parameters }),
    signal,
  });
}
