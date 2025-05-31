// Predefined MCP servers that can be hosted
export const PREDEFINED_SERVERS = {
  'digitalocean': {
    name: 'DigitalOcean MCP Server',
    description: 'Deploy and manage apps on DigitalOcean App Platform',
    command: 'npx',
    args: ['-y', '@digitalocean/mcp'],
    envVars: ['DIGITALOCEAN_API_TOKEN'],
    requiredEnv: ['DIGITALOCEAN_API_TOKEN'],
    category: 'cloud',
    npm: '@digitalocean/mcp'
  },
  
  'sequential-thinking': {
    name: 'Sequential Thinking MCP Server',
    description: 'Dynamic problem-solving through structured thinking',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    envVars: [],
    requiredEnv: [],
    category: 'ai',
    npm: '@modelcontextprotocol/server-sequential-thinking'
  },
  
  'puppeteer': {
    name: 'Puppeteer MCP Server',
    description: 'Browser automation and web scraping',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    envVars: [],
    requiredEnv: [],
    category: 'automation',
    npm: '@modelcontextprotocol/server-puppeteer'
  },
  
  'playwright': {
    name: 'Playwright MCP Server',
    description: 'Advanced browser testing and automation',
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    envVars: [],
    requiredEnv: [],
    category: 'automation',
    npm: '@playwright/mcp'
  },
  
  'memory': {
    name: 'Memory MCP Server',
    description: 'Persistent memory and knowledge storage',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    envVars: ['MEMORY_FILE_PATH'],
    requiredEnv: [],
    category: 'storage',
    npm: '@modelcontextprotocol/server-memory'
  },
  
  'mcp-compass': {
    name: 'MCP Compass',
    description: 'Navigate and discover MCP servers',
    command: 'npx',
    args: ['-y', '@liuyoshio/mcp-compass'],
    envVars: [],
    requiredEnv: [],
    category: 'utility',
    npm: '@liuyoshio/mcp-compass'
  },
  
  'brave-search': {
    name: 'Brave Search MCP Server',
    description: 'Web and local search capabilities',
    command: 'docker',
    args: ['run', '-i', '--rm', '-e', 'BRAVE_API_KEY', 'mcp/brave-search'],
    envVars: ['BRAVE_API_KEY'],
    requiredEnv: ['BRAVE_API_KEY'],
    category: 'search',
    docker: 'mcp/brave-search'
  },
  
  'github': {
    name: 'GitHub MCP Server',
    description: 'Repository management, issues, and PRs',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    requiredEnv: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    category: 'development',
    npm: '@modelcontextprotocol/server-github'
  },
  
  'knowledge-graph': {
    name: 'Knowledge Graph MCP Server',
    description: 'Graph-based knowledge storage and retrieval',
    command: 'npx',
    args: ['-y', '@itseasy21/mcp-knowledge-graph'],
    envVars: ['MEMORY_FILE_PATH'],
    requiredEnv: [],
    category: 'storage',
    npm: '@itseasy21/mcp-knowledge-graph'
  }
};