import { ProviderAdapter, StreamChunk, Message, FormatConfig, LLMParameters } from '../../lib/types';

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
   * @param {LLMParameters} [params.parameters] - LLM parameters
   * @yields {StreamChunk} Stream chunks
   */
  async *generateStream({
    messages,
    signal,
    formatConfig,
    parameters,
    tools,
  }: {
    messages: Message[];
    signal?: AbortSignal;
    formatConfig?: FormatConfig;
    parameters?: LLMParameters;
    tools?: import('../../lib/types').OpenAITool[];
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
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto'; // Let model decide when to use tools
      }

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
        if (parameters.seed !== undefined) {
          requestBody.seed = parameters.seed;
        }
        // Note: Z.AI might not support all parameters
        // frequency_penalty, presence_penalty, top_k might need API docs check
      }

      // Debug logging (remove in production)
      console.log('[Z.AI Request]', {
        model: this.model,
        temperature: requestBody.temperature,
        seed: requestBody.seed,
        top_p: requestBody.top_p,
      });

      const url = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
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
      const toolCallsAccumulator = new Map<number, any>(); // Accumulate by index

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

                // Handle tool calls (streamed in chunks) - accumulate by index
                if (delta.tool_calls && delta.tool_calls.length > 0) {
                  for (const toolCallDelta of delta.tool_calls) {
                    const index = toolCallDelta.index ?? 0;

                    if (!toolCallsAccumulator.has(index)) {
                      // First chunk for this tool call
                      toolCallsAccumulator.set(index, {
                        id: toolCallDelta.id || `call_${Date.now()}_${index}`,
                        type: 'function',
                        function: {
                          name: toolCallDelta.function?.name || '',
                          arguments: '',
                        },
                      });
                    }

                    // Accumulate data
                    const accumulated = toolCallsAccumulator.get(index);
                    if (toolCallDelta.function?.name) {
                      accumulated.function.name = toolCallDelta.function.name;
                    }
                    if (toolCallDelta.function?.arguments) {
                      accumulated.function.arguments += toolCallDelta.function.arguments;
                    }
                    if (toolCallDelta.id) {
                      accumulated.id = toolCallDelta.id;
                    }
                  }
                }

                if (data.choices[0].finish_reason) {
                  // Yield accumulated tool calls when streaming is done
                  if (toolCallsAccumulator.size > 0) {
                    for (const toolCall of toolCallsAccumulator.values()) {
                      if (toolCall.function.name) {
                        yield {
                          type: 'tool_call',
                          toolCall,
                        };
                      }
                    }
                  }

                  // Include usage data if available
                  const usage = data.usage
                    ? {
                        inputTokens: data.usage.prompt_tokens || 0,
                        outputTokens: data.usage.completion_tokens || 0,
                        totalTokens: data.usage.total_tokens || 0,
                      }
                    : undefined;

                  yield {
                    type: 'done',
                    usage,
                  };
                  return;
                }
              }
            } catch (error) {
              // Failed to parse SSE data
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
