# dav-mcp

An MCP (Model Context Protocol) server written in TypeScript that handles authentication and forwards WebDAV requests to DAV servers. This server acts as an authenticated proxy, allowing MCP clients to send properly-formed WebDAV requests while the server handles authentication.

## Features

- **WebDAV Request Forwarding**: Forward any WebDAV request (PROPFIND, GET, PUT, DELETE, MKCOL, etc.) to configured servers
- **Authentication Handling**: Support for Basic and Bearer token authentication
- **Simple Design**: No parsing - just forward requests with authentication headers
- **TypeScript**: Fully typed implementation with comprehensive error handling
- **MCP Integration**: Compatible with MCP clients and Claude Desktop

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

The server can be used with any MCP-compatible client. For Claude Desktop, add to your configuration:

```json
{
  "mcpServers": {
    "dav-mcp": {
      "command": "node",
      "args": ["/path/to/dav-mcp/dist/index.js"]
    }
  }
}
```

### Available Tools

#### 1. Configure WebDAV Server
Configure a connection to a WebDAV server:

```json
{
  "name": "configure_webdav_server",
  "arguments": {
    "name": "my-server",
    "baseUrl": "https://dav.example.com/remote.php/dav/",
    "username": "user@example.com",
    "password": "your-password",
    "authType": "basic"
  }
}
```

#### 2. Test WebDAV Connection
Test if the configured server is accessible:

```json
{
  "name": "test_webdav_connection",
  "arguments": {
    "serverName": "my-server"
  }
}
```

#### 3. WebDAV Request
Forward any WebDAV request to the configured server:

```json
{
  "name": "webdav_request",
  "arguments": {
    "serverName": "my-server",
    "method": "PROPFIND",
    "path": "/calendars/user@example.com/personal/",
    "headers": {
      "Content-Type": "application/xml; charset=utf-8",
      "Depth": "1"
    },
    "body": "<?xml version=\"1.0\" encoding=\"utf-8\" ?><d:propfind xmlns:d=\"DAV:\"><d:prop><d:displayname /><d:resourcetype /></d:prop></d:propfind>"
  }
}
```

## Supported WebDAV Methods

The server can forward any HTTP method, including WebDAV-specific methods:

- **GET**: Retrieve resources
- **PUT**: Create/update resources  
- **DELETE**: Remove resources
- **PROPFIND**: Get properties of resources
- **PROPPATCH**: Modify properties of resources
- **MKCOL**: Create collections (folders)
- **COPY**: Copy resources
- **MOVE**: Move resources
- **LOCK**: Lock resources
- **UNLOCK**: Unlock resources
- **REPORT**: Extended queries (CalDAV/CardDAV)

## Example WebDAV Operations

### List Calendars (CalDAV)
```json
{
  "name": "webdav_request",
  "arguments": {
    "serverName": "my-server",
    "method": "PROPFIND",
    "path": "/calendars/user@example.com/",
    "headers": {
      "Content-Type": "application/xml; charset=utf-8",
      "Depth": "1"
    },
    "body": "<?xml version=\"1.0\" encoding=\"utf-8\" ?><d:propfind xmlns:d=\"DAV:\" xmlns:c=\"urn:ietf:params:xml:ns:caldav\"><d:prop><d:displayname /><d:resourcetype /><c:calendar-description /></d:prop></d:propfind>"
  }
}
```

### Get Calendar Events
```json
{
  "name": "webdav_request",
  "arguments": {
    "serverName": "my-server", 
    "method": "REPORT",
    "path": "/calendars/user@example.com/personal/",
    "headers": {
      "Content-Type": "application/xml; charset=utf-8",
      "Depth": "1"
    },
    "body": "<?xml version=\"1.0\" encoding=\"utf-8\" ?><c:calendar-query xmlns:d=\"DAV:\" xmlns:c=\"urn:ietf:params:xml:ns:caldav\"><d:prop><d:getetag /><c:calendar-data /></d:prop><c:filter><c:comp-filter name=\"VCALENDAR\"><c:comp-filter name=\"VEVENT\"></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>"
  }
}
```

### List Address Books (CardDAV)
```json
{
  "name": "webdav_request",
  "arguments": {
    "serverName": "my-server",
    "method": "PROPFIND", 
    "path": "/addressbooks/user@example.com/",
    "headers": {
      "Content-Type": "application/xml; charset=utf-8",
      "Depth": "1"
    },
    "body": "<?xml version=\"1.0\" encoding=\"utf-8\" ?><d:propfind xmlns:d=\"DAV:\" xmlns:card=\"urn:ietf:params:xml:ns:carddav\"><d:prop><d:displayname /><d:resourcetype /><card:addressbook-description /></d:prop></d:propfind>"
  }
}
```

## Supported DAV Servers

This MCP server works with any WebDAV-compatible server, including:

- **Nextcloud**: Full CalDAV/CardDAV support
- **ownCloud**: Calendar and contacts
- **Radicale**: Lightweight CalDAV/CardDAV server
- **Apple Calendar/Contacts Server**: macOS Server
- **Google Calendar/Contacts**: Via DAV interface (with app passwords)
- **Generic WebDAV**: Any RFC 4918 compliant server

## Authentication

### Basic Authentication
Username and password authentication:

```json
{
  "authType": "basic",
  "username": "your-username", 
  "password": "your-password"
}
```

### Bearer Token Authentication
For OAuth or API token authentication:

```json
{
  "authType": "bearer",
  "token": "your-access-token"
}
```

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Linting
```bash
npm run lint
```

## Architecture

The server is designed as a simple authenticated proxy:

- **`src/index.ts`**: Main MCP server implementation with 3 tools
- **`src/types/`**: TypeScript type definitions
- **`src/utils/dav-client.ts`**: WebDAV client for authenticated request forwarding
- **`src/__tests__/`**: Test files

## Design Philosophy

This server follows the principle of simplicity:

1. **No Parsing**: The server doesn't parse or interpret WebDAV responses
2. **Raw Forwarding**: Requests are forwarded exactly as received from the client
3. **Authentication Only**: The server only adds authentication headers
4. **Client Responsibility**: MCP clients must send properly-formed WebDAV requests

This approach provides maximum flexibility and compatibility with any WebDAV server while keeping the server implementation simple and reliable.

## Security Notes

- Credentials are stored in memory only during the session
- HTTPS is recommended for all DAV server connections
- Bearer tokens should be preferred over basic auth when available

## License

ISC

## Contributing

Contributions are welcome! Please ensure all tests pass and follow the existing code style.