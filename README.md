# MCP Host Server

A multi-tenant remote MCP (Model Context Protocol) server hosting platform built for DigitalOcean deployment. This server allows multiple applications to connect to and use various MCP servers remotely over WebSocket connections.

## Features

- 🏗️ **Multi-tenant Architecture**: Isolated MCP servers for different tenants
- 🔒 **Secure Authentication**: JWT-based authentication with role-based access
- 🌐 **Remote Access**: WebSocket-based connections for remote MCP usage
- 📊 **Management API**: RESTful API for server management
- 🛡️ **Security**: Rate limiting, input validation, CORS protection
- 📈 **Scalable**: Designed for cloud deployment on DigitalOcean

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   MCP Client    │    │   MCP Client    │
│  (Claude, etc.) │    │   (API App)     │    │   (Custom)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │ WebSocket Connections
                    ┌────────────▼────────────┐
                    │   MCP Host Server       │
                    │   ┌─────────────────┐   │
                    │   │ Tenant A        │   │
                    │   │ ├ File Server   │   │
                    │   │ ├ DB Server     │   │
                    │   │ └ API Server    │   │
                    │   ├─────────────────┤   │
                    │   │ Tenant B        │   │
                    │   │ ├ Custom Server │   │
                    │   │ └ File Server   │   │
                    │   └─────────────────┘   │
                    └─────────────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/motionmavericks/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 2. Configuration

Edit `.env` file with your settings:

```env
PORT=3000
JWT_SECRET=your_secret_here
ALLOWED_ORIGINS=https://yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123!
```

### 3. Development

```bash
# Start in development mode
npm run dev

# Or start normally
npm start
```

### 4. Production Deployment

```bash
# Set environment to production
export NODE_ENV=production

# Start the server
npm start
```

## API Usage

### Authentication

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mcp.mvrx.com.au", "password": "SecureMCP2024!"}'
```

### Create MCP Server

```bash
# Create a file manager server
curl -X POST http://localhost:3000/api/servers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My File Server",
    "type": "file-manager",
    "description": "File management MCP server"
  }'
```

### Get Connection URL

```bash
# Get WebSocket connection URL for MCP client
curl -X POST http://localhost:3000/api/servers/SERVER_ID/connect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## MCP Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "remote-file-server": {
      "command": "node",
      "args": ["path/to/mcp-websocket-client.js"],
      "env": {
        "MCP_SERVER_URL": "ws://mcp.mvrx.com.au:3001/mcp-ws?tenant=TENANT_ID&server=SERVER_ID&token=CONNECTION_TOKEN"
      }
    }
  }
}
```

### Custom MCP Client

```javascript
import { WebSocket } from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const ws = new WebSocket('ws://mcp.mvrx.com.au:3001/mcp-ws?tenant=TENANT_ID&server=SERVER_ID&token=CONNECTION_TOKEN');
const client = new Client({ name: 'my-app', version: '1.0.0' }, { capabilities: {} });

await client.connect(new WebSocketClientTransport(ws));

// Use MCP tools
const tools = await client.listTools();
console.log('Available tools:', tools);
```

## Available MCP Server Types

### File Manager
- `read_file`: Read file contents
- `write_file`: Write file contents  
- `list_files`: List directory contents

### Database
- `query_database`: Execute SQL queries

### API Client
- `api_request`: Make HTTP API requests

### Custom
- Define your own tools and resources

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: Sanitizes all inputs
- **CORS Protection**: Configurable cross-origin policies
- **Security Headers**: Helmet.js security headers
- **Request Logging**: Comprehensive audit logging

## Deployment on DigitalOcean

### App Platform

1. Create new app from GitHub repository
2. Set environment variables in App Platform dashboard
3. Configure custom domain (optional)
4. Deploy!

### Example App Spec

```yaml
name: mcp-host-server
services:
- name: api
  source_dir: /
  github:
    repo: motionmavericks/mcp-server
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 2
  instance_size_slug: apps-s-1vcpu-1gb
  http_port: 3000
  envs:
  - key: NODE_ENV
    value: production
  - key: JWT_SECRET
    value: YOUR_SECRET
  - key: ALLOWED_ORIGINS
    value: https://mcp.yourdomain.com
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### System Status

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/status
```

## Development

### Project Structure

```
src/
├── config/           # Configuration management
├── middleware/       # Express middleware
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Utilities
```

### Adding New MCP Server Types

1. Extend `MCPServerManager.registerServerTools()`
2. Add new tool handlers
3. Update validation in API routes
4. Add tests

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: https://github.com/motionmavericks/mcp-server/issues
- Documentation: https://github.com/motionmavericks/mcp-server/wiki
- Email: support@motionmavericks.com.au