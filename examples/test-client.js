#!/usr/bin/env node

/**
 * Example MCP client for testing the multi-tenant MCP host server
 * This demonstrates how to connect to and use remote MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocket } from 'ws';
import axios from 'axios';

const API_BASE = 'https://mcp.mvrx.com.au';
const WS_BASE = 'wss://mcp.mvrx.com.au:3001';

class MCPTestClient {
  constructor() {
    this.authToken = null;
    this.client = null;
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating with MCP host server...');
      
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'admin@mcp.mvrx.com.au',
        password: 'SecureMCP2024!'
      });

      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
      
      return response.data.tenant;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async createServer(name, type, description = '') {
    try {
      console.log(`🏗️ Creating MCP server: ${name} (${type})`);
      
      const response = await axios.post(`${API_BASE}/api/servers`, {
        name,
        type,
        description
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      console.log('✅ MCP server created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Server creation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async getConnectionUrl(serverId) {
    try {
      console.log(`🔗 Getting connection URL for server: ${serverId}`);
      
      const response = await axios.post(`${API_BASE}/api/servers/${serverId}/connect`, {}, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      console.log('✅ Connection URL generated');
      return response.data;
    } catch (error) {
      console.error('❌ Connection URL generation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async connectToServer(connectionUrl) {
    try {
      console.log('🌐 Connecting to MCP server via WebSocket...');
      
      const ws = new WebSocket(connectionUrl);
      
      // Create MCP client
      this.client = new Client({
        name: 'test-client',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Wait for WebSocket connection
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
      });

      // Connect MCP client to WebSocket transport
      const transport = new WebSocketClientTransport(ws);
      await this.client.connect(transport);

      console.log('✅ Connected to MCP server');
      return this.client;
    } catch (error) {
      console.error('❌ MCP connection failed:', error.message);
      throw error;
    }
  }

  async testTools() {
    if (!this.client) {
      throw new Error('Not connected to MCP server');
    }

    try {
      console.log('🔧 Testing MCP tools...');
      
      // List available tools
      const toolsResponse = await this.client.request({
        method: 'tools/list'
      });
      
      console.log('📋 Available tools:', toolsResponse.tools);

      // Test ping tool if available
      const pingTool = toolsResponse.tools.find(tool => tool.name === 'ping');
      if (pingTool) {
        console.log('🏓 Testing ping tool...');
        
        const pingResponse = await this.client.request({
          method: 'tools/call',
          params: {
            name: 'ping',
            arguments: {
              message: 'Hello from test client!'
            }
          }
        });
        
        console.log('✅ Ping response:', pingResponse);
      }

      return toolsResponse.tools;
    } catch (error) {
      console.error('❌ Tool testing failed:', error.message);
      throw error;
    }
  }

  async runFullTest() {
    try {
      console.log('🚀 Starting full MCP host server test...\n');

      // 1. Authenticate
      const tenant = await this.authenticate();
      console.log('👤 Logged in as:', tenant.name, '\n');

      // 2. Create a test server
      const server = await this.createServer(
        'Test File Manager',
        'file-manager',
        'Test server for file management operations'
      );
      console.log('📁 Server ID:', server.id, '\n');

      // 3. Get connection URL
      const connectionInfo = await this.getConnectionUrl(server.id);
      console.log('🔗 Connection URL generated\n');

      // 4. Connect to MCP server
      await this.connectToServer(connectionInfo.connectionUrl);
      console.log('🌐 MCP client connected\n');

      // 5. Test tools
      const tools = await this.testTools();
      console.log(`🎯 Found ${tools.length} tools\n`);

      // 6. Test system status
      const statusResponse = await axios.get(`${API_BASE}/api/status`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      console.log('📊 System Status:', statusResponse.data);

      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
    } finally {
      if (this.client) {
        try {
          await this.client.close();
          console.log('🔌 MCP client disconnected');
        } catch (error) {
          console.error('Error closing MCP client:', error.message);
        }
      }
    }
  }
}

// WebSocket transport for MCP client
class WebSocketClientTransport {
  constructor(ws) {
    this.ws = ws;
    this.messageHandlers = new Set();
  }

  async send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not open');
    }
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    
    if (this.messageHandlers.size === 1) {
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.messageHandlers.forEach(h => h(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
    }
  }

  onClose(handler) {
    this.ws.on('close', handler);
  }

  onError(handler) {
    this.ws.on('error', handler);
  }

  close() {
    this.ws.close();
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testClient = new MCPTestClient();
  testClient.runFullTest().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

export default MCPTestClient;