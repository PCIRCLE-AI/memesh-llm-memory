/**
 * MCP Tool Definitions
 *
 * Centralized definitions for all Claude Code Buddy MCP tools.
 * Separated from server.ts for better maintainability.
 */

import { recallMemoryTool } from './tools/recall-memory.js';
import { AgentMetadata } from '../core/AgentRegistry.js';

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
 * MCP Tool Definition structure
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Get all MCP tool definitions
 */
export function getAllToolDefinitions(allAgents: AgentMetadata[]): MCPToolDefinition[] {
  // ========================================
  // NEW: sa_* prefixed tools (recommended)
  // ========================================

  const saTaskTool: MCPToolDefinition = {
    name: 'sa_task',
    description: '🤖 Claude Code Buddy: Execute a task with autonomous agent routing. Analyzes your task, selects the best of 22 specialized agents, and returns an optimized execution plan.',
    inputSchema: CommonSchemas.taskInput,
  };

  const saDashboardTool: MCPToolDefinition = {
    name: 'sa_dashboard',
    description: '📊 Claude Code Buddy: View evolution system dashboard showing agent learning progress, discovered patterns, and performance improvements. Tracks 22 agent evolution configurations (18 currently available + 4 planned).',
    inputSchema: CommonSchemas.dashboardInput,
  };

  const saAgentsTool: MCPToolDefinition = {
    name: 'sa_agents',
    description: '📋 Claude Code Buddy: List all 22 specialized agents with their capabilities and specializations.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };

  const saSkillsTool: MCPToolDefinition = {
    name: 'sa_skills',
    description: '🎓 Claude Code Buddy: List all skills, differentiate sa: prefixed skills from user skills.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string',
          description: 'Filter skills: "all" (default), "claude-code-buddy" (sa: prefix only), "user" (user skills only)',
          enum: ['all', 'claude-code-buddy', 'user'],
        },
      },
    },
  };

  const saUninstallTool: MCPToolDefinition = {
    name: 'sa_uninstall',
    description: '🗑️ Claude Code Buddy: Uninstall Claude Code Buddy and clean up files with control over data retention.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        keepData: {
          type: 'boolean',
          description: 'Keep user data (evolution patterns, task history). Default: false',
        },
        keepConfig: {
          type: 'boolean',
          description: 'Keep configuration files (~/.claude-code-buddy/). Default: false',
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview what would be removed without actually removing. Default: false',
        },
      },
    },
  };

  // ========================================
  // Buddy Commands (User-Friendly Layer)
  // ========================================

  const buddyDoTool: MCPToolDefinition = {
    name: 'buddy_do',
    description: '🤖 CCB: Execute a task with smart routing. Analyzes complexity and routes to Ollama (fast & free) or Claude (high quality).',
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
  };

  const buddyStatsTool: MCPToolDefinition = {
    name: 'buddy_stats',
    description: '📊 CCB: View performance dashboard showing token usage, cost savings, and model routing decisions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'all'],
          description: 'Time period for statistics (default: "all")',
        },
      },
    },
  };

  const buddyRememberTool: MCPToolDefinition = {
    name: 'buddy_remember',
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
  };

  const buddyHelpTool: MCPToolDefinition = {
    name: 'buddy_help',
    description: '📖 CCB: Get help for all buddy commands or a specific command.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'Specific command to get help for (optional, e.g., "do", "stats", "remember")',
        },
      },
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
  };

  const getSessionHealthTool: MCPToolDefinition = {
    name: 'get-session-health',
    description: '💊 Claude Code Buddy: Check session health including token usage and quality metrics',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };

  const reloadContextTool: MCPToolDefinition = {
    name: 'reload-context',
    description: '🔄 Claude Code Buddy: Reload CLAUDE.md context to refresh session',
    inputSchema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          enum: ['token-threshold', 'quality-degradation', 'manual', 'context-staleness'],
          description: 'Reason for reload',
        },
      },
      required: ['reason'],
    },
  };

  const recordTokenUsageTool: MCPToolDefinition = {
    name: 'record-token-usage',
    description: '📊 Claude Code Buddy: Record token usage for session monitoring',
    inputSchema: {
      type: 'object' as const,
      properties: {
        inputTokens: {
          type: 'number',
          description: 'Number of input tokens',
        },
        outputTokens: {
          type: 'number',
          description: 'Number of output tokens',
        },
      },
      required: ['inputTokens', 'outputTokens'],
    },
  };

  // ========================================
  // Smart Planning Tools (Phase 2)
  // ========================================

  const generateSmartPlanTool: MCPToolDefinition = {
    name: 'generate-smart-plan',
    description: '📋 Claude Code Buddy: Generate intelligent implementation plan with agent-aware task breakdown and TDD structure. Creates bite-sized tasks (2-5 min each) with learning-enhanced recommendations.',
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
  };

  // ========================================
  // Git Assistant Tools
  // ========================================

  const gitSaveWorkTool: MCPToolDefinition = {
    name: 'git-save-work',
    description: '💾 Git Assistant: Save your work with a friendly commit message. Automatically stages changes and creates a commit.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        description: {
          type: 'string',
          description: 'Description of what you did (in plain language)',
        },
        autoBackup: {
          type: 'boolean',
          description: 'Create local backup before committing. Default: true',
        },
      },
      required: ['description'],
    },
  };

  const gitListVersionsTool: MCPToolDefinition = {
    name: 'git-list-versions',
    description: '📚 Git Assistant: List recent versions (commits) with friendly format.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Number of versions to show. Default: 10',
        },
      },
    },
  };

  const gitStatusTool: MCPToolDefinition = {
    name: 'git-status',
    description: '📊 Git Assistant: Show current status of your files in a friendly format.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };

  const gitShowChangesTool: MCPToolDefinition = {
    name: 'git-show-changes',
    description: '🔍 Git Assistant: Show what changed compared to a specific version or branch.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        compareWith: {
          type: 'string',
          description: 'Version/branch to compare with. Default: HEAD',
        },
      },
    },
  };

  const gitGoBackTool: MCPToolDefinition = {
    name: 'git-go-back',
    description: '⏪ Git Assistant: Go back to a previous version. Can use version number or commit hash.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        identifier: {
          type: 'string',
          description: 'Version number (e.g., "3") or commit hash to go back to',
        },
      },
      required: ['identifier'],
    },
  };

  const gitCreateBackupTool: MCPToolDefinition = {
    name: 'git-create-backup',
    description: '💼 Git Assistant: Create a local backup of your project.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };

  const gitSetupTool: MCPToolDefinition = {
    name: 'git-setup',
    description: '⚙️ Git Assistant: Setup Git for a new project with guided wizard.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        existingGit: {
          type: 'boolean',
          description: 'Whether project already has Git initialized. Default: false',
        },
      },
    },
  };

  const gitHelpTool: MCPToolDefinition = {
    name: 'git-help',
    description: '❓ Git Assistant: Show help and available commands.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };

  // ========================================
  // Database Backup Tools
  // ========================================

  const createDatabaseBackupTool: MCPToolDefinition = {
    name: 'create_database_backup',
    description: '💾 Database Backup: Create a manual backup of a SQLite database with compression and verification.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dbPath: {
          type: 'string',
          description: 'Path to database file (default: data/knowledge-graph.db). Supports: knowledge-graph.db, evolution.db, collaboration.db',
        },
        compress: {
          type: 'boolean',
          description: 'Whether to compress backup (default: true)',
        },
        verify: {
          type: 'boolean',
          description: 'Whether to verify backup after creation (default: true)',
        },
        prefix: {
          type: 'string',
          description: 'Optional prefix for backup filename',
        },
      },
    },
  };

  const listDatabaseBackupsTool: MCPToolDefinition = {
    name: 'list_database_backups',
    description: '📋 Database Backup: List all available backups for a database.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dbPath: {
          type: 'string',
          description: 'Path to database file (default: data/knowledge-graph.db)',
        },
      },
    },
  };

  const restoreDatabaseBackupTool: MCPToolDefinition = {
    name: 'restore_database_backup',
    description: '♻️ Database Backup: Restore database from a backup. WARNING: Creates backup of current database before restoring.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        backupPath: {
          type: 'string',
          description: 'Path to backup file to restore',
        },
        targetPath: {
          type: 'string',
          description: 'Target path for restored database (default: original database path)',
        },
        verify: {
          type: 'boolean',
          description: 'Whether to verify backup before restore (default: true)',
        },
      },
      required: ['backupPath'],
    },
  };

  const cleanDatabaseBackupsTool: MCPToolDefinition = {
    name: 'clean_database_backups',
    description: '🧹 Database Backup: Clean old backups based on retention policy (7 daily, 4 weekly, 12 monthly by default).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dbPath: {
          type: 'string',
          description: 'Path to database file (default: data/knowledge-graph.db)',
        },
        dailyBackups: {
          type: 'number',
          description: 'Number of daily backups to keep (default: 7)',
        },
        weeklyBackups: {
          type: 'number',
          description: 'Number of weekly backups to keep (default: 4)',
        },
        monthlyBackups: {
          type: 'number',
          description: 'Number of monthly backups to keep (default: 12)',
        },
      },
    },
  };

  const getBackupStatsTool: MCPToolDefinition = {
    name: 'get_backup_stats',
    description: '📊 Database Backup: Get backup statistics for a database (total backups, size, age).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dbPath: {
          type: 'string',
          description: 'Path to database file (default: data/knowledge-graph.db)',
        },
      },
    },
  };

  // ========================================
  // Project Memory Tools
  // ========================================

  const recallMemoryToolDef: MCPToolDefinition = {
    name: recallMemoryTool.name,
    description: recallMemoryTool.description,
    inputSchema: recallMemoryTool.inputSchema,
  };

  // ========================================
  // Backward compatibility (old names)
  // ========================================

  const smartRouterTool: MCPToolDefinition = {
    name: 'smart_route_task',
    description: '[LEGACY] Smart task router that analyzes your task and recommends the best agent. Use sa_task instead for shorter command.',
    inputSchema: CommonSchemas.taskInput,
  };

  const evolutionDashboardTool: MCPToolDefinition = {
    name: 'evolution_dashboard',
    description: '[LEGACY] View evolution system dashboard. Use sa_dashboard instead for shorter command.',
    inputSchema: CommonSchemas.dashboardInput,
  };

  // ========================================
  // Individual agent tools (dynamic)
  // ========================================

  const agentTools: MCPToolDefinition[] = allAgents.map(agent => ({
    name: agent.name,
    description: agent.description,
    inputSchema: agent.inputSchema || {
      type: 'object',
      properties: {
        task_description: {
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
      required: ['task_description'],
    },
  }));

  // ========================================
  // Return all tools in priority order
  // ========================================

  return [
    // New sa_* tools first (recommended)
    saTaskTool,
    saDashboardTool,
    saAgentsTool,
    saSkillsTool,
    saUninstallTool,
    // Buddy Commands (user-friendly layer)
    buddyDoTool,
    buddyStatsTool,
    buddyRememberTool,
    buddyHelpTool,
    // Workflow guidance tools
    getWorkflowGuidanceTool,
    getSessionHealthTool,
    reloadContextTool,
    recordTokenUsageTool,
    // Smart Planning tools (Phase 2)
    generateSmartPlanTool,
    // Git Assistant tools
    gitSaveWorkTool,
    gitListVersionsTool,
    gitStatusTool,
    gitShowChangesTool,
    gitGoBackTool,
    gitCreateBackupTool,
    gitSetupTool,
    gitHelpTool,
    // Database Backup tools
    createDatabaseBackupTool,
    listDatabaseBackupsTool,
    restoreDatabaseBackupTool,
    cleanDatabaseBackupsTool,
    getBackupStatsTool,
    // Project Memory tools
    recallMemoryToolDef,
    // Legacy tools (backward compatibility)
    smartRouterTool,
    evolutionDashboardTool,
    // Individual agents
    ...agentTools,
  ];
}
