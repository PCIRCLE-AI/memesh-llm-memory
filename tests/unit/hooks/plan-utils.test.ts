import { describe, it, expect } from 'vitest';
import {
  tokenize,
  extractModuleHints,
  derivePlanName,
} from '../../../scripts/hooks/hook-utils.js';

describe('tokenize', () => {
  it('should lowercase and split text into words', () => {
    // 'set' and 'up' are filtered (stop words / too short)
    expect(tokenize('Set Up Auth Middleware')).toEqual(['auth', 'middleware']);
  });

  it('should remove punctuation', () => {
    expect(tokenize('feat(auth): add validation!')).toEqual(['feat', 'auth', 'add', 'validation']);
  });

  it('should filter words shorter than 3 chars', () => {
    expect(tokenize('a is to the big dog')).toEqual(['big', 'dog']);
  });

  it('should filter common stop words', () => {
    expect(tokenize('add the new feature for users')).toEqual(['add', 'new', 'feature', 'users']);
  });

  it('should return empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('extractModuleHints', () => {
  it('should extract meaningful words from step description', () => {
    const hints = extractModuleHints('Set up auth middleware');
    expect(hints).toContain('auth');
    expect(hints).toContain('middleware');
  });

  it('should handle technical terms', () => {
    const hints = extractModuleHints('Add JWT validation logic');
    expect(hints).toContain('jwt');
    expect(hints).toContain('validation');
  });
});

describe('derivePlanName', () => {
  it('should extract name from docs/plans/ path', () => {
    expect(derivePlanName('docs/plans/2026-02-25-auth-system-design.md'))
      .toBe('auth-system-design');
  });

  it('should extract name from -design.md suffix', () => {
    expect(derivePlanName('docs/auth-system-design.md'))
      .toBe('auth-system-design');
  });

  it('should extract name from -plan.md suffix', () => {
    expect(derivePlanName('my-feature-plan.md'))
      .toBe('my-feature-plan');
  });

  it('should handle path with no date prefix', () => {
    expect(derivePlanName('docs/plans/auth-design.md'))
      .toBe('auth-design');
  });
});
