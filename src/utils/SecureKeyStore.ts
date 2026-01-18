/**
 * SecureKeyStore - Secure in-memory storage for API keys
 *
 * SECURITY: Stores API keys in memory instead of mutating process.env
 * to prevent race conditions, leakage through error messages, and
 * violations of immutable configuration principle.
 *
 * Features:
 * - In-memory storage (keys never written to disk)
 * - No process.env mutation (prevents race conditions)
 * - Case-insensitive provider lookup
 * - Input validation with detailed error messages
 * - Automatic key redaction in error messages
 *
 * @example
 * ```typescript
 * import { SecureKeyStore } from './SecureKeyStore.js';
 *
 * // Store API keys
 * SecureKeyStore.set('anthropic', process.env.ANTHROPIC_API_KEY!);
 * SecureKeyStore.set('internal', 'local-access-token');
 *
 * // Retrieve API keys
 * const anthropicKey = SecureKeyStore.get('anthropic');
 *
 * // Check if key exists
 * if (SecureKeyStore.has('anthropic')) {
 *   // Use API
 * }
 *
 * // List providers (for debugging)
 * console.log('Configured providers:', SecureKeyStore.listProviders());
 * ```
 */

import { ValidationError } from '../errors/index.js';

/**
 * Secure in-memory store for API keys
 *
 * Static class that maintains a singleton Map of provider → API key mappings.
 * All provider names are normalized to lowercase for case-insensitive lookup.
 */
export class SecureKeyStore {
  private static keys = new Map<string, string>();

  /**
   * Store an API key securely in memory
   *
   * Provider names are normalized to lowercase for case-insensitive lookup.
   * Throws ValidationError if provider or key is empty.
   *
   * @param provider - Provider name (e.g., 'anthropic', 'internal')
   * @param key - API key to store
   * @throws {ValidationError} If provider or key is empty
   *
   * @example
   * ```typescript
   * SecureKeyStore.set('anthropic', process.env.ANTHROPIC_API_KEY!);
   * SecureKeyStore.set('INTERNAL', 'local-access-token'); // Normalized to 'internal'
   * ```
   */
  static set(provider: string, key: string): void {
    if (!provider || !key) {
      throw new ValidationError(
        'Provider and key must be non-empty strings',
        {
          component: 'SecureKeyStore',
          method: 'set',
          providedProvider: provider,
          providedKey: key ? '[REDACTED]' : undefined,
          constraint: 'both provider and key must be non-empty strings',
        }
      );
    }
    this.keys.set(provider.toLowerCase(), key);
  }

  /**
   * Retrieve an API key from secure storage
   *
   * Provider lookup is case-insensitive.
   *
   * @param provider - Provider name (case-insensitive)
   * @returns API key if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const key = SecureKeyStore.get('anthropic');
   * if (key) {
   *   // Use API key
   * } else {
   *   console.error('API key not configured');
   * }
   * ```
   */
  static get(provider: string): string | undefined {
    return this.keys.get(provider.toLowerCase());
  }

  /**
   * Check if an API key exists for a provider
   *
   * Provider lookup is case-insensitive.
   *
   * @param provider - Provider name (case-insensitive)
   * @returns true if key exists for provider, false otherwise
   *
   * @example
   * ```typescript
   * if (SecureKeyStore.has('anthropic')) {
   *   const key = SecureKeyStore.get('anthropic')!;
   *   // Use Anthropic API
   * }
   * ```
   */
  static has(provider: string): boolean {
    return this.keys.has(provider.toLowerCase());
  }

  /**
   * Remove an API key from storage
   *
   * Provider lookup is case-insensitive.
   * Does nothing if provider doesn't exist.
   *
   * @param provider - Provider name (case-insensitive)
   *
   * @example
   * ```typescript
   * SecureKeyStore.delete('anthropic'); // Remove key
   * ```
   */
  static delete(provider: string): void {
    this.keys.delete(provider.toLowerCase());
  }

  /**
   * Clear all stored API keys
   *
   * CAUTION: This will remove all keys from memory.
   * Use sparingly, typically only in tests or shutdown procedures.
   *
   * @example
   * ```typescript
   * // Clear all keys (e.g., in test teardown)
   * SecureKeyStore.clear();
   * ```
   */
  static clear(): void {
    this.keys.clear();
  }

  /**
   * Get list of providers with stored keys
   *
   * Useful for debugging and validation.
   * Returns provider names only - does NOT expose actual API keys.
   *
   * @returns Array of provider names (lowercase)
   *
   * @example
   * ```typescript
   * const providers = SecureKeyStore.listProviders();
   * console.log('Configured providers:', providers);
   * // Output: ['anthropic', 'internal']
   * ```
   */
  static listProviders(): string[] {
    return Array.from(this.keys.keys());
  }
}
