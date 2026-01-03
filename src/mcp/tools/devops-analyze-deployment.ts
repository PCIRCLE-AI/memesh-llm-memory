/**
 * MCP Tool: devops-analyze-deployment
 *
 * Analyzes deployment readiness by running tests, build, and checking git status.
 * Provides a comprehensive pre-deployment checklist with blockers identified.
 */

import type { DevOpsEngineerAgent } from '../../agents/DevOpsEngineerAgent.js';

export interface AnalyzeDeploymentArgs {
  /** Optional custom test command (default: 'npm test') */
  testCommand?: string;
  /** Optional custom build command (default: 'npm run build') */
  buildCommand?: string;
}

/**
 * MCP Tool definition for analyzing deployment readiness
 */
export const analyzeDeploymentTool = {
  name: 'devops-analyze-deployment',
  description: 'Analyze deployment readiness by running tests, build, and checking git status. Identifies blockers and provides a go/no-go decision for deployment.',

  inputSchema: {
    type: 'object' as const,
    properties: {
      testCommand: {
        type: 'string',
        description: 'Custom test command to run (default: "npm test")',
      },
      buildCommand: {
        type: 'string',
        description: 'Custom build command to run (default: "npm run build")',
      },
    },
  },

  /**
   * Handler for devops-analyze-deployment tool
   *
   * @param args - Tool arguments
   * @param devopsEngineer - DevOpsEngineerAgent instance
   * @returns Deployment readiness analysis
   */
  async handler(
    args: AnalyzeDeploymentArgs,
    devopsEngineer: DevOpsEngineerAgent
  ) {
    try {
      const analysis = await devopsEngineer.analyzeDeploymentReadiness({
        testCommand: args.testCommand,
        buildCommand: args.buildCommand,
      });

      // Format the response
      const statusEmoji = analysis.readyToDeploy ? '✅' : '❌';
      const decision = analysis.readyToDeploy ? 'READY TO DEPLOY' : 'NOT READY - BLOCKERS FOUND';

      return {
        success: true,
        decision,
        readyToDeploy: analysis.readyToDeploy,
        checks: {
          testsPass: analysis.testsPass ? '✅ Tests passing' : '❌ Tests failing',
          buildSuccessful: analysis.buildSuccessful ? '✅ Build successful' : '❌ Build failed',
          noUncommittedChanges: analysis.noUncommittedChanges ? '✅ No uncommitted changes' : '⚠️ Uncommitted changes found',
        },
        blockers: analysis.blockers.length > 0 ? analysis.blockers : undefined,
        summary: `
${statusEmoji} Deployment Status: ${decision}

Pre-Deployment Checklist:
${analysis.testsPass ? '✅' : '❌'} Tests: ${analysis.testsPass ? 'Passing' : 'FAILING'}
${analysis.buildSuccessful ? '✅' : '❌'} Build: ${analysis.buildSuccessful ? 'Successful' : 'FAILED'}
${analysis.noUncommittedChanges ? '✅' : '⚠️'} Git Status: ${analysis.noUncommittedChanges ? 'Clean' : 'Uncommitted changes'}

${analysis.blockers.length > 0 ? `
🚫 Blockers:
${analysis.blockers.map(b => `  - ${b}`).join('\n')}

Fix these issues before deploying.
` : '✅ All checks passed. Ready to deploy!'}
`.trim(),
      };
    } catch (error) {
      return {
        success: false,
        readyToDeploy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
