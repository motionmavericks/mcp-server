import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Security configuration
  jwtSecret: process.env.JWT_SECRET || 'BfUVwTZAovzjbLl9v0zsRlpoIwbFmIvXSEvIX7p1l3RWUklX6NffSBfPaNab1uY1Wqn5qWjlrQ7KLwXbuZ391g==',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://mcp.mvrx.com.au,http://localhost:3000').split(','),
  adminPassword: process.env.ADMIN_PASSWORD || 'SecureMCP2024!',
  
  // Rate limiting
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100,
  loginRateLimitMax: 5,
  
  // MCP Server configuration
  mcpServers: {
    maxServersPerTenant: 10,
    maxConcurrentConnections: 100,
    serverTimeout: 30000, // 30 seconds
    heartbeatInterval: 30000, // 30 seconds
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // DigitalOcean integration
  digitalOceanToken: process.env.DIGITALOCEAN_TOKEN,
  
  // WebSocket configuration
  wsPort: process.env.WS_PORT || 3001,
  wsPath: '/mcp-ws',
};