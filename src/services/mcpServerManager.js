import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

class MCPServerManager {
  constructor() {
    this.servers = new Map(); // tenantId -> Map<serverId, serverInstance>
    this.serverConfigs = new Map(); // serverId -> serverConfig
    this.connections = new Map(); // connectionId -> connection details
    this.wsServer = null;
  }

  async initialize() {
    // Initialize WebSocket server for MCP connections
    this.wsServer = new WebSocketServer({ 
      port: config.wsPort,
      path: config.wsPath 
    });

    this.wsServer.on('connection', (ws, req) => {
      this.handleWebSocketConnection(ws, req);
    });

    logger.info(`MCP WebSocket server initialized on port ${config.wsPort}`);
  }

  handleWebSocketConnection(ws, req) {
    const connectionId = uuidv4();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenant');
    const serverId = url.searchParams.get('server');
    const token = url.searchParams.get('token');

    logger.info(`New WebSocket connection: ${connectionId}`, {
      tenantId,
      serverId,
      ip: req.socket.remoteAddress
    });

    // Validate connection
    if (!this.validateConnection(tenantId, serverId, token)) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    // Store connection
    this.connections.set(connectionId, {
      id: connectionId,
      ws,
      tenantId,
      serverId,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Set up MCP server for this connection
    this.setupMCPServerForConnection(connectionId, ws, tenantId, serverId);

    ws.on('close', () => {
      logger.info(`WebSocket connection closed: ${connectionId}`);
      this.connections.delete(connectionId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for connection ${connectionId}:`, error);
      this.connections.delete(connectionId);
    });
  }

  async setupMCPServerForConnection(connectionId, ws, tenantId, serverId) {
    try {
      const serverConfig = this.serverConfigs.get(serverId);
      if (!serverConfig) {
        ws.close(1008, 'Server not found');
        return;
      }

      // Create MCP server instance
      const server = new Server({
        name: serverConfig.name,
        version: serverConfig.version,
      }, {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      });

      // Register tools based on server configuration
      await this.registerServerTools(server, serverConfig);

      // Create transport for WebSocket
      const transport = new WebSocketServerTransport(ws);
      
      // Connect server to transport
      await server.connect(transport);

      // Store server instance
      if (!this.servers.has(tenantId)) {
        this.servers.set(tenantId, new Map());
      }
      this.servers.get(tenantId).set(serverId, {
        server,
        transport,
        connectionId,
        config: serverConfig,
        startedAt: new Date()
      });

      logger.info(`MCP server started for connection ${connectionId}`, {
        tenantId,
        serverId,
        serverName: serverConfig.name
      });

    } catch (error) {
      logger.error(`Failed to setup MCP server for connection ${connectionId}:`, error);
      ws.close(1011, 'Internal server error');
    }
  }

  async registerServerTools(server, serverConfig) {
    // Register tools based on server type
    switch (serverConfig.type) {
      case 'file-manager':
        await this.registerFileManagerTools(server);
        break;
      case 'database':
        await this.registerDatabaseTools(server, serverConfig);
        break;
      case 'api-client':
        await this.registerApiClientTools(server, serverConfig);
        break;
      case 'custom':
        await this.registerCustomTools(server, serverConfig);
        break;
      default:
        await this.registerDefaultTools(server);
    }
  }

  async registerFileManagerTools(server) {
    server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read contents of a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to read' }
              },
              required: ['path']
            }
          },
          {
            name: 'write_file',
            description: 'Write contents to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to write' },
                content: { type: 'string', description: 'Content to write' }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'list_files',
            description: 'List files in a directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path to list' }
              },
              required: ['path']
            }
          }
        ]
      };
    });

    server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'read_file':
          return await this.handleReadFile(args.path);
        case 'write_file':
          return await this.handleWriteFile(args.path, args.content);
        case 'list_files':
          return await this.handleListFiles(args.path);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async registerDatabaseTools(server, serverConfig) {
    server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'query_database',
            description: 'Execute a database query',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL query to execute' },
                params: { type: 'array', description: 'Query parameters' }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'query_database':
          return await this.handleDatabaseQuery(serverConfig, args.query, args.params);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async registerApiClientTools(server, serverConfig) {
    server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'api_request',
            description: 'Make HTTP API request',
            inputSchema: {
              type: 'object',
              properties: {
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                url: { type: 'string', description: 'API endpoint URL' },
                headers: { type: 'object', description: 'Request headers' },
                body: { type: 'object', description: 'Request body' }
              },
              required: ['method', 'url']
            }
          }
        ]
      };
    });

    server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'api_request':
          return await this.handleApiRequest(serverConfig, args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async registerDefaultTools(server) {
    server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'ping',
            description: 'Test connectivity',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Message to echo back' }
              }
            }
          }
        ]
      };
    });

    server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'ping':
          return {
            content: [
              {
                type: 'text',
                text: `Pong: ${args.message || 'Hello from MCP server!'}`
              }
            ]
          };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  // Tool implementation methods
  async handleReadFile(path) {
    // Implementation would depend on security policies and file access controls
    return {
      content: [
        {
          type: 'text',
          text: `File read operation for: ${path} (implementation needed)`
        }
      ]
    };
  }

  async handleWriteFile(path, content) {
    // Implementation would depend on security policies and file access controls
    return {
      content: [
        {
          type: 'text',
          text: `File write operation for: ${path} (implementation needed)`
        }
      ]
    };
  }

  async handleListFiles(path) {
    // Implementation would depend on security policies and file access controls
    return {
      content: [
        {
          type: 'text',
          text: `Directory listing for: ${path} (implementation needed)`
        }
      ]
    };
  }

  async handleDatabaseQuery(serverConfig, query, params) {
    // Implementation would connect to configured database
    return {
      content: [
        {
          type: 'text',
          text: `Database query executed: ${query} (implementation needed)`
        }
      ]
    };
  }

  async handleApiRequest(serverConfig, args) {
    // Implementation would make HTTP request with proper security
    return {
      content: [
        {
          type: 'text',
          text: `API request: ${args.method} ${args.url} (implementation needed)`
        }
      ]
    };
  }

  // Management methods
  async createServer(tenantId, serverConfig) {
    const serverId = uuidv4();
    
    // Validate tenant doesn't exceed server limit
    const tenantServers = this.servers.get(tenantId);
    if (tenantServers && tenantServers.size >= config.mcpServers.maxServersPerTenant) {
      throw new Error('Maximum servers per tenant exceeded');
    }

    // Store server configuration
    this.serverConfigs.set(serverId, {
      ...serverConfig,
      id: serverId,
      tenantId,
      createdAt: new Date(),
      status: 'created'
    });

    logger.info(`MCP server configuration created: ${serverId}`, {
      tenantId,
      serverType: serverConfig.type,
      serverName: serverConfig.name
    });

    return serverId;
  }

  async deleteServer(tenantId, serverId) {
    // Stop any running instances
    const tenantServers = this.servers.get(tenantId);
    if (tenantServers && tenantServers.has(serverId)) {
      const serverInstance = tenantServers.get(serverId);
      await serverInstance.server.close();
      tenantServers.delete(serverId);
    }

    // Remove configuration
    this.serverConfigs.delete(serverId);

    logger.info(`MCP server deleted: ${serverId}`, { tenantId });
  }

  getServerStatus(tenantId, serverId) {
    const config = this.serverConfigs.get(serverId);
    if (!config || config.tenantId !== tenantId) {
      return null;
    }

    const tenantServers = this.servers.get(tenantId);
    const isRunning = tenantServers && tenantServers.has(serverId);

    return {
      id: serverId,
      name: config.name,
      type: config.type,
      status: isRunning ? 'running' : 'stopped',
      createdAt: config.createdAt,
      startedAt: isRunning ? tenantServers.get(serverId).startedAt : null
    };
  }

  listServers(tenantId) {
    const servers = [];
    
    for (const [serverId, config] of this.serverConfigs.entries()) {
      if (config.tenantId === tenantId) {
        servers.push(this.getServerStatus(tenantId, serverId));
      }
    }

    return servers;
  }

  validateConnection(tenantId, serverId, token) {
    // Implement tenant and server validation logic
    // For now, basic validation
    return tenantId && serverId && token;
  }

  getConnectionStats() {
    return {
      activeConnections: this.connections.size,
      totalServers: this.serverConfigs.size,
      runningServers: Array.from(this.servers.values())
        .reduce((total, tenantServers) => total + tenantServers.size, 0)
    };
  }
}

// WebSocket transport for MCP server
class WebSocketServerTransport {
  constructor(ws) {
    this.ws = ws;
  }

  async send(message) {
    if (this.ws.readyState === 1) { // WebSocket.OPEN
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler) {
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handler(message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
      }
    });
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

export default MCPServerManager;