import { describe, it, expect } from 'vitest';
import type { TaskState } from '../../../src/a2a/types/index.js';
import { isValidStateTransition, isTerminalState, VALID_STATE_TRANSITIONS } from '../../../src/a2a/types/index.js';

describe('Task State Machine', () => {
  describe('Valid transitions', () => {
    it('should allow SUBMITTED → WORKING', () => {
      expect(isValidStateTransition('SUBMITTED', 'WORKING')).toBe(true);
    });

    it('should allow WORKING → COMPLETED', () => {
      expect(isValidStateTransition('WORKING', 'COMPLETED')).toBe(true);
    });

    it('should allow WORKING → FAILED', () => {
      expect(isValidStateTransition('WORKING', 'FAILED')).toBe(true);
    });

    it('should allow WORKING → TIMEOUT', () => {
      expect(isValidStateTransition('WORKING', 'TIMEOUT')).toBe(true);
    });

    it('should allow SUBMITTED → CANCELED', () => {
      expect(isValidStateTransition('SUBMITTED', 'CANCELED')).toBe(true);
    });

    it('should allow WORKING → CANCELED', () => {
      expect(isValidStateTransition('WORKING', 'CANCELED')).toBe(true);
    });

    it('should allow SUBMITTED → REJECTED', () => {
      expect(isValidStateTransition('SUBMITTED', 'REJECTED')).toBe(true);
    });

    it('should allow WORKING → INPUT_REQUIRED', () => {
      expect(isValidStateTransition('WORKING', 'INPUT_REQUIRED')).toBe(true);
    });

    it('should allow INPUT_REQUIRED → WORKING', () => {
      expect(isValidStateTransition('INPUT_REQUIRED', 'WORKING')).toBe(true);
    });

    it('should allow INPUT_REQUIRED → CANCELED', () => {
      expect(isValidStateTransition('INPUT_REQUIRED', 'CANCELED')).toBe(true);
    });
  });

  describe('Invalid transitions', () => {
    it('should not allow SUBMITTED → COMPLETED (must go through WORKING)', () => {
      expect(isValidStateTransition('SUBMITTED', 'COMPLETED')).toBe(false);
    });

    it('should not allow SUBMITTED → FAILED (must go through WORKING)', () => {
      expect(isValidStateTransition('SUBMITTED', 'FAILED')).toBe(false);
    });

    it('should not allow COMPLETED → any state (terminal)', () => {
      expect(isValidStateTransition('COMPLETED', 'WORKING')).toBe(false);
      expect(isValidStateTransition('COMPLETED', 'FAILED')).toBe(false);
      expect(isValidStateTransition('COMPLETED', 'SUBMITTED')).toBe(false);
    });

    it('should not allow FAILED → any state (terminal)', () => {
      expect(isValidStateTransition('FAILED', 'COMPLETED')).toBe(false);
      expect(isValidStateTransition('FAILED', 'WORKING')).toBe(false);
      expect(isValidStateTransition('FAILED', 'SUBMITTED')).toBe(false);
    });

    it('should not allow TIMEOUT → any state (terminal)', () => {
      expect(isValidStateTransition('TIMEOUT', 'COMPLETED')).toBe(false);
      expect(isValidStateTransition('TIMEOUT', 'WORKING')).toBe(false);
    });

    it('should not allow CANCELED → any state (terminal)', () => {
      expect(isValidStateTransition('CANCELED', 'WORKING')).toBe(false);
      expect(isValidStateTransition('CANCELED', 'COMPLETED')).toBe(false);
    });

    it('should not allow REJECTED → any state (terminal)', () => {
      expect(isValidStateTransition('REJECTED', 'WORKING')).toBe(false);
      expect(isValidStateTransition('REJECTED', 'COMPLETED')).toBe(false);
    });
  });

  describe('Terminal states', () => {
    it('should identify COMPLETED as terminal', () => {
      expect(isTerminalState('COMPLETED')).toBe(true);
    });

    it('should identify FAILED as terminal', () => {
      expect(isTerminalState('FAILED')).toBe(true);
    });

    it('should identify TIMEOUT as terminal', () => {
      expect(isTerminalState('TIMEOUT')).toBe(true);
    });

    it('should identify CANCELED as terminal', () => {
      expect(isTerminalState('CANCELED')).toBe(true);
    });

    it('should identify REJECTED as terminal', () => {
      expect(isTerminalState('REJECTED')).toBe(true);
    });

    it('should not identify SUBMITTED as terminal', () => {
      expect(isTerminalState('SUBMITTED')).toBe(false);
    });

    it('should not identify WORKING as terminal', () => {
      expect(isTerminalState('WORKING')).toBe(false);
    });

    it('should not identify INPUT_REQUIRED as terminal', () => {
      expect(isTerminalState('INPUT_REQUIRED')).toBe(false);
    });
  });

  describe('State transition map completeness', () => {
    it('should have transition rules for all states', () => {
      const allStates: TaskState[] = [
        'SUBMITTED',
        'WORKING',
        'INPUT_REQUIRED',
        'COMPLETED',
        'FAILED',
        'CANCELED',
        'REJECTED',
        'TIMEOUT',
      ];

      for (const state of allStates) {
        expect(VALID_STATE_TRANSITIONS).toHaveProperty(state);
        expect(Array.isArray(VALID_STATE_TRANSITIONS[state])).toBe(true);
      }
    });
  });
});
