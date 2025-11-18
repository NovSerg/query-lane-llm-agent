/**
 * API endpoint to list available Weather MCP tools
 * GET /api/mcp/weather/tools
 */

import { NextResponse } from 'next/server';
import { createWeatherMcpClient } from '@/server/mcp/weather-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  let client;

  try {
    // Get MCP server URL from environment (default: http://localhost:3001/mcp)
    const mcpServerUrl = process.env.MCP_WEATHER_SERVER_URL || 'http://localhost:3001/mcp';

    // Connect to MCP server via HTTP
    client = await createWeatherMcpClient(mcpServerUrl);

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
    console.error('Weather MCP tools error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Weather MCP tools',
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
