/**
 * MCP Tool Definitions
 *
 * Centralized definitions for all MeMesh MCP tools.
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
    description: 'Execute development tasks with smart routing and complexity analysis',
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
    description: 'Search project memory for past decisions, bugs, patterns, and architecture choices',
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
    description: '📖 MeMesh: Get help for all buddy commands or a specific command.',
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
    description: 'Get next steps and recommendations for current development phase (code-written, test-complete, commit-ready)',
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
    description: '💊 MeMesh: Check session health including token usage and quality metrics',
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

  // generate-smart-plan tool removed - planning delegated to Claude's built-in capabilities

  // ========================================
  // Learning Tools (Feedback & Improvement)
  // ========================================

  const buddyRecordMistakeTool: MCPToolDefinition = {
    name: 'buddy-record-mistake',
    description: `📝 MeMesh: Record AI mistakes for learning and prevention - enable systematic improvement from user feedback.

**When to Record:**
• User explicitly corrects behavior or approach
• Violated a documented procedure or guideline
• Made incorrect assumptions instead of asking
• Skipped validation step and caused problems
• User says "you should have..." or "why didn't you..."

**Mistake Record Structure:**
• **Action**: What was actually done (specific, concrete)
• **Error Type**: Category that best fits (see errorType enum)
• **User Correction**: What the user said was wrong (exact feedback)
• **Correct Method**: What should have been done instead (actionable, specific)
• **Impact**: How this affected the user (time wasted, bugs introduced, confusion)
• **Prevention Method**: Concrete steps to prevent this in future (not vague promises)

**Pattern Recognition:**
• Identify the underlying pattern of the mistake (not just the specific instance)
• Categorize the error type accurately (procedure-violation, assumption-error, etc.)
• Recognize if this mistake has happened before (check patterns)
• Extract the root cause, not just the symptom

**Error Type Classification:**
• **procedure-violation**: Skipped a documented workflow step
• **workflow-skip**: Didn't follow the correct sequence (e.g., tested before implementing)
• **assumption-error**: Made incorrect assumptions instead of asking
• **validation-skip**: Didn't verify something that should have been checked
• **responsibility-lack**: Failed to take ownership or be proactive
• **firefighting**: Rushed to fix without understanding root cause
• **dependency-miss**: Missed a dependency or integration point
• **integration-error**: Failed to integrate components correctly
• **deployment-error**: Deployment or configuration mistake

**Example:**
User: "Why did you edit the file without reading it first? Now the indentation is broken!"
Record:
  action: "Edited ServerInitializer.ts without reading file first"
  errorType: "procedure-violation"
  userCorrection: "Must read file before editing - broke indentation"
  correctMethod: "Use Read tool first to see exact content and formatting, then Edit"
  impact: "Broke file indentation, required re-edit, wasted user time"
  preventionMethod: "ALWAYS invoke Read tool before Edit tool - no exceptions"
  relatedRule: "READ_BEFORE_EDIT (Anti-Hallucination Protocol)"`,
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
    description: 'Process tool execution events from Claude Code CLI for workflow automation (auto-triggered, do not call manually)',
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
    description: `✨ MeMesh: Create entities in Knowledge Graph - record decisions, features, bug fixes, and lessons learned.

**What to Record:**
• Technical decisions (e.g., "chose JWT over sessions for auth")
• Architectural patterns (e.g., "use repository pattern for data access")
• Bug fixes and root causes (e.g., "fixed race condition in login flow")
• Lessons learned (e.g., "always validate user input before DB queries")
• Code changes and rationale (e.g., "refactored UserService to improve testability")

**Entity Naming Guidelines:**
• Use imperative or declarative form (e.g., "Use Redis for session storage")
• Make names searchable and meaningful (avoid generic names like "Decision 1")
• Include key context (e.g., "API rate limiting implementation - Express middleware")

**Observation Structure:**
• Break down into atomic observations (one fact per observation)
• Include WHY (rationale), WHAT (implementation), and HOW (approach)
• Add context for future recall (date, related files, dependencies)

**Tag Guidelines (3-7 tags):**
• Technology: "tech:postgresql", "tech:nodejs", "tech:react"
• Domain: "domain:authentication", "domain:api", "domain:frontend"
• Pattern: "pattern:repository", "pattern:singleton", "pattern:observer"
• Use lowercase, hyphens for multi-word (e.g., "error-handling")
• MeMesh automatically adds scope tags (scope:project:xxx)

**Example:**
name: "JWT authentication implementation for API"
entityType: "feature"
observations: [
  "Implementation: Used jsonwebtoken library with RS256 algorithm",
  "Rationale: Stateless auth enables horizontal scaling",
  "Security: Tokens expire after 1 hour, refresh tokens after 7 days",
  "Files: src/auth/jwt.ts, src/middleware/authenticate.ts"
]
tags: ["tech:jwt", "tech:nodejs", "domain:authentication", "security"]`,
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
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags. Scope tags (scope:project:xxx) and tech tags (tech:xxx) will be automatically added.',
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
    description: '🤝 MeMesh A2A: Send a task to another A2A agent for execution.',
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
    description: '🔍 MeMesh A2A: Get task status and details from another A2A agent.',
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
    description: '📋 MeMesh A2A: List own tasks (tasks assigned to this agent).',
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
    description: '🤖 MeMesh A2A: List available A2A agents in the registry.',
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

  const a2aReportResultTool: MCPToolDefinition = {
    name: 'a2a-report-result',
    description: '✅ MeMesh A2A: Report task execution result back to MeMesh Server (used by MCP Clients).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID to report result for',
        },
        result: {
          type: 'string',
          description: 'Execution output or result',
        },
        success: {
          type: 'boolean',
          description: 'Whether execution succeeded (true) or failed (false)',
        },
        error: {
          type: 'string',
          description: 'Error message if success=false (optional)',
        },
      },
      required: ['taskId', 'result', 'success'],
    },
    outputSchema: OutputSchemas.a2aReportResult,
    annotations: {
      title: 'A2A Result Reporter',
      readOnlyHint: false,      // Updates task status
      destructiveHint: false,
      idempotentHint: true,     // Reporting same result multiple times is safe
      openWorldHint: false,     // Requires specific task ID
    },
  };

  // ========================================
  // Test Generation Tools
  // ========================================

  const generateTestsTool: MCPToolDefinition = {
    name: 'generate-tests',
    description: 'Automatically generate test cases from specifications or code using AI. Provide either specification or code (at least one required).',
    inputSchema: {
      type: 'object',
      properties: {
        specification: {
          type: 'string',
          description: 'Feature or function specification to generate tests for',
        },
        code: {
          type: 'string',
          description: 'Source code to generate tests for',
        },
      },
    },
    outputSchema: OutputSchemas.generateTests,
    annotations: {
      title: 'Test Generator',
      readOnlyHint: true,       // Only generates test code, doesn't modify files
      destructiveHint: false,
      idempotentHint: false,    // Results may vary based on AI generation
      openWorldHint: true,      // Can handle various specifications and code
    },
  };

  // ========================================
  // Secret Management Tools (Phase 0.7.0)
  // ========================================

  const buddySecretStoreTool: MCPToolDefinition = {
    name: 'buddy-secret-store',
    description: '🔐 MeMesh: Store a secret (API key, token, password) securely with AES-256-GCM encryption. Never transmitted over network.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name/identifier for the secret (e.g., "openai-api-key")',
        },
        value: {
          type: 'string',
          description: 'The secret value to store',
        },
        type: {
          type: 'string',
          enum: ['api_key', 'token', 'password', 'other'],
          description: 'Type of secret for categorization',
        },
        description: {
          type: 'string',
          description: 'Optional description of what this secret is for',
        },
        expiresIn: {
          type: 'string',
          description: 'Optional expiry duration (e.g., "30d", "24h", "60m"). Default: 30 days',
        },
      },
      required: ['name', 'value', 'type'],
    },
    annotations: {
      title: 'Secret Storage',
      readOnlyHint: false,      // Writes data
      destructiveHint: false,   // Non-destructive
      idempotentHint: false,    // Creates new entry each time
      openWorldHint: false,     // Structured input required
    },
  };

  const buddySecretGetTool: MCPToolDefinition = {
    name: 'buddy-secret-get',
    description: '🔓 MeMesh: Retrieve a stored secret by name from MeMesh secure storage.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name of the secret to retrieve',
        },
      },
      required: ['name'],
    },
    annotations: {
      title: 'Secret Retrieval',
      readOnlyHint: true,       // Read-only operation
      destructiveHint: false,
      idempotentHint: true,     // Same query returns same result
      openWorldHint: false,     // Requires specific name
    },
  };

  const buddySecretListTool: MCPToolDefinition = {
    name: 'buddy-secret-list',
    description: '📋 MeMesh: List all secrets stored in MeMesh (names and metadata only, NOT values).',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
    annotations: {
      title: 'Secret List',
      readOnlyHint: true,       // Read-only operation
      destructiveHint: false,
      idempotentHint: true,     // Same query returns same result
      openWorldHint: false,
    },
  };

  const buddySecretDeleteTool: MCPToolDefinition = {
    name: 'buddy-secret-delete',
    description: '🗑️ MeMesh: Delete a stored secret from MeMesh secure storage.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name of the secret to delete',
        },
      },
      required: ['name'],
    },
    annotations: {
      title: 'Secret Deletion',
      readOnlyHint: false,      // Modifies data
      destructiveHint: true,    // Permanently deletes data
      idempotentHint: true,     // Deleting twice is safe
      openWorldHint: false,     // Requires specific name
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

    // Learning Tools
    buddyRecordMistakeTool,

    // Knowledge Graph Tools
    createEntitiesTool,

    // Secret Management Tools (Phase 0.7.0)
    buddySecretStoreTool,
    buddySecretGetTool,
    buddySecretListTool,
    buddySecretDeleteTool,

    // A2A Protocol Tools
    a2aSendTaskTool,
    a2aGetTaskTool,
    a2aListTasksTool,
    a2aListAgentsTool,
    a2aReportResultTool,

    // Hook Integration
    hookToolUseTool,

    // Test Generation Tools
    generateTestsTool,
  ];
}
