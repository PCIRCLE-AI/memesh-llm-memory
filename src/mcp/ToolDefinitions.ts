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
    title?: string;              // Human-readable display name
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
      title: 'Smart Task Router',
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
      title: 'Project Memory Recall',
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
      title: 'Help & Documentation',
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
    outputSchema: OutputSchemas.getWorkflowGuidance,
    annotations: {
      title: 'Workflow Recommendations',
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
      additionalProperties: false,  // No parameters accepted
    },
    outputSchema: OutputSchemas.getSessionHealth,
    annotations: {
      title: 'Session Health Check',
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
    outputSchema: OutputSchemas.generateSmartPlan,
    annotations: {
      title: 'Smart Plan Generator',
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
    outputSchema: OutputSchemas.buddyRecordMistake,
    annotations: {
      title: 'Mistake Recorder',
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
      title: 'Hook Event Processor',
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
    outputSchema: OutputSchemas.createEntities,
    annotations: {
      title: 'Knowledge Graph Creator',
      readOnlyHint: false,      // Creates data
      destructiveHint: false,   // Non-destructive
      idempotentHint: false,    // Creates new entities each time
      openWorldHint: false,     // Structured input required
    },
  };

  // ========================================
  // A2A Protocol Tools (Agent-to-Agent)
  // ========================================

  const a2aSendTaskTool: MCPToolDefinition = {
    name: 'a2a-send-task',
    description: '🤝 CCB A2A: Send a task to another A2A agent for execution.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        targetAgentId: {
          type: 'string',
          description: 'ID of the target agent to send the task to',
        },
        taskDescription: {
          type: 'string',
          description: 'Description of the task to execute',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'Task priority (optional, default: normal)',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for task tracking (optional)',
        },
        metadata: {
          type: 'object',
          description: 'Additional task metadata (optional)',
        },
      },
      required: ['targetAgentId', 'taskDescription'],
    },
    outputSchema: OutputSchemas.a2aSendTask,
    annotations: {
      title: 'A2A Task Sender',
      readOnlyHint: false,      // Creates tasks
      destructiveHint: false,   // Non-destructive
      idempotentHint: false,    // Each call creates new task
      openWorldHint: true,      // Can handle various task types
    },
  };

  const a2aGetTaskTool: MCPToolDefinition = {
    name: 'a2a-get-task',
    description: '🔍 CCB A2A: Get task status and details from another A2A agent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        targetAgentId: {
          type: 'string',
          description: 'ID of the agent that owns the task',
        },
        taskId: {
          type: 'string',
          description: 'ID of the task to retrieve',
        },
      },
      required: ['targetAgentId', 'taskId'],
    },
    outputSchema: OutputSchemas.a2aGetTask,
    annotations: {
      title: 'A2A Task Retriever',
      readOnlyHint: true,       // Read-only operation
      destructiveHint: false,
      idempotentHint: true,     // Same query returns same result
      openWorldHint: false,     // Requires specific task ID
    },
  };

  const a2aListTasksTool: MCPToolDefinition = {
    name: 'a2a-list-tasks',
    description: '📋 CCB A2A: List own tasks (tasks assigned to this agent).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        state: {
          type: 'string',
          enum: ['SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
          description: 'Filter by task state (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (1-100, optional)',
          minimum: 1,
          maximum: 100,
        },
        offset: {
          type: 'number',
          description: 'Number of tasks to skip (optional)',
          minimum: 0,
        },
      },
    },
    outputSchema: OutputSchemas.a2aListTasks,
    annotations: {
      title: 'A2A Task Lister',
      readOnlyHint: true,       // Read-only operation
      destructiveHint: false,
      idempotentHint: true,     // Same query returns same result
      openWorldHint: false,     // Limited to own tasks
    },
  };

  const a2aListAgentsTool: MCPToolDefinition = {
    name: 'a2a-list-agents',
    description: '🤖 CCB A2A: List available A2A agents in the registry.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'all'],
          description: 'Filter by agent status (optional, default: active)',
        },
      },
    },
    outputSchema: OutputSchemas.a2aListAgents,
    annotations: {
      title: 'A2A Agent Registry',
      readOnlyHint: true,       // Read-only operation
      destructiveHint: false,
      idempotentHint: true,     // Same query returns same result
      openWorldHint: false,     // Limited to registry
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

    // A2A Protocol Tools
    a2aSendTaskTool,
    a2aGetTaskTool,
    a2aListTasksTool,
    a2aListAgentsTool,

    // Hook Integration
    hookToolUseTool,
  ];
}
