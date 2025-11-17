/**
 * API endpoint to list available MCP tools
 * GET /api/mcp/tools
 */

import { NextResponse } from 'next/server';
import { createFigmaMcpClient } from '@/server/mcp/figma-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  let client;

  try {
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

    // Get server info
    const serverInfo = await client.getServerInfo();

    // Get available tools
    const tools = await client.listTools();

    return NextResponse.json({
      success: true,
      server: serverInfo,
      tools,
    });
  } catch (error) {
    console.error('MCP tools error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch MCP tools',
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
