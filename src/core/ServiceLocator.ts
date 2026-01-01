/**
 * Service Locator
 *
 * Central registry for dependency injection.
 * Reduces constructor parameter coupling.
 *
 * Usage:
 * ```typescript
 * // Registration (in initialization code)
 * ServiceLocator.register('database', db);
 * ServiceLocator.register('logger', logger);
 *
 * // Retrieval (in classes)
 * const db = ServiceLocator.get<Database>('database');
 * const logger = ServiceLocator.get<Logger>('logger');
 * ```
 *
 * Benefits:
 * - Reduces constructor parameter count
 * - Centralizes dependency management
 * - Easier testing (swap services in tests)
 * - Loose coupling between components
 */
export class ServiceLocator {
  private static services = new Map<string, any>();

  /**
   * Register a service instance
   *
   * @param key - Unique identifier for the service
   * @param service - Service instance to register
   *
   * @example
   * ```typescript
   * ServiceLocator.register('database', db);
   * ServiceLocator.register('logger', new Logger());
   * ```
   */
  static register<T>(key: string, service: T): void {
    if (this.services.has(key)) {
      console.warn(`ServiceLocator: Overwriting existing service '${key}'`);
    }
    this.services.set(key, service);
  }

  /**
   * Retrieve a registered service
   *
   * @param key - Service identifier
   * @returns The registered service instance
   * @throws Error if service not found
   *
   * @example
   * ```typescript
   * const db = ServiceLocator.get<Database>('database');
   * ```
   */
  static get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }
    return service as T;
  }

  /**
   * Check if a service is registered
   *
   * @param key - Service identifier to check
   * @returns true if service exists
   *
   * @example
   * ```typescript
   * if (ServiceLocator.has('database')) {
   *   const db = ServiceLocator.get<Database>('database');
   * }
   * ```
   */
  static has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all registered services
   * Useful for testing to ensure clean state
   *
   * @example
   * ```typescript
   * beforeEach(() => {
   *   ServiceLocator.clear();
   * });
   * ```
   */
  static clear(): void {
    this.services.clear();
  }

  /**
   * Get all registered service keys
   * Useful for debugging
   *
   * @returns Array of service keys
   */
  static keys(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Unregister a specific service
   *
   * @param key - Service identifier to remove
   * @returns true if service was removed, false if it didn't exist
   */
  static unregister(key: string): boolean {
    return this.services.delete(key);
  }
}
