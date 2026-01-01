import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_CONSTRAINTS } from '../../../src/agents/e2e-healing/config.js';

describe('E2E Healing Setup', () => {
  it('should have valid default config', () => {
    expect(DEFAULT_CONFIG.maxAttempts).toBe(3);
    expect(DEFAULT_CONFIG.cooldownPeriod).toBe(30 * 60 * 1000);
    expect(DEFAULT_CONFIG.failureThreshold).toBe(3);
  });

  it('should have valid default constraints', () => {
    expect(DEFAULT_CONSTRAINTS.maxFilesModified).toBe(3);
    expect(DEFAULT_CONSTRAINTS.maxLinesChanged).toBe(100);
    expect(DEFAULT_CONSTRAINTS.allowedFilePatterns).toContain('**/*.css');
    expect(DEFAULT_CONSTRAINTS.forbiddenFilePatterns).toContain('**/api/**');
  });
});
