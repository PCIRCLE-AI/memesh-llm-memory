/**
 * Test Helper Utilities
 *
 * Provides type-safe mock factories and utilities for testing.
 * These helpers improve test maintainability by providing complete
 * mock implementations with proper TypeScript types.
 */

import { vi } from 'vitest';
import type { A2AClient } from '../../src/a2a/client/A2AClient.js';
import type { AgentRegistry } from '../../src/core/AgentRegistry.js';
import type { SecretManager } from '../../src/memory/SecretManager.js';

/**
 * Create a complete mock A2AClient with all methods stubbed
 *
 * All methods default to vi.fn() stubs. Provide overrides to customize
 * specific methods for your test scenarios.
 *
 * @param overrides - Partial overrides for specific methods
 * @returns Complete A2AClient mock
 *
 * @example
 * ```typescript
 * const mockClient = createMockA2AClient({
 *   sendMessage: vi.fn().mockResolvedValue({ taskId: 'test-123' }),
 *   getTask: vi.fn().mockResolvedValue({ id: 'test-123', state: 'COMPLETED' }),
 * });
 * ```
 */
export function createMockA2AClient(overrides: Partial<A2AClient> = {}): A2AClient {
  return {
    sendMessage: vi.fn(),
    getTask: vi.fn(),
    listTasks: vi.fn(),
    getAgentCard: vi.fn(),
    cancelTask: vi.fn(),
    listAvailableAgents: vi.fn(),
    ...overrides,
  } as A2AClient;
}

/**
 * Create a complete mock AgentRegistry with all methods stubbed
 *
 * All methods default to vi.fn() stubs. Provide overrides to customize
 * specific methods for your test scenarios.
 *
 * @param overrides - Partial overrides for specific methods
 * @returns Complete AgentRegistry mock
 *
 * @example
 * ```typescript
 * const mockRegistry = createMockAgentRegistry({
 *   listActive: vi.fn().mockReturnValue([
 *     { agentId: 'agent-1', baseUrl: 'http://localhost:3000' },
 *   ]),
 * });
 * ```
 */
export function createMockAgentRegistry(
  overrides: Partial<AgentRegistry> = {}
): AgentRegistry {
  return {
    registerAgent: vi.fn(),
    getAllAgents: vi.fn(),
    getAgent: vi.fn(),
    getAgentsByCategory: vi.fn(),
    hasAgent: vi.fn(),
    getAgentCount: vi.fn(),
    getAllAgentTypes: vi.fn(),
    getRealImplementations: vi.fn(),
    getEnhancedPrompts: vi.fn(),
    getOptionalAgents: vi.fn(),
    ...overrides,
  } as unknown as AgentRegistry;
}

/**
 * Create a complete mock SecretManager with all methods stubbed
 *
 * All methods default to vi.fn() stubs. Provide overrides to customize
 * specific methods for your test scenarios.
 *
 * @param overrides - Partial overrides for specific methods
 * @returns Complete SecretManager mock
 *
 * @example
 * ```typescript
 * const mockSecretManager = createMockSecretManager({
 *   store: vi.fn().mockResolvedValue('secret-uuid-123'),
 *   getByName: vi.fn().mockResolvedValue('my-secret-value'),
 * });
 * ```
 */
export function createMockSecretManager(
  overrides: Partial<SecretManager> = {}
): SecretManager {
  return {
    detectSecrets: vi.fn(),
    maskValue: vi.fn(),
    store: vi.fn(),
    get: vi.fn(),
    getByName: vi.fn(),
    getStoredData: vi.fn(),
    update: vi.fn(),
    updateMetadata: vi.fn(),
    delete: vi.fn(),
    deleteByName: vi.fn(),
    list: vi.fn(),
    requestConfirmation: vi.fn(),
    addSecretPatterns: vi.fn(),
    cleanupExpired: vi.fn(),
    countExpired: vi.fn(),
    close: vi.fn(),
    ...overrides,
  } as unknown as SecretManager;
}
