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
  getSessionHealth: {
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
  getWorkflowGuidance: {
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
  generateSmartPlan: {
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

  /**
   * buddy-record-mistake output structure
   */
  buddyRecordMistake: {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' },
      mistakeId: { type: 'string' },
      message: { type: 'string' },
      details: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          errorType: { type: 'string' },
          userCorrection: { type: 'string' },
          correctMethod: { type: 'string' },
          impact: { type: 'string' },
          preventionMethod: { type: 'string' },
          timestamp: { type: 'string' },
        },
        required: ['action', 'errorType', 'userCorrection', 'correctMethod', 'impact', 'preventionMethod', 'timestamp'],
      },
    },
    required: ['success', 'message'],
  },

  /**
   * create-entities output structure
   */
  createEntities: {
    type: 'object' as const,
    properties: {
      created: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of successfully created entity names',
      },
      count: { type: 'number' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            error: { type: 'string' },
          },
          required: ['name', 'error'],
        },
      },
    },
    required: ['created', 'count'],
  },

  /**
   * a2a-send-task output structure
   */
  a2aSendTask: {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' },
      targetAgentId: { type: 'string' },
      task: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          state: {
            type: 'string',
            enum: ['SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
          },
          name: { type: 'string' },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
          },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
        required: ['id', 'state', 'createdAt', 'updatedAt'],
      },
    },
    required: ['success', 'targetAgentId', 'task'],
  },

  /**
   * a2a-get-task output structure
   */
  a2aGetTask: {
    type: 'object' as const,
    properties: {
      task: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          state: {
            type: 'string',
            enum: ['SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
          },
          name: { type: 'string' },
          description: { type: 'string' },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
          },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
          sessionId: { type: 'string' },
          messageCount: { type: 'number' },
          artifactCount: { type: 'number' },
        },
        required: ['id', 'state', 'createdAt', 'updatedAt'],
      },
    },
    required: ['task'],
  },

  /**
   * a2a-list-tasks output structure
   */
  a2aListTasks: {
    type: 'object' as const,
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            state: {
              type: 'string',
              enum: ['SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
            },
            name: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'urgent'],
            },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            messageCount: { type: 'number' },
            artifactCount: { type: 'number' },
          },
          required: ['id', 'state', 'createdAt', 'updatedAt', 'messageCount', 'artifactCount'],
        },
      },
      count: { type: 'number' },
    },
    required: ['tasks', 'count'],
  },

  /**
   * a2a-list-agents output structure
   */
  a2aListAgents: {
    type: 'object' as const,
    properties: {
      agents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            baseUrl: { type: 'string' },
            port: { type: 'number' },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'stale'],
            },
            lastHeartbeat: { type: 'string' },
            capabilities: { type: 'object' },
            metadata: { type: 'object' },
          },
          required: ['agentId', 'baseUrl', 'port', 'status', 'lastHeartbeat'],
        },
      },
      count: { type: 'number' },
    },
    required: ['agents', 'count'],
  },

  /**
   * generate-tests output structure
   */
  generateTests: {
    type: 'object' as const,
    properties: {
      testCode: { type: 'string' },
      message: { type: 'string' },
    },
    required: ['testCode', 'message'],
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

export type BuddyRecordMistakeOutput = {
  success: boolean;
  message: string;
  mistakeId?: string;
  details?: {
    action: string;
    errorType: string;
    userCorrection: string;
    correctMethod: string;
    impact: string;
    preventionMethod: string;
    timestamp: string;
  };
};

export type CreateEntitiesOutput = {
  created: string[];
  count: number;
  errors?: Array<{
    name: string;
    error: string;
  }>;
};

export type A2ASendTaskOutput = {
  success: boolean;
  targetAgentId: string;
  task: {
    id: string;
    state: 'SUBMITTED' | 'WORKING' | 'INPUT_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    name?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
};

export type A2AGetTaskOutput = {
  task: {
    id: string;
    state: 'SUBMITTED' | 'WORKING' | 'INPUT_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    name?: string;
    description?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    sessionId?: string;
    messageCount?: number;
    artifactCount?: number;
  };
};

export type A2AListTasksOutput = {
  tasks: Array<{
    id: string;
    state: 'SUBMITTED' | 'WORKING' | 'INPUT_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    artifactCount: number;
    name?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }>;
  count: number;
};

export type A2AListAgentsOutput = {
  agents: Array<{
    agentId: string;
    baseUrl: string;
    port: number;
    status: 'active' | 'inactive' | 'stale';
    lastHeartbeat: string;
    capabilities?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
  count: number;
};

export type GenerateTestsOutput = {
  testCode: string;
  message: string;
};
