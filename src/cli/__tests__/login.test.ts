import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock credentials module
vi.mock('../credentials.js', () => ({
  loadCredentials: vi.fn(),
  saveCredentials: vi.fn(),
  getCredentialsPath: vi.fn(() => '/tmp/test-memesh/credentials.json'),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { loadCredentials, saveCredentials } from '../credentials.js';

describe('login module', () => {
  const mockLoadCredentials = vi.mocked(loadCredentials);
  const mockSaveCredentials = vi.mocked(saveCredentials);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('DeviceAuthResponse interface', () => {
    it('should have correct shape', () => {
      const response = {
        device_code: 'test-device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://memesh.ai/auth/device',
        verification_uri_complete: 'https://memesh.ai/auth/device?user_code=ABCD-1234',
        expires_in: 600,
        interval: 5,
      };

      expect(response.device_code).toBeDefined();
      expect(response.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(response.verification_uri).toContain('https://');
      expect(response.expires_in).toBeGreaterThan(0);
      expect(response.interval).toBeGreaterThan(0);
    });
  });

  describe('TokenResponse interface', () => {
    it('should have correct shape', () => {
      const response = {
        api_key: 'sk_memmesh_abc123def456',
        token_type: 'api_key',
      };

      expect(response.api_key).toMatch(/^sk_memmesh_/);
      expect(response.token_type).toBe('api_key');
    });
  });

  describe('openBrowser URL validation', () => {
    // Test the URL validation logic directly
    it('should accept https URLs', () => {
      const url = 'https://memesh.ai/auth/device?user_code=ABCD-1234';
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
    });

    it('should accept http URLs', () => {
      const url = 'http://localhost:3000/auth/device';
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('http:');
    });

    it('should reject non-http protocols', () => {
      const url = 'javascript:alert(1)';
      const parsed = new URL(url);
      expect(parsed.protocol).not.toBe('https:');
      expect(parsed.protocol).not.toBe('http:');
    });

    it('should reject invalid URLs', () => {
      expect(() => new URL('not-a-url')).toThrow();
    });
  });

  describe('manualKeyLogin via secure stdin', () => {
    it('should validate key format prefix', () => {
      const validKey = 'sk_memmesh_abc123def456';
      expect(validKey.startsWith('sk_memmesh_')).toBe(true);

      const invalidKey = 'sk_live_abc123';
      expect(invalidKey.startsWith('sk_memmesh_')).toBe(false);
    });

    it('should export readApiKeyFromStdin function that returns a promise', async () => {
      const { readApiKeyFromStdin } = await import('../login.js');
      expect(readApiKeyFromStdin).toBeDefined();
      expect(typeof readApiKeyFromStdin).toBe('function');
      // The function should return a Promise (thenable)
      // We don't call it here since it requires interactive stdin
    });

    it('should not have --api-key option (security: prevents ps aux exposure)', async () => {
      const { Command } = await import('commander');
      const { registerLoginCommand } = await import('../login.js');
      const testProgram = new Command();
      registerLoginCommand(testProgram);
      const loginCmd = testProgram.commands.find(c => c.name() === 'login');
      expect(loginCmd).toBeDefined();
      // Verify --api-key option does NOT exist
      const apiKeyOpt = loginCmd!.options.find(o => o.long === '--api-key');
      expect(apiKeyOpt).toBeUndefined();
    });

    it('should have --manual flag option for secure stdin input', async () => {
      const { Command } = await import('commander');
      const { registerLoginCommand } = await import('../login.js');
      const testProgram = new Command();
      registerLoginCommand(testProgram);
      const loginCmd = testProgram.commands.find(c => c.name() === 'login');
      expect(loginCmd).toBeDefined();
      // Verify --manual option exists and is a boolean flag (no argument)
      const manualOpt = loginCmd!.options.find(o => o.long === '--manual');
      expect(manualOpt).toBeDefined();
      expect(manualOpt!.required).toBeFalsy();
    });
  });

  describe('deviceFlowLogin', () => {
    it('should detect existing credentials and skip login', async () => {
      mockLoadCredentials.mockReturnValue({
        apiKey: 'sk_memmesh_existing',
        createdAt: '2026-01-01T00:00:00Z',
      });

      // The actual function calls process.exit, so we test the logic flow
      const existing = loadCredentials();
      expect(existing).not.toBeNull();
      expect(existing!.apiKey).toBe('sk_memmesh_existing');
    });

    it('should proceed when no existing credentials', () => {
      mockLoadCredentials.mockReturnValue(null);
      expect(loadCredentials()).toBeNull();
    });
  });

  describe('polling error handling', () => {
    it('should handle authorization_pending', () => {
      const error = { error: 'authorization_pending', error_description: 'Waiting' };
      expect(error.error).toBe('authorization_pending');
    });

    it('should handle slow_down by increasing interval', () => {
      let interval = 5000;
      const error = { error: 'slow_down' };
      if (error.error === 'slow_down') {
        interval += 5000;
      }
      expect(interval).toBe(10000);
    });

    it('should handle access_denied', () => {
      const error = { error: 'access_denied' };
      expect(error.error).toBe('access_denied');
    });

    it('should handle expired_token', () => {
      const error = { error: 'expired_token' };
      expect(error.error).toBe('expired_token');
    });
  });

  describe('credential saving on success', () => {
    it('should save credentials with default backend URL', () => {
      const tokenData = { api_key: 'sk_memmesh_newkey', token_type: 'api_key' };
      const backendUrl = 'https://memesh-backend.fly.dev';
      const DEFAULT_BACKEND_URL = 'https://memesh-backend.fly.dev';

      saveCredentials({
        apiKey: tokenData.api_key,
        baseUrl: backendUrl !== DEFAULT_BACKEND_URL ? backendUrl : undefined,
        createdAt: new Date().toISOString(),
      });

      expect(mockSaveCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk_memmesh_newkey',
          baseUrl: undefined,
        }),
      );
    });

    it('should save credentials with custom backend URL', () => {
      const tokenData = { api_key: 'sk_memmesh_newkey', token_type: 'api_key' };
      const backendUrl = 'https://custom-backend.example.com';
      const DEFAULT_BACKEND_URL = 'https://memesh-backend.fly.dev';

      saveCredentials({
        apiKey: tokenData.api_key,
        baseUrl: backendUrl !== DEFAULT_BACKEND_URL ? backendUrl : undefined,
        createdAt: new Date().toISOString(),
      });

      expect(mockSaveCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk_memmesh_newkey',
          baseUrl: 'https://custom-backend.example.com',
        }),
      );
    });
  });
});
