import { describe, it, expect, beforeEach } from 'vitest';
import { GraduatedAutonomyPolicy, AutomationLevel } from '../../../../src/agents/e2e-healing/policy/GraduatedAutonomyPolicy.js';

describe('GraduatedAutonomyPolicy', () => {
  let policy: GraduatedAutonomyPolicy;

  beforeEach(() => {
    policy = new GraduatedAutonomyPolicy();
  });

  it('should start at SUGGEST_ONLY level', () => {
    const level = policy.getCurrentLevel();
    expect(level).toBe(AutomationLevel.SUGGEST_ONLY);
  });

  it('should upgrade to AUTO_DEV after meeting criteria', () => {
    // Simulate 10 successful fixes with 95% approval rate
    for (let i = 0; i < 10; i++) {
      policy.recordFix({
        success: true,
        humanApproved: true,
        environment: 'dev',
      });
    }

    const canGraduate = policy.canGraduateToNextLevel();
    expect(canGraduate).toBe(true);

    policy.graduateToNextLevel();
    expect(policy.getCurrentLevel()).toBe(AutomationLevel.AUTO_DEV);
  });

  it('should require more fixes for AUTO_STAGING', () => {
    // Graduate to AUTO_DEV first
    for (let i = 0; i < 10; i++) {
      policy.recordFix({
        success: true,
        humanApproved: true,
        environment: 'dev',
      });
    }
    policy.graduateToNextLevel();

    // Now try to graduate to AUTO_STAGING (requires 50 fixes)
    for (let i = 0; i < 40; i++) {
      policy.recordFix({
        success: true,
        humanApproved: true,
        environment: 'dev',
      });
    }

    const canGraduate = policy.canGraduateToNextLevel();
    expect(canGraduate).toBe(true);

    policy.graduateToNextLevel();
    expect(policy.getCurrentLevel()).toBe(AutomationLevel.AUTO_STAGING);
  });

  it('should check environment permission', () => {
    // At SUGGEST_ONLY level
    expect(policy.isAllowedInEnvironment('dev')).toBe(false); // Only suggest
    expect(policy.isAllowedInEnvironment('staging')).toBe(false);
    expect(policy.isAllowedInEnvironment('production')).toBe(false);

    // Graduate to AUTO_DEV
    for (let i = 0; i < 10; i++) {
      policy.recordFix({
        success: true,
        humanApproved: true,
        environment: 'dev',
      });
    }
    policy.graduateToNextLevel();

    expect(policy.isAllowedInEnvironment('dev')).toBe(true); // Can auto-apply
    expect(policy.isAllowedInEnvironment('staging')).toBe(false); // Still suggest
    expect(policy.isAllowedInEnvironment('production')).toBe(false);
  });

  it('should degrade level after rollbacks', () => {
    // Graduate to AUTO_DEV
    for (let i = 0; i < 10; i++) {
      policy.recordFix({
        success: true,
        humanApproved: true,
        environment: 'dev',
      });
    }
    policy.graduateToNextLevel();
    expect(policy.getCurrentLevel()).toBe(AutomationLevel.AUTO_DEV);

    // Record 2 rollbacks (exceeds maxRollbacks: 1 for AUTO_DEV)
    policy.recordRollback('dev');
    policy.recordRollback('dev');

    // Should auto-degrade back to SUGGEST_ONLY
    expect(policy.getCurrentLevel()).toBe(AutomationLevel.SUGGEST_ONLY);
  });
});
