/**
 * MCP Tool Definitions
 *
 * Centralized definitions for all Claude Code Buddy MCP tools.
 * Separated from server.ts for better maintainability.
 */

import { recallMemoryTool } from './tools/recall-memory.js';
import { createEntitiesTool } from './tools/create-entities.js';
import { addObservationsTool } from './tools/add-observations.js';
import { createRelationsTool } from './tools/create-relations.js';
import { generateCIConfigTool } from './tools/devops-generate-ci-config.js';
import { analyzeDeploymentTool } from './tools/devops-analyze-deployment.js';
import { setupCITool } from './tools/devops-setup-ci.js';
import { createWorkflowTool } from './tools/workflow-create.js';
import { listWorkflowsTool } from './tools/workflow-list.js';
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
  // Buddy Tools (buddy-* prefix - kebab-case naming)
  // ========================================

  const buddyAgentsTool: MCPToolDefinition = {
    name: 'buddy-agents',
    description: '📋 Claude Code Buddy: List all 22 specialized agents with their capabilities and specializations.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  };

  const buddySkillsTool: MCPToolDefinition = {
    name: 'buddy-skills',
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

  const buddyUninstallTool: MCPToolDefinition = {
    name: 'buddy-uninstall',
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
    name: 'buddy-do',
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
    name: 'buddy-stats',
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
  };

  const buddyHelpTool: MCPToolDefinition = {
    name: 'buddy-help',
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
  // DevOps Tools
  // ========================================

  const devopsGenerateCIConfigToolDef: MCPToolDefinition = {
    name: generateCIConfigTool.name,
    description: generateCIConfigTool.description,
    inputSchema: generateCIConfigTool.inputSchema,
  };

  const devopsAnalyzeDeploymentToolDef: MCPToolDefinition = {
    name: analyzeDeploymentTool.name,
    description: analyzeDeploymentTool.description,
    inputSchema: analyzeDeploymentTool.inputSchema,
  };

  const devopsSetupCIToolDef: MCPToolDefinition = {
    name: setupCITool.name,
    description: setupCITool.description,
    inputSchema: setupCITool.inputSchema,
  };

  // ========================================
  // Workflow Automation Tools
  // ========================================

  const workflowCreateToolDef: MCPToolDefinition = {
    name: createWorkflowTool.name,
    description: createWorkflowTool.description,
    inputSchema: createWorkflowTool.inputSchema,
  };

  const workflowListToolDef: MCPToolDefinition = {
    name: listWorkflowsTool.name,
    description: listWorkflowsTool.description,
    inputSchema: listWorkflowsTool.inputSchema,
  };

  // ========================================
  // Database Backup Tools
  // ========================================

  const createDatabaseBackupTool: MCPToolDefinition = {
    name: 'create-database-backup',
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
    name: 'list-database-backups',
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
    name: 'restore-database-backup',
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
    name: 'clean-database-backups',
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
    name: 'get-backup-stats',
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

  const createEntitiesToolDef: MCPToolDefinition = {
    name: createEntitiesTool.name,
    description: createEntitiesTool.description,
    inputSchema: createEntitiesTool.inputSchema,
  };

  const addObservationsToolDef: MCPToolDefinition = {
    name: addObservationsTool.name,
    description: addObservationsTool.description,
    inputSchema: addObservationsTool.inputSchema,
  };

  const createRelationsToolDef: MCPToolDefinition = {
    name: createRelationsTool.name,
    description: createRelationsTool.description,
    inputSchema: createRelationsTool.inputSchema,
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
    // Buddy tools
    buddyAgentsTool,
    buddySkillsTool,
    buddyUninstallTool,
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
    // DevOps tools
    devopsGenerateCIConfigToolDef,
    devopsAnalyzeDeploymentToolDef,
    devopsSetupCIToolDef,
    // Workflow Automation tools
    workflowCreateToolDef,
    workflowListToolDef,
    // Database Backup tools
    createDatabaseBackupTool,
    listDatabaseBackupsTool,
    restoreDatabaseBackupTool,
    cleanDatabaseBackupsTool,
    getBackupStatsTool,
    // Project Memory tools
    recallMemoryToolDef,
    createEntitiesToolDef,
    addObservationsToolDef,
    createRelationsToolDef,
    // Individual agents
    ...agentTools,
  ];
}
