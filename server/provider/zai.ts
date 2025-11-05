import { ProviderAdapter, StreamChunk, Message, FormatConfig } from '../../lib/types';

/**
 * Z.AI (Zhipu AI) provider adapter
 * Supports GLM model family
 */
export class ZAIAdapter implements ProviderAdapter {
  private apiKey: string;
  private model: string;

  /**
   * Creates a new Z.AI adapter instance
   * @param {string} apiKey - Z.AI API key
   * @param {string} [model='glm-4.5-flash'] - Model identifier
   */
  constructor(apiKey: string, model = 'glm-4.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Gets system prompt from format config
   * @param {FormatConfig} formatConfig - Format configuration
   * @returns {string} System prompt
   */
  private getSystemPrompt(formatConfig: FormatConfig): string {
    // Use the system prompt from formatConfig directly
    return formatConfig.systemPrompt;
  }

  /**
   * Generates a streaming response from Z.AI API
   * @param {Object} params - Generation parameters
   * @param {Message[]} params.messages - Chat messages
   * @param {AbortSignal} [params.signal] - Optional abort signal
   * @param {FormatConfig} [params.formatConfig] - Output format configuration
   * @yields {StreamChunk} Stream chunks
   */
  async *generateStream({
    messages,
    signal,
    formatConfig,
  }: {
    messages: Message[];
    signal?: AbortSignal;
    formatConfig?: FormatConfig;
  }): AsyncIterable<StreamChunk> {
    // Check for abort signal
    if (signal?.aborted) {
      return;
    }

    try {
      // Send meta chunk
      yield {
        type: 'meta',
        model: this.model,
        startedAt: Date.now(),
      };

      // Prepare messages with optional system prompt for structured output
      let apiMessages = messages.map(({ role, content }) => ({
        role,
        content,
      }));

      // Add system prompt if formatConfig is provided
      if (formatConfig) {
        const systemPrompt = this.getSystemPrompt(formatConfig);
        if (systemPrompt) {
          // Check if there's already a system message
          const hasSystemMessage = apiMessages.some(msg => msg.role === 'system');

          if (hasSystemMessage) {
            // Prepend to existing system message
            apiMessages = apiMessages.map(msg =>
              msg.role === 'system'
                ? { ...msg, content: `${systemPrompt}\n\n${msg.content}` }
                : msg
            );
          } else {
            // Add new system message at the beginning
            apiMessages = [
              { role: 'system' as const, content: systemPrompt },
              ...apiMessages,
            ];
          }
        }
      }

      const requestBody = {
        model: this.model,
        messages: apiMessages,
        stream: true,
      };

      const url = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

      console.log('[Z.AI Request]');
      console.log('URL:', url);
      console.log('Headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey.substring(0, 10)}...`,
      });
      console.log('Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      console.log('[Z.AI Response]');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error body:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Skip empty lines
          if (!trimmedLine) {
            continue;
          }

          // SSE format: "data: {...}" or "data: [DONE]"
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6); // Remove "data: " prefix

            // Check for stream end
            if (dataStr === '[DONE]') {
              yield {
                type: 'done',
              };
              return;
            }

            try {
              const data = JSON.parse(dataStr);

              if (data.choices && data.choices.length > 0) {
                const delta = data.choices[0].delta;

                if (delta.content) {
                  yield {
                    type: 'token',
                    content: delta.content,
                  };
                }

                if (data.choices[0].finish_reason) {
                  yield {
                    type: 'done',
                  };
                  return;
                }
              }
            } catch (error) {
              console.error('Error parsing SSE data:', dataStr, error);
            }
          }
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        code: 'PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
