/**
 * API Route: /api/memory/search
 * Semantic search across chat history using vector embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/server/memory/memory-storage';
import { embeddingGenerator } from '@/server/memory/embeddings';
import { SemanticSearchRequestSchema } from '@/server/memory/schema';

/**
 * POST /api/memory/search
 * Semantic search for messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = SemanticSearchRequestSchema.safeParse(body);
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

    const { query, limit = 5, chatId, minSimilarity = 0.3 } = validation.data;

    // Initialize services
    await memoryStorage.init();
    await embeddingGenerator.init();

    // Generate query embedding
    const startTime = Date.now();
    const queryVector = await embeddingGenerator.embed(query);
    const embeddingTime = Date.now() - startTime;

    // Search for similar messages
    const searchStart = Date.now();
    const results = await memoryStorage.searchByVector(
      queryVector,
      limit,
      minSimilarity,
      chatId
    );
    const searchTime = Date.now() - searchStart;

    // Enrich results with chat titles
    const enrichedResults = await Promise.all(
      results.map(async result => {
        const chat = await memoryStorage.getChat(result.chatId);
        return {
          ...result,
          chatTitle: chat?.title || 'Unknown',
        };
      })
    );

    return NextResponse.json({
      success: true,
      results: enrichedResults,
      count: enrichedResults.length,
      metadata: {
        query,
        embeddingTime,
        searchTime,
        totalTime: embeddingTime + searchTime,
      },
    });
  } catch (error) {
    console.error('[API /api/memory/search POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
