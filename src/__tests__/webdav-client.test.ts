import { WebDavClient } from '../utils/dav-client';
import { DavServerConfig } from '../types';

// Mock axios to avoid making real HTTP requests
jest.mock('axios');
const mockedAxios = jest.mocked(require('axios'));

describe('WebDavClient', () => {
  const config: DavServerConfig = {
    name: 'test-server',
    baseUrl: 'https://example.com/dav/',
    username: 'testuser',
    password: 'testpass',
    authType: 'basic',
  };

  let client: WebDavClient;

  beforeEach(() => {
    client = new WebDavClient(config);
    jest.clearAllMocks();
  });

  describe('forwardRequest', () => {
    it('should forward a simple GET request', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html' },
        data: '<html>Test</html>',
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await client.forwardRequest({
        method: 'GET',
        path: '/test.html',
      });

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://example.com/dav/test.html',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        },
        data: undefined,
        validateStatus: expect.any(Function),
      });

      expect(result).toEqual({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html' },
        body: '<html>Test</html>',
      });
    });

    it('should forward a PROPFIND request with body and headers', async () => {
      const mockResponse = {
        status: 207,
        statusText: 'Multi-Status',
        headers: { 'content-type': 'application/xml' },
        data: '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"/>',
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const propfindBody = '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>';

      const result = await client.forwardRequest({
        method: 'PROPFIND',
        path: '/collection/',
        headers: {
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
        body: propfindBody,
      });

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'PROPFIND',
        url: 'https://example.com/dav/collection/',
        headers: {
          Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
        data: propfindBody,
        validateStatus: expect.any(Function),
      });

      expect(result.status).toBe(207);
      expect(result.body).toBe('<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"/>');
    });
  });

  describe('authentication', () => {
    it('should handle bearer token authentication', async () => {
      const bearerConfig: DavServerConfig = {
        name: 'test-bearer',
        baseUrl: 'https://example.com/dav/',
        authType: 'bearer',
        token: 'abc123token',
      };

      const bearerClient = new WebDavClient(bearerConfig);
      const mockResponse = { status: 200, statusText: 'OK', headers: {}, data: '' };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      await bearerClient.forwardRequest({
        method: 'GET',
        path: '/',
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer abc123token',
          },
        })
      );
    });
  });

  describe('testConnection', () => {
    it('should return true for successful OPTIONS request', async () => {
      const mockResponse = { status: 200, statusText: 'OK', headers: {}, data: '' };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'OPTIONS',
          url: 'https://example.com/dav/',
        })
      );
    });

    it('should return false for failed request', async () => {
      mockedAxios.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
});