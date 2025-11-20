/**
 * MCP Client for Research Pipeline
 * Connects to Research Pipeline MCP server via HTTP and provides access to research tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpTool, McpServerInfo } from './weather-client';

export class ResearchMcpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private connected = false;
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3003/mcp') {
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected to MCP server');
    }

    try {
      this.transport = new StreamableHTTPClientTransport(new URL(this.serverUrl));

      this.client = new Client(
        {
          name: 'querylane-research-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      this.connected = true;

      console.log(`✅ Connected to Research Pipeline MCP server at ${this.serverUrl}`);
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect to Research Pipeline MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

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
      console.log('✅ Disconnected from Research Pipeline MCP server');
    } catch (error) {
      console.error('Error during disconnect:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export async function createResearchMcpClient(
  serverUrl?: string
): Promise<ResearchMcpClient> {
  const client = new ResearchMcpClient(serverUrl);
  await client.connect();
  return client;
}
