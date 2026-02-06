/**
 * Tests for a2a-subscribe MCP Tool
 *
 * Comprehensive test coverage for SSE endpoint URL information.
 */

import { describe, it, expect } from 'vitest';
import { handleA2ASubscribe, A2ASubscribeInputSchema } from '../a2a-subscribe.js';

describe('a2a-subscribe MCP Tool', () => {
  describe('Input Validation', () => {
    it('should accept no parameters', () => {
      const result = A2ASubscribeInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept status filter', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        status: 'pending',
      });
      expect(result.success).toBe(true);
    });

    it('should accept platform filter', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        platform: 'claude-code',
      });
      expect(result.success).toBe(true);
    });

    it('should accept skills filter', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        skills: ['typescript', 'testing'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept types filter', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        types: ['task.created', 'task.claimed'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept all filter parameters', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        status: 'pending',
        platform: 'claude-code',
        skills: ['typescript', 'testing'],
        types: ['task.created', 'task.claimed'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        status: 'invalid-status',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid event types', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        types: ['invalid.type'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject skills array exceeding max items', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        skills: Array(21).fill('skill'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject types array exceeding max items', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        types: Array(11).fill('task.created'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject platform exceeding max length', () => {
      const result = A2ASubscribeInputSchema.safeParse({
        platform: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handleA2ASubscribe', () => {
    it('should return SSE endpoint URL without filters', () => {
      const result = handleA2ASubscribe({});
      const text = result.content[0].text;

      expect(text).toContain('/a2a/events');
      expect(text).toContain('curl');
    });

    it('should include query params for status filter', () => {
      const result = handleA2ASubscribe({ status: 'pending' });
      const text = result.content[0].text;

      expect(text).toContain('status=pending');
    });

    it('should include query params for platform filter', () => {
      const result = handleA2ASubscribe({ platform: 'claude-code' });
      const text = result.content[0].text;

      expect(text).toContain('platform=claude-code');
    });

    it('should include query params for skills filter', () => {
      const result = handleA2ASubscribe({ skills: ['typescript', 'testing'] });
      const text = result.content[0].text;

      expect(text).toContain('skills=typescript,testing');
    });

    it('should include query params for types filter', () => {
      const result = handleA2ASubscribe({ types: ['task.created', 'task.claimed'] });
      const text = result.content[0].text;

      expect(text).toContain('types=task.created,task.claimed');
    });

    it('should combine multiple filters', () => {
      const result = handleA2ASubscribe({
        status: 'pending',
        skills: ['typescript'],
      });
      const text = result.content[0].text;

      expect(text).toContain('status=pending');
      expect(text).toContain('skills=typescript');
    });

    it('should include reconnection header info', () => {
      const result = handleA2ASubscribe({});
      const text = result.content[0].text;

      expect(text).toContain('Last-Event-ID');
    });

    it('should list available event types', () => {
      const result = handleA2ASubscribe({});
      const text = result.content[0].text;

      expect(text).toContain('task.created');
      expect(text).toContain('task.claimed');
      expect(text).toContain('task.cancelled');
      expect(text).toContain('agent.registered');
    });

    it('should return proper MCP tool result structure', () => {
      const result = handleA2ASubscribe({});

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should include usage instructions', () => {
      const result = handleA2ASubscribe({});
      const text = result.content[0].text;

      expect(text).toContain('localhost:3000');
      expect(text).toContain('Endpoint');
    });

    it('should document available filters', () => {
      const result = handleA2ASubscribe({});
      const text = result.content[0].text;

      expect(text).toContain('status');
      expect(text).toContain('platform');
      expect(text).toContain('skills');
      expect(text).toContain('types');
    });
  });
});
