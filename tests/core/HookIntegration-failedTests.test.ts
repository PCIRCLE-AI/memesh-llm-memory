/**
 * Test suite for HookIntegration failedTests extraction and recording
 *
 * Verifies that parsed failure details are actually recorded to memory,
 * not just parsed and discarded.
 *
 * This test validates the fix for Code Review Issue #1 (CRITICAL):
 * "Incomplete Feature Implementation - Test Failure Extraction"
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HookIntegration } from '../../src/core/HookIntegration.js';
import { CheckpointDetector } from '../../src/core/CheckpointDetector.js';
import { DevelopmentButler } from '../../src/agents/DevelopmentButler.js';
import type { MCPToolInterface } from '../../src/core/MCPToolInterface.js';

describe('HookIntegration - Failed Tests Recording', () => {
  let hooks: HookIntegration;
  let mockMcp: MCPToolInterface;
  let recordTestResultSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock MCP interface
    recordTestResultSpy = vi.fn().mockResolvedValue(undefined);

    mockMcp = {
      memory: {
        createEntities: vi.fn().mockResolvedValue(undefined),
        searchNodes: vi.fn().mockResolvedValue([]),
      },
      supportsMemory: () => true,
    } as any;

    const detector = new CheckpointDetector();
    const butler = new DevelopmentButler(detector, mockMcp);
    hooks = new HookIntegration(detector, butler);

    // Initialize project memory and mock the test result hook
    hooks.initializeProjectMemory(mockMcp);

    // Mock ProjectAutoTracker's createTestResultHook to spy on calls
    const projectMemory = (hooks as any).projectMemory;
    if (projectMemory) {
      vi.spyOn(projectMemory, 'createTestResultHook').mockReturnValue(recordTestResultSpy);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Vitest failures recording', () => {
    it('should extract and record failed test details from Vitest output', async () => {
      const vitestOutput = `
 FAIL  src/api/users.test.ts > User API > should validate email
AssertionError: expected false to be true

 FAIL  src/api/users.test.ts > Authentication > should reject invalid password
Error: Password validation failed

Test Files  1 failed | 1 passed (2)
     Tests  2 failed | 6 passed (8)
`;

      await hooks.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'npm test' },
        success: true,
        output: vitestOutput,
      });

      // Verify recordTestResult was called
      expect(recordTestResultSpy).toHaveBeenCalledTimes(1);

      // Verify the failures array was populated (not empty!)
      const callArgs = recordTestResultSpy.mock.calls[0][0];
      expect(callArgs.failures).toBeDefined();
      expect(callArgs.failures.length).toBeGreaterThan(0);

      // Verify failure details were extracted correctly
      // Format: "file: testName - error"
      const failuresStr = callArgs.failures.join('\n');
      expect(failuresStr).toContain('User API > should validate email');
      expect(failuresStr).toContain('Authentication > should reject invalid password');
    });
  });

  describe('Jest failures recording', () => {
    it('should extract and record failed test details from Jest output', async () => {
      const jestOutput = `
FAIL  src/components/Button.test.tsx
  ● Button Component › should render with correct props

    expect(received).toBe(expected)

FAIL  src/utils/helpers.test.ts
  ● Helper Functions › should format date correctly

    TypeError: Cannot read property 'format' of undefined

Test Suites: 2 failed, 3 passed, 5 total
Tests:       2 failed, 15 passed, 17 total
`;

      await hooks.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'npm test' },
        success: true,
        output: jestOutput,
      });

      // Verify failures were recorded
      expect(recordTestResultSpy).toHaveBeenCalledTimes(1);

      const callArgs = recordTestResultSpy.mock.calls[0][0];
      expect(callArgs.failures).toBeDefined();
      expect(callArgs.failures.length).toBe(2);

      // Verify file paths and test names are included
      const failuresStr = callArgs.failures.join('\n');
      expect(failuresStr).toContain('Button Component');
      expect(failuresStr).toContain('Helper Functions');
    });
  });

  describe('Mocha failures recording', () => {
    it('should extract and record failed test details from Mocha output', async () => {
      const mochaOutput = `
  15 passing (342ms)
  2 failing

  1) User Service
     should create new user:
     AssertionError: expected 201 to equal 200

  2) Database Connection should handle connection errors:
     Error: Connection timeout
`;

      await hooks.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'npm test' },
        success: true,
        output: mochaOutput,
      });

      // Verify failures were recorded
      expect(recordTestResultSpy).toHaveBeenCalledTimes(1);

      const callArgs = recordTestResultSpy.mock.calls[0][0];
      expect(callArgs.failures).toBeDefined();
      expect(callArgs.failures.length).toBeGreaterThan(0);

      // Verify test names are included
      const failuresStr = callArgs.failures.join('\n');
      expect(failuresStr).toContain('User Service');
      expect(failuresStr).toContain('Database Connection');
    });
  });

  describe('No failures scenario', () => {
    it('should record empty failures array when all tests pass', async () => {
      const passingOutput = `
Test Files  3 passed (3)
     Tests  25 passed (25)
`;

      await hooks.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'npm test' },
        success: true,
        output: passingOutput,
      });

      // Verify was called with empty failures
      expect(recordTestResultSpy).toHaveBeenCalledTimes(1);

      const callArgs = recordTestResultSpy.mock.calls[0][0];
      expect(callArgs.failures).toEqual([]);
      expect(callArgs.failed).toBe(0);
      expect(callArgs.passed).toBe(25);
    });
  });

  describe('Invalid data handling', () => {
    it('should handle malformed test output gracefully', async () => {
      const malformedOutput = `
Some random output
that doesn't match
any test framework pattern
`;

      await hooks.processToolUse({
        toolName: 'Bash',
        arguments: { command: 'npm test' },
        success: true,
        output: malformedOutput,
      });

      // Should still be called (with zero counts and empty failures)
      expect(recordTestResultSpy).toHaveBeenCalledTimes(1);

      const callArgs = recordTestResultSpy.mock.calls[0][0];
      expect(callArgs.total).toBe(0);
      expect(callArgs.passed).toBe(0);
      expect(callArgs.failed).toBe(0);
      expect(callArgs.failures).toEqual([]);
    });
  });
});
