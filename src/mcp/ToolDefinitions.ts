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
  /**
   * Tool name aliases for backward compatibility
   * Deprecated names that still work but show warnings
   * @since v2.8.0 - Tool naming unification
   */
  aliases?: string[];
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
    description: 'Execute development tasks with context-aware analysis and memory integration',
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
    description: `Search project memory using semantic similarity or keyword matching.

PROJECT ISOLATION (Default):
By default, searches are isolated to the CURRENT PROJECT + GLOBAL memories only.
This prevents memory mixing across different projects.

Examples:
- buddy-remember "how do we handle authentication" -> finds JWT, OAuth, session memories in CURRENT project
- buddy-remember "database" mode=keyword -> exact keyword match in CURRENT project only
- buddy-remember "user login" mode=semantic minSimilarity=0.5 -> high-quality semantic matches in CURRENT project
- buddy-remember "API patterns" allProjects=true -> search across ALL projects (cross-project search)

The default 'hybrid' mode combines semantic understanding with keyword matching for best results.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (natural language supported for semantic search)',
        },
        mode: {
          type: 'string',
          enum: ['semantic', 'keyword', 'hybrid'],
          description: 'Search mode: semantic (AI similarity), keyword (exact match), hybrid (both combined). Default: hybrid',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (1-50, default: 10)',
          minimum: 1,
          maximum: 50,
        },
        minSimilarity: {
          type: 'number',
          description: 'Minimum similarity score (0-1) for semantic/hybrid search. Default: 0.3',
          minimum: 0,
          maximum: 1,
        },
        allProjects: {
          type: 'boolean',
          description: 'Search across all projects (default: false, searches only current project + global memories)',
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
  // Learning Tools (Feedback & Improvement)
  // ========================================

  const buddyRecordMistakeTool: MCPToolDefinition = {
    name: 'memesh-record-mistake',
    aliases: ['buddy-record-mistake'],  // Deprecated, will be removed in v3.0.0
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
    name: 'memesh-hook-tool-use',
    aliases: ['hook-tool-use'],  // Deprecated, will be removed in v3.0.0
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
    name: 'memesh-create-entities',
    aliases: ['create-entities'],  // Deprecated, will be removed in v3.0.0
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
  // Cloud Sync Tools
  // ========================================

  const cloudSyncTool: MCPToolDefinition = {
    name: 'memesh-cloud-sync',
    description: `☁️ Sync local Knowledge Graph memories with MeMesh Cloud.

**Actions:**
• {action: "status"}: Compare local vs cloud memory counts
• {action: "push"}: Push local memories to cloud
• {action: "pull"}: Pull cloud memories to local
• {action: "push", dryRun: true}: Preview what would be synced

Requires MEMESH_API_KEY to be configured. Without it, all actions return a setup guide.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['push', 'pull', 'status'],
          description: 'Sync action: push (local→cloud), pull (cloud→local), status (compare)',
        },
        query: {
          type: 'string',
          description: 'Optional search query to filter which memories to sync',
        },
        space: {
          type: 'string',
          description: 'Cloud memory space to sync with (default: "default")',
          default: 'default',
        },
        limit: {
          type: 'number',
          description: 'Max memories per batch (default: 100, max: 500)',
          minimum: 1,
          maximum: 500,
          default: 100,
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview sync without executing (default: false)',
          default: false,
        },
      },
      required: ['action'],
    },
    outputSchema: OutputSchemas.cloudSync,
    annotations: {
      title: 'Cloud Sync',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  };

  // ========================================
  // Task Board Tools (Local Task Management)
  // ========================================

  // ========================================
  // Test Generation Tools
  // ========================================

  const generateTestsTool: MCPToolDefinition = {
    name: 'memesh-generate-tests',
    aliases: ['generate-tests'],  // Deprecated, will be removed in v3.0.0
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
  // Return all tools in priority order
  // ========================================

  return [
    // Buddy Commands (user-friendly layer)
    buddyDoTool,
    buddyRememberTool,
    buddyHelpTool,

    // Learning Tools
    buddyRecordMistakeTool,

    // Knowledge Graph Tools
    createEntitiesTool,

    // Cloud Sync
    cloudSyncTool,

    // Hook Integration
    hookToolUseTool,

    // Test Generation Tools
    generateTestsTool,
  ];
}
