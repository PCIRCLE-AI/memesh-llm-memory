import { describe, it, expect } from 'vitest';
import {
  sanitizeEvent,
  looksLikeSensitive,
  hashValue,
  BANNED_FIELDS
} from './sanitization';

describe('Telemetry Sanitization', () => {
  it('should remove banned fields', () => {
    const event = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      api_key: 'sk-secret-123',
      password: 'password123',
      email: 'user@example.com',
      file_content: 'const secret = "xyz"',
      duration_ms: 1000
    };

    const sanitized = sanitizeEvent(event);

    expect(sanitized.api_key).toBeUndefined();
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.email).toBeUndefined();
    expect(sanitized.file_content).toBeUndefined();
    expect(sanitized.duration_ms).toBe(1000);
  });

  it('should hash sensitive-looking strings', () => {
    expect(looksLikeSensitive('sk-proj-abc123def456')).toBe(true);
    expect(looksLikeSensitive('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(true);
    expect(looksLikeSensitive('/Users/john/secret-project/api-key.txt')).toBe(true);
    expect(looksLikeSensitive('code-reviewer')).toBe(false);
  });

  it('should hash sensitive values', () => {
    const hashed = hashValue('sk-proj-secret-key-123');
    expect(hashed).not.toContain('secret');
    expect(hashed).toHaveLength(16);
  });
});
