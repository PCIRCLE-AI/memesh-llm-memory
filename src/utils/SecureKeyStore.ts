/**
 * SecureKeyStore - Secure in-memory storage for API keys
 *
 * SECURITY: Stores API keys in memory instead of mutating process.env
 * to prevent race conditions, leakage through error messages, and
 * violations of immutable configuration principle.
 */

import { ValidationError } from '../errors/index.js';

export class SecureKeyStore {
  private static keys = new Map<string, string>();

  /**
   * Store an API key securely in memory
   * @param provider - Provider name (e.g., 'openai', 'anthropic')
   * @param key - API key to store
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
   * @param provider - Provider name
   * @returns API key or undefined if not found
   */
  static get(provider: string): string | undefined {
    return this.keys.get(provider.toLowerCase());
  }

  /**
   * Check if an API key exists for a provider
   * @param provider - Provider name
   * @returns true if key exists
   */
  static has(provider: string): boolean {
    return this.keys.has(provider.toLowerCase());
  }

  /**
   * Remove an API key from storage
   * @param provider - Provider name
   */
  static delete(provider: string): void {
    this.keys.delete(provider.toLowerCase());
  }

  /**
   * Clear all stored API keys
   * CAUTION: This will remove all keys from memory
   */
  static clear(): void {
    this.keys.clear();
  }

  /**
   * Get list of providers with stored keys (for debugging)
   * Does NOT return the actual keys
   */
  static listProviders(): string[] {
    return Array.from(this.keys.keys());
  }
}
