/**
 * Test Helper Utilities
 *
 * Provides type-safe mock factories and utilities for testing.
 * These helpers improve test maintainability by providing complete
 * mock implementations with proper TypeScript types.
 */

import { vi } from 'vitest';
import type { AgentRegistry } from '../../src/core/AgentRegistry.js';

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

