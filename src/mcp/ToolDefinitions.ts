/**
 * MCP Tool Definitions
 *
 * Centralized definitions for all Claude Code Buddy MCP tools.
 * Separated from server.ts for better maintainability.
 */

import { OutputSchemas } from './schemas/OutputSchemas.js';


/**
 * Common input schemas used across multiple tools
 */
export const CommonSchemas = {
  taskInput: {
    type: 'object' as const,
    properties: {
      taskDescription: {
        type: 'string',
        description: 'Description of the task to be performed',
      },
      priority: {
        type: 'number',
        description: 'Task priority (optional, 1-10)',
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['taskDescription'],
  },

  dashboardInput: {
    type: 'object' as const,
    properties: {
      format: {
        type: 'string',
        description: 'Dashboard format: "summary" (default) or "detailed"',
        enum: ['summary', 'detailed'],
      },
    },
  },
};

/**
 * MCP Tool Definition structure (updated for MCP Specification 2025-11-25)
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

/**
 * Get all MCP tool definitions
 */
export function getAllToolDefinitions(): MCPToolDefinition[] {

  // ========================================
  // Buddy Commands (User-Friendly Layer)
  // ========================================

  const buddyDoTool: MCPToolDefinition = {
    name: 'buddy-do',
    description: '🤖 CCB: Execute a task with smart routing. Analyzes complexity and applies capability-focused prompt enhancement.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task: {
          type: 'string',
          description: 'Task description to execute (e.g., "setup authentication", "fix login bug")',
        },
      },
      required: ['task'],
    },
    outputSchema: OutputSchemas.buddyDo,
    annotations: {
      readOnlyHint: false,      // May generate modification suggestions
      destructiveHint: false,   // Does not directly execute destructive operations
      idempotentHint: false,    // Results may vary based on context
      openWorldHint: true,      // Can handle open-ended tasks
    },
  };

  const buddyRememberTool: MCPToolDefinition = {
    name: 'buddy-remember',
    description: '🧠 CCB: Recall project memory - past decisions, API design, bug fixes, and patterns.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'What to remember/recall (e.g., "api design decisions", "authentication approach")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to retrieve (1-50, default: 5)',
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
    outputSchema: OutputSchemas.buddyRemember,
    annotations: {
      readOnlyHint: true,       // Pure read operation
      destructiveHint: false,
      idempotentHint: true,     // Same query returns same results
      openWorldHint: false,     // Limited to project memory scope
    },
  };

  const buddyHelpTool: MCPToolDefinition = {
    name: 'buddy-help',
    description: '📖 CCB: Get help for all buddy commands or a specific command.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'Specific command to get help for (optional, e.g., "do", "remember")',
        },
      },
    },
    outputSchema: OutputSchemas.buddyHelp,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  };

  // ========================================
  // Workflow Guidance Tools
  // ========================================

  const getWorkflowGuidanceTool: MCPToolDefinition = {
    name: 'get-workflow-guidance',
    description: '🔄 Claude Code Buddy: Get intelligent workflow recommendations based on current development context',
    inputSchema: {
      type: 'object' as const,
      properties: {
        phase: {
          type: 'string',
          enum: ['idle', 'code-written', 'test-complete', 'commit-ready', 'committed'],
          description: 'Current workflow phase',
        },
        filesChanged: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files that were changed',
        },
        testsPassing: {
          type: 'boolean',
          description: 'Whether tests are passing',
        },
      },
      required: ['phase'],
    },
    outputSchema: OutputSchemas.workflowGuidance,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,    // Results depend on current state
      openWorldHint: false,
    },
  };

  const getSessionHealthTool: MCPToolDefinition = {
    name: 'get-session-health',
    description: '💊 Claude Code Buddy: Check session health including token usage and quality metrics',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
    outputSchema: OutputSchemas.sessionHealth,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,    // Results change over time
      openWorldHint: false,
    },
  };

  // ========================================
  // Smart Planning Tools (Phase 2)
  // ========================================

  const generateSmartPlanTool: MCPToolDefinition = {
    name: 'generate-smart-plan',
    description: '📋 Claude Code Buddy: Generate an implementation plan with capability-aware task breakdown and TDD structure. Creates bite-sized tasks (2-5 min each) with learning-enhanced recommendations.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        featureDescription: {
          type: 'string',
          description: 'Description of the feature to plan',
        },
        requirements: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific requirements',
        },
        constraints: {
          type: 'object',
          properties: {
            projectType: { type: 'string' },
            techStack: {
              type: 'array',
              items: { type: 'string' },
            },
            complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          description: 'Project constraints and context',
        },
      },
      required: ['featureDescription'],
    },
    outputSchema: OutputSchemas.smartPlan,
    annotations: {
      readOnlyHint: true,       // Only generates plan, doesn't execute
      destructiveHint: false,
      idempotentHint: false,    // Plans may vary based on context
      openWorldHint: true,      // Can handle various feature requirements
    },
  };

  // ========================================
  // Learning Tools (Feedback & Improvement)
  // ========================================

  const buddyRecordMistakeTool: MCPToolDefinition = {
    name: 'buddy-record-mistake',
    description: '📝 CCB: Record an AI mistake for learning and prevention. Enables "learn from feedback" feature.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          description: 'What action the AI took (the mistake)',
        },
        errorType: {
          type: 'string',
          description: 'Error classification',
          enum: [
            'procedure-violation',
            'workflow-skip',
            'assumption-error',
            'validation-skip',
            'responsibility-lack',
            'firefighting',
            'dependency-miss',
            'integration-error',
            'deployment-error',
          ],
        },
        userCorrection: {
          type: 'string',
          description: 'User\'s correction/feedback',
        },
        correctMethod: {
          type: 'string',
          description: 'What should have been done instead',
        },
        impact: {
          type: 'string',
          description: 'Impact of the mistake',
        },
        preventionMethod: {
          type: 'string',
          description: 'How to prevent this in the future',
        },
        relatedRule: {
          type: 'string',
          description: 'Related rule/guideline (optional)',
        },
        context: {
          type: 'object',
          description: 'Additional context (optional)',
        },
      },
      required: ['action', 'errorType', 'userCorrection', 'correctMethod', 'impact', 'preventionMethod'],
    },
    annotations: {
      readOnlyHint: false,      // Records data
      destructiveHint: false,   // Non-destructive
      idempotentHint: true,     // Same mistake recorded multiple times is OK
      openWorldHint: false,     // Structured input required
    },
  };

  // ========================================
  // Hook Integration Tools (Internal)
  // ========================================

  const hookToolUseTool: MCPToolDefinition = {
    name: 'hook-tool-use',
    description: '🔌 Internal: Ingest Claude Code tool-use hook events for workflow automation and memory tracking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        toolName: {
          type: 'string',
          description: 'Tool name executed by Claude Code (e.g., "Write", "Edit", "Bash")',
        },
        arguments: {
          type: 'object',
          description: 'Tool arguments payload (tool-specific)',
        },
        success: {
          type: 'boolean',
          description: 'Whether the tool execution succeeded',
        },
        duration: {
          type: 'number',
          description: 'Execution duration in milliseconds (optional)',
        },
        tokensUsed: {
          type: 'number',
          description: 'Tokens used by the tool call (optional)',
        },
        output: {
          type: 'string',
          description: 'Tool output (optional)',
        },
      },
      required: ['toolName', 'success'],
    },
    outputSchema: OutputSchemas.hookToolUse,
    annotations: {
      readOnlyHint: false,      // Records data
      destructiveHint: false,
      idempotentHint: true,     // Repeated calls have no additional side effects
      openWorldHint: false,
    },
  };

  // ========================================
  // Knowledge Graph Tools
  // ========================================

  const createEntitiesTool: MCPToolDefinition = {
    name: 'create-entities',
    description: '✨ CCB: Create new entities in the Knowledge Graph. Record decisions, features, bug fixes, code changes, and other knowledge for future recall.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        entities: {
          type: 'array',
          description: 'Array of entities to create',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Entity name (unique identifier)',
              },
              entityType: {
                type: 'string',
                description: 'Entity type (e.g., "decision", "feature", "bug_fix", "lesson_learned")',
              },
              observations: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of observations (facts, notes, details)',
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata',
              },
            },
            required: ['name', 'entityType', 'observations'],
          },
        },
      },
      required: ['entities'],
    },
    annotations: {
      readOnlyHint: false,      // Creates data
      destructiveHint: false,   // Non-destructive
      idempotentHint: false,    // Creates new entities each time
      openWorldHint: false,     // Structured input required
    },
  };

  // ========================================
  // Return all tools in priority order
  // ========================================

  return [
    // Buddy Commands (user-friendly layer)
    buddyDoTool,
    buddyRememberTool,
    buddyHelpTool,
    getSessionHealthTool,
    getWorkflowGuidanceTool,
    generateSmartPlanTool,

    // Learning Tools
    buddyRecordMistakeTool,

    // Knowledge Graph Tools
    createEntitiesTool,

    // Hook Integration
    hookToolUseTool,
  ];
}
