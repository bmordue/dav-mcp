export interface DavServerConfig {
  name: string;
  baseUrl: string;
  username?: string;
  password?: string;
  authType: 'basic' | 'digest' | 'bearer';
  token?: string;
}

export interface WebDavRequest {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface WebDavResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}