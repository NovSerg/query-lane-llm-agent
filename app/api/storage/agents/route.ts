import { NextRequest, NextResponse } from 'next/server';
import {
  getAllAgents,
  createAgent as createAgentStorage,
  saveAgents,
} from '@/server/storage/local-storage';
import { Agent } from '@/lib/types';

/**
 * GET /api/storage/agents - Получить всех агентов
 */
export async function GET() {
  try {
    const agents = await getAllAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error getting agents:', error);
    return NextResponse.json(
      { error: 'Failed to get agents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storage/agents - Создать нового агента
 */
export async function POST(request: NextRequest) {
  try {
    const agent: Agent = await request.json();

    // Валидация
    if (!agent.id || !agent.name || !agent.model) {
      return NextResponse.json(
        { error: 'Invalid agent data' },
        { status: 400 }
      );
    }

    const created = await createAgentStorage(agent);
    return NextResponse.json({ agent: created });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storage/agents - Сохранить всех агентов (bulk update)
 */
export async function PUT(request: NextRequest) {
  try {
    const agents: Agent[] = await request.json();

    if (!Array.isArray(agents)) {
      return NextResponse.json(
        { error: 'Invalid data: expected array of agents' },
        { status: 400 }
      );
    }

    await saveAgents(agents);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving agents:', error);
    return NextResponse.json(
      { error: 'Failed to save agents' },
      { status: 500 }
    );
  }
}
