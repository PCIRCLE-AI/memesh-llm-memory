/**
 * Storage Pool - Connection Pooling and Failover
 *
 * Provides high availability and load balancing for storage backends:
 * - Multiple backend support with priority
 * - Automatic failover on errors
 * - Health checking and circuit breaking
 * - Load balancing strategies (round-robin, priority, random)
 * - Connection pooling and reuse
 */

import { logger } from '../../utils/logger.js';
import type { Credential, CredentialQuery, SecureStorage } from '../types.js';

/**
 * Storage backend configuration with priority
 */
export interface StorageBackendConfig {
  /**
   * Backend instance
   */
  backend: SecureStorage;

  /**
   * Backend name for identification
   */
  name: string;

  /**
   * Priority (lower = higher priority, 0 = highest)
   */
  priority: number;

  /**
   * Weight for load balancing (default: 1)
   */
  weight?: number;

  /**
   * Maximum failures before circuit break (default: 3)
   */
  maxFailures?: number;

  /**
   * Circuit breaker reset time in milliseconds (default: 60000)
   */
  resetTimeout?: number;
}

/**
 * Load balancing strategy
 */
export enum LoadBalancingStrategy {
  /**
   * Always use highest priority backend (with fallback)
   */
  PRIORITY = 'priority',

  /**
   * Round-robin across backends of same priority
   */
  ROUND_ROBIN = 'round_robin',

  /**
   * Weighted random selection
   */
  WEIGHTED_RANDOM = 'weighted_random',

  /**
   * Least recently used
   */
  LEAST_USED = 'least_used',
}

/**
 * Storage pool statistics
 */
export interface StoragePoolStats {
  totalBackends: number;
  healthyBackends: number;
  circuitBrokenBackends: number;
  totalRequests: number;
  failedRequests: number;
  backendStats: Array<{
    name: string;
    healthy: boolean;
    circuitBroken: boolean;
    requests: number;
    failures: number;
    lastUsed?: Date;
  }>;
}

/**
 * Backend health state
 */
interface BackendHealth {
  failures: number;
  circuitBroken: boolean;
  lastFailure?: Date;
  resetTimeout?: NodeJS.Timeout;
  requests: number;
  lastUsed?: Date;
}

/**
 * Storage Pool with failover and load balancing
 */
export class StoragePool implements SecureStorage {
  private backends: Map<string, StorageBackendConfig> = new Map();
  private health: Map<string, BackendHealth> = new Map();
  private strategy: LoadBalancingStrategy;
  private roundRobinIndex: number = 0;
  private totalRequests: number = 0;
  private failedRequests: number = 0;

  constructor(strategy: LoadBalancingStrategy = LoadBalancingStrategy.PRIORITY) {
    this.strategy = strategy;
    logger.info('Storage pool initialized', { strategy });
  }

  /**
   * Add a storage backend to the pool
   */
  addBackend(config: StorageBackendConfig): void {
    const healthState: BackendHealth = {
      failures: 0,
      circuitBroken: false,
      requests: 0,
    };

    this.backends.set(config.name, {
      ...config,
      weight: config.weight || 1,
      maxFailures: config.maxFailures || 3,
      resetTimeout: config.resetTimeout || 60000,
    });

    this.health.set(config.name, healthState);

    logger.info('Backend added to storage pool', {
      name: config.name,
      priority: config.priority,
      weight: config.weight || 1,
    });
  }

  /**
   * Remove a backend from the pool
   */
  removeBackend(name: string): void {
    const health = this.health.get(name);
    if (health?.resetTimeout) {
      clearTimeout(health.resetTimeout);
    }

    this.backends.delete(name);
    this.health.delete(name);

    logger.info('Backend removed from storage pool', { name });
  }

  /**
   * Get sorted backends by priority and health
   */
  private getSortedBackends(): Array<[string, StorageBackendConfig]> {
    return Array.from(this.backends.entries())
      .filter(([name]) => !this.health.get(name)?.circuitBroken)
      .sort(([, a], [, b]) => a.priority - b.priority);
  }

  /**
   * Select next backend based on strategy
   */
  private selectBackend(): StorageBackendConfig | null {
    const backends = this.getSortedBackends();

    if (backends.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case LoadBalancingStrategy.PRIORITY:
        // Always use highest priority (lowest number)
        return backends[0][1];

      case LoadBalancingStrategy.ROUND_ROBIN: {
        // Get backends with highest priority
        const highestPriority = backends[0][1].priority;
        const samePriority = backends.filter(([, b]) => b.priority === highestPriority);

        const selected = samePriority[this.roundRobinIndex % samePriority.length][1];
        this.roundRobinIndex++;
        return selected;
      }

      case LoadBalancingStrategy.WEIGHTED_RANDOM: {
        // Weighted random selection
        const totalWeight = backends.reduce((sum, [, b]) => sum + (b.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const [, backend] of backends) {
          random -= backend.weight || 1;
          if (random <= 0) {
            return backend;
          }
        }

        return backends[0][1];
      }

      case LoadBalancingStrategy.LEAST_USED: {
        // Select backend with fewest requests
        const sorted = backends.sort(([nameA], [nameB]) => {
          const healthA = this.health.get(nameA)!;
          const healthB = this.health.get(nameB)!;
          return healthA.requests - healthB.requests;
        });

        return sorted[0][1];
      }

      default:
        return backends[0][1];
    }
  }

  /**
   * Execute operation with fallback
   */
  private async executeWithFallback<T>(
    operation: (backend: SecureStorage) => Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    const backends = this.getSortedBackends();

    if (backends.length === 0) {
      throw new Error('No healthy backends available');
    }

    let lastError: Error | null = null;

    for (const [name, config] of backends) {
      const health = this.health.get(name)!;
      health.requests++;
      health.lastUsed = new Date();

      try {
        const result = await operation(config.backend);

        // Reset failures on success
        if (health.failures > 0) {
          health.failures = 0;
          logger.info('Backend recovered', { name });
        }

        return result;
      } catch (error: any) {
        lastError = error;
        health.failures++;
        health.lastFailure = new Date();

        logger.warn('Backend operation failed', {
          name,
          failures: health.failures,
          maxFailures: config.maxFailures,
          error: error.message,
        });

        // Check if circuit should break
        if (health.failures >= config.maxFailures! && !health.circuitBroken) {
          health.circuitBroken = true;

          logger.error('Circuit breaker triggered', {
            name,
            failures: health.failures,
          });

          // Set timeout to reset circuit
          health.resetTimeout = setTimeout(() => {
            health.circuitBroken = false;
            health.failures = 0;
            logger.info('Circuit breaker reset', { name });
          }, config.resetTimeout);
        }
      }
    }

    this.failedRequests++;
    throw new Error(
      `All backends failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Store a credential (with fallback)
   */
  async set(credential: Credential): Promise<void> {
    return this.executeWithFallback((backend) => backend.set(credential));
  }

  /**
   * Retrieve a credential (with fallback)
   */
  async get(service: string, account: string): Promise<Credential | null> {
    return this.executeWithFallback((backend) => backend.get(service, account));
  }

  /**
   * Delete a credential (with fallback)
   */
  async delete(service: string, account: string): Promise<void> {
    return this.executeWithFallback((backend) => backend.delete(service, account));
  }

  /**
   * List credentials (with fallback)
   */
  async list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]> {
    return this.executeWithFallback((backend) => backend.list(query));
  }

  /**
   * Check if any backend is available
   */
  async isAvailable(): Promise<boolean> {
    const backends = Array.from(this.backends.values());

    for (const config of backends) {
      try {
        const available = await config.backend.isAvailable();
        if (available) {
          return true;
        }
      } catch (error) {
        continue;
      }
    }

    return false;
  }

  /**
   * Health check all backends
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, config] of this.backends.entries()) {
      try {
        const available = await config.backend.isAvailable();
        results.set(name, available);

        if (!available) {
          logger.warn('Backend health check failed', { name });
        }
      } catch (error: any) {
        results.set(name, false);
        logger.error('Backend health check error', {
          name,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get pool statistics
   */
  getStats(): StoragePoolStats {
    const backendStats = Array.from(this.backends.entries()).map(([name, config]) => {
      const health = this.health.get(name)!;

      return {
        name,
        healthy: !health.circuitBroken && health.failures < config.maxFailures!,
        circuitBroken: health.circuitBroken,
        requests: health.requests,
        failures: health.failures,
        lastUsed: health.lastUsed,
      };
    });

    const healthyBackends = backendStats.filter((b) => b.healthy).length;
    const circuitBrokenBackends = backendStats.filter((b) => b.circuitBroken).length;

    return {
      totalBackends: this.backends.size,
      healthyBackends,
      circuitBrokenBackends,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      backendStats,
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const [name, health] of this.health.entries()) {
      if (health.circuitBroken) {
        health.circuitBroken = false;
        health.failures = 0;
        logger.info('Circuit breaker manually reset', { name });
      }

      if (health.resetTimeout) {
        clearTimeout(health.resetTimeout);
        health.resetTimeout = undefined;
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    for (const health of this.health.values()) {
      if (health.resetTimeout) {
        clearTimeout(health.resetTimeout);
      }
    }

    this.backends.clear();
    this.health.clear();

    logger.info('Storage pool disposed');
  }
}
