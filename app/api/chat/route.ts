import { NextRequest } from 'next/server';
import { ChatRequestSchema, validateInputLength } from '../../../server/schema';
import { createProvider } from '../../../server/provider';
import { StreamChunk } from '../../../lib/types';

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

    const { messages, model, formatConfig } = result.data;

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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of provider.generateStream({
            messages,
            signal: request.signal,
            formatConfig,
          })) {
            if (request.signal.aborted) {
              break;
            }

            const line = JSON.stringify(chunk) + '\n';
            controller.enqueue(encoder.encode(line));
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
