/**
 * API Route: /api/memory/stats
 * Get memory storage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/server/memory/memory-storage';

/**
 * GET /api/memory/stats
 * Get statistics about memory storage
 */
export async function GET(request: NextRequest) {
  try {
    await memoryStorage.init();
    const stats = await memoryStorage.getStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[API /api/memory/stats GET]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
