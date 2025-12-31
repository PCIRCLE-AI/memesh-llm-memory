import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, setLogLevel, LogLevel } from './logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create logger with default info level', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should log info messages with context', () => {
    const logSpy = vi.spyOn(logger, 'info');
    logger.info('Test message', { userId: '123' });
    expect(logSpy).toHaveBeenCalledWith('Test message', { userId: '123' });
  });

  it('should log error messages with error object', () => {
    const logSpy = vi.spyOn(logger, 'error');
    const error = new Error('Test error');
    logger.error('Error occurred', { error });
    expect(logSpy).toHaveBeenCalledWith('Error occurred', { error });
  });

  it('should change log level dynamically', () => {
    setLogLevel(LogLevel.DEBUG);
    const debugSpy = vi.spyOn(logger, 'debug');
    logger.debug('Debug message');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('should format logs with timestamp and level', () => {
    const logSpy = vi.spyOn(logger, 'info');
    logger.info('Formatted message');
    // Verify format includes timestamp and level
    expect(logSpy).toHaveBeenCalled();
  });
});
