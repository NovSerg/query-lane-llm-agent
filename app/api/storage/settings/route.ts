import { NextRequest, NextResponse } from 'next/server';
import {
  getSettings,
  setCurrentChatId,
  setActiveAgentId,
} from '@/server/storage/local-storage';

/**
 * GET /api/storage/settings - Получить настройки
 */
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storage/settings - Обновить настройки
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Обновляем currentChatId если предоставлен
    if ('currentChatId' in body) {
      await setCurrentChatId(body.currentChatId);
    }

    // Обновляем activeAgentId если предоставлен
    if ('activeAgentId' in body) {
      await setActiveAgentId(body.activeAgentId);
    }

    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
