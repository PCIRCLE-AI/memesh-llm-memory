/**
 * Proper Vitest Mock Type Definitions
 *
 * Provides correct type definitions for Vitest mocked functions and objects.
 * This resolves TypeScript errors when accessing `.mock` property on mocked functions.
 *
 * Usage:
 * ```typescript
 * import type { MockedFunction } from './utils/vitest-mock-types.js';
 *
 * const mockFn = vi.fn() as MockedFunction<typeof SomeClass.prototype.method>;
 * mockFn.mock.calls // ✅ TypeScript happy
 * ```
 */

import { vi } from 'vitest';

/**
 * Proper type for Vitest mocked functions
 *
 * This type ensures that mocked functions have the correct `.mock` property
 * with call history, results, and other mock-specific features.
 *
 * @template T - The function type to mock
 */
export type MockedFunction<T extends (...args: any[]) => any> = ReturnType<
  typeof vi.fn<Parameters<T>, ReturnType<T>>
>;

/**
 * Proper type for Vitest mocked objects
 *
 * Converts all methods in an object to properly typed mocked functions.
 *
 * @template T - The object type to mock
 */
export type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? MockedFunction<T[K]>
    : T[K];
};

/**
 * Helper to create properly typed mock objects
 *
 * @template T - The type of object to create a mock for
 * @returns A mock object with properly typed methods
 */
export function createMock<T>(): MockedObject<T> {
  return {} as MockedObject<T>;
}
