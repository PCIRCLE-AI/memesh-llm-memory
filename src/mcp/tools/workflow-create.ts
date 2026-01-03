/**
 * Create Workflow Tool
 *
 * Creates automated workflows on Google Opal or n8n platforms.
 * Intelligently chooses the best platform based on the workflow description.
 */

import { z } from 'zod';
import { WorkflowOrchestrator, WorkflowRequest } from '../../agents/WorkflowOrchestrator.js';

export const createWorkflowTool = {
  name: 'workflow_create',
  description:
    '🔄 Workflow Automation: Create automated workflows on Google Opal or n8n platforms. ' +
    'Simply describe what you want to automate, and the system will intelligently choose the best platform ' +
    'and create the workflow for you. Supports AI-powered workflows (Opal) and production-grade integrations (n8n).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string' as const,
        description:
          'Natural language description of what you want to automate (e.g., "Summarize daily emails and post to Slack")',
      },
      platform: {
        type: 'string' as const,
        enum: ['opal', 'n8n', 'auto'],
        description:
          'Platform to use: "opal" (AI-powered, fast prototyping), "n8n" (production-grade, integrations), "auto" (intelligent selection)',
      },
      priority: {
        type: 'string' as const,
        enum: ['speed', 'production'],
        description:
          'Priority: "speed" (quick prototype), "production" (reliable, scalable)',
      },
    },
    required: ['description'],
  },

  handler: async (
    input: {
      description: string;
      platform?: 'opal' | 'n8n' | 'auto';
      priority?: 'speed' | 'production';
    },
    workflowOrchestrator?: WorkflowOrchestrator
  ): Promise<{
    success: boolean;
    platform: 'opal' | 'n8n';
    workflowUrl?: string;
    workflowId?: string;
    screenshot?: string;
    error?: string;
    reasoning?: string;
  }> => {
    if (!workflowOrchestrator) {
      return {
        success: false,
        platform: 'opal',
        error: 'WorkflowOrchestrator not available',
      };
    }

    const request: WorkflowRequest = {
      description: input.description,
      platform: input.platform,
      priority: input.priority,
    };

    const result = await workflowOrchestrator.createWorkflow(request);

    return result;
  },
};
