/**
 * Tool Handlers Module
 *
 * Handles all MCP tool operations. Provides handlers for:
 * - Smart routing, workflow guidance, planning, memory, and hook integration
 * - Workflow guidance and session management
 * - Planning and decomposition
 * - Memory recall
 * - Uninstallation
 *
 * This module was extracted from server.ts for better modularity and separation
 * of concerns. Each handler method corresponds to a specific MCP tool.
 *
 * @module ToolHandlers
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ValidationError, OperationError } from '../../errors/index.js';
import { Router } from '../../orchestrator/router.js';
import { RateLimiter } from '../../utils/RateLimiter.js';
import { AgentRegistry } from '../../core/AgentRegistry.js';
import { FeedbackCollector } from '../../evolution/FeedbackCollector.js';
import { PerformanceTracker } from '../../evolution/PerformanceTracker.js';
import { LearningManager } from '../../evolution/LearningManager.js';
import { EvolutionMonitor } from '../../evolution/EvolutionMonitor.js';
import { SkillManager } from '../../skills/index.js';
import { UninstallManager } from '../../management/index.js';
import { DevelopmentButler } from '../../agents/DevelopmentButler.js';
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
import type { AgentType } from '../../orchestrator/types.js';
import { handleError, logError } from '../../utils/errorHandler.js';
import {
  ListSkillsInputSchema,
  UninstallInputSchema,
  WorkflowGuidanceInputSchema,
  RecordTokenUsageInputSchema,
  HookToolUseInputSchema,
  RecallMemoryInputSchema,
  CreateEntitiesInputSchema,
  AddObservationsInputSchema,
  CreateRelationsInputSchema,
  GenerateTestsInputSchema,
  formatValidationError,
  type ValidatedListSkillsInput,
  type ValidatedUninstallInput,
  type ValidatedWorkflowGuidanceInput,
  type ValidatedRecordTokenUsageInput,
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
 *
 * **Responsibilities**:
 * - Input validation and error handling
 * - Delegating to appropriate service classes
 * - Formatting responses for MCP protocol
 * - Logging and telemetry
 *
 * **Design Patterns**:
 * - Dependency Injection: All dependencies passed via constructor
 * - Single Responsibility: Each method handles exactly one tool
 * - Error Handling: Try-catch with structured error logging
 * - Consistent Response Format: All methods return CallToolResult shape
 */
export class ToolHandlers {
  /**
   * ✅ FIX MAJOR-2: Rate limiter for memory operations (10 req/min)
   * Prevents DoS through excessive database writes
   */
  private memoryRateLimiter: RateLimiter;

  /**
   * ✅ Phase 0.7.0: Unified memory store for all memory operations
   */
  private unifiedMemoryStore: UnifiedMemoryStore;

  /**
   * ✅ Phase 0.7.0: Pattern engine for auto-extracting prevention rules
   */
  private mistakePatternEngine: MistakePatternEngine;

  /**
   * ✅ Phase 0.7.0: Preference engine for auto-learning user preferences
   */
  private userPreferenceEngine: UserPreferenceEngine;

  /**
   * Create a new ToolHandlers instance
   *
   * @param router - Main task routing engine
   * @param agentRegistry - Registry of available agents
   * @param feedbackCollector - User feedback collection system
   * @param performanceTracker - Performance metrics tracker
   * @param learningManager - Continuous learning system
   * @param evolutionMonitor - Evolution monitoring and reporting
   * @param skillManager - Skill installation and management
   * @param uninstallManager - Uninstallation coordinator
   * @param developmentButler - Workflow guidance engine
   * @param checkpointDetector - Development checkpoint detection
   * @param hookIntegration - Hook integration bridge
   * @param projectMemoryManager - Project-specific memory system
   * @param knowledgeGraph - Knowledge graph for entity/relation storage
   * @param ui - Human-in-loop UI formatter
   * @param samplingClient - Sampling client for AI-powered operations
   * @param unifiedMemoryStore - Unified memory store (Phase 0.7.0)
   */
  constructor(
    private router: Router,
    private agentRegistry: AgentRegistry,
    private feedbackCollector: FeedbackCollector,
    private performanceTracker: PerformanceTracker,
    private learningManager: LearningManager,
    private evolutionMonitor: EvolutionMonitor,
    private skillManager: SkillManager,
    private uninstallManager: UninstallManager,
    private developmentButler: DevelopmentButler,
    private checkpointDetector: CheckpointDetector,
    private hookIntegration: HookIntegration,
    private projectMemoryManager: ProjectMemoryManager,
    private knowledgeGraph: KnowledgeGraph,
    private ui: HumanInLoopUI,
    private samplingClient: SamplingClient,
    unifiedMemoryStore: UnifiedMemoryStore
  ) {
    // ✅ FIX MAJOR-2: Initialize rate limiter for memory operations
    this.memoryRateLimiter = new RateLimiter({ requestsPerMinute: 10 });

    // ✅ Phase 0.7.0: Initialize unified memory system
    this.unifiedMemoryStore = unifiedMemoryStore;
    this.mistakePatternEngine = new MistakePatternEngine(this.unifiedMemoryStore);
    this.userPreferenceEngine = new UserPreferenceEngine(this.unifiedMemoryStore);
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

      // Get skills based on filter
      let skills: string[];
      let title: string;

      switch (filter) {
        case 'claude-code-buddy':
          skills = await this.skillManager.listSmartAgentsSkills();
          title = '🎓 MeMesh Skills (sa: prefix)';
          break;
        case 'user':
          skills = await this.skillManager.listUserSkills();
          title = '👤 User Skills';
          break;
        case 'all':
        default:
          const allSkillsMetadata = await this.skillManager.listAllSkills();
          skills = allSkillsMetadata.map(s => s.name);
          title = '🎓 All Skills';
          break;
      }

      // Build formatted output
      let output = `${title}\n`;
      output += '━'.repeat(60) + '\n\n';

      if (skills.length === 0) {
        output += '  No skills found.\n\n';
        if (filter === 'claude-code-buddy') {
          output += '💡 MeMesh can generate skills automatically.\n';
          output += '   Skills will appear here once generated.\n';
        }
      } else {
        output += `Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}\n\n`;

        // Group by prefix
        const saSkills = skills.filter(s => s.startsWith('sa:'));
        const userSkills = skills.filter(s => !s.startsWith('sa:'));

        if (filter === 'all') {
          if (saSkills.length > 0) {
            output += '🎓 MeMesh Skills:\n';
            output += '─'.repeat(60) + '\n';
            saSkills.forEach(skill => {
              output += `  • ${skill}\n`;
            });
            output += '\n';
          }

          if (userSkills.length > 0) {
            output += '👤 User Skills:\n';
            output += '─'.repeat(60) + '\n';
            userSkills.forEach(skill => {
              output += `  • ${skill}\n`;
            });
            output += '\n';
          }
        } else {
          skills.forEach(skill => {
            output += `  • ${skill}\n`;
          });
          output += '\n';
        }
      }

      output += '━'.repeat(60) + '\n';
      output += '\n💡 Usage:\n';
      output += '  • buddy_skills - List all skills\n';
      output += '  • buddy_skills --filter claude-code-buddy - List only sa: skills\n';
      output += '  • buddy_skills --filter user - List only user skills\n';
      output += '\n📚 Skill Naming Convention:\n';
      output += '  • sa:<name> - MeMesh generated skills\n';
      output += '  • <name> - User-installed skills\n';

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
            text: `❌ List skills failed: ${handled.message}`,
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

      // Perform uninstallation
      const report = await this.uninstallManager.uninstall(validatedInput);

      // Format report for display
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
            text: `❌ Uninstall failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle get-workflow-guidance tool
   */
  async handleGetWorkflowGuidance(args: unknown): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedWorkflowGuidanceInput;
      try {
        validatedInput = WorkflowGuidanceInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleGetWorkflowGuidance',
              schema: 'WorkflowGuidanceInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const normalizedPhase = this.normalizeWorkflowPhase(validatedInput.phase);
      if (!normalizedPhase) {
        throw new ValidationError(
          `Invalid workflow phase: ${validatedInput.phase}`,
          {
            component: 'ToolHandlers',
            method: 'handleGetWorkflowGuidance',
            validPhases: ['idle', 'code-written', 'test-complete', 'commit-ready', 'committed'],
            providedPhase: validatedInput.phase,
          }
        );
      }

      const result = await this.developmentButler.processCheckpoint(
        normalizedPhase,
        {
          ...validatedInput,
          phase: normalizedPhase,
        }
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: result.formattedRequest,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleGetWorkflowGuidance',
        operation: 'processing workflow checkpoint',
        data: { phase: (args as { phase?: string } | null)?.phase },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleGetWorkflowGuidance',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Workflow guidance failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle get-session-health tool
   */
  async handleGetSessionHealth(): Promise<CallToolResult> {
    try {
      const health = this.developmentButler.getContextMonitor().checkSessionHealth();

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(health, null, 2),
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleGetSessionHealth',
        operation: 'checking session health',
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleGetSessionHealth',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Session health check failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle reload-context tool
   */
  async handleReloadContext(input: { reason: string }): Promise<CallToolResult> {
    try {
      const requestId = `manual_${Date.now()}`;
      const result = await this.developmentButler.executeContextReload(requestId);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleReloadContext',
        operation: 'reloading context',
        data: { reason: input.reason },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleReloadContext',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Context reload failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle record-token-usage tool
   */
  async handleRecordTokenUsage(args: unknown): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedRecordTokenUsageInput;
      try {
        validatedInput = RecordTokenUsageInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleRecordTokenUsage',
              schema: 'RecordTokenUsageInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      this.developmentButler.getTokenTracker().recordUsage({
        inputTokens: validatedInput.inputTokens,
        outputTokens: validatedInput.outputTokens,
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
        method: 'handleRecordTokenUsage',
        operation: 'recording token usage',
        data: { inputTokens: (args as { inputTokens?: number } | null)?.inputTokens, outputTokens: (args as { outputTokens?: number } | null)?.outputTokens },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleRecordTokenUsage',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Token usage recording failed: ${handled.message}`,
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
            text: `❌ Hook processing failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle generate-smart-plan tool (Phase 2)
   */
  // handleGenerateSmartPlan() removed - planning delegated to Claude's built-in capabilities

  /**
   * Handle recall-memory tool
   */
  async handleRecallMemory(args: unknown): Promise<CallToolResult> {
    // ✅ FIX MAJOR-2: Check rate limit before memory operation
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

      const result = await recallMemoryTool.handler(
        validatedInput,
        this.projectMemoryManager
      );

      // Format the memories into readable text
      let text = '📚 Project Memory Recall\n';
      text += '━'.repeat(60) + '\n\n';

      if (result.memories.length === 0) {
        text += 'No memories found.\n\n';
        text += '💡 Memories will be created as you work on the project.\n';
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

      text += '━'.repeat(60) + '\n';

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
            text: `❌ Failed to recall memory: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Map an internal agent name to a short capability hint for user-facing output.
   */
  private describeCapabilities(agentName: string): string | undefined {
    const agent = this.agentRegistry.getAgent(agentName as AgentType);
    if (!agent || !agent.capabilities || agent.capabilities.length === 0) {
      return undefined;
    }

    return agent.capabilities.slice(0, 3).join(', ');
  }

  /**
   * Handle create-entities tool
   *
   * Creates new entities in the Knowledge Graph for manual knowledge recording.
   */
  async handleCreateEntities(args: unknown): Promise<CallToolResult> {
    // ✅ FIX MAJOR-2: Check rate limit before memory operation
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

      const result = await createEntitiesTool.handler(
        validatedInput,
        this.knowledgeGraph
      );

      // Format the result into readable text
      let text = '✨ Knowledge Graph Entity Creation\n';
      text += '━'.repeat(60) + '\n\n';

      if (result.count === 0) {
        text += '⚠️ No entities were created.\n\n';
        if (result.errors && result.errors.length > 0) {
          text += 'Errors encountered:\n';
          result.errors.forEach(error => {
            text += `  ❌ ${error.name}: ${error.error}\n`;
          });
        }
      } else {
        text += `✅ Successfully created ${result.count} ${result.count === 1 ? 'entity' : 'entities'}:\n\n`;
        result.created.forEach((name, index) => {
          text += `${index + 1}. ${name}\n`;
        });

        if (result.errors && result.errors.length > 0) {
          text += '\n⚠️ Some entities failed:\n';
          result.errors.forEach(error => {
            text += `  ❌ ${error.name}: ${error.error}\n`;
          });
        }
      }

      text += '\n' + '━'.repeat(60) + '\n';

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
            text: `❌ Failed to create entities: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle buddy-record-mistake tool
   *
   * Phase 0.7.0: Records AI mistakes to UnifiedMemoryStore with auto-extraction
   * of PreventionRule and UserPreference.
   *
   * This is the CRITICAL fix for Fatal Flaw #1:
   * - Previously: Stored to FeedbackCollector (separate from KnowledgeGraph)
   * - Now: Stored to UnifiedMemoryStore + auto-extracts rules and preferences
   */
  async handleBuddyRecordMistake(args: unknown): Promise<CallToolResult> {
    // ✅ FIX MAJOR-2: Check rate limit before memory operation
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

    // Validate input
    if (!args || typeof args !== 'object') {
      throw new ValidationError('Invalid input: expected object', {
        component: 'ToolHandlers',
        method: 'handleBuddyRecordMistake',
        providedArgs: args,
      });
    }

    const input = args as BuddyRecordMistakeInput;

    // Validate required fields
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

    // ✅ Phase 0.7.0: Use UnifiedMemoryStore + auto-extraction
    return handleBuddyRecordMistake(
      input,
      this.unifiedMemoryStore,
      this.mistakePatternEngine,
      this.userPreferenceEngine
    );
  }

  /**
   * Handle add-observations tool
   *
   * Adds new observations to existing entities in the Knowledge Graph.
   */
  async handleAddObservations(args: unknown): Promise<CallToolResult> {
    // ✅ FIX MAJOR-2: Check rate limit before memory operation
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

      const result = await addObservationsTool.handler(
        validatedInput,
        this.knowledgeGraph
      );

      // Format the result into readable text
      let text = '📝 Knowledge Graph Observation Update\n';
      text += '━'.repeat(60) + '\n\n';

      if (result.count === 0) {
        text += '⚠️ No observations were added.\n\n';
        if (result.notFound && result.notFound.length > 0) {
          text += 'Entities not found:\n';
          result.notFound.forEach(name => {
            text += `  ❌ ${name}\n`;
          });
        }
        if (result.errors && result.errors.length > 0) {
          text += '\nErrors encountered:\n';
          result.errors.forEach(error => {
            text += `  ❌ ${error.entityName}: ${error.error}\n`;
          });
        }
      } else {
        text += `✅ Successfully updated ${result.count} ${result.count === 1 ? 'entity' : 'entities'}:\n\n`;
        result.updated.forEach((name, index) => {
          text += `${index + 1}. ${name}\n`;
        });

        if (result.notFound && result.notFound.length > 0) {
          text += '\n⚠️ Some entities were not found:\n';
          result.notFound.forEach(name => {
            text += `  ❌ ${name}\n`;
          });
        }

        if (result.errors && result.errors.length > 0) {
          text += '\n⚠️ Some updates failed:\n';
          result.errors.forEach(error => {
            text += `  ❌ ${error.entityName}: ${error.error}\n`;
          });
        }
      }

      text += '\n' + '━'.repeat(60) + '\n';

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
            text: `❌ Failed to add observations: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle create-relations tool
   *
   * Creates relations between entities in the Knowledge Graph.
   *
   */
  async handleCreateRelations(args: unknown): Promise<CallToolResult> {
    // ✅ FIX MAJOR-2: Check rate limit before memory operation
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

      const result = await createRelationsTool.handler(
        validatedInput,
        this.knowledgeGraph
      );

      // Format the result into readable text
      let text = '🔗 Knowledge Graph Relation Creation\n';
      text += '━'.repeat(60) + '\n\n';

      if (result.count === 0) {
        text += '⚠️ No relations were created.\n\n';
        if (result.missingEntities && result.missingEntities.length > 0) {
          text += 'Entities not found:\n';
          result.missingEntities.forEach(name => {
            text += `  ❌ ${name}\n`;
          });
        }
        if (result.errors && result.errors.length > 0) {
          text += '\nErrors encountered:\n';
          result.errors.forEach(error => {
            text += `  ❌ ${error.from} → ${error.to}: ${error.error}\n`;
          });
        }
      } else {
        text += `✅ Successfully created ${result.count} ${result.count === 1 ? 'relation' : 'relations'}:\n\n`;
        result.created.forEach((rel, index) => {
          text += `${index + 1}. ${rel.from} --[${rel.type}]--> ${rel.to}\n`;
        });

        if (result.missingEntities && result.missingEntities.length > 0) {
          text += '\n⚠️ Some entities were not found:\n';
          result.missingEntities.forEach(name => {
            text += `  ❌ ${name}\n`;
          });
        }

        if (result.errors && result.errors.length > 0) {
          text += '\n⚠️ Some relations failed:\n';
          result.errors.forEach(error => {
            text += `  ❌ ${error.from} → ${error.to}: ${error.error}\n`;
          });
        }
      }

      text += '\n' + '━'.repeat(60) + '\n';

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
            text: `❌ Failed to create relations: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle generate-tests tool
   *
   * Generates test cases from specifications or code using AI sampling.
   */
  async handleGenerateTests(args: unknown): Promise<CallToolResult> {
    try {
      // Validate input using Zod schema
      const validatedInput = GenerateTestsInputSchema.parse(args);
      const input = validatedInput as GenerateTestsInput;

      // Generate tests
      const result = await generateTestsTool(input, this.samplingClient);

      // Format the result
      let text = '🧪 Test Generation Result\n';
      text += '━'.repeat(60) + '\n\n';
      text += `${result.message}\n\n`;
      text += '```typescript\n';
      text += result.testCode;
      text += '\n```\n\n';
      text += '━'.repeat(60) + '\n';
      text += '\n💡 Next Steps:\n';
      text += '  • Review the generated tests for accuracy\n';
      text += '  • Adjust test cases as needed\n';
      text += '  • Add edge cases if necessary\n';
      text += '  • Run tests to verify they pass\n';

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
            text: `❌ Failed to generate tests: ${handled.message}`,
          },
        ],
      };
    }
  }

  private normalizeWorkflowPhase(phase: string): string | null {
    const normalized = phase.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const cleaned = normalized.replace(/[_\s]+/g, '-');
    const direct = new Set(['idle', 'code-written', 'test-complete', 'commit-ready', 'committed']);
    if (direct.has(cleaned)) {
      return cleaned;
    }

    const aliases: Record<string, string> = {
      planning: 'idle',
      analysis: 'idle',
      start: 'idle',
      'code-analysis': 'code-written',
      implementation: 'code-written',
      coding: 'code-written',
      code: 'code-written',
      'test-analysis': 'test-complete',
      testing: 'test-complete',
      tests: 'test-complete',
      test: 'test-complete',
      'tests-complete': 'test-complete',
      'ready-to-commit': 'commit-ready',
      commit: 'commit-ready',
      'pre-commit': 'commit-ready',
      done: 'committed',
      merged: 'committed',
      shipped: 'committed',
      released: 'committed',
    };

    return aliases[cleaned] || null;
  }
}
