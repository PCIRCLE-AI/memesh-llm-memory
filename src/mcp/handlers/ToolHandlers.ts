/**
 * Tool Handlers Module
 *
 * Handles all MCP tool operations. Provides handlers for:
 * - Memory operations (recall, create entities, add observations, create relations)
 * - Hook integration (tool use tracking)
 * - Skill management
 * - Uninstallation
 * - Mistake recording
 * - Test generation
 *
 * @module ToolHandlers
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ValidationError, OperationError } from '../../errors/index.js';
import { RateLimiter } from '../../utils/RateLimiter.js';
import { AgentRegistry } from '../../core/AgentRegistry.js';
import { SkillManager } from '../../skills/index.js';
import { UninstallManager } from '../../management/index.js';
import { CheckpointDetector } from '../../core/CheckpointDetector.js';
import { HookIntegration } from '../../core/HookIntegration.js';
import { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import { UnifiedMemoryStore } from '../../memory/UnifiedMemoryStore.js';
import { MistakePatternEngine } from '../../memory/MistakePatternEngine.js';
import { UserPreferenceEngine } from '../../memory/UserPreferenceEngine.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { HumanInLoopUI } from '../HumanInLoopUI.js';
import { recallMemoryTool } from '../tools/recall-memory.js';
import { createEntitiesTool } from '../tools/create-entities.js';
import { addObservationsTool } from '../tools/add-observations.js';
import { createRelationsTool } from '../tools/create-relations.js';
import { generateTestsTool, GenerateTestsInput } from '../tools/generate-tests.js';
import { handleBuddyRecordMistake, type BuddyRecordMistakeInput } from './BuddyRecordMistake.js';
import { SamplingClient } from '../SamplingClient.js';
import { handleError, logError } from '../../utils/errorHandler.js';
import {
  ListSkillsInputSchema,
  UninstallInputSchema,
  HookToolUseInputSchema,
  RecallMemoryInputSchema,
  CreateEntitiesInputSchema,
  AddObservationsInputSchema,
  CreateRelationsInputSchema,
  GenerateTestsInputSchema,
  formatValidationError,
  type ValidatedListSkillsInput,
  type ValidatedUninstallInput,
  type ValidatedHookToolUseInput,
  type ValidatedRecallMemoryInput,
  type ValidatedCreateEntitiesInput,
  type ValidatedAddObservationsInput,
  type ValidatedCreateRelationsInput,
} from '../validation.js';

/**
 * Tool Handlers Class
 *
 * Centralized handler for all non-Git MCP tools. Each public method corresponds
 * to a specific tool and is called by ToolRouter based on the tool name.
 */
export class ToolHandlers {
  /** Rate limiter for memory operations (10 req/min) */
  private memoryRateLimiter: RateLimiter;

  /** Unified memory store for all memory operations (undefined in cloud-only mode) */
  private unifiedMemoryStore: UnifiedMemoryStore | undefined;

  /** Pattern engine for auto-extracting prevention rules (undefined in cloud-only mode) */
  private mistakePatternEngine: MistakePatternEngine | undefined;

  /** Preference engine for auto-learning user preferences (undefined in cloud-only mode) */
  private userPreferenceEngine: UserPreferenceEngine | undefined;

  constructor(
    private agentRegistry: AgentRegistry,
    private skillManager: SkillManager,
    private uninstallManager: UninstallManager,
    private checkpointDetector: CheckpointDetector,
    private hookIntegration: HookIntegration,
    private projectMemoryManager: ProjectMemoryManager | undefined,
    private knowledgeGraph: KnowledgeGraph | undefined,
    private ui: HumanInLoopUI,
    private samplingClient: SamplingClient,
    unifiedMemoryStore: UnifiedMemoryStore | undefined
  ) {
    this.memoryRateLimiter = new RateLimiter({ requestsPerMinute: 10 });
    this.unifiedMemoryStore = unifiedMemoryStore;

    // Initialize memory engines only if unified store is available
    this.mistakePatternEngine = unifiedMemoryStore ? new MistakePatternEngine(unifiedMemoryStore) : undefined;
    this.userPreferenceEngine = unifiedMemoryStore ? new UserPreferenceEngine(unifiedMemoryStore) : undefined;
  }

  /**
   * Check if local memory systems are available
   * @returns true if running in cloud-only mode (local storage unavailable)
   */
  private isCloudOnlyMode(): boolean {
    return this.knowledgeGraph === undefined || this.projectMemoryManager === undefined;
  }

  /**
   * Return cloud-only mode error message
   * @param toolName - Name of the tool being called
   */
  private cloudOnlyModeError(toolName: string): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Tool '${toolName}' is not available in cloud-only mode.\n\n` +
                `This MCP server is running without local SQLite storage (better-sqlite3 unavailable).\n\n` +
                `To use local memory tools:\n` +
                `1. Install better-sqlite3: npm install better-sqlite3\n` +
                `2. Restart the MCP server\n\n` +
                `OR use cloud sync tools instead:\n` +
                `- memesh-cloud-sync: Sync with cloud storage (requires MEMESH_API_KEY)`,
        },
      ],
      isError: true,
    };
  }

  /**
   * Handle buddy_skills tool - List all skills
   */
  async handleListSkills(args: unknown): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedListSkillsInput;
      try {
        validatedInput = ListSkillsInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleListSkills',
              schema: 'ListSkillsInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const filter = validatedInput.filter || 'all';

      let skills: string[];
      let title: string;

      switch (filter) {
        case 'claude-code-buddy':
          skills = await this.skillManager.listSmartAgentsSkills();
          title = 'MeMesh Skills (sa: prefix)';
          break;
        case 'user':
          skills = await this.skillManager.listUserSkills();
          title = 'User Skills';
          break;
        case 'all':
        default:
          const allSkillsMetadata = await this.skillManager.listAllSkills();
          skills = allSkillsMetadata.map(s => s.name);
          title = 'All Skills';
          break;
      }

      let output = `${title}\n`;
      output += '='.repeat(60) + '\n\n';

      if (skills.length === 0) {
        output += '  No skills found.\n\n';
        if (filter === 'claude-code-buddy') {
          output += 'MeMesh can generate skills automatically.\n';
          output += 'Skills will appear here once generated.\n';
        }
      } else {
        output += `Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}\n\n`;

        const saSkills = skills.filter(s => s.startsWith('sa:'));
        const userSkills = skills.filter(s => !s.startsWith('sa:'));

        if (filter === 'all') {
          if (saSkills.length > 0) {
            output += 'MeMesh Skills:\n';
            output += '-'.repeat(60) + '\n';
            saSkills.forEach(skill => {
              output += `  - ${skill}\n`;
            });
            output += '\n';
          }

          if (userSkills.length > 0) {
            output += 'User Skills:\n';
            output += '-'.repeat(60) + '\n';
            userSkills.forEach(skill => {
              output += `  - ${skill}\n`;
            });
            output += '\n';
          }
        } else {
          skills.forEach(skill => {
            output += `  - ${skill}\n`;
          });
          output += '\n';
        }
      }

      output += '='.repeat(60) + '\n';
      output += '\nUsage:\n';
      output += '  - buddy_skills - List all skills\n';
      output += '  - buddy_skills --filter claude-code-buddy - List only sa: skills\n';
      output += '  - buddy_skills --filter user - List only user skills\n';
      output += '\nSkill Naming Convention:\n';
      output += '  - sa:<name> - MeMesh generated skills\n';
      output += '  - <name> - User-installed skills\n';

      return {
        content: [
          {
            type: 'text' as const,
            text: output,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleListSkills',
        operation: 'listing skills',
        data: { filter: (args as { filter?: string } | null)?.filter },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleListSkills',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `List skills failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle buddy_uninstall tool - Uninstall MeMesh
   */
  async handleUninstall(args: unknown): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedUninstallInput;
      try {
        validatedInput = UninstallInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleUninstall',
              schema: 'UninstallInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const report = await this.uninstallManager.uninstall(validatedInput);
      const formattedReport = this.uninstallManager.formatReport(report);

      return {
        content: [
          {
            type: 'text' as const,
            text: formattedReport,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleUninstall',
        operation: 'uninstalling MeMesh',
        data: { options: args },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleUninstall',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Uninstall failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle hook-tool-use tool
   */
  async handleHookToolUse(args: unknown): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedHookToolUseInput;
      try {
        validatedInput = HookToolUseInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleHookToolUse',
              schema: 'HookToolUseInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      await this.hookIntegration.processToolUse({
        toolName: validatedInput.toolName,
        arguments: validatedInput.arguments,
        success: validatedInput.success,
        duration: validatedInput.duration,
        tokensUsed: validatedInput.tokensUsed,
        output: validatedInput.output,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true }, null, 2),
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleHookToolUse',
        operation: 'processing hook tool use',
        data: { toolName: (args as { toolName?: string } | null)?.toolName },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleHookToolUse',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Hook processing failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle recall-memory tool
   */
  async handleRecallMemory(args: unknown): Promise<CallToolResult> {
    // Check for cloud-only mode
    if (this.isCloudOnlyMode()) {
      return this.cloudOnlyModeError('recall-memory');
    }

    if (!this.memoryRateLimiter.consume()) {
      throw new OperationError(
        'Memory operation rate limit exceeded. Please try again later.',
        {
          component: 'ToolHandlers',
          method: 'handleRecallMemory',
          rateLimitStatus: this.memoryRateLimiter.getStatus(),
        }
      );
    }

    try {
      let validatedInput: ValidatedRecallMemoryInput;
      try {
        validatedInput = RecallMemoryInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleRecallMemory',
              schema: 'RecallMemoryInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      // Safe to use non-null assertion - cloud-only mode check at method start ensures non-null
      const result = await recallMemoryTool.handler(
        validatedInput,
        this.projectMemoryManager!
      );

      let text = 'Project Memory Recall\n';
      text += '='.repeat(60) + '\n\n';

      if (result.memories.length === 0) {
        text += 'No memories found.\n\n';
        text += 'Memories will be created as you work on the project.\n';
      } else {
        text += `Found ${result.memories.length} recent memories:\n\n`;

        result.memories.forEach((memory, index) => {
          text += `${index + 1}. ${memory.type}\n`;
          if (memory.timestamp) {
            text += `   Timestamp: ${memory.timestamp}\n`;
          }
          if (memory.observations && memory.observations.length > 0) {
            text += '   Observations:\n';
            memory.observations.forEach(obs => {
              text += `   - ${obs}\n`;
            });
          }
          text += '\n';
        });
      }

      text += '='.repeat(60) + '\n';

      return {
        content: [
          {
            type: 'text' as const,
            text,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleRecallMemory',
        operation: 'recalling project memory',
        data: { query: (args as { query?: string } | null)?.query, limit: (args as { limit?: number } | null)?.limit },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleRecallMemory',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to recall memory: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle create-entities tool
   */
  async handleCreateEntities(args: unknown): Promise<CallToolResult> {
    // Check for cloud-only mode
    if (this.isCloudOnlyMode()) {
      return this.cloudOnlyModeError('create-entities');
    }

    if (!this.memoryRateLimiter.consume()) {
      throw new OperationError(
        'Memory operation rate limit exceeded. Please try again later.',
        {
          component: 'ToolHandlers',
          method: 'handleCreateEntities',
          rateLimitStatus: this.memoryRateLimiter.getStatus(),
        }
      );
    }

    try {
      let validatedInput: ValidatedCreateEntitiesInput;
      try {
        validatedInput = CreateEntitiesInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleCreateEntities',
              schema: 'CreateEntitiesInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      // Safe to use non-null assertion - cloud-only mode check at method start ensures non-null
      const result = await createEntitiesTool.handler(
        validatedInput,
        this.knowledgeGraph!
      );

      let text = 'Knowledge Graph Entity Creation\n';
      text += '='.repeat(60) + '\n\n';

      if (result.count === 0) {
        text += 'No entities were created.\n\n';
        if (result.errors && result.errors.length > 0) {
          text += 'Errors encountered:\n';
          result.errors.forEach(error => {
            text += `  - ${error.name}: ${error.error}\n`;
          });
        }
      } else {
        text += `Successfully created ${result.count} ${result.count === 1 ? 'entity' : 'entities'}:\n\n`;
        result.created.forEach((name, index) => {
          text += `${index + 1}. ${name}\n`;
        });

        if (result.errors && result.errors.length > 0) {
          text += '\nSome entities failed:\n';
          result.errors.forEach(error => {
            text += `  - ${error.name}: ${error.error}\n`;
          });
        }
      }

      text += '\n' + '='.repeat(60) + '\n';

      return {
        content: [
          {
            type: 'text' as const,
            text,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleCreateEntities',
        operation: 'creating knowledge graph entities',
        data: { entityCount: (args as { entities?: unknown[] } | null)?.entities?.length ?? 0 },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleCreateEntities',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to create entities: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle buddy-record-mistake tool
   */
  async handleBuddyRecordMistake(args: unknown): Promise<CallToolResult> {
    // Check for cloud-only mode
    if (this.isCloudOnlyMode()) {
      return this.cloudOnlyModeError('buddy-record-mistake');
    }

    if (!this.memoryRateLimiter.consume()) {
      throw new OperationError(
        'Memory operation rate limit exceeded. Please try again later.',
        {
          component: 'ToolHandlers',
          method: 'handleBuddyRecordMistake',
          rateLimitStatus: this.memoryRateLimiter.getStatus(),
        }
      );
    }

    if (!args || typeof args !== 'object') {
      throw new ValidationError('Invalid input: expected object', {
        component: 'ToolHandlers',
        method: 'handleBuddyRecordMistake',
        providedArgs: args,
      });
    }

    const input = args as BuddyRecordMistakeInput;

    const requiredFields = ['action', 'errorType', 'userCorrection', 'correctMethod', 'impact', 'preventionMethod'];
    for (const field of requiredFields) {
      if (!(field in input) || !input[field as keyof BuddyRecordMistakeInput]) {
        throw new ValidationError(`Missing required field: ${field}`, {
          component: 'ToolHandlers',
          method: 'handleBuddyRecordMistake',
          missingField: field,
        });
      }
    }

    // Safe to use non-null assertions - cloud-only mode check at method start ensures non-null
    return handleBuddyRecordMistake(
      input,
      this.unifiedMemoryStore!,
      this.mistakePatternEngine!,
      this.userPreferenceEngine!
    );
  }

  /**
   * Handle add-observations tool
   */
  async handleAddObservations(args: unknown): Promise<CallToolResult> {
    // Check for cloud-only mode
    if (this.isCloudOnlyMode()) {
      return this.cloudOnlyModeError('add-observations');
    }

    if (!this.memoryRateLimiter.consume()) {
      throw new OperationError(
        'Memory operation rate limit exceeded. Please try again later.',
        {
          component: 'ToolHandlers',
          method: 'handleAddObservations',
          rateLimitStatus: this.memoryRateLimiter.getStatus(),
        }
      );
    }

    try {
      let validatedInput: ValidatedAddObservationsInput;
      try {
        validatedInput = AddObservationsInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleAddObservations',
              schema: 'AddObservationsInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      // Safe to use non-null assertion - cloud-only mode check at method start ensures non-null
      const result = await addObservationsTool.handler(
        validatedInput,
        this.knowledgeGraph!
      );

      let text = 'Knowledge Graph Observation Update\n';
      text += '='.repeat(60) + '\n\n';

      if (result.count === 0) {
        text += 'No observations were added.\n\n';
        if (result.notFound && result.notFound.length > 0) {
          text += 'Entities not found:\n';
          result.notFound.forEach(name => {
            text += `  - ${name}\n`;
          });
        }
        if (result.errors && result.errors.length > 0) {
          text += '\nErrors encountered:\n';
          result.errors.forEach(error => {
            text += `  - ${error.entityName}: ${error.error}\n`;
          });
        }
      } else {
        text += `Successfully updated ${result.count} ${result.count === 1 ? 'entity' : 'entities'}:\n\n`;
        result.updated.forEach((name, index) => {
          text += `${index + 1}. ${name}\n`;
        });

        if (result.notFound && result.notFound.length > 0) {
          text += '\nSome entities were not found:\n';
          result.notFound.forEach(name => {
            text += `  - ${name}\n`;
          });
        }

        if (result.errors && result.errors.length > 0) {
          text += '\nSome updates failed:\n';
          result.errors.forEach(error => {
            text += `  - ${error.entityName}: ${error.error}\n`;
          });
        }
      }

      text += '\n' + '='.repeat(60) + '\n';

      return {
        content: [
          {
            type: 'text' as const,
            text,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleAddObservations',
        operation: 'adding observations to entities',
        data: { observationCount: (args as { observations?: unknown[] } | null)?.observations?.length ?? 0 },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleAddObservations',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to add observations: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle create-relations tool
   */
  async handleCreateRelations(args: unknown): Promise<CallToolResult> {
    // Check for cloud-only mode
    if (this.isCloudOnlyMode()) {
      return this.cloudOnlyModeError('create-relations');
    }

    if (!this.memoryRateLimiter.consume()) {
      throw new OperationError(
        'Memory operation rate limit exceeded. Please try again later.',
        {
          component: 'ToolHandlers',
          method: 'handleCreateRelations',
          rateLimitStatus: this.memoryRateLimiter.getStatus(),
        }
      );
    }

    try {
      let validatedInput: ValidatedCreateRelationsInput;
      try {
        validatedInput = CreateRelationsInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleCreateRelations',
              schema: 'CreateRelationsInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      // Safe to use non-null assertion - cloud-only mode check at method start ensures non-null
      const result = await createRelationsTool.handler(
        validatedInput,
        this.knowledgeGraph!
      );

      let text = 'Knowledge Graph Relation Creation\n';
      text += '='.repeat(60) + '\n\n';

      if (result.count === 0) {
        text += 'No relations were created.\n\n';
        if (result.missingEntities && result.missingEntities.length > 0) {
          text += 'Entities not found:\n';
          result.missingEntities.forEach(name => {
            text += `  - ${name}\n`;
          });
        }
        if (result.errors && result.errors.length > 0) {
          text += '\nErrors encountered:\n';
          result.errors.forEach(error => {
            text += `  - ${error.from} -> ${error.to}: ${error.error}\n`;
          });
        }
      } else {
        text += `Successfully created ${result.count} ${result.count === 1 ? 'relation' : 'relations'}:\n\n`;
        result.created.forEach((rel, index) => {
          text += `${index + 1}. ${rel.from} --[${rel.type}]--> ${rel.to}\n`;
        });

        if (result.missingEntities && result.missingEntities.length > 0) {
          text += '\nSome entities were not found:\n';
          result.missingEntities.forEach(name => {
            text += `  - ${name}\n`;
          });
        }

        if (result.errors && result.errors.length > 0) {
          text += '\nSome relations failed:\n';
          result.errors.forEach(error => {
            text += `  - ${error.from} -> ${error.to}: ${error.error}\n`;
          });
        }
      }

      text += '\n' + '='.repeat(60) + '\n';

      return {
        content: [
          {
            type: 'text' as const,
            text,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleCreateRelations',
        operation: 'creating entity relations',
        data: { relationCount: (args as { relations?: unknown[] } | null)?.relations?.length ?? 0 },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleCreateRelations',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to create relations: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle generate-tests tool
   */
  async handleGenerateTests(args: unknown): Promise<CallToolResult> {
    try {
      const validatedInput = GenerateTestsInputSchema.parse(args);
      const input = validatedInput as GenerateTestsInput;

      const result = await generateTestsTool(input, this.samplingClient);

      let text = 'Test Generation Result\n';
      text += '='.repeat(60) + '\n\n';
      text += `${result.message}\n\n`;
      text += '```typescript\n';
      text += result.testCode;
      text += '\n```\n\n';
      text += '='.repeat(60) + '\n';
      text += '\nNext Steps:\n';
      text += '  - Review the generated tests for accuracy\n';
      text += '  - Adjust test cases as needed\n';
      text += '  - Add edge cases if necessary\n';
      text += '  - Run tests to verify they pass\n';

      return {
        content: [
          {
            type: 'text' as const,
            text,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleGenerateTests',
        operation: 'generating tests',
        data: { args },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleGenerateTests',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to generate tests: ${handled.message}`,
          },
        ],
      };
    }
  }
}
