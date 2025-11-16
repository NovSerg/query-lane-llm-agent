/**
 * API Route: /api/memory/chats
 * Handles CRUD operations for chats in external memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/server/memory/memory-storage';
import { CreateChatRequestSchema } from '@/server/memory/schema';

/**
 * GET /api/memory/chats
 * List all chats (with optional limit)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    await memoryStorage.init();
    const chats = await memoryStorage.listChats(limit ? parseInt(limit) : undefined);

    return NextResponse.json({
      success: true,
      chats,
      count: chats.length,
    });
  } catch (error) {
    console.error('[API /api/memory/chats GET]', error);
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
 * POST /api/memory/chats
 * Create new chat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = CreateChatRequestSchema.safeParse(body);
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

    const { title, messages = [], agentId } = validation.data;

    await memoryStorage.init();
    const chat = await memoryStorage.createChat(title, agentId, messages);

    return NextResponse.json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error('[API /api/memory/chats POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
