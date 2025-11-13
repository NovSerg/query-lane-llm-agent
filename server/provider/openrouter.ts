import { ProviderAdapter, StreamChunk, Message, FormatConfig, LLMParameters } from '../../lib/types';

/**
 * OpenRouter provider adapter
 * Supports Claude and other models through OpenRouter API
 */
export class OpenRouterAdapter implements ProviderAdapter {
  private apiKey: string;
  private model: string;

  /**
   * Creates a new OpenRouter adapter instance
   * @param {string} apiKey - OpenRouter API key
   * @param {string} model - Model identifier (e.g., 'anthropic/claude-haiku-4.5')
   */
  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Gets system prompt from format config
   * @param {FormatConfig} formatConfig - Format configuration
   * @returns {string} System prompt
   */
  private getSystemPrompt(formatConfig: FormatConfig): string {
    return formatConfig.systemPrompt;
  }

  /**
   * Generates a streaming response from OpenRouter API
   * @param {Object} params - Generation parameters
   * @param {Message[]} params.messages - Chat messages
   * @param {AbortSignal} [params.signal] - Optional abort signal
   * @param {FormatConfig} [params.formatConfig] - Output format configuration
   * @param {LLMParameters} [params.parameters] - LLM parameters
   * @yields {StreamChunk} Stream chunks
   */
  async *generateStream({
    messages,
    signal,
    formatConfig,
    parameters,
  }: {
    messages: Message[];
    signal?: AbortSignal;
    formatConfig?: FormatConfig;
    parameters?: LLMParameters;
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

      const requestBody: Record<string, unknown> = {
        model: this.model,
        messages: apiMessages,
        stream: true,
        usage: { include: true }, // Enable detailed usage accounting with costs
      };

      // Add LLM parameters if provided
      if (parameters) {
        if (parameters.temperature !== undefined) {
          requestBody.temperature = parameters.temperature;
        }
        if (parameters.top_p !== undefined) {
          requestBody.top_p = parameters.top_p;
        }
        if (parameters.max_tokens !== undefined) {
          requestBody.max_tokens = parameters.max_tokens;
        }
        if (parameters.frequency_penalty !== undefined) {
          requestBody.frequency_penalty = parameters.frequency_penalty;
        }
        if (parameters.presence_penalty !== undefined) {
          requestBody.presence_penalty = parameters.presence_penalty;
        }
        if (parameters.seed !== undefined) {
          requestBody.seed = parameters.seed;
        }
        // top_k is less commonly supported by OpenRouter models
      }

      const url = 'https://openrouter.ai/api/v1/chat/completions';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://querylane.app',
          'X-Title': 'QueryLane',
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let savedUsage: Record<string, unknown> | undefined;
      let finishReasonSeen = false;

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
              const usage = savedUsage
                ? {
                    inputTokens: (savedUsage.native_tokens_prompt as number) || (savedUsage.prompt_tokens as number) || 0,
                    outputTokens: (savedUsage.native_tokens_completion as number) || (savedUsage.completion_tokens as number) || 0,
                    totalTokens: ((savedUsage.native_tokens_prompt as number) || (savedUsage.prompt_tokens as number) || 0) +
                                 ((savedUsage.native_tokens_completion as number) || (savedUsage.completion_tokens as number) || 0),
                    cost: savedUsage.cost as number | undefined, // Cost in USD (1 credit = $1)
                  }
                : undefined;

              yield {
                type: 'done',
                usage,
              };
              return;
            }

            try {
              const data = JSON.parse(dataStr);

              // Save usage data from any chunk that has it
              if (data.usage) {
                savedUsage = data.usage;
              }

              if (data.choices && data.choices.length > 0) {
                const delta = data.choices[0].delta;

                if (delta.content) {
                  yield {
                    type: 'token',
                    content: delta.content,
                  };
                }

                if (data.choices[0].finish_reason) {
                  finishReasonSeen = true;
                  // Don't return yet - wait for usage data or [DONE]
                }
              }
            } catch (error) {
              // Failed to parse SSE data
              console.error('[OpenRouter] Failed to parse SSE:', error);
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
