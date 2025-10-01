# dav-mcp

An MCP (Model Context Protocol) server written in TypeScript that handles authentication and forwards DAV requests for querying CalDAV and CardDAV servers.

## Features

- **CalDAV Support**: List calendars, retrieve calendar events, create new events
- **CardDAV Support**: List address books, retrieve contacts, search contacts, create new contacts
- **Authentication**: Support for Basic and Bearer token authentication
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

#### 1. Configure DAV Server
Configure a connection to a DAV server:

```json
{
  "name": "configure_dav_server",
  "arguments": {
    "name": "my-server",
    "baseUrl": "https://caldav.example.com",
    "username": "user@example.com",
    "password": "your-password",
    "authType": "basic"
  }
}
```

#### 2. Test DAV Connection
Test if the configured server is accessible:

```json
{
  "name": "test_dav_connection",
  "arguments": {
    "serverName": "my-server"
  }
}
```

#### 3. List Calendars (CalDAV)
List available calendars:

```json
{
  "name": "list_calendars",
  "arguments": {
    "serverName": "my-server"
  }
}
```

#### 4. Get Calendar Events (CalDAV)
Retrieve events from a calendar:

```json
{
  "name": "get_calendar_events",
  "arguments": {
    "serverName": "my-server",
    "calendarPath": "/calendars/user@example.com/personal/",
    "startDate": "2023-12-01T00:00:00Z",
    "endDate": "2023-12-31T23:59:59Z"
  }
}
```

#### 5. Create Calendar Event (CalDAV)
Create a new calendar event:

```json
{
  "name": "create_calendar_event",
  "arguments": {
    "serverName": "my-server",
    "calendarPath": "/calendars/user@example.com/personal/",
    "event": {
      "uid": "unique-event-id",
      "summary": "Team Meeting",
      "start": "2023-12-15T10:00:00Z",
      "end": "2023-12-15T11:00:00Z",
      "description": "Weekly team sync",
      "location": "Conference Room A",
      "status": "CONFIRMED"
    }
  }
}
```

#### 6. List Address Books (CardDAV)
List available address books:

```json
{
  "name": "list_address_books",
  "arguments": {
    "serverName": "my-server"
  }
}
```

#### 7. Get Contacts (CardDAV)
Retrieve contacts from an address book:

```json
{
  "name": "get_contacts",
  "arguments": {
    "serverName": "my-server",
    "addressBookPath": "/addressbooks/user@example.com/contacts/"
  }
}
```

#### 8. Search Contacts (CardDAV)
Search for contacts:

```json
{
  "name": "search_contacts",
  "arguments": {
    "serverName": "my-server",
    "addressBookPath": "/addressbooks/user@example.com/contacts/",
    "query": "John"
  }
}
```

#### 9. Create Contact (CardDAV)
Create a new contact:

```json
{
  "name": "create_contact",
  "arguments": {
    "serverName": "my-server",
    "addressBookPath": "/addressbooks/user@example.com/contacts/",
    "contact": {
      "uid": "unique-contact-id",
      "fn": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "organization": "Example Corp"
    }
  }
}
```

## Supported DAV Servers

This MCP server has been designed to work with various DAV servers including:

- **CalDAV**: Google Calendar, Apple Calendar Server, Radicale, Nextcloud, ownCloud
- **CardDAV**: Google Contacts, Apple Contacts Server, Radicale, Nextcloud, ownCloud

## Authentication

### Basic Authentication
Most commonly used with username and password:

```json
{
  "authType": "basic",
  "username": "your-username",
  "password": "your-password"
}
```

### Bearer Token Authentication
For servers that support OAuth or API tokens:

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

The server is structured as follows:

- **`src/index.ts`**: Main MCP server implementation
- **`src/types/`**: TypeScript type definitions
- **`src/utils/`**: Utility classes for DAV client and XML parsing
- **`src/handlers/`**: CalDAV and CardDAV specific handlers
- **`src/__tests__/`**: Test files

## Error Handling

The server includes comprehensive error handling for:

- Authentication failures
- Network connectivity issues
- Invalid DAV responses
- Malformed calendar/contact data
- Server configuration errors

## Security Notes

- Credentials are stored in memory only during the session
- HTTPS is recommended for all DAV server connections
- Bearer tokens should be preferred over basic auth when available

## License

ISC

## Contributing

Contributions are welcome! Please ensure all tests pass and follow the existing code style.
