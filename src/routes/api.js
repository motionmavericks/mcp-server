import express from 'express';
import { authenticateToken, authenticateAdmin, generateToken, comparePassword } from '../utils/auth.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import validator from 'validator';
import rateLimit from 'express-rate-limit';
import { PREDEFINED_SERVERS } from '../config/predefined-servers.js';

const router = express.Router();

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.loginRateLimitMax,
  message: { error: 'Too many login attempts, please try again later' }
});

// Tenant management
const tenants = new Map(); // In production, this would be a database

// Initialize with default admin tenant
tenants.set('admin', {
  id: 'admin',
  name: 'Administrator',
  email: 'admin@mcp.mvrx.com.au',
  isAdmin: true,
  createdAt: new Date(),
  servers: []
});

// Authentication endpoints
router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find tenant by email
    const tenant = Array.from(tenants.values()).find(t => t.email === email);
    if (!tenant) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For demo purposes, check against admin password
    if (password !== config.adminPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      tenantId: tenant.id,
      email: tenant.email,
      isAdmin: tenant.isAdmin
    });

    logger.info(`Successful login: ${email}`, { tenantId: tenant.id });
    
    res.json({
      success: true,
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        isAdmin: tenant.isAdmin
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    tenant: {
      id: req.user.tenantId,
      email: req.user.email,
      isAdmin: req.user.isAdmin
    }
  });
});

// Tenant management endpoints
router.get('/tenants', authenticateAdmin, (req, res) => {
  const tenantList = Array.from(tenants.values()).map(tenant => ({
    id: tenant.id,
    name: tenant.name,
    email: tenant.email,
    isAdmin: tenant.isAdmin,
    createdAt: tenant.createdAt,
    serverCount: tenant.servers.length
  }));
  
  res.json(tenantList);
});

router.post('/tenants', authenticateAdmin, (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Valid name and email required' });
    }

    // Check if email already exists
    const existingTenant = Array.from(tenants.values()).find(t => t.email === email);
    if (existingTenant) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tenant = {
      id: tenantId,
      name: validator.escape(name),
      email: validator.normalizeEmail(email),
      isAdmin: false,
      createdAt: new Date(),
      servers: []
    };

    tenants.set(tenantId, tenant);
    
    logger.info(`Tenant created: ${tenantId}`, { email, name });
    
    res.status(201).json({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      isAdmin: tenant.isAdmin,
      createdAt: tenant.createdAt
    });

  } catch (error) {
    logger.error('Tenant creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/tenants/:id', authenticateAdmin, (req, res) => {
  const tenantId = validator.escape(req.params.id);
  
  if (tenantId === 'admin') {
    return res.status(400).json({ error: 'Cannot delete admin tenant' });
  }

  if (!tenants.has(tenantId)) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  tenants.delete(tenantId);
  logger.info(`Tenant deleted: ${tenantId}`);
  
  res.json({ message: 'Tenant deleted successfully' });
});

// Get available server types
router.get('/server-types', authenticateToken, (req, res) => {
  try {
    const serverTypes = Object.keys(PREDEFINED_SERVERS).map(key => ({
      id: key,
      name: PREDEFINED_SERVERS[key].name,
      description: PREDEFINED_SERVERS[key].description,
      category: PREDEFINED_SERVERS[key].category,
      requiredEnv: PREDEFINED_SERVERS[key].requiredEnv,
      envVars: PREDEFINED_SERVERS[key].envVars
    }));
    
    res.json(serverTypes);
  } catch (error) {
    logger.error('List server types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MCP Server management endpoints
router.get('/servers', authenticateToken, (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const mcpManager = req.app.get('mcpManager');
    const serverRunner = req.app.get('serverRunner');
    
    const servers = mcpManager.listServers(tenantId);
    
    // Add runtime status from serverRunner
    const enrichedServers = servers.map(server => {
      const runtimeStatus = serverRunner.getServerStatus(server.id);
      return {
        ...server,
        runtime: runtimeStatus
      };
    });
    
    res.json(enrichedServers);

  } catch (error) {
    logger.error('List servers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/servers', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, type, description, environment } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Validate server type against predefined servers
    if (!PREDEFINED_SERVERS[type]) {
      return res.status(400).json({ 
        error: 'Invalid server type',
        availableTypes: Object.keys(PREDEFINED_SERVERS)
      });
    }

    const serverConfig = PREDEFINED_SERVERS[type];
    
    // Validate required environment variables
    for (const envVar of serverConfig.requiredEnv) {
      if (!environment || !environment[envVar]) {
        return res.status(400).json({ 
          error: `Required environment variable missing: ${envVar}`,
          requiredEnv: serverConfig.requiredEnv
        });
      }
    }

    const mcpManager = req.app.get('mcpManager');
    
    const serverId = await mcpManager.createServer(tenantId, {
      name: validator.escape(name),
      type,
      description: description ? validator.escape(description) : '',
      environment: environment || {},
      config: serverConfig
    });

    // Update tenant's server list
    const tenant = tenants.get(tenantId);
    if (tenant) {
      tenant.servers.push(serverId);
    }

    logger.info(`MCP server created: ${serverId}`, { tenantId, type, name });
    
    res.status(201).json({
      id: serverId,
      name,
      type,
      description,
      status: 'created',
      config: {
        name: serverConfig.name,
        description: serverConfig.description,
        requiredEnv: serverConfig.requiredEnv
      }
    });

  } catch (error) {
    logger.error('Server creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/servers/:id', authenticateToken, (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const serverId = validator.escape(req.params.id);
    const mcpManager = req.app.get('mcpManager');
    
    const server = mcpManager.getServerStatus(tenantId, serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json(server);

  } catch (error) {
    logger.error('Get server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/servers/:id', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const serverId = validator.escape(req.params.id);
    const mcpManager = req.app.get('mcpManager');
    
    await mcpManager.deleteServer(tenantId, serverId);

    // Update tenant's server list
    const tenant = tenants.get(tenantId);
    if (tenant) {
      tenant.servers = tenant.servers.filter(id => id !== serverId);
    }

    logger.info(`MCP server deleted: ${serverId}`, { tenantId });
    
    res.json({ message: 'Server deleted successfully' });

  } catch (error) {
    logger.error('Server deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Server control endpoints
router.post('/servers/:id/start', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const serverId = validator.escape(req.params.id);
    const mcpManager = req.app.get('mcpManager');
    const serverRunner = req.app.get('serverRunner');
    
    // Get server config
    const serverConfig = Array.from(mcpManager.serverConfigs.values())
      .find(config => config.id === serverId && config.tenantId === tenantId);
    
    if (!serverConfig) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Start the server process
    await serverRunner.startServer(serverId, serverConfig.type, serverConfig.environment);
    
    logger.info(`Server started: ${serverId}`, { tenantId });
    res.json({ message: 'Server started successfully', serverId });

  } catch (error) {
    logger.error('Server start error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/servers/:id/stop', authenticateToken, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const serverId = validator.escape(req.params.id);
    const mcpManager = req.app.get('mcpManager');
    const serverRunner = req.app.get('serverRunner');
    
    // Verify ownership
    const serverConfig = Array.from(mcpManager.serverConfigs.values())
      .find(config => config.id === serverId && config.tenantId === tenantId);
    
    if (!serverConfig) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Stop the server process
    await serverRunner.stopServer(serverId);
    
    logger.info(`Server stopped: ${serverId}`, { tenantId });
    res.json({ message: 'Server stopped successfully', serverId });

  } catch (error) {
    logger.error('Server stop error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/servers/:id/logs', authenticateToken, (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const serverId = validator.escape(req.params.id);
    const limit = parseInt(req.query.limit) || 100;
    const mcpManager = req.app.get('mcpManager');
    const serverRunner = req.app.get('serverRunner');
    
    // Verify ownership
    const serverConfig = Array.from(mcpManager.serverConfigs.values())
      .find(config => config.id === serverId && config.tenantId === tenantId);
    
    if (!serverConfig) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const logs = serverRunner.getServerLogs(serverId, limit);
    res.json({ logs, serverId });

  } catch (error) {
    logger.error('Get server logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  } catch (error) {
    logger.error('Server deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connection management
router.get('/connections', authenticateToken, (req, res) => {
  try {
    const mcpManager = req.app.get('mcpManager');
    const stats = mcpManager.getConnectionStats();
    
    res.json(stats);

  } catch (error) {
    logger.error('Get connections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate connection URL for MCP clients
router.post('/servers/:id/connect', authenticateToken, (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const serverId = validator.escape(req.params.id);
    const mcpManager = req.app.get('mcpManager');
    
    // Check if server exists in configs
    const serverConfig = Array.from(mcpManager.serverConfigs.values())
      .find(config => config.id === serverId && config.tenantId === tenantId);
    
    if (!serverConfig) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Generate connection token (in production, implement proper token generation)
    const connectionToken = generateToken({
      tenantId,
      serverId,
      purpose: 'mcp-connection'
    }, '1h');

    const connectionUrl = `ws://${req.get('host')}:${config.wsPort}${config.wsPath}?tenant=${tenantId}&server=${serverId}&token=${connectionToken}`;
    
    res.json({
      connectionUrl,
      token: connectionToken,
      expiresIn: '1h',
      instructions: {
        client: 'Use this WebSocket URL in your MCP client configuration',
        example: `{
  "mcpServers": {
    "${serverConfig.name}": {
      "command": "node",
      "args": ["path/to/mcp-client.js"],
      "env": {
        "MCP_SERVER_URL": "${connectionUrl}"
      }
    }
  }
}`
      }
    });

  } catch (error) {
    logger.error('Connection URL generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// System status endpoint
router.get('/status', authenticateToken, (req, res) => {
  try {
    const mcpManager = req.app.get('mcpManager');
    const stats = mcpManager.getConnectionStats();
    
    res.json({
      status: 'online',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: config.nodeEnv,
      ...stats
    });

  } catch (error) {
    logger.error('Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;