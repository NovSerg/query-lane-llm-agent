import { NextRequest, NextResponse } from 'next/server';
import {
  getAllChats,
  createChat as createChatStorage,
  deleteAllChats,
} from '@/server/storage/local-storage';
import { Chat } from '@/lib/chat-storage';

/**
 * GET /api/storage/chats - Получить все чаты
 */
export async function GET() {
  try {
    const chats = await getAllChats();
    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error getting chats:', error);
    return NextResponse.json(
      { error: 'Failed to get chats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storage/chats - Создать новый чат
 */
export async function POST(request: NextRequest) {
  try {
    const chat: Chat = await request.json();

    // Валидация
    if (!chat.id || !chat.title || !Array.isArray(chat.messages)) {
      return NextResponse.json(
        { error: 'Invalid chat data' },
        { status: 400 }
      );
    }

    const created = await createChatStorage(chat);
    return NextResponse.json({ chat: created });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/chats - Удалить все чаты
 */
export async function DELETE() {
  try {
    await deleteAllChats();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting all chats:', error);
    return NextResponse.json(
      { error: 'Failed to delete all chats' },
      { status: 500 }
    );
  }
}
