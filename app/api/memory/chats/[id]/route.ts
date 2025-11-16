/**
 * API Route: /api/memory/chats/[id]
 * Get, update, or delete a specific chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/server/memory/memory-storage';
import { UpdateChatSchema } from '@/server/memory/schema';

/**
 * GET /api/memory/chats/[id]
 * Get chat by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await memoryStorage.init();
    const chat = await memoryStorage.getChat(id);

    if (!chat) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chat not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error('[API /api/memory/chats/[id] GET]', error);
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
 * PUT /api/memory/chats/[id]
 * Update chat
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request
    const validation = UpdateChatSchema.safeParse(body);
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

    await memoryStorage.init();
    await memoryStorage.updateChat(id, validation.data);

    // Get updated chat
    const chat = await memoryStorage.getChat(id);

    return NextResponse.json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error('[API /api/memory/chats/[id] PUT]', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

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
 * DELETE /api/memory/chats/[id]
 * Delete chat
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await memoryStorage.init();
    await memoryStorage.deleteChat(id);

    return NextResponse.json({
      success: true,
      message: 'Chat deleted',
    });
  } catch (error) {
    console.error('[API /api/memory/chats/[id] DELETE]', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
