export interface DavServerConfig {
  name: string;
  baseUrl: string;
  username?: string;
  password?: string;
  authType: 'basic' | 'digest' | 'bearer';
  token?: string;
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export interface Contact {
  uid: string;
  fn: string; // Full name
  email?: string;
  phone?: string;
  organization?: string;
}

export interface DavResource {
  href: string;
  etag?: string;
  contentType: string;
  lastModified?: string;
  data?: string;
}

export interface DavRequestOptions {
  method: 'GET' | 'PUT' | 'DELETE' | 'PROPFIND' | 'REPORT';
  path: string;
  headers?: Record<string, string>;
  body?: string;
  depth?: '0' | '1' | 'infinity';
}

export interface DavResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}