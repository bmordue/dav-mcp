#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { CalDavHandler } from './handlers/caldav-handler';
import { CardDavHandler } from './handlers/carddav-handler';
import { DavServerConfig } from './types/index';

interface ServerState {
  configs: Map<string, DavServerConfig>;
  caldavHandlers: Map<string, CalDavHandler>;
  carddavHandlers: Map<string, CardDavHandler>;
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
      caldavHandlers: new Map(),
      carddavHandlers: new Map(),
    };

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure_dav_server',
          description: 'Configure a DAV server connection for CalDAV or CardDAV operations',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Unique name for this server configuration' },
              baseUrl: { type: 'string', description: 'Base URL of the DAV server' },
              username: { type: 'string', description: 'Username for authentication' },
              password: { type: 'string', description: 'Password for authentication' },
              authType: { 
                type: 'string', 
                enum: ['basic', 'bearer'], 
                description: 'Authentication type (basic or bearer)' 
              },
              token: { type: 'string', description: 'Bearer token (if using bearer auth)' },
            },
            required: ['name', 'baseUrl', 'authType'],
          },
        },
        {
          name: 'test_dav_connection',
          description: 'Test connection to a configured DAV server',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
            },
            required: ['serverName'],
          },
        },
        {
          name: 'list_calendars',
          description: 'List available calendars from a CalDAV server',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
            },
            required: ['serverName'],
          },
        },
        {
          name: 'get_calendar_events',
          description: 'Get events from a calendar',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
              calendarPath: { type: 'string', description: 'Path to the calendar' },
              startDate: { type: 'string', description: 'Start date in ISO format (optional)' },
              endDate: { type: 'string', description: 'End date in ISO format (optional)' },
            },
            required: ['serverName', 'calendarPath'],
          },
        },
        {
          name: 'create_calendar_event',
          description: 'Create a new calendar event',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
              calendarPath: { type: 'string', description: 'Path to the calendar' },
              event: {
                type: 'object',
                properties: {
                  uid: { type: 'string', description: 'Unique identifier for the event' },
                  summary: { type: 'string', description: 'Event title/summary' },
                  start: { type: 'string', description: 'Start datetime in ISO format' },
                  end: { type: 'string', description: 'End datetime in ISO format' },
                  description: { type: 'string', description: 'Event description (optional)' },
                  location: { type: 'string', description: 'Event location (optional)' },
                  status: { type: 'string', enum: ['CONFIRMED', 'TENTATIVE', 'CANCELLED'], description: 'Event status (optional)' },
                },
                required: ['uid', 'summary', 'start', 'end'],
              },
            },
            required: ['serverName', 'calendarPath', 'event'],
          },
        },
        {
          name: 'list_address_books',
          description: 'List available address books from a CardDAV server',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
            },
            required: ['serverName'],
          },
        },
        {
          name: 'get_contacts',
          description: 'Get contacts from an address book',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
              addressBookPath: { type: 'string', description: 'Path to the address book' },
            },
            required: ['serverName', 'addressBookPath'],
          },
        },
        {
          name: 'search_contacts',
          description: 'Search for contacts in an address book',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
              addressBookPath: { type: 'string', description: 'Path to the address book' },
              query: { type: 'string', description: 'Search query' },
            },
            required: ['serverName', 'addressBookPath', 'query'],
          },
        },
        {
          name: 'create_contact',
          description: 'Create a new contact',
          inputSchema: {
            type: 'object',
            properties: {
              serverName: { type: 'string', description: 'Name of the configured server' },
              addressBookPath: { type: 'string', description: 'Path to the address book' },
              contact: {
                type: 'object',
                properties: {
                  uid: { type: 'string', description: 'Unique identifier for the contact' },
                  fn: { type: 'string', description: 'Full name' },
                  email: { type: 'string', description: 'Email address (optional)' },
                  phone: { type: 'string', description: 'Phone number (optional)' },
                  organization: { type: 'string', description: 'Organization (optional)' },
                },
                required: ['uid', 'fn'],
              },
            },
            required: ['serverName', 'addressBookPath', 'contact'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'configure_dav_server':
            return await this.configureDavServer(args);
          case 'test_dav_connection':
            return await this.testDavConnection(args);
          case 'list_calendars':
            return await this.listCalendars(args);
          case 'get_calendar_events':
            return await this.getCalendarEvents(args);
          case 'create_calendar_event':
            return await this.createCalendarEvent(args);
          case 'list_address_books':
            return await this.listAddressBooks(args);
          case 'get_contacts':
            return await this.getContacts(args);
          case 'search_contacts':
            return await this.searchContacts(args);
          case 'create_contact':
            return await this.createContact(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  private async configureDavServer(args: any) {
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
    this.state.caldavHandlers.set(name, new CalDavHandler(config));
    this.state.carddavHandlers.set(name, new CardDavHandler(config));

    return {
      content: [
        {
          type: 'text',
          text: `DAV server '${name}' configured successfully`,
        },
      ],
    };
  }

  private async testDavConnection(args: any) {
    const { serverName } = args;
    const handler = this.state.caldavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const isConnected = await handler['client'].testConnection();

    return {
      content: [
        {
          type: 'text',
          text: `Connection test ${isConnected ? 'successful' : 'failed'} for server '${serverName}'`,
        },
      ],
    };
  }

  private async listCalendars(args: any) {
    const { serverName } = args;
    const handler = this.state.caldavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const calendars = await handler.listCalendars();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(calendars, null, 2),
        },
      ],
    };
  }

  private async getCalendarEvents(args: any) {
    const { serverName, calendarPath, startDate, endDate } = args;
    const handler = this.state.caldavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const events = await handler.getCalendarEvents(calendarPath, startDate, endDate);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(events, null, 2),
        },
      ],
    };
  }

  private async createCalendarEvent(args: any) {
    const { serverName, calendarPath, event } = args;
    const handler = this.state.caldavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    await handler.createEvent(calendarPath, event);

    return {
      content: [
        {
          type: 'text',
          text: `Event '${event.summary}' created successfully`,
        },
      ],
    };
  }

  private async listAddressBooks(args: any) {
    const { serverName } = args;
    const handler = this.state.carddavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const addressBooks = await handler.listAddressBooks();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(addressBooks, null, 2),
        },
      ],
    };
  }

  private async getContacts(args: any) {
    const { serverName, addressBookPath } = args;
    const handler = this.state.carddavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const contacts = await handler.getContacts(addressBookPath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(contacts, null, 2),
        },
      ],
    };
  }

  private async searchContacts(args: any) {
    const { serverName, addressBookPath, query } = args;
    const handler = this.state.carddavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    const contacts = await handler.searchContacts(addressBookPath, query);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(contacts, null, 2),
        },
      ],
    };
  }

  private async createContact(args: any) {
    const { serverName, addressBookPath, contact } = args;
    const handler = this.state.carddavHandlers.get(serverName);

    if (!handler) {
      throw new McpError(ErrorCode.InvalidParams, `Server '${serverName}' not configured`);
    }

    await handler.createContact(addressBookPath, contact);

    return {
      content: [
        {
          type: 'text',
          text: `Contact '${contact.fn}' created successfully`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DAV MCP Server running on stdio');
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