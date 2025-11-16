import { NextRequest, NextResponse } from 'next/server';
import {
  getAgentById,
  updateAgent as updateAgentStorage,
  deleteAgent as deleteAgentStorage,
} from '@/server/storage/local-storage';
import { Agent } from '@/lib/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/storage/agents/[id] - Получить агента по ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const agent = await getAgentById(id);

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error getting agent:', error);
    return NextResponse.json(
      { error: 'Failed to get agent' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storage/agents/[id] - Обновить агента
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const updates: Partial<Agent> = await request.json();

    const success = await updateAgentStorage(id, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/agents/[id] - Удалить агента
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const success = await deleteAgentStorage(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Agent not found or cannot delete last agent' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
