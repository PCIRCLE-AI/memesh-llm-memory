/**
 * HumanInLoopUI Test
 *
 * Tests for human-in-the-loop confirmation UI formatting
 */

import { describe, it, expect } from 'vitest';
import { HumanInLoopUI, type ConfirmationRequest, type ConfirmationResponse } from '../../src/mcp/HumanInLoopUI.js';

describe('HumanInLoopUI', () => {
  describe('formatConfirmationRequest', () => {
    it('should format confirmation request with recommendation', () => {
      const ui = new HumanInLoopUI();

      const request: ConfirmationRequest = {
        taskDescription: 'Review this code for security vulnerabilities',
        recommendedAgent: 'code-reviewer',
        confidence: 0.85,
        reasoning: [
          'Task involves code review',
          'Security focus detected',
          'Code-reviewer specializes in security analysis',
        ],
        alternatives: [
          { agent: 'security-auditor', confidence: 0.72, reason: 'Specialized in security' },
          { agent: 'debugger', confidence: 0.45, reason: 'Can identify issues' },
        ],
      };

      const formatted = ui.formatConfirmationRequest(request);

      // Should contain recommendation
      expect(formatted).toContain('code-reviewer');
      expect(formatted).toContain('85%');

      // Should contain reasoning
      expect(formatted).toContain('code review');
      expect(formatted).toContain('security');

      // Should contain alternatives
      expect(formatted).toContain('security-auditor');
      expect(formatted).toContain('72%');

      // Should contain clear prompt
      expect(formatted).toContain('[y/n');
      expect(formatted).toMatch(/\[y\/n\/[0-9]-[0-9]\]/);
    });

    it('should format minimal request without alternatives', () => {
      const ui = new HumanInLoopUI();

      const request: ConfirmationRequest = {
        taskDescription: 'Simple task',
        recommendedAgent: 'general-agent',
        confidence: 0.95,
        reasoning: ['General purpose task'],
        alternatives: [],
      };

      const formatted = ui.formatConfirmationRequest(request);

      expect(formatted).toContain('general-agent');
      expect(formatted).toContain('95%');
      expect(formatted).toContain('General purpose task');
      expect(formatted).toContain('[y/n]');
    });
  });

  describe('parseUserResponse', () => {
    const request: ConfirmationRequest = {
      taskDescription: 'Test task',
      recommendedAgent: 'code-reviewer',
      confidence: 0.8,
      reasoning: ['Test reason'],
      alternatives: [
        { agent: 'security-auditor', confidence: 0.7, reason: 'Alternative 1' },
        { agent: 'debugger', confidence: 0.5, reason: 'Alternative 2' },
      ],
    };

    it('should parse "y" as accept recommendation', () => {
      const ui = new HumanInLoopUI();

      const response = ui.parseUserResponse('y', request);

      expect(response.accepted).toBe(true);
      expect(response.selectedAgent).toBe('code-reviewer');
      expect(response.wasOverridden).toBe(false);
    });

    it('should parse "n" as reject recommendation', () => {
      const ui = new HumanInLoopUI();

      const response = ui.parseUserResponse('n', request);

      expect(response.accepted).toBe(false);
      expect(response.selectedAgent).toBeUndefined();
      expect(response.wasOverridden).toBe(false);
    });

    it('should parse "1" as select first alternative', () => {
      const ui = new HumanInLoopUI();

      const response = ui.parseUserResponse('1', request);

      expect(response.accepted).toBe(true);
      expect(response.selectedAgent).toBe('security-auditor');
      expect(response.wasOverridden).toBe(true);
    });

    it('should parse "2" as select second alternative', () => {
      const ui = new HumanInLoopUI();

      const response = ui.parseUserResponse('2', request);

      expect(response.accepted).toBe(true);
      expect(response.selectedAgent).toBe('debugger');
      expect(response.wasOverridden).toBe(true);
    });

    it('should handle invalid input gracefully', () => {
      const ui = new HumanInLoopUI();

      const response = ui.parseUserResponse('invalid', request);

      expect(response.accepted).toBe(false);
      expect(response.selectedAgent).toBeUndefined();
    });

    it('should return properly typed ConfirmationResponse', () => {
      const ui = new HumanInLoopUI();

      const response: ConfirmationResponse = ui.parseUserResponse('y', request);

      // Verify the response conforms to ConfirmationResponse type
      expect(typeof response.accepted).toBe('boolean');
      expect('wasOverridden' in response).toBe(true);
      // selectedAgent is optional, so just verify the property exists or is undefined
      expect(response.selectedAgent === undefined || typeof response.selectedAgent === 'string').toBe(true);
    });
  });
});
