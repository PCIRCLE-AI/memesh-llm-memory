import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceLocator } from '../ServiceLocator';
import { logger } from '../../utils/logger.js';

describe('ServiceLocator', () => {
  beforeEach(() => {
    ServiceLocator.clear();
  });

  it('should register and retrieve service', () => {
    const logger = { log: (msg: string) => {} };
    ServiceLocator.register('logger', logger);

    expect(ServiceLocator.get('logger')).toBe(logger);
  });

  it('should throw for missing service', () => {
    expect(() => ServiceLocator.get('missing')).toThrow('Service not found: missing');
  });

  it('should check if service exists', () => {
    expect(ServiceLocator.has('logger')).toBe(false);

    ServiceLocator.register('logger', {});

    expect(ServiceLocator.has('logger')).toBe(true);
  });

  it('should clear all services', () => {
    ServiceLocator.register('service1', {});
    ServiceLocator.register('service2', {});

    expect(ServiceLocator.keys()).toHaveLength(2);

    ServiceLocator.clear();

    expect(ServiceLocator.keys()).toHaveLength(0);
  });

  it('should unregister specific service', () => {
    ServiceLocator.register('service1', {});
    ServiceLocator.register('service2', {});

    const removed = ServiceLocator.unregister('service1');

    expect(removed).toBe(true);
    expect(ServiceLocator.has('service1')).toBe(false);
    expect(ServiceLocator.has('service2')).toBe(true);
  });

  it('should return false when unregistering non-existent service', () => {
    const removed = ServiceLocator.unregister('non-existent');

    expect(removed).toBe(false);
  });

  it('should list all registered keys', () => {
    ServiceLocator.register('database', {});
    ServiceLocator.register('logger', {});
    ServiceLocator.register('config', {});

    const keys = ServiceLocator.keys();

    expect(keys).toHaveLength(3);
    expect(keys).toContain('database');
    expect(keys).toContain('logger');
    expect(keys).toContain('config');
  });

  it('should warn when overwriting existing service', () => {
    const consoleSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    ServiceLocator.register('logger', { version: 1 });
    ServiceLocator.register('logger', { version: 2 });

    expect(consoleSpy).toHaveBeenCalledWith(
      "ServiceLocator: Overwriting existing service 'logger'"
    );

    consoleSpy.mockRestore();
  });

  it('should support typed retrieval', () => {
    interface Logger {
      log(message: string): void;
      error(message: string): void;
    }

    const logger: Logger = {
      log: (msg: string) => {},
      error: (msg: string) => {}
    };

    ServiceLocator.register('logger', logger);

    const retrievedLogger = ServiceLocator.get<Logger>('logger');

    expect(typeof retrievedLogger.log).toBe('function');
    expect(typeof retrievedLogger.error).toBe('function');
  });

  it('should maintain independent instances', () => {
    const config1 = { value: 'test' };
    ServiceLocator.register('config', config1);

    const config2 = ServiceLocator.get('config');
    config2.value = 'modified';

    expect(config1.value).toBe('modified'); // Same reference
    expect(config2).toBe(config1);
  });
});
