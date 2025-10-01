import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { DavServerConfig, WebDavRequest, WebDavResponse } from '../types';

export class WebDavClient {
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
        // Digest auth requires challenge-response, which is complex to implement
        // For now, we'll throw an error suggesting basic auth
        throw new Error('Digest authentication not yet implemented. Please use basic or bearer authentication.');
    }

    return headers;
  }

  async forwardRequest(request: WebDavRequest): Promise<WebDavResponse> {
    // Ensure baseUrl ends with / and path doesn't start with / to avoid double slashes
    const baseUrl = this.config.baseUrl.endsWith('/') ? this.config.baseUrl : this.config.baseUrl + '/';
    const path = request.path.startsWith('/') ? request.path.substring(1) : request.path;
    const url = baseUrl + path;
    
    const axiosConfig: AxiosRequestConfig = {
      method: request.method.toUpperCase(),
      url,
      headers: {
        ...this.buildAuthHeaders(),
        ...request.headers,
      },
      data: request.body,
      validateStatus: () => true, // Don't throw on non-2xx status codes
    };

    try {
      const response: AxiosResponse = await axios(axiosConfig);
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body: response.data || '',
      };
    } catch (error) {
      throw new Error(`WebDAV request failed: ${error}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.forwardRequest({
        method: 'OPTIONS',
        path: '/',
      });
      
      return response.status >= 200 && response.status < 400;
    } catch {
      return false;
    }
  }
}