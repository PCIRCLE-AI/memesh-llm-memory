#!/usr/bin/env node

/**
 * Hook Tests — Validates hook behavior without Claude Code runtime.
 *
 * Run: node scripts/hooks/__tests__/hooks.test.js
 */

import { runHook, assertHookResponse, assertSilent, runTests } from './hook-test-harness.js';

// ============================================================================
// PreToolUse Tests
// ============================================================================

const preToolUseTests = [
  {
    name: 'Git commit without review triggers reminder or silent exit',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "test commit"' },
      });
      // Should produce JSON output with review reminder
      // OR exit silently if codeReviewDone=true from prior test
      if (result.parsed) {
        return assertHookResponse(result, 'PreToolUse');
      }
      // Silent exit is acceptable (review already done or no session file)
      return assertSilent(result);
    },
  },
  {
    name: 'Non-git-commit Bash exits silently',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
      });
      return assertSilent(result);
    },
  },
  {
    name: 'Non-Bash tool exits silently',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Read',
        tool_input: { file_path: '/tmp/test.js' },
      });
      return assertSilent(result);
    },
  },
  {
    name: 'Git amend exits silently',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Bash',
        tool_input: { command: 'git commit --amend -m "fix"' },
      });
      return assertSilent(result);
    },
  },
  {
    name: 'Empty stdin exits without error',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', '');
      return result.exitCode === 0;
    },
  },
];

// ============================================================================
// PreToolUse — Smart Router Tests (1B)
// ============================================================================

const smartRouterTests = [
  {
    name: 'Task(Explore) gets model routing or silent exit',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Task',
        tool_input: { subagent_type: 'Explore', prompt: 'find auth code' },
      });
      // Either: hook produces routing output with haiku, or exits silently (no config)
      if (!result.parsed) {
        return assertSilent(result); // No output = no config, valid
      }
      const output = result.parsed?.hookSpecificOutput;
      if (!output) return false; // Parsed but no hookSpecificOutput = malformed
      // If routing was applied, model should be haiku
      if (output.updatedInput?.model) {
        return output.updatedInput.model === 'haiku';
      }
      // Output present but no model routing = other handler fired, OK
      return true;
    },
  },
  {
    name: 'Task with explicit model preserves user choice',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Task',
        tool_input: { subagent_type: 'Explore', model: 'opus', prompt: 'deep analysis' },
      });
      // Should NOT override user's explicit model
      if (result.parsed?.hookSpecificOutput?.updatedInput?.model) {
        // Any model override when user specified 'opus' is wrong
        return false;
      }
      // No model override = correct behavior
      return true;
    },
  },
  {
    name: 'Task(Plan) gets planning template injected',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Task',
        tool_input: { subagent_type: 'Plan', prompt: 'plan the auth refactor' },
      });
      if (!result.parsed) {
        // No output = template file not found. Acceptable but log it.
        return assertSilent(result);
      }
      const output = result.parsed?.hookSpecificOutput;
      if (!output) return false; // Parsed but no hookSpecificOutput = malformed
      // Prompt should contain original + template content
      if (output.updatedInput?.prompt) {
        const prompt = output.updatedInput.prompt;
        // Must contain original prompt AND some template content
        return prompt.includes('plan the auth refactor') &&
               (prompt.includes('Required Plan Sections') || prompt.includes('---'));
      }
      // No prompt modification = handler didn't fire, unexpected
      return false;
    },
  },
  {
    name: 'EnterPlanMode gets context with template reference',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'EnterPlanMode',
        tool_input: {},
      });
      if (!result.parsed) {
        // No output = template file not found. Acceptable.
        return assertSilent(result);
      }
      const output = result.parsed?.hookSpecificOutput;
      if (!output) return false; // Parsed but no hookSpecificOutput = malformed
      if (output.additionalContext) {
        return output.additionalContext.includes('PLANNING MODE');
      }
      // hookSpecificOutput without additionalContext = wrong handler response
      return false;
    },
  },
  {
    name: 'Non-Task tool is not affected by routing',
    fn: async () => {
      const result = await runHook('pre-tool-use.js', {
        tool_name: 'Grep',
        tool_input: { pattern: 'test', path: '/tmp' },
      });
      return assertSilent(result);
    },
  },
];

// ============================================================================
// PostToolUse Tests
// ============================================================================

const postToolUseTests = [
  {
    name: 'Read tool exits silently',
    fn: async () => {
      const result = await runHook('post-tool-use.js', {
        tool_name: 'Read',
        tool_input: { file_path: '/tmp/test.js' },
        success: true,
      });
      return assertSilent(result);
    },
  },
  {
    name: 'Bash tool exits silently',
    fn: async () => {
      const result = await runHook('post-tool-use.js', {
        tool_name: 'Bash',
        tool_input: { command: 'echo hello' },
        success: true,
      });
      return assertSilent(result);
    },
  },
  {
    name: 'Empty stdin exits without error',
    fn: async () => {
      const result = await runHook('post-tool-use.js', '');
      return result.exitCode === 0;
    },
  },
];

// ============================================================================
// PostCommit Tests
// ============================================================================

const postCommitTests = [
  {
    name: 'Non-git-commit exits silently',
    fn: async () => {
      const result = await runHook('post-commit.js', {
        tool_name: 'Read',
        tool_input: { file_path: '/tmp/test.js' },
        success: true,
      });
      return assertSilent(result);
    },
  },
  {
    name: 'Failed command exits silently',
    fn: async () => {
      const result = await runHook('post-commit.js', {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "test"' },
        success: false,
      });
      return assertSilent(result);
    },
  },
];

// ============================================================================
// Run All Tests
// ============================================================================

async function main() {
  console.log('\n🧪 Hook Test Suite\n');

  let totalPassed = 0;
  let totalFailed = 0;

  const suites = [
    { name: 'PreToolUse Hook (Code Review)', tests: preToolUseTests },
    { name: 'PreToolUse Hook (Smart Router)', tests: smartRouterTests },
    { name: 'PostToolUse Hook', tests: postToolUseTests },
    { name: 'PostCommit Hook', tests: postCommitTests },
  ];

  for (const suite of suites) {
    const { passed, failed } = await runTests(suite.name, suite.tests);
    totalPassed += passed;
    totalFailed += failed;
  }

  console.log('═'.repeat(55));
  console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('═'.repeat(55));

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
