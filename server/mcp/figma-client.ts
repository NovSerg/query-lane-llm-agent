/**
 * MCP Client for Figma
 * Connects to Figma MCP server and provides access to Figma tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export class FigmaMcpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  /**
   * Connect to Figma MCP server
   * @param figmaToken - Figma API token (optional, can be set via env)
   */
  async connect(figmaToken?: string): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected to MCP server');
    }

    try {
      // Create transport using stdio to spawn the Figma MCP server
      // Figma MCP expects FIGMA_API_KEY or FIGMA_OAUTH_TOKEN
      const token = figmaToken || process.env.FIGMA_API_KEY;

      // Use locally installed figma-developer-mcp
      // Path to the bin entry point in node_modules
      const serverPath = 'node_modules/figma-developer-mcp/dist/bin.js';

      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath, '--stdio'], // Force stdio mode
        env: {
          ...process.env,
          NODE_ENV: 'cli', // Set CLI mode
          ...(token ? { FIGMA_API_KEY: token } : {}),
        },
      });

      // Create client and connect
      this.client = new Client(
        {
          name: 'querylane-mcp-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      this.connected = true;

      console.log('✅ Connected to Figma MCP server');
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect to Figma MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<McpServerInfo | null> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const info = await this.client.getServerVersion();
      return {
        name: info?.name || 'Unknown',
        version: info?.version || 'Unknown',
      };
    } catch (error) {
      console.error('Failed to get server info:', error);
      return null;
    }
  }

  /**
   * List all available tools from Figma MCP server
   */
  async listTools(): Promise<McpTool[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this.client.listTools();
      return (
        response.tools?.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema as McpTool['inputSchema'],
        })) || []
      );
    } catch (error) {
      throw new Error(
        `Failed to list tools: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Call a tool by name with parameters
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: args,
      });
      return response;
    } catch (error) {
      throw new Error(
        `Failed to call tool '${name}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      this.connected = false;
      console.log('✅ Disconnected from Figma MCP server');
    } catch (error) {
      console.error('Error during disconnect:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Create and connect to Figma MCP server
 */
export async function createFigmaMcpClient(
  figmaToken?: string
): Promise<FigmaMcpClient> {
  const client = new FigmaMcpClient();
  await client.connect(figmaToken);
  return client;
}
