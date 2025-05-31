#!/usr/bin/env node

import express from 'express';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import MCPServerManager from './services/mcpServerManager.js';
import ServerRunner from './services/serverRunner.js';
import apiRoutes from './routes/api.js';
import {
  corsMiddleware,
  securityHeaders,
  generalRateLimit,
  apiRateLimit,
  validateInput,
  requestLogger,
  errorHandler,
  notFoundHandler
} from './middleware/security.js';

class MCPHostServer {
  constructor() {
    this.app = express();
    this.mcpManager = new MCPServerManager();
    this.serverRunner = new ServerRunner();
    this.server = null;
  }

  async initialize() {
    try {
      // Initialize MCP server manager and server runner
      await this.mcpManager.initialize();
      this.app.set('mcpManager', this.mcpManager);
      this.app.set('serverRunner', this.serverRunner);

      // Trust proxy for DigitalOcean App Platform
      this.app.set('trust proxy', true);

      // Apply security middleware
      this.app.use(securityHeaders);
      this.app.use(corsMiddleware);
      this.app.use(generalRateLimit);
      this.app.use(requestLogger);
      this.app.use(validateInput);

      // Parse JSON with size limit
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // Health check endpoint (no auth required)
      this.app.get('/health', (req, res) => {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: config.nodeEnv
        });
      });

      // Root endpoint
      this.app.get('/', (req, res) => {
        res.json({
          name: 'MCP Host Server',
          description: 'Multi-tenant remote MCP server hosting platform',
          version: '1.0.0',
          status: 'online',
          endpoints: {
            health: '/health',
            api: '/api',
            websocket: `ws://localhost:${config.wsPort}${config.wsPath}`
          },
          documentation: 'https://github.com/motionmavericks/mcp-server'
        });
      });

      // API routes with additional rate limiting
      this.app.use('/api', apiRateLimit, apiRoutes);

      // Error handling
      this.app.use(notFoundHandler);
      this.app.use(errorHandler);

      logger.info('MCP Host Server initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize MCP Host Server:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(config.port, config.host, () => {
        logger.info(`MCP Host Server running on ${config.host}:${config.port}`);
        logger.info(`WebSocket server running on port ${config.wsPort}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Admin login: admin@mcp.mvrx.com.au / ${config.adminPassword}`);
        
        console.log(`
🚀 MCP Host Server Started Successfully!

HTTP API:    http://${config.host}:${config.port}
WebSocket:   ws://${config.host}:${config.wsPort}${config.wsPath}
Environment: ${config.nodeEnv}

📚 API Endpoints:
   GET  /health                    - Health check
   POST /api/auth/login            - Authenticate
   GET  /api/servers               - List MCP servers
   POST /api/servers               - Create MCP server
   POST /api/servers/:id/connect   - Get connection URL

🔧 Admin Credentials:
   Email:    admin@mcp.mvrx.com.au
   Password: ${config.adminPassword}

🌐 Web Interface: https://mcp.mvrx.com.au
        `);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
        this.shutdown('uncaughtException');
      });
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection:', { reason, promise });
        this.shutdown('unhandledRejection');
      });

    } catch (error) {
      logger.error('Failed to start MCP Host Server:', error);
      process.exit(1);
    }
  }

  async shutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP server closed');
      }

      // Close WebSocket server
      if (this.mcpManager.wsServer) {
        await new Promise((resolve) => {
          this.mcpManager.wsServer.close(resolve);
        });
        logger.info('WebSocket server closed');
      }

      // Stop all running server processes
      await this.serverRunner.stopAllServers();

      // Close all MCP server instances
      for (const [tenantId, tenantServers] of this.mcpManager.servers.entries()) {
        for (const [serverId, serverInstance] of tenantServers.entries()) {
          try {
            await serverInstance.server.close();
            logger.info(`Closed MCP server ${serverId} for tenant ${tenantId}`);
          } catch (error) {
            logger.error(`Error closing MCP server ${serverId}:`, error);
          }
        }
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server
const mcpHostServer = new MCPHostServer();
mcpHostServer.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});