/**
 * Test script for Figma MCP connection
 *
 * Usage:
 *   npx tsx scripts/test-mcp.ts
 *
 * Or with Figma token:
 *   FIGMA_API_KEY=your_token npx tsx scripts/test-mcp.ts
 *
 * Or add to .env file:
 *   FIGMA_API_KEY=your_token
 */

import 'dotenv/config';
import { createFigmaMcpClient } from '../server/mcp/figma-client';

async function main() {
  console.log('🚀 Starting Figma MCP connection test...\n');

  let client;

  try {
    // Get Figma token from environment
    const figmaToken = process.env.FIGMA_API_KEY;

    if (!figmaToken) {
      console.log('⚠️  Warning: FIGMA_API_KEY not set in environment');
      console.log('   Set it with: export FIGMA_API_KEY=your_token');
      console.log('   Or add to .env file: FIGMA_API_KEY=your_token\n');
    }

    // Connect to Figma MCP server
    console.log('📡 Connecting to Figma MCP server...');
    client = await createFigmaMcpClient(figmaToken);

    // Get server info
    console.log('\n📋 Server Information:');
    const serverInfo = await client.getServerInfo();
    if (serverInfo) {
      console.log(`   Name: ${serverInfo.name}`);
      console.log(`   Version: ${serverInfo.version}`);
    }

    // List available tools
    console.log('\n🛠️  Available Tools:');
    const tools = await client.listTools();

    if (tools.length === 0) {
      console.log('   No tools available');
    } else {
      console.log(`   Found ${tools.length} tools:\n`);

      tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name}`);
        if (tool.description) {
          console.log(`      Description: ${tool.description}`);
        }

        // Show input schema details
        if (tool.inputSchema.properties) {
          const params = Object.keys(tool.inputSchema.properties);
          if (params.length > 0) {
            console.log(`      Parameters: ${params.join(', ')}`);
          }
        }

        if (tool.inputSchema.required && tool.inputSchema.required.length > 0) {
          console.log(`      Required: ${tool.inputSchema.required.join(', ')}`);
        }

        console.log('');
      });
    }

    // Pretty print full tools as JSON
    console.log('\n📄 Full Tools Schema:');
    console.log(JSON.stringify(tools, null, 2));

    console.log('\n✅ MCP connection test completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    // Clean up connection
    if (client) {
      await client.disconnect();
    }
  }
}

// Run the test
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
