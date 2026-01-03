/**
 * MCP Tool: workflow-list
 *
 * List all workflows from both Google Opal and n8n platforms.
 */

import type { WorkflowOrchestrator } from '../../agents/WorkflowOrchestrator.js';

export interface ListWorkflowsArgs {
  /** Optional: Filter by platform ('opal', 'n8n', or 'all' for both) */
  platform?: 'opal' | 'n8n' | 'all';
}

/**
 * MCP Tool definition for listing workflows
 */
export const listWorkflowsTool = {
  name: 'workflow-list',
  description: 'List all workflows from Google Opal and n8n platforms. Shows workflow URLs, names, and descriptions from both platforms.',

  inputSchema: {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string',
        enum: ['opal', 'n8n', 'all'],
        description: 'Filter by platform: "opal", "n8n", or "all" (default)',
      },
    },
    required: [],
  },

  /**
   * Handler for workflow-list tool
   *
   * @param args - Tool arguments
   * @param workflowOrchestrator - WorkflowOrchestrator instance
   * @returns List of workflows
   */
  async handler(
    args: ListWorkflowsArgs,
    workflowOrchestrator: WorkflowOrchestrator
  ) {
    try {
      const allWorkflows = await workflowOrchestrator.listAllWorkflows();
      const platform = args.platform || 'all';

      // Filter by platform if specified
      const opalWorkflows = platform === 'all' || platform === 'opal'
        ? allWorkflows.opal
        : [];
      const n8nWorkflows = platform === 'all' || platform === 'n8n'
        ? allWorkflows.n8n
        : [];

      // Format Opal workflows
      const opalSummary = opalWorkflows.map((workflow, index) => ({
        index: index + 1,
        platform: 'Opal',
        url: workflow.url,
        description: workflow.description || 'No description',
      }));

      // Format n8n workflows
      const n8nSummary = n8nWorkflows.map((workflow, index) => ({
        index: index + 1,
        platform: 'n8n',
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes?.length || 0,
        active: workflow.active ? 'Active' : 'Inactive',
      }));

      return {
        success: true,
        summary: {
          total: opalWorkflows.length + n8nWorkflows.length,
          opal: opalWorkflows.length,
          n8n: n8nWorkflows.length,
        },
        opalWorkflows: opalSummary,
        n8nWorkflows: n8nSummary,
        message: `
Found ${opalWorkflows.length + n8nWorkflows.length} workflows:
- ${opalWorkflows.length} Opal workflows (AI-powered prototypes)
- ${n8nWorkflows.length} n8n workflows (production integrations)

Use workflow-create to add more workflows.
`.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
