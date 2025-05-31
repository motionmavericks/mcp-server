# 🚀 **How to Host Real MCP Servers**

Your MCP host server now supports running the actual MCP servers from the ecosystem!

## **Step 1: Get Authentication Token**

```bash
export TOKEN=$(curl -s -X POST https://mcp.mvrx.com.au/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mcp.mvrx.com.au", "password": "SecureMCP2024!"}' | jq -r '.token')
```

## **Step 2: See Available Server Types**

```bash
curl -H "Authorization: Bearer $TOKEN" https://mcp.mvrx.com.au/api/server-types | jq .
```

## **Step 3: Create Real MCP Servers**

### **🌊 DigitalOcean Server** (requires API token)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My DigitalOcean Server",
    "type": "digitalocean", 
    "description": "Manage DigitalOcean apps",
    "environment": {
      "DIGITALOCEAN_API_TOKEN": "your_digitalocean_token_here"
    }
  }'
```

### **🔍 Brave Search Server** (requires API key)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Brave Search Server",
    "type": "brave-search",
    "description": "Web and local search",
    "environment": {
      "BRAVE_API_KEY": "your_brave_api_key_here"
    }
  }'
```

### **🐙 GitHub Server** (requires personal access token)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub Server", 
    "type": "github",
    "description": "Repository management",
    "environment": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here"
    }
  }'
```

### **🧠 Sequential Thinking Server** (no API key needed)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sequential Thinking",
    "type": "sequential-thinking",
    "description": "Problem-solving workflows"
  }'
```

### **🎭 Puppeteer Server** (no API key needed)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Puppeteer Browser",
    "type": "puppeteer", 
    "description": "Browser automation"
  }'
```

### **🎬 Playwright Server** (no API key needed)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Playwright Browser",
    "type": "playwright",
    "description": "Advanced browser testing"
  }'
```

### **💾 Memory Server** (no API key needed)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Memory Storage",
    "type": "memory",
    "description": "Persistent memory",
    "environment": {
      "MEMORY_FILE_PATH": "/tmp/mcp-memory.jsonl"
    }
  }'
```

### **🧭 MCP Compass** (no API key needed)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MCP Compass",
    "type": "mcp-compass",
    "description": "Discover MCP servers"
  }'
```

### **📊 Knowledge Graph** (no API key needed)
```bash
curl -X POST https://mcp.mvrx.com.au/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Knowledge Graph",
    "type": "knowledge-graph", 
    "description": "Graph-based knowledge storage",
    "environment": {
      "MEMORY_FILE_PATH": "/tmp/knowledge-graph.jsonl"
    }
  }'
```

## **Step 4: Start a Server**

After creating a server, start it:

```bash
# Get your server ID from the creation response
SERVER_ID="your-server-id-here"

# Start the server
curl -X POST https://mcp.mvrx.com.au/api/servers/$SERVER_ID/start \
  -H "Authorization: Bearer $TOKEN"
```

## **Step 5: Check Server Status**

```bash
# List all your servers with runtime status
curl -H "Authorization: Bearer $TOKEN" https://mcp.mvrx.com.au/api/servers | jq .

# Get logs from a specific server
curl -H "Authorization: Bearer $TOKEN" https://mcp.mvrx.com.au/api/servers/$SERVER_ID/logs | jq .
```

## **Step 6: Stop a Server**

```bash
curl -X POST https://mcp.mvrx.com.au/api/servers/$SERVER_ID/stop \
  -H "Authorization: Bearer $TOKEN"
```

## **Step 7: Connect to Running Servers**

Once a server is running, get its connection URL:

```bash
curl -X POST https://mcp.mvrx.com.au/api/servers/$SERVER_ID/connect \
  -H "Authorization: Bearer $TOKEN" | jq .
```

This gives you a WebSocket URL that you can use with:
- **Claude Desktop**
- **Cursor** 
- **Custom applications**
- **Any MCP client**

## **🎯 What Each Server Provides**

| Server | What it does | Tools Available |
|--------|-------------|----------------|
| **digitalocean** | Deploy & manage DigitalOcean apps | `list_apps`, `create_app`, `get_deployment_logs` |
| **github** | Repository management | `search_repositories`, `create_issue`, `list_commits` |
| **brave-search** | Web & local search | `brave_web_search`, `brave_local_search` |
| **sequential-thinking** | Problem-solving workflows | `sequentialthinking` |
| **puppeteer** | Browser automation | `puppeteer_navigate`, `puppeteer_screenshot`, `puppeteer_click` |
| **playwright** | Advanced browser testing | `browser_navigate`, `browser_screenshot`, `browser_click` |
| **memory** | Persistent memory | `create_entities`, `search_nodes`, `add_observations` |
| **knowledge-graph** | Graph-based knowledge | `create_entities`, `create_relations`, `search_nodes` |
| **mcp-compass** | Discover MCP servers | `recommend-mcp-servers` |

## **💡 Pro Tips**

1. **Multiple Instances**: You can create multiple servers of the same type with different configurations
2. **Environment Variables**: Some servers require API keys - check the `requiredEnv` field
3. **Logging**: Use the `/logs` endpoint to debug server issues
4. **Resource Management**: Stop servers when not in use to save resources

## **🔧 Management Commands**

```bash
# List all server types
curl -H "Authorization: Bearer $TOKEN" https://mcp.mvrx.com.au/api/server-types

# System status  
curl -H "Authorization: Bearer $TOKEN" https://mcp.mvrx.com.au/api/status

# Delete a server
curl -X DELETE -H "Authorization: Bearer $TOKEN" https://mcp.mvrx.com.au/api/servers/$SERVER_ID
```

Now you're hosting **real MCP servers** that AI assistants can connect to remotely! 🚀