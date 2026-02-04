/**
 * SecretHandlers Test Suite
 *
 * TDD tests for MCP Secret Management Tools.
 * Part of Phase 0.7.0 MeMesh Memory System Upgrade.
 *
 * Tests cover:
 * - buddy-secret-store: Store secrets securely
 * - buddy-secret-get: Retrieve stored secrets
 * - buddy-secret-list: List all secret names
 * - buddy-secret-delete: Delete secrets
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  handleBuddySecretStore,
  handleBuddySecretGet,
  handleBuddySecretList,
  handleBuddySecretDelete,
  parseExpiry,
} from '../../../src/mcp/handlers/SecretHandlers.js';
import type { SecretManager } from '../../../src/memory/SecretManager.js';
import { createMockSecretManager } from '../../utils/mock-factories.js';

describe('SecretHandlers', () => {
  let mockSecretManager: SecretManager;

  beforeEach(() => {
    // Create complete SecretManager mock with overrides for methods used in tests
    mockSecretManager = createMockSecretManager({
      store: vi.fn().mockResolvedValue('secret-uuid-123'),
      getByName: vi.fn().mockResolvedValue('my-secret-value'),
      list: vi.fn().mockResolvedValue([
        {
          id: 'id-1',
          name: 'api-key-1',
          secretType: 'api_key',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          expiresAt: new Date('2025-02-01'),
        },
        {
          id: 'id-2',
          name: 'token-1',
          secretType: 'bearer_token',
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        },
      ]),
      deleteByName: vi.fn().mockResolvedValue(true),
      requestConfirmation: vi.fn().mockReturnValue({
        messageKey: 'ccb.secret.confirmation',
        params: {
          secretName: 'test-secret',
          maskedValue: 'sk-a****1234',
          expiresIn: '30 days',
        },
        privacyNoticeKey: 'ccb.secret.privacyNotice',
      }),
      maskValue: vi.fn().mockReturnValue('sk-a****1234'),
      // Other methods (get, delete, update, updateMetadata, detectSecrets, etc.)
      // are stubbed by createMockSecretManager but not used in these tests
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // buddy-secret-store Tests
  // =====================================================
  describe('handleBuddySecretStore', () => {
    it('should store a new secret successfully', async () => {
      const input = {
        name: 'my-api-key',
        value: 'sk-ant-api03-xxxxx',
        type: 'api_key' as const,
      };

      const result = await handleBuddySecretStore(input, mockSecretManager);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('my-api-key');
      expect(mockSecretManager.store).toHaveBeenCalledWith(
        'sk-ant-api03-xxxxx',
        expect.objectContaining({
          name: 'my-api-key',
          secretType: 'api_key',
        })
      );
    });

    it('should store a secret with optional description', async () => {
      const input = {
        name: 'github-token',
        value: 'ghp_xxxxxxxxxxxx',
        type: 'token' as const,
        description: 'GitHub Personal Access Token for CI',
      };

      const result = await handleBuddySecretStore(input, mockSecretManager);

      expect(result.isError).toBeFalsy();
      expect(mockSecretManager.store).toHaveBeenCalledWith(
        'ghp_xxxxxxxxxxxx',
        expect.objectContaining({
          name: 'github-token',
          secretType: 'bearer_token', // 'token' maps to 'bearer_token'
        })
      );
      // Verify metadata was passed with description
      const callArgs = vi.mocked(mockSecretManager.store).mock.calls[0][1];
      expect(callArgs.metadata).toEqual({
        description: 'GitHub Personal Access Token for CI',
      });
    });

    it('should store a secret with expiry time', async () => {
      const input = {
        name: 'temp-token',
        value: 'temp-xxxxx',
        type: 'token' as const,
        expiresIn: '7d',
      };

      const result = await handleBuddySecretStore(input, mockSecretManager);

      expect(result.isError).toBeFalsy();
      expect(mockSecretManager.store).toHaveBeenCalledWith(
        'temp-xxxxx',
        expect.objectContaining({
          name: 'temp-token',
          expiresInSeconds: 7 * 24 * 60 * 60, // 7 days in seconds
        })
      );
    });

    it('should handle store failure gracefully', async () => {
      vi.mocked(mockSecretManager.store).mockRejectedValue(
        new Error("Secret with name 'existing' already exists")
      );

      const input = {
        name: 'existing',
        value: 'duplicate-value',
        type: 'api_key' as const,
      };

      const result = await handleBuddySecretStore(input, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidInput = {
        value: 'missing-name',
        type: 'api_key' as const,
      } as any;

      const result = await handleBuddySecretStore(invalidInput, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('name');
    });
  });

  // =====================================================
  // buddy-secret-get Tests
  // =====================================================
  describe('handleBuddySecretGet', () => {
    it('should retrieve an existing secret', async () => {
      const input = { name: 'my-api-key' };

      const result = await handleBuddySecretGet(input, mockSecretManager);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('my-secret-value');
      expect(mockSecretManager.getByName).toHaveBeenCalledWith('my-api-key');
    });

    it('should return error for non-existent secret', async () => {
      vi.mocked(mockSecretManager.getByName).mockResolvedValue(null);

      const input = { name: 'non-existent' };

      const result = await handleBuddySecretGet(input, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle get failure gracefully', async () => {
      vi.mocked(mockSecretManager.getByName).mockRejectedValue(
        new Error('Database error')
      );

      const input = { name: 'some-key' };

      const result = await handleBuddySecretGet(input, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('error');
    });

    it('should validate name is required', async () => {
      const invalidInput = {} as any;

      const result = await handleBuddySecretGet(invalidInput, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('name');
    });
  });

  // =====================================================
  // buddy-secret-list Tests
  // =====================================================
  describe('handleBuddySecretList', () => {
    it('should list all secret names', async () => {
      const result = await handleBuddySecretList({}, mockSecretManager);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('api-key-1');
      expect(result.content[0].text).toContain('token-1');
      // Should NOT contain actual secret values
      expect(result.content[0].text).not.toContain('my-secret-value');
    });

    it('should return empty message when no secrets exist', async () => {
      vi.mocked(mockSecretManager.list).mockResolvedValue([]);

      const result = await handleBuddySecretList({}, mockSecretManager);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No secrets');
    });

    it('should show secret types and expiry info', async () => {
      const result = await handleBuddySecretList({}, mockSecretManager);

      expect(result.content[0].text).toContain('api_key');
      expect(result.content[0].text).toContain('bearer_token');
    });

    it('should handle list failure gracefully', async () => {
      vi.mocked(mockSecretManager.list).mockRejectedValue(
        new Error('Database error')
      );

      const result = await handleBuddySecretList({}, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('error');
    });
  });

  // =====================================================
  // buddy-secret-delete Tests
  // =====================================================
  describe('handleBuddySecretDelete', () => {
    it('should delete an existing secret', async () => {
      const input = { name: 'api-key-1' };

      const result = await handleBuddySecretDelete(input, mockSecretManager);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('deleted');
      expect(result.content[0].text).toContain('api-key-1');
      expect(mockSecretManager.deleteByName).toHaveBeenCalledWith('api-key-1');
    });

    it('should return error for non-existent secret', async () => {
      vi.mocked(mockSecretManager.deleteByName).mockResolvedValue(false);

      const input = { name: 'non-existent' };

      const result = await handleBuddySecretDelete(input, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle delete failure gracefully', async () => {
      vi.mocked(mockSecretManager.deleteByName).mockRejectedValue(
        new Error('Database error')
      );

      const input = { name: 'some-key' };

      const result = await handleBuddySecretDelete(input, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('error');
    });

    it('should validate name is required', async () => {
      const invalidInput = {} as any;

      const result = await handleBuddySecretDelete(invalidInput, mockSecretManager);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('name');
    });
  });

  // =====================================================
  // parseExpiry Helper Tests
  // =====================================================
  describe('parseExpiry', () => {
    it('should parse days correctly', () => {
      expect(parseExpiry('30d')).toBe(30 * 24 * 60 * 60);
      expect(parseExpiry('1d')).toBe(24 * 60 * 60);
      expect(parseExpiry('7d')).toBe(7 * 24 * 60 * 60);
    });

    it('should parse hours correctly', () => {
      expect(parseExpiry('1h')).toBe(60 * 60);
      expect(parseExpiry('24h')).toBe(24 * 60 * 60);
      expect(parseExpiry('2h')).toBe(2 * 60 * 60);
    });

    it('should parse minutes correctly', () => {
      expect(parseExpiry('30m')).toBe(30 * 60);
      expect(parseExpiry('1m')).toBe(60);
      expect(parseExpiry('60m')).toBe(60 * 60);
    });

    it('should return undefined for invalid format', () => {
      expect(parseExpiry('invalid')).toBeUndefined();
      expect(parseExpiry('')).toBeUndefined();
      expect(parseExpiry('30')).toBeUndefined();
      expect(parseExpiry('d30')).toBeUndefined();
    });

    it('should handle edge cases', () => {
      expect(parseExpiry('0d')).toBe(0);
      expect(parseExpiry('0h')).toBe(0);
      expect(parseExpiry('0m')).toBe(0);
    });
  });

  // =====================================================
  // i18n Integration Tests
  // =====================================================
  describe('i18n Integration', () => {
    it('should use i18n message for successful store', async () => {
      const input = {
        name: 'test-key',
        value: 'test-value',
        type: 'api_key' as const,
      };

      const result = await handleBuddySecretStore(input, mockSecretManager);

      // Message should be translated (MeMesh branding)
      expect(result.content[0].text).toContain('MeMesh');
    });

    it('should use i18n message for not found error', async () => {
      vi.mocked(mockSecretManager.getByName).mockResolvedValue(null);

      const input = { name: 'missing' };

      const result = await handleBuddySecretGet(input, mockSecretManager);

      expect(result.content[0].text).toContain('MeMesh');
    });

    it('should use i18n message for delete success', async () => {
      const input = { name: 'to-delete' };

      const result = await handleBuddySecretDelete(input, mockSecretManager);

      expect(result.content[0].text).toContain('MeMesh');
    });
  });

  // =====================================================
  // Security Tests
  // =====================================================
  describe('Security', () => {
    it('should not expose secret value in store response', async () => {
      const input = {
        name: 'secure-key',
        value: 'super-secret-value-12345',
        type: 'api_key' as const,
      };

      const result = await handleBuddySecretStore(input, mockSecretManager);

      // Response should NOT contain the actual secret value
      expect(result.content[0].text).not.toContain('super-secret-value-12345');
    });

    it('should not expose secret values in list response', async () => {
      const result = await handleBuddySecretList({}, mockSecretManager);

      // List should only show names, not values
      expect(result.content[0].text).toContain('api-key-1');
      expect(result.content[0].text).not.toContain('my-secret-value');
    });
  });
});
