/**
 * MCP Client for OpenWeather
 * Connects to Weather MCP server via HTTP and provides access to weather tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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

export class WeatherMcpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private connected = false;
  private serverUrl: string;

  /**
   * Create Weather MCP client
   * @param serverUrl - URL of the MCP Weather server (default: http://localhost:3001/mcp)
   */
  constructor(serverUrl: string = 'http://localhost:3001/mcp') {
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to Weather MCP server via HTTP
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected to MCP server');
    }

    try {
      // Create HTTP transport
      this.transport = new StreamableHTTPClientTransport(new URL(this.serverUrl));

      // Create client and connect
      this.client = new Client(
        {
          name: 'querylane-weather-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      this.connected = true;

      console.log(`✅ Connected to Weather MCP server at ${this.serverUrl}`);
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect to Weather MCP server: ${error instanceof Error ? error.message : String(error)}`
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
   * List all available tools from Weather MCP server
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
      console.log('✅ Disconnected from Weather MCP server');
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
 * Create and connect to Weather MCP server
 * @param serverUrl - URL of the MCP Weather server (default: http://localhost:3001/mcp)
 */
export async function createWeatherMcpClient(
  serverUrl?: string
): Promise<WeatherMcpClient> {
  const client = new WeatherMcpClient(serverUrl);
  await client.connect();
  return client;
}
