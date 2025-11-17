/**
 * API endpoint to call MCP tools
 * POST /api/mcp/call
 */

import { NextRequest, NextResponse } from 'next/server';
import { createFigmaMcpClient } from '@/server/mcp/figma-client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CallToolSchema = z.object({
  tool: z.string().min(1),
  arguments: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  let client;

  try {
    // Parse request body
    const body = await request.json();
    const { tool, arguments: args } = CallToolSchema.parse(body);

    // Get Figma token from environment
    const figmaToken = process.env.FIGMA_API_KEY;

    if (!figmaToken) {
      return NextResponse.json(
        {
          error: 'FIGMA_API_KEY not configured',
          message:
            'Please set FIGMA_API_KEY in your environment variables to use MCP tools',
        },
        { status: 503 }
      );
    }

    // Connect to MCP server
    client = await createFigmaMcpClient(figmaToken);

    // Call the tool
    const result = await client.callTool(tool, args);

    return NextResponse.json({
      success: true,
      tool,
      result,
    });
  } catch (error) {
    console.error('MCP call error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Request body validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to call MCP tool',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    // Clean up connection
    if (client) {
      await client.disconnect().catch(console.error);
    }
  }
}
