/**
 * MCP Tool Definitions
 *
 * Centralized definitions for all Claude Code Buddy MCP tools.
 * Separated from server.ts for better maintainability.
 */


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
    annotations: {
      readOnlyHint: true,       // Only generates plan, doesn't execute
      destructiveHint: false,
      idempotentHint: false,    // Plans may vary based on context
      openWorldHint: true,      // Can handle various feature requirements
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
    annotations: {
      readOnlyHint: false,      // Records data
      destructiveHint: false,
      idempotentHint: true,     // Repeated calls have no additional side effects
      openWorldHint: false,
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
    hookToolUseTool,
  ];
}
