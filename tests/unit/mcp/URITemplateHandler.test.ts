// tests/unit/mcp/URITemplateHandler.test.ts
import { describe, it, expect } from 'vitest';
import { URITemplateHandler } from '../../../src/mcp/resources/URITemplateHandler';

describe('URITemplateHandler', () => {
  const handler = new URITemplateHandler();

  describe('Basic functionality', () => {
    it('should parse URI template parameters', () => {
      const result = handler.parseTemplate(
        'ccb://agent/{agentType}/status',
        'ccb://agent/code-reviewer/status'
      );
      expect(result).toEqual({ agentType: 'code-reviewer' });
    });

    it('should return null for non-matching URIs', () => {
      const result = handler.parseTemplate(
        'ccb://agent/{agentType}/status',
        'ccb://task/123/logs'
      );
      expect(result).toBeNull();
    });
  });

  describe('Multiple parameters', () => {
    it('should parse multiple parameters', () => {
      const result = handler.parseTemplate(
        'ccb://agent/{type}/{id}/status',
        'ccb://agent/code-reviewer/123/status'
      );
      expect(result).toEqual({ type: 'code-reviewer', id: '123' });
    });

    it('should parse parameters at different positions', () => {
      const result = handler.parseTemplate(
        'ccb://{protocol}/agent/{type}',
        'ccb://https/agent/debugger'
      );
      expect(result).toEqual({ protocol: 'https', type: 'debugger' });
    });
  });

  describe('Input validation', () => {
    it('should return null for empty template', () => {
      const result = handler.parseTemplate('', 'ccb://agent/status');
      expect(result).toBeNull();
    });

    it('should return null for empty URI', () => {
      const result = handler.parseTemplate('ccb://agent/{type}', '');
      expect(result).toBeNull();
    });

    it('should return null for null template', () => {
      const result = handler.parseTemplate(null as any, 'ccb://agent/status');
      expect(result).toBeNull();
    });

    it('should return null for null URI', () => {
      const result = handler.parseTemplate('ccb://agent/{type}', null as any);
      expect(result).toBeNull();
    });

    it('should return null for undefined template', () => {
      const result = handler.parseTemplate(undefined as any, 'ccb://agent/status');
      expect(result).toBeNull();
    });

    it('should return null for undefined URI', () => {
      const result = handler.parseTemplate('ccb://agent/{type}', undefined as any);
      expect(result).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle malformed template (unclosed brace)', () => {
      const result = handler.parseTemplate('ccb://agent/{type', 'ccb://agent/test');
      expect(result).toBeNull();
    });

    it('should handle malformed template (unopened brace)', () => {
      const result = handler.parseTemplate('ccb://agent/type}', 'ccb://agent/test');
      expect(result).toBeNull();
    });

    it('should handle template with invalid regex characters', () => {
      const result = handler.parseTemplate('ccb://agent/[{type}]', 'ccb://agent/[test]');
      expect(result).toEqual({ type: 'test' });
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in parameter value', () => {
      const result = handler.parseTemplate(
        'ccb://agent/{type}',
        'ccb://agent/code-reviewer@v1'
      );
      expect(result).toEqual({ type: 'code-reviewer@v1' });
    });

    it('should handle no parameters (static URI)', () => {
      const result = handler.parseTemplate(
        'ccb://agent/status',
        'ccb://agent/status'
      );
      expect(result).toEqual({});
    });

    it('should handle parameter at start', () => {
      const result = handler.parseTemplate(
        'ccb://{protocol}/agent',
        'ccb://https/agent'
      );
      expect(result).toEqual({ protocol: 'https' });
    });

    it('should handle parameter at end', () => {
      const result = handler.parseTemplate(
        'ccb://agent/{type}',
        'ccb://agent/debugger'
      );
      expect(result).toEqual({ type: 'debugger' });
    });

    it('should handle dashes and underscores in parameter values', () => {
      const result = handler.parseTemplate(
        'ccb://agent/{type}',
        'ccb://agent/code-reviewer_v2'
      );
      expect(result).toEqual({ type: 'code-reviewer_v2' });
    });

    it('should handle numeric parameter values', () => {
      const result = handler.parseTemplate(
        'ccb://task/{id}',
        'ccb://task/12345'
      );
      expect(result).toEqual({ id: '12345' });
    });
  });

  describe('matches() method', () => {
    it('should return true for matching URIs', () => {
      const result = handler.matches(
        'ccb://agent/{type}/status',
        'ccb://agent/code-reviewer/status'
      );
      expect(result).toBe(true);
    });

    it('should return false for non-matching URIs', () => {
      const result = handler.matches(
        'ccb://agent/{type}/status',
        'ccb://task/123/logs'
      );
      expect(result).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      const result = handler.matches('', '');
      expect(result).toBe(false);
    });
  });
});
