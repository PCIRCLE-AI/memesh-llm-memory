/**
 * List Workflows Tool
 *
 * Lists all workflows from Google Opal and n8n platforms.
 */

import { z } from 'zod';
import { WorkflowOrchestrator } from '../../agents/WorkflowOrchestrator.js';
import { N8nWorkflow } from '../../agents/N8nWorkflowAgent.js';

export const listWorkflowsTool = {
  name: 'workflow_list',
  description:
    '📋 Workflow Automation: List all workflows from Google Opal and n8n platforms. ' +
    'View your automated workflows across both platforms to see what automations are currently active.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string' as const,
        enum: ['opal', 'n8n', 'all'],
        description:
          'Platform to list workflows from: "opal", "n8n", or "all" (default: all)',
      },
    },
  },

  handler: async (
    input: {
      platform?: 'opal' | 'n8n' | 'all';
    },
    workflowOrchestrator?: WorkflowOrchestrator
  ): Promise<{
    opal?: Array<{ url: string; description: string }>;
    n8n?: N8nWorkflow[];
    total: number;
    error?: string;
  }> => {
    if (!workflowOrchestrator) {
      return {
        total: 0,
        error: 'WorkflowOrchestrator not available',
      };
    }

    try {
      const platform = input.platform || 'all';
      const allWorkflows = await workflowOrchestrator.listAllWorkflows();

      if (platform === 'opal') {
        return {
          opal: allWorkflows.opal,
          total: allWorkflows.opal.length,
        };
      } else if (platform === 'n8n') {
        return {
          n8n: allWorkflows.n8n,
          total: allWorkflows.n8n.length,
        };
      } else {
        // platform === 'all'
        return {
          opal: allWorkflows.opal,
          n8n: allWorkflows.n8n,
          total: allWorkflows.opal.length + allWorkflows.n8n.length,
        };
      }
    } catch (error) {
      return {
        total: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
