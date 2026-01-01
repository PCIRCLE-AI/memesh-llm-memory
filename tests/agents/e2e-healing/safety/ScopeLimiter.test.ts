import { describe, it, expect, beforeEach } from 'vitest';
import { ScopeLimiter } from '../../../../src/agents/e2e-healing/safety/ScopeLimiter.js';
import { DEFAULT_CONSTRAINTS } from '../../../../src/agents/e2e-healing/config.js';
import { CodeChange } from '../../../../src/agents/e2e-healing/types.js';

describe('ScopeLimiter', () => {
  let limiter: ScopeLimiter;

  beforeEach(() => {
    limiter = new ScopeLimiter(DEFAULT_CONSTRAINTS);
  });

  it('should pass validation for valid fix scope', () => {
    const proposedFix: CodeChange[] = [
      {
        path: 'src/components/Button.tsx',
        additions: 5,
        deletions: 2,
        diff: '...',
      },
    ];

    const result = limiter.validateRepairScope('Button.test.tsx', proposedFix);

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should reject fix exceeding max files limit', () => {
    const proposedFix: CodeChange[] = [
      { path: 'src/components/A.tsx', additions: 1, deletions: 0, diff: '...' },
      { path: 'src/components/B.tsx', additions: 1, deletions: 0, diff: '...' },
      { path: 'src/components/C.tsx', additions: 1, deletions: 0, diff: '...' },
      { path: 'src/components/D.tsx', additions: 1, deletions: 0, diff: '...' },
    ];

    const result = limiter.validateRepairScope('test.tsx', proposedFix);

    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('exceeds limit of 3'))).toBe(true);
  });

  it('should reject fix exceeding max lines limit', () => {
    const proposedFix: CodeChange[] = [
      {
        path: 'src/components/Button.tsx',
        additions: 80,
        deletions: 30,
        diff: '...',
      },
    ];

    const result = limiter.validateRepairScope('Button.test.tsx', proposedFix);

    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('exceeds limit of 100'))).toBe(true);
  });

  it('should reject forbidden file patterns', () => {
    const proposedFix: CodeChange[] = [
      {
        path: 'src/api/endpoints.ts',
        additions: 5,
        deletions: 2,
        diff: '...',
      },
    ];

    const result = limiter.validateRepairScope('test.tsx', proposedFix);

    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('forbidden file'))).toBe(true);
  });

  it('should enforce whitelist patterns', () => {
    const proposedFix: CodeChange[] = [
      {
        path: 'src/utils/helpers.ts',
        additions: 5,
        deletions: 2,
        diff: '...',
      },
    ];

    const result = limiter.validateRepairScope('test.tsx', proposedFix);

    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('not in allowed patterns'))).toBe(true);
  });
});
