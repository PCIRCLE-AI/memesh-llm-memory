/**
 * Analyze Deployment Tool
 *
 * Analyzes deployment readiness by running tests, build, and checking git status.
 */

import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const analyzeDeploymentTool = {
  name: 'devops_analyze_deployment',
  description:
    '🔍 DevOps: Analyze deployment readiness by running tests, build checks, and git status verification. ' +
    'Ensures the project is in a deployable state before pushing to production.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      testCommand: {
        type: 'string' as const,
        description: 'Command to run tests (default: "npm test")',
      },
      buildCommand: {
        type: 'string' as const,
        description: 'Command to build the project (default: "npm run build")',
      },
    },
  },

  handler: async (
    input: {
      testCommand?: string;
      buildCommand?: string;
    },
    devopsEngineer?: any
  ): Promise<{
    success: boolean;
    ready: boolean;
    summary: string;
    checks: {
      git: { clean: boolean; branch: string };
      tests: { passed: boolean; output?: string };
      build: { passed: boolean; output?: string };
    };
    issues: string[];
    error?: string;
  }> => {
    const testCmd = input.testCommand || 'npm test';
    const buildCmd = input.buildCommand || 'npm run build';
    const issues: string[] = [];

    // Check git status
    let gitClean = false;
    let gitBranch = 'unknown';
    try {
      const { stdout: statusOutput } = await execAsync('git status --porcelain');
      gitClean = statusOutput.trim() === '';

      const { stdout: branchOutput } = await execAsync(
        'git rev-parse --abbrev-ref HEAD'
      );
      gitBranch = branchOutput.trim();

      if (!gitClean) {
        issues.push('Git working directory has uncommitted changes');
      }
    } catch (error) {
      issues.push('Failed to check git status');
    }

    // Run tests
    let testsPassed = false;
    let testOutput = '';
    try {
      const { stdout } = await execAsync(testCmd);
      testsPassed = true;
      testOutput = stdout;
    } catch (error: any) {
      testOutput = error.stdout || error.message;
      issues.push('Tests failed');
    }

    // Run build
    let buildPassed = false;
    let buildOutput = '';
    try {
      const { stdout } = await execAsync(buildCmd);
      buildPassed = true;
      buildOutput = stdout;
    } catch (error: any) {
      buildOutput = error.stdout || error.message;
      issues.push('Build failed');
    }

    const ready = gitClean && testsPassed && buildPassed;

    // Generate summary
    const statusIcon = ready ? '✅' : '❌';
    const summary = `${statusIcon} Deployment Readiness: ${ready ? 'READY' : 'NOT READY'}

Git Status: ${gitClean ? '✅ Clean' : '❌ Uncommitted changes'} (branch: ${gitBranch})
Tests: ${testsPassed ? '✅ Passed' : '❌ Failed'}
Build: ${buildPassed ? '✅ Passed' : '❌ Failed'}

${issues.length > 0 ? `Issues:\n${issues.map(i => `  - ${i}`).join('\n')}` : 'No issues found'}`;

    return {
      success: true,
      ready,
      summary,
      checks: {
        git: { clean: gitClean, branch: gitBranch },
        tests: { passed: testsPassed, output: testOutput },
        build: { passed: buildPassed, output: buildOutput },
      },
      issues,
    };
  },
};
