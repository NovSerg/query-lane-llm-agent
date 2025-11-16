/**
 * API Route: /api/memory/embeddings
 * Generate and store vector embeddings for messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/server/memory/memory-storage';
import { embeddingGenerator } from '@/server/memory/embeddings';
import { z } from 'zod';

const GenerateEmbeddingRequestSchema = z.object({
  chatId: z.string().min(1),
  messageIndex: z.number().int().min(0),
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(50000),
});

const BatchGenerateEmbeddingRequestSchema = z.object({
  chatId: z.string().min(1),
  messages: z.array(
    z.object({
      index: z.number().int().min(0),
      role: z.enum(['user', 'assistant']),
      text: z.string().min(1).max(50000),
    })
  ).max(100),
});

/**
 * POST /api/memory/embeddings
 * Generate embedding for a single message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if it's a batch request
    if (Array.isArray(body.messages)) {
      return handleBatchGeneration(body);
    }

    // Validate single request
    const validation = GenerateEmbeddingRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { chatId, messageIndex, role, text } = validation.data;

    // Initialize services
    await memoryStorage.init();
    await embeddingGenerator.init();

    // Generate embedding
    const startTime = Date.now();
    const vector = await embeddingGenerator.embed(text);
    const generationTime = Date.now() - startTime;

    // Store embedding
    const embedding = await memoryStorage.addEmbedding({
      chatId,
      messageIndex,
      role,
      text,
      vector,
    });

    return NextResponse.json({
      success: true,
      embedding: {
        id: embedding.id,
        chatId: embedding.chatId,
        messageIndex: embedding.messageIndex,
        dimensions: vector.length,
      },
      metadata: {
        generationTime,
      },
    });
  } catch (error) {
    console.error('[API /api/memory/embeddings POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle batch generation
 */
async function handleBatchGeneration(body: unknown) {
  try {
    const validation = BatchGenerateEmbeddingRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { chatId, messages } = validation.data;

    // Initialize services
    await memoryStorage.init();
    await embeddingGenerator.init();

    // Generate embeddings in batch
    const startTime = Date.now();
    const texts = messages.map(m => m.text);
    const vectors = await embeddingGenerator.embedBatch(texts);
    const generationTime = Date.now() - startTime;

    // Store embeddings
    const embeddings = await Promise.all(
      messages.map((msg, i) =>
        memoryStorage.addEmbedding({
          chatId,
          messageIndex: msg.index,
          role: msg.role,
          text: msg.text,
          vector: vectors[i],
        })
      )
    );

    return NextResponse.json({
      success: true,
      embeddings: embeddings.map(e => ({
        id: e.id,
        messageIndex: e.messageIndex,
      })),
      count: embeddings.length,
      metadata: {
        generationTime,
        averageTimePerMessage: Math.round(generationTime / messages.length),
      },
    });
  } catch (error) {
    console.error('[API /api/memory/embeddings BATCH]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
