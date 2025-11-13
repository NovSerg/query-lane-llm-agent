import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProvider } from '../../../server/provider';
import { getSummarizationPrompt } from '../../../lib/message-compactor';
import type { Message } from '../../../lib/types';

/**
 * Request schema for compaction endpoint
 */
const CompactRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .min(1)
    .max(100),
  model: z.string().optional(), // Optional: use specific model for summarization
});

/**
 * POST /api/compact
 * Summarizes messages using LLM
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    const validation = CompactRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { messages, model } = validation.data;

    // Use fast, cheap model for summarization
    // Priority: provided model > Claude Haiku (if available) > GLM-4-Flash
    const summarizationModel =
      model ||
      (process.env.OPENROUTER_API_KEY
        ? 'anthropic/claude-haiku-4.5-20250415'
        : 'glm-4-flash');

    // Get API keys
    const zaiKey = process.env.ZAI_API_KEY || '';
    const openRouterKey = process.env.OPENROUTER_API_KEY || '';

    // Validate API keys for the selected model
    if (
      summarizationModel.includes('claude') ||
      summarizationModel.includes('anthropic') ||
      summarizationModel.includes('openai')
    ) {
      if (!openRouterKey) {
        return NextResponse.json(
          {
            error: 'OpenRouter API key not configured',
            message:
              'OPENROUTER_API_KEY environment variable is required for this model',
          },
          { status: 500 }
        );
      }
    } else if (!zaiKey) {
      return NextResponse.json(
        {
          error: 'Z.AI API key not configured',
          message: 'ZAI_API_KEY environment variable is required for GLM models',
        },
        { status: 500 }
      );
    }

    // Create summarization prompt
    const prompt = getSummarizationPrompt(messages as Message[]);

    // Create provider
    const provider = createProvider(zaiKey, openRouterKey, summarizationModel);

    // Prepare messages for provider
    const providerMessages: Message[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Collect response
    let summary = '';
    try {
      for await (const chunk of provider.generateStream({
        messages: providerMessages,
        parameters: {
          temperature: 0.3, // Low temperature for consistent summaries
          max_tokens: 2000, // Allow detailed summary with context
        },
      })) {
        if (chunk.type === 'token' && chunk.content) {
          summary += chunk.content;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.message || 'Summarization failed');
        }
      }
    } catch (error) {
      console.error('Summarization stream error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        {
          error: 'Failed to generate summary',
          message: `Model: ${summarizationModel}, Error: ${errorMessage}`,
        },
        { status: 500 }
      );
    }

    // Return summary
    return NextResponse.json({
      summary: summary.trim(),
      model: summarizationModel,
      originalCount: messages.length,
    });
  } catch (error) {
    console.error('Compact API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
