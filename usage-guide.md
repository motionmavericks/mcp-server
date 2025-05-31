# 🚀 MCP Host Server Usage Guide

Your multi-tenant MCP server is live at **https://mcp.mvrx.com.au**

## 🔑 **Step 1: Authentication**

First, get your access token:

```bash
# Login and save token
TOKEN=$(curl -s -X POST https://mcp.mvrx.com.au/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mcp.mvrx.com.au", "password": "SecureMCP2024!"}' | jq -r '.token')

echo "Your token: $TOKEN"
```

**Credentials:**
- Email: `admin@mcp.mvrx.com.au`
- Password: `SecureMCP2024!`

## 🏗️ **Step 2: Create an MCP Server**

Create different types of MCP servers:

### **File Manager Server**
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My File Manager",
    "type": "file-manager",
    "description": "Manages files and directories"
  }'
```

### **Database Server**
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Database Server",
    "type": "database",
    "description": "Execute database queries"
  }'
```

### **API Client Server**
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Client",
    "type": "api-client",
    "description": "Make HTTP API requests"
  }'
```

## 📋 **Step 3: List Your Servers**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://mcp.mvrx.com.au/api/servers | jq .
```

## 🔗 **Step 4: Get Connection URL**

For each server you create, get a WebSocket connection URL:

```bash
# Replace SERVER_ID with the actual ID from step 2
SERVER_ID="your-server-id-here"

curl -X POST https://mcp.mvrx.com.au/api/servers/$SERVER_ID/connect \
  -H "Authorization: Bearer $TOKEN" | jq .
```

This returns a WebSocket URL like:
```
wss://mcp.mvrx.com.au:3001/mcp-ws?tenant=TENANT_ID&server=SERVER_ID&token=CONNECTION_TOKEN
```

## 🤖 **Step 5: Connect with Claude Desktop**

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "remote-file-server": {
      "command": "node",
      "args": ["/path/to/websocket-client.js"],
      "env": {
        "MCP_SERVER_URL": "wss://mcp.mvrx.com.au:3001/mcp-ws?tenant=TENANT&server=SERVER&token=TOKEN"
      }
    }
  }
}
```

## ⚡ **Step 6: Connect with Custom App**

### **Node.js Example**
```javascript
import { WebSocket } from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const connectionUrl = 'wss://mcp.mvrx.com.au:3001/mcp-ws?tenant=TENANT&server=SERVER&token=TOKEN';
const ws = new WebSocket(connectionUrl);

const client = new Client({
  name: 'my-app',
  version: '1.0.0'
}, {
  capabilities: { tools: {} }
});

// Wait for connection
ws.on('open', async () => {
  console.log('Connected to MCP server');
  
  // Connect MCP client
  await client.connect(new WebSocketTransport(ws));
  
  // List available tools
  const tools = await client.request({ method: 'tools/list' });
  console.log('Available tools:', tools);
  
  // Call a tool
  const result = await client.request({
    method: 'tools/call',
    params: {
      name: 'ping',
      arguments: { message: 'Hello!' }
    }
  });
  console.log('Tool result:', result);
});
```

### **Python Example**
```python
import asyncio
import websockets
import json

async def connect_mcp():
    uri = "wss://mcp.mvrx.com.au:3001/mcp-ws?tenant=TENANT&server=SERVER&token=TOKEN"
    
    async with websockets.connect(uri) as websocket:
        # Send MCP initialization
        init_msg = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "python-client",
                    "version": "1.0.0"
                }
            }
        }
        
        await websocket.send(json.dumps(init_msg))
        response = await websocket.recv()
        print("MCP Response:", response)

# Run the client
asyncio.run(connect_mcp())
```

## 🛠️ **Available MCP Tools by Server Type**

### **File Manager Server**
- `read_file` - Read file contents
- `write_file` - Write to files
- `list_files` - List directory contents

### **Database Server**
- `query_database` - Execute SQL queries

### **API Client Server**
- `api_request` - Make HTTP requests

### **Custom Server**
- `ping` - Test connectivity
- Define your own tools!

## 📊 **Step 7: Monitor Your Servers**

### **System Status**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://mcp.mvrx.com.au/api/status | jq .
```

### **Connection Stats**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://mcp.mvrx.com.au/api/connections | jq .
```

## 🔧 **Advanced Usage**

### **Add New Tenants** (Admin only)
```bash
curl -X POST https://mcp.mvrx.com.au/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Name",
    "email": "customer@example.com"
  }'
```

### **Delete Servers**
```bash
curl -X DELETE https://mcp.mvrx.com.au/api/servers/$SERVER_ID \
  -H "Authorization: Bearer $TOKEN"
```

## 🌍 **Use Cases**

1. **🤖 AI Assistant Integration** - Connect Claude, ChatGPT, or custom AI to your tools
2. **📁 Remote File Management** - Access files from any application
3. **🗄️ Database Operations** - Query databases from AI assistants
4. **🌐 API Orchestration** - Chain API calls through MCP
5. **🏢 Multi-tenant SaaS** - Offer MCP services to customers
6. **🔄 Workflow Automation** - Build complex workflows with MCP tools

## 🆘 **Troubleshooting**

### **Health Check**
```bash
curl https://mcp.mvrx.com.au/health
```

### **Test WebSocket Connection**
```bash
# Install wscat if needed: npm install -g wscat
wscat -c "wss://mcp.mvrx.com.au:3001/mcp-ws?tenant=TEST&server=TEST&token=TEST"
```

### **View Logs**
Check the DigitalOcean App Platform dashboard for deployment logs.

---

## 🎯 **Next Steps**

1. **Test authentication** - Get your token working
2. **Create your first MCP server** - Start with file-manager type
3. **Get connection URL** - Use it to connect your applications
4. **Build integrations** - Connect Claude Desktop or custom apps
5. **Scale up** - Add more servers and tenants as needed

Your MCP host server is production-ready and can handle multiple tenants and concurrent connections!