#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { WebDavClient } from './utils/dav-client';
import { DavServerConfig } from './types/index';

interface ServerState {
  configs: Map<string, DavServerConfig>;
  clients: Map<string, WebDavClient>;
}

class DavMcpServer {
  private server: Server;
  private state: ServerState;

  constructor() {
    this.server = new Server(
      {
        name: 'dav-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.state = {
      configs: new Map(),
      clients: new Map(),
    };

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure_webdav_server',
          description: 'Configure a WebDAV server connection',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Unique name for this server configuration' },
              baseUrl: { type: 'string', description: 'Base URL of the WebDAV server' },
              username: { type: 'string', description: 'Username for authentication (optional)' },
              password: { type: 'string', description: 'Password for authentication (optional)' },
              authType: { 
                type: 'string', 
                enum: ['basic', 'bearer'], 
                description: 'Authentication type (basic or bearer)' 
              },
              token: { type: 'string', description: 'Bearer token (if using bearer auth, optional)' },
            },
            required: ['name', 'baseUrl', 'authType'],
          },
        },
        {
          name: 'test_webdav_connection',
          description: 'Test connection to a configured WebDAV server',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
            },
            required: ['serverName'],
          },
        },
        {
          name: 'webdav_request',
          description: 'Forward a WebDAV request to the configured server',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
              method: { 
                type: 'string', 
                description: 'HTTP method (GET, PUT, POST, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, etc.)' 
              },
              path: { type: 'string', description: 'Path relative to the server base URL' },
              headers: { 
                type: 'object', 
                description: 'HTTP headers to include in the request (optional)',
                additionalProperties: { type: 'string' }
              },
              body: { type: 'string', description: 'Request body (optional)' },
            },
            required: ['serverName', 'method', 'path'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'configure_webdav_server':
            return await this.configureWebdavServer(args);
          case 'test_webdav_connection':
            return await this.testWebdavConnection(args);
          case 'webdav_request':
            return await this.webdavRequest(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  private async configureWebdavServer(args: any) {
    const { name, baseUrl, username, password, authType, token } = args;

    if (!name || !baseUrl || !authType) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters: name, baseUrl, authType');
    }

    if (authType === 'basic' && (!username || !password)) {
      throw new McpError(ErrorCode.InvalidParams, 'Basic auth requires username and password');
    }

    if (authType === 'bearer' && !token) {
      throw new McpError(ErrorCode.InvalidParams, 'Bearer auth requires token');
    }

    const config: DavServerConfig = {
      name,
      baseUrl,
      username,
      password,
      authType,
      token,
    };

    this.state.configs.set(name, config);
    this.state.clients.set(name, new WebDavClient(config));

    return {
      content: [
        {
          type: 'text',
          text: `WebDAV server '${name}' configured successfully`,
        },
      ],
    };
  }

  private async testWebdavConnection(args: any) {
    const { serverName } = args;
    const client = this.state.clients.get(serverName);

    if (!client) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const isConnected = await client.testConnection();

    return {
      content: [
        {
          type: 'text',
          text: `Connection test ${isConnected ? 'successful' : 'failed'} for server '${serverName}'`,
        },
      ],
    };
  }

  private async webdavRequest(args: any) {
    const { serverName, method, path, headers, body } = args;
    const client = this.state.clients.get(serverName);

    if (!client) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const response = await client.forwardRequest({
      method,
      path,
      headers: headers || {},
      body,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.body,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WebDAV MCP Server running on stdio');
  }
}

async function main() {
  const server = new DavMcpServer();
  await server.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}