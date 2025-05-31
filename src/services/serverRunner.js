import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import { PREDEFINED_SERVERS } from '../config/predefined-servers.js';

class ServerRunner {
  constructor() {
    this.runningProcesses = new Map(); // serverId -> process
    this.serverLogs = new Map(); // serverId -> log array
  }

  async startServer(serverId, serverType, environment = {}) {
    try {
      if (this.runningProcesses.has(serverId)) {
        throw new Error('Server is already running');
      }

      const serverConfig = PREDEFINED_SERVERS[serverType];
      if (!serverConfig) {
        throw new Error(`Unknown server type: ${serverType}`);
      }

      // Check required environment variables
      for (const envVar of serverConfig.requiredEnv) {
        if (!environment[envVar]) {
          throw new Error(`Required environment variable missing: ${envVar}`);
        }
      }

      logger.info(`Starting ${serverConfig.name} (${serverId})`, {
        serverType,
        command: serverConfig.command,
        args: serverConfig.args
      });

      // Prepare environment
      const env = {
        ...process.env,
        ...environment,
        NODE_ENV: 'production'
      };

      // Spawn the process
      const child = spawn(serverConfig.command, serverConfig.args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      // Initialize logs for this server
      this.serverLogs.set(serverId, []);

      // Handle process output
      child.stdout.on('data', (data) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: data.toString().trim()
        };
        this.addLog(serverId, logEntry);
      });

      child.stderr.on('data', (data) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: data.toString().trim()
        };
        this.addLog(serverId, logEntry);
      });

      // Handle process events
      child.on('error', (error) => {
        logger.error(`Server ${serverId} error:`, error);
        this.addLog(serverId, {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Process error: ${error.message}`
        });
        this.runningProcesses.delete(serverId);
      });

      child.on('exit', (code, signal) => {
        logger.info(`Server ${serverId} exited`, { code, signal });
        this.addLog(serverId, {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Process exited with code ${code}, signal ${signal}`
        });
        this.runningProcesses.delete(serverId);
      });

      // Store the process
      this.runningProcesses.set(serverId, {
        process: child,
        serverType,
        startedAt: new Date(),
        config: serverConfig
      });

      // Wait a moment to see if it starts successfully
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve();
        }, 2000);

        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        child.on('exit', (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(`Process exited with code ${code}`));
          } else {
            resolve();
          }
        });
      });

      logger.info(`Server ${serverId} started successfully`);
      return true;

    } catch (error) {
      logger.error(`Failed to start server ${serverId}:`, error);
      throw error;
    }
  }

  async stopServer(serverId) {
    try {
      const serverInfo = this.runningProcesses.get(serverId);
      if (!serverInfo) {
        throw new Error('Server is not running');
      }

      logger.info(`Stopping server ${serverId}`);

      // Gracefully terminate the process
      serverInfo.process.kill('SIGTERM');

      // Wait for graceful shutdown, then force kill if necessary
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (this.runningProcesses.has(serverId)) {
            logger.warn(`Force killing server ${serverId}`);
            serverInfo.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        serverInfo.process.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.runningProcesses.delete(serverId);
      logger.info(`Server ${serverId} stopped`);
      return true;

    } catch (error) {
      logger.error(`Failed to stop server ${serverId}:`, error);
      throw error;
    }
  }

  getServerStatus(serverId) {
    const serverInfo = this.runningProcesses.get(serverId);
    if (!serverInfo) {
      return { status: 'stopped' };
    }

    return {
      status: 'running',
      pid: serverInfo.process.pid,
      startedAt: serverInfo.startedAt,
      serverType: serverInfo.serverType,
      config: serverInfo.config
    };
  }

  getServerLogs(serverId, limit = 100) {
    const logs = this.serverLogs.get(serverId) || [];
    return logs.slice(-limit);
  }

  addLog(serverId, logEntry) {
    if (!this.serverLogs.has(serverId)) {
      this.serverLogs.set(serverId, []);
    }

    const logs = this.serverLogs.get(serverId);
    logs.push(logEntry);

    // Keep only last 1000 log entries
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
  }

  getAllRunningServers() {
    const servers = [];
    for (const [serverId, serverInfo] of this.runningProcesses.entries()) {
      servers.push({
        id: serverId,
        status: 'running',
        serverType: serverInfo.serverType,
        startedAt: serverInfo.startedAt,
        pid: serverInfo.process.pid
      });
    }
    return servers;
  }

  async stopAllServers() {
    const serverIds = Array.from(this.runningProcesses.keys());
    const promises = serverIds.map(serverId => this.stopServer(serverId));
    await Promise.allSettled(promises);
    logger.info('All servers stopped');
  }
}

export default ServerRunner;