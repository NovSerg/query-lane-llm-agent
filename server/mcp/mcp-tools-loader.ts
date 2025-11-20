/**
 * MCP Tools Loader
 * Loads tools from MCP servers and converts them to OpenAI function calling format
 */

import { createWeatherMcpClient, McpTool } from './weather-client';
import { createReminderMcpClient } from './reminder-client';

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Convert MCP tool schema to OpenAI function calling format
 */
export function convertMcpToolToOpenAI(tool: McpTool): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema as OpenAITool['function']['parameters'],
    },
  };
}

/**
 * Load all available MCP tools from configured servers
 */
export async function loadMcpTools(): Promise<{
  tools: OpenAITool[];
  toolsMap: Map<string, { client: any; tool: McpTool }>;
}> {
  const tools: OpenAITool[] = [];
  const toolsMap = new Map<string, { client: any; tool: McpTool }>();

  try {
    // Load Weather MCP tools
    const weatherServerUrl = process.env.MCP_WEATHER_SERVER_URL || 'http://localhost:3001/mcp';
    
    try {
      const weatherClient = await createWeatherMcpClient(weatherServerUrl);
      const weatherTools = await weatherClient.listTools();

      for (const tool of weatherTools) {
        const openAITool = convertMcpToolToOpenAI(tool);
        tools.push(openAITool);
        toolsMap.set(tool.name, { client: weatherClient, tool });
      }

      console.log(`✅ Loaded ${weatherTools.length} tools from Weather MCP`);
    } catch (error) {
      console.warn(`⚠️  Weather MCP server not available:`, error instanceof Error ? error.message : String(error));
    }

    // Load Reminder MCP tools
    const reminderServerUrl = process.env.MCP_REMINDER_SERVER_URL || 'http://localhost:3002/mcp';

    try {
      const reminderClient = await createReminderMcpClient(reminderServerUrl);
      const reminderTools = await reminderClient.listTools();

      for (const tool of reminderTools) {
        const openAITool = convertMcpToolToOpenAI(tool);
        tools.push(openAITool);
        toolsMap.set(tool.name, { client: reminderClient, tool });
      }

      console.log(`✅ Loaded ${reminderTools.length} tools from Reminder MCP`);
    } catch (error) {
      console.warn(`⚠️  Reminder MCP server not available:`, error instanceof Error ? error.message : String(error));
    }

    // Add more MCP servers here in the future
    // e.g., Figma MCP, GitHub MCP, etc.

  } catch (error) {
    console.error('Error loading MCP tools:', error);
  }

  return { tools, toolsMap };
}

/**
 * Execute an MCP tool by name
 */
export async function executeMcpTool(
  toolName: string,
  args: Record<string, any>,
  toolsMap: Map<string, { client: any; tool: McpTool }>
): Promise<string> {
  const toolEntry = toolsMap.get(toolName);

  if (!toolEntry) {
    throw new Error(`Tool '${toolName}' not found`);
  }

  const { client } = toolEntry;
  const result = await client.callTool(toolName, args);

  // Extract text content from MCP response
  if (result && result.content && Array.isArray(result.content)) {
    const textContent = result.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');
    return textContent;
  }

  return JSON.stringify(result);
}
