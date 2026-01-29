/**
 * MCP Output Schemas
 *
 * JSON Schema definitions for MCP tool outputs (MCP Specification 2025-11-25)
 *
 * These schemas define the structure of responses from each tool,
 * enabling runtime validation and type safety.
 *
 * @example
 * ```typescript
 * import { OutputSchemas, BuddyDoOutput } from './schemas/OutputSchemas.js';
 *
 * // Use schema for validation
 * const schema = OutputSchemas.buddyDo;
 *
 * // Use inferred type
 * const response: BuddyDoOutput = {
 *   routing: {
 *     approved: true,
 *     message: 'Task approved for execution',
 *   },
 * };
 * ```
 */

export const OutputSchemas = {
  /**
   * buddy-do output structure
   */
  buddyDo: {
    type: 'object' as const,
    properties: {
      routing: {
        type: 'object',
        properties: {
          approved: { type: 'boolean' },
          message: { type: 'string' },
          capabilityFocus: {
            type: 'array',
            items: { type: 'string' },
          },
          complexity: {
            type: 'string',
            enum: ['simple', 'medium', 'complex'],
          },
          estimatedTokens: { type: 'number' },
          estimatedCost: { type: 'number' },
        },
        required: ['approved', 'message'],
      },
      enhancedPrompt: {
        type: 'object',
        properties: {
          systemPrompt: { type: 'string' },
          userPrompt: { type: 'string' },
          suggestedModel: { type: 'string' },
        },
      },
      stats: {
        type: 'object',
        properties: {
          durationMs: { type: 'number' },
          estimatedTokens: { type: 'number' },
        },
      },
    },
    required: ['routing'],
  },

  /**
   * buddy-remember output structure
   */
  buddyRemember: {
    type: 'object' as const,
    properties: {
      query: { type: 'string' },
      count: { type: 'number' },
      memories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            type: { type: 'string' },
            timestamp: { type: 'string' },
            relevance: { type: 'number' },
          },
        },
      },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['query', 'count'],
  },

  /**
   * buddy-help output structure
   */
  buddyHelp: {
    type: 'object' as const,
    properties: {
      commands: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            usage: { type: 'string' },
            examples: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['name', 'description'],
        },
      },
    },
    required: ['commands'],
  },

  /**
   * get-session-health output structure
   */
  sessionHealth: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['healthy', 'degraded', 'unhealthy'],
      },
      tokenUsagePercentage: { type: 'number' },
      warnings: {
        type: 'array',
        items: { type: 'string' },
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
      },
      timestamp: { type: 'string' },
    },
    required: ['status', 'tokenUsagePercentage', 'timestamp'],
  },

  /**
   * get-workflow-guidance output structure
   */
  workflowGuidance: {
    type: 'object' as const,
    properties: {
      currentPhase: { type: 'string' },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            confidence: { type: 'number' },
            suggestedAgent: { type: 'string' },
            reasoning: { type: 'string' },
          },
          required: ['action', 'priority'],
        },
      },
      nextSteps: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['currentPhase', 'recommendations'],
  },

  /**
   * generate-smart-plan output structure
   */
  smartPlan: {
    type: 'object' as const,
    properties: {
      planId: { type: 'string' },
      featureDescription: { type: 'string' },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            estimatedDuration: { type: 'string' },
            requiredCapabilities: {
              type: 'array',
              items: { type: 'string' },
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
            },
            testCriteria: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['id', 'title', 'description'],
        },
      },
      totalEstimatedDuration: { type: 'string' },
      risks: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['planId', 'featureDescription', 'tasks'],
  },

  /**
   * hook-tool-use output structure
   */
  hookToolUse: {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      recorded: {
        type: 'object',
        properties: {
          toolName: { type: 'string' },
          timestamp: { type: 'string' },
          success: { type: 'boolean' },
        },
      },
    },
    required: ['success', 'message'],
  },
};

/**
 * TypeScript type inference helpers
 *
 * These types are inferred from the JSON schemas above,
 * providing type safety for tool responses.
 */

export type BuddyDoOutput = {
  routing: {
    approved: boolean;
    message: string;
    capabilityFocus?: string[];
    complexity?: 'simple' | 'medium' | 'complex';
    estimatedTokens?: number;
    estimatedCost?: number;
  };
  enhancedPrompt?: {
    systemPrompt?: string;
    userPrompt?: string;
    suggestedModel?: string;
  };
  stats?: {
    durationMs?: number;
    estimatedTokens?: number;
  };
};

export type BuddyRememberOutput = {
  query: string;
  count: number;
  memories?: Array<{
    id?: string;
    content?: string;
    type?: string;
    timestamp?: string;
    relevance?: number;
  }>;
  suggestions?: string[];
};

export type BuddyHelpOutput = {
  commands: Array<{
    name: string;
    description: string;
    usage?: string;
    examples?: string[];
  }>;
};

export type SessionHealthOutput = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  tokenUsagePercentage: number;
  timestamp: string;
  warnings?: string[];
  recommendations?: string[];
};

export type WorkflowGuidanceOutput = {
  currentPhase: string;
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    suggestedAgent?: string;
    reasoning?: string;
  }>;
  nextSteps?: string[];
};

export type SmartPlanOutput = {
  planId: string;
  featureDescription: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    estimatedDuration?: string;
    requiredCapabilities?: string[];
    dependencies?: string[];
    testCriteria?: string[];
  }>;
  totalEstimatedDuration?: string;
  risks?: string[];
};

export type HookToolUseOutput = {
  success: boolean;
  message: string;
  recorded?: {
    toolName?: string;
    timestamp?: string;
    success?: boolean;
  };
};
