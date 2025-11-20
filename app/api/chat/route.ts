import { NextRequest } from 'next/server';
import { ChatRequestSchema, validateInputLength } from '../../../server/schema';
import { createProvider } from '../../../server/provider';
import { StreamChunk, ToolCall } from '../../../lib/types';
import { loadMcpTools, executeMcpTool } from '../../../server/mcp/mcp-tools-loader';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM || '30');

/**
 * Removes expired rate limit entries from memory
 */
function cleanupOldEntries() {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now >= data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

/**
 * Checks if the IP address has exceeded rate limits
 * @param {string} ip - Client IP address
 * @returns {boolean} True if within limits, false if exceeded
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Cleanup old entries periodically (every ~100 requests)
  if (Math.random() < 0.01) {
    cleanupOldEntries();
  }

  const current = rateLimitMap.get(ip);

  // If no entry or window expired, create new entry
  if (!current || now >= current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  // Check if limit exceeded
  if (current.count >= RATE_LIMIT_RPM) {
    return false;
  }

  // Increment counter
  current.count++;
  return true;
}

/**
 * POST endpoint for chat completions
 * Streams NDJSON responses with AI-generated content
 * @param {NextRequest} request - Next.js request object
 * @returns {Response} Streaming NDJSON response
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return new Response(
        `{"type":"error","code":"RATE_LIMIT","message":"Too many requests. Please try again later."}\n`,
        {
          status: 429,
          headers: {
            'Content-Type': 'application/x-ndjson',
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = ChatRequestSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        `{"type":"error","code":"BAD_REQUEST","message":"Invalid request format"}\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'application/x-ndjson',
          },
        }
      );
    }

    const { messages, model, formatConfig, parameters } = result.data;

    if (!validateInputLength(messages)) {
      return new Response(
        `{"type":"error","code":"BAD_REQUEST","message":"Input too long"}\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'application/x-ndjson',
          },
        }
      );
    }

    const zaiKey = process.env.ZAI_API_KEY || '';
    const openRouterKey = process.env.OPENROUTER_API_KEY || '';

    if (!zaiKey && !openRouterKey) {
      return new Response(
        `{"type":"error","code":"CONFIGURATION_ERROR","message":"No API keys configured"}\n`,
        {
          status: 500,
          headers: {
            'Content-Type': 'application/x-ndjson',
          },
        }
      );
    }

    const provider = createProvider(zaiKey, openRouterKey, model);
    const encoder = new TextEncoder();

    // Load MCP tools
    const { tools, toolsMap } = await loadMcpTools();
    console.log(`[Chat API] Loaded ${tools.length} MCP tools`);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages];
          let iteration = 0;
          const MAX_ITERATIONS = 6; // Prevent infinite loops

          while (iteration < MAX_ITERATIONS) {
            iteration++;
            console.log(`[Chat API] Starting iteration ${iteration}/${MAX_ITERATIONS}`);
            const toolCalls: ToolCall[] = [];
            let hasContent = false;
            let chunkCount = 0;

            // Generate response from AI
            for await (const chunk of provider.generateStream({
              messages: currentMessages,
              signal: request.signal,
              formatConfig,
              parameters,
              tools: tools.length > 0 ? tools : undefined,
            })) {
              if (request.signal.aborted) {
                return;
              }

              chunkCount++;

              // Collect complete tool calls (providers now handle accumulation)
              if (chunk.type === 'tool_call' && chunk.toolCall && chunk.toolCall.function?.name) {
                toolCalls.push(chunk.toolCall);
                console.log(`[Chat API] Iteration ${iteration}: Tool call received: ${chunk.toolCall.function.name}`);
              }

              // Track if AI generated content
              if (chunk.type === 'token') {
                hasContent = true;
              }

              // Log done chunks
              if (chunk.type === 'done') {
                console.log(`[Chat API] Iteration ${iteration}: Done chunk received (${chunkCount} total chunks)`);
              }

              // Stream chunk to client
              const line = JSON.stringify(chunk) + '\n';
              controller.enqueue(encoder.encode(line));
            }

            console.log(`[Chat API] Iteration ${iteration} complete: ${toolCalls.length} tool calls, ${chunkCount} chunks, hasContent=${hasContent}`);

            // If no tool calls, we're done
            if (toolCalls.length === 0) {
              console.log(`[Chat API] No tool calls, ending conversation`);
              break;
            }

            // Log and execute tool calls
            console.log(`[Chat API] Executing ${toolCalls.length} tool calls...`);

            for (const toolCall of toolCalls) {
              try {
                const { name, arguments: argsStr } = toolCall.function;
                const args = JSON.parse(argsStr || '{}');

                console.log(`[Chat API] Executing: ${name}(${JSON.stringify(args)})`);

                // Execute MCP tool
                const result = await executeMcpTool(name, args, toolsMap);
                console.log(`[Chat API] Result: ${result.substring(0, 100)}...`);

                // Add tool result to message history as a user message
                // This format is more compatible with AI models
                currentMessages.push({
                  role: 'user',
                  content: `Результат вызова инструмента ${name}:\n${result}\n\nИспользуй эти данные для ответа на вопрос пользователя.`,
                });

                // Send tool result chunk to client (for debugging)
                const toolResultChunk = {
                  type: 'token' as const,
                  content: `\n\n[Получены данные из ${name}]\n`,
                };
                controller.enqueue(encoder.encode(JSON.stringify(toolResultChunk) + '\n'));

              } catch (error) {
                console.error(`[Chat API] Tool execution error:`, error);
                const errorMsg = error instanceof Error ? error.message : String(error);

                currentMessages.push({
                  role: 'user',
                  content: `[Tool Error]: ${errorMsg}`,
                });
              }
            }

            // Continue to next iteration with updated messages
            // AI will now see the tool results and can formulate final response
          }

          // If we hit max iterations, warn the user
          if (iteration >= MAX_ITERATIONS) {
            console.log(`[Chat API] Max iterations reached`);
            const warningChunk = {
              type: 'token' as const,
              content: '\n\n[Достигнут лимит итераций]',
            };
            controller.enqueue(encoder.encode(JSON.stringify(warningChunk) + '\n'));
          }
        } catch (error) {
          const errorChunk: StreamChunk = {
            type: 'error',
            code: 'PROVIDER_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          };

          const line = JSON.stringify(errorChunk) + '\n';
          controller.enqueue(encoder.encode(line));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      `{"type":"error","code":"PROVIDER_ERROR","message":"${error instanceof Error ? error.message : 'Unknown error'}"}\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      }
    );
  }
}
