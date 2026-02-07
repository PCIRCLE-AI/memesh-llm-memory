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

  /**
   * memesh-cloud-sync output structure
   */
  cloudSync: {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' },
      action: { type: 'string', enum: ['push', 'pull', 'status'] },
      message: { type: 'string' },
      pushed: { type: 'number' },
      pulled: { type: 'number' },
      errors: { type: 'number' },
      dryRun: { type: 'boolean' },
      connected: { type: 'boolean' },
      local: { type: 'object', properties: { count: { type: 'number' } } },
      cloud: { type: 'object', properties: { count: { type: 'number' } } },
      delta: { type: 'number' },
      hasMore: { type: 'boolean' },
      hint: { type: 'string' },
    },
    required: ['success'],
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

export type GenerateTestsOutput = {
  testCode: string;
  message: string;
};
