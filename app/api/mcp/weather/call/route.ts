/**
 * API endpoint to call Weather MCP tools
 * POST /api/mcp/weather/call
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWeatherMcpClient } from '@/server/mcp/weather-client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CallToolSchema = z.object({
  tool: z.string().min(1),
  arguments: z.record(z.any()).default({}),
});

export async function POST(req: NextRequest) {
  let client;

  try {
    // Parse request body
    const body = await req.json();
    console.log('Received body:', JSON.stringify(body));

    // Simple parsing without schema for now
    const tool = body.tool;
    const args = body.arguments || {};

    // Get MCP server URL from environment (default: http://localhost:3001/mcp)
    const mcpServerUrl = process.env.MCP_WEATHER_SERVER_URL || 'http://localhost:3001/mcp';

    // Connect to Weather MCP server via HTTP
    client = await createWeatherMcpClient(mcpServerUrl);

    // Call the tool
    const result = await client.callTool(tool, args);

    return NextResponse.json({
      success: true,
      tool,
      result,
    });
  } catch (error) {
    console.error('Weather MCP call error:', error);

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
        error: 'Failed to call Weather MCP tool',
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
