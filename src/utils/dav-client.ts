import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { DavServerConfig, DavRequestOptions, DavResponse } from '../types';

export class DavClient {
  private config: DavServerConfig;

  constructor(config: DavServerConfig) {
    this.config = config;
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (this.config.authType) {
      case 'basic':
        if (this.config.username && this.config.password) {
          const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'bearer':
        if (this.config.token) {
          headers['Authorization'] = `Bearer ${this.config.token}`;
        }
        break;
      case 'digest':
        // Digest auth is more complex and would require multiple round trips
        // For now, we'll throw an error suggesting basic auth
        throw new Error('Digest authentication not yet implemented. Please use basic or bearer authentication.');
    }

    return headers;
  }

  async makeRequest(options: DavRequestOptions): Promise<DavResponse> {
    const url = new URL(options.path, this.config.baseUrl).toString();
    
    const axiosConfig: AxiosRequestConfig = {
      method: options.method,
      url,
      headers: {
        ...this.buildAuthHeaders(),
        ...options.headers,
      },
      data: options.body,
      validateStatus: () => true, // Don't throw on non-2xx status codes
    };

    // Add depth header for PROPFIND requests
    if (options.method === 'PROPFIND' && options.depth) {
      axiosConfig.headers!['Depth'] = options.depth;
    }

    try {
      const response: AxiosResponse = await axios(axiosConfig);
      
      return {
        status: response.status,
        headers: response.headers as Record<string, string>,
        body: response.data || '',
      };
    } catch (error) {
      throw new Error(`DAV request failed: ${error}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest({
        method: 'PROPFIND',
        path: '/',
        depth: '0',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
  </d:prop>
</d:propfind>`,
      });
      
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }
}