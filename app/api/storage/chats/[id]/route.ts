import { NextRequest, NextResponse } from 'next/server';
import {
  getChatById,
  updateChat as updateChatStorage,
  deleteChat as deleteChatStorage,
} from '@/server/storage/local-storage';
import { Chat } from '@/lib/chat-storage';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/storage/chats/[id] - Получить чат по ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const chat = await getChatById(id);

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Error getting chat:', error);
    return NextResponse.json(
      { error: 'Failed to get chat' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storage/chats/[id] - Обновить чат
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const updates: Partial<Omit<Chat, 'id' | 'createdAt'>> = await request.json();

    const success = await updateChatStorage(id, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/chats/[id] - Удалить чат
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const success = await deleteChatStorage(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
