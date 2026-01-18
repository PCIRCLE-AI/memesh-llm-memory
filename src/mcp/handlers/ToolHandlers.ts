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
import { ValidationError } from '../../errors/index.js';
import { Router } from '../../orchestrator/router.js';
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
import { PlanningEngine } from '../../planning/PlanningEngine.js';
import { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { HumanInLoopUI } from '../HumanInLoopUI.js';
import { recallMemoryTool } from '../tools/recall-memory.js';
import { createEntitiesTool } from '../tools/create-entities.js';
import { addObservationsTool } from '../tools/add-observations.js';
import { createRelationsTool } from '../tools/create-relations.js';
import type { AgentType } from '../../orchestrator/types.js';
import { handleError, logError } from '../../utils/errorHandler.js';
import {
  ListSkillsInputSchema,
  UninstallInputSchema,
  WorkflowGuidanceInputSchema,
  RecordTokenUsageInputSchema,
  HookToolUseInputSchema,
  GenerateSmartPlanInputSchema,
  RecallMemoryInputSchema,
  CreateEntitiesInputSchema,
  AddObservationsInputSchema,
  CreateRelationsInputSchema,
  formatValidationError,
  type ValidatedListSkillsInput,
  type ValidatedUninstallInput,
  type ValidatedWorkflowGuidanceInput,
  type ValidatedRecordTokenUsageInput,
  type ValidatedHookToolUseInput,
  type ValidatedGenerateSmartPlanInput,
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
   * @param planningEngine - Task decomposition and planning
   * @param projectMemoryManager - Project-specific memory system
   * @param knowledgeGraph - Knowledge graph for entity/relation storage
   * @param ui - Human-in-loop UI formatter
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
    private planningEngine: PlanningEngine,
    private projectMemoryManager: ProjectMemoryManager,
    private knowledgeGraph: KnowledgeGraph,
    private ui: HumanInLoopUI
  ) {}

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
          title = '🎓 Claude Code Buddy Skills (sa: prefix)';
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
          output += '💡 Claude Code Buddy can generate skills automatically.\n';
          output += '   Skills will appear here once generated.\n';
        }
      } else {
        output += `Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}\n\n`;

        // Group by prefix
        const saSkills = skills.filter(s => s.startsWith('sa:'));
        const userSkills = skills.filter(s => !s.startsWith('sa:'));

        if (filter === 'all') {
          if (saSkills.length > 0) {
            output += '🎓 Claude Code Buddy Skills:\n';
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
      output += '  • sa:<name> - Claude Code Buddy generated skills\n';
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
   * Handle buddy_uninstall tool - Uninstall Claude Code Buddy
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
        operation: 'uninstalling Claude Code Buddy',
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
  async handleGenerateSmartPlan(args: unknown): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedGenerateSmartPlanInput;
      try {
        validatedInput = GenerateSmartPlanInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'ToolHandlers',
              method: 'handleGenerateSmartPlan',
              schema: 'GenerateSmartPlanInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      // Generate plan using PlanningEngine
      const plan = await this.planningEngine.generatePlan({
        featureDescription: validatedInput.featureDescription,
        requirements: validatedInput.requirements,
        constraints: validatedInput.constraints,
      });

      // Format plan as text
      let planText = `# ${plan.title}\n\n`;
      planText += `**Goal**: ${plan.goal}\n\n`;
      planText += `**Architecture**: ${plan.architecture}\n\n`;
      planText += `**Tech Stack**: ${plan.techStack.join(', ')}\n\n`;
      planText += `**Total Estimated Time**: ${plan.totalEstimatedTime}\n\n`;
      planText += `---\n\n`;
      planText += `## Tasks\n\n`;

      for (const task of plan.tasks) {
        planText += `### ${task.id}: ${task.description}\n\n`;
        planText += `- **Priority**: ${task.priority}\n`;
        planText += `- **Estimated Duration**: ${task.estimatedDuration}\n`;

        if (task.suggestedAgent) {
          const capabilityHint = this.describeCapabilities(task.suggestedAgent);
          if (capabilityHint) {
            planText += `- **Suggested Capability**: ${capabilityHint}\n`;
          }
        }

        if (task.dependencies.length > 0) {
          planText += `- **Dependencies**: ${task.dependencies.join(', ')}\n`;
        }

        planText += `\n**Steps**:\n`;
        task.steps.forEach((step, index) => {
          planText += `${index + 1}. ${step}\n`;
        });

        if (task.files.create && task.files.create.length > 0) {
          planText += `\n**Files to Create**: ${task.files.create.join(', ')}\n`;
        }
        if (task.files.modify && task.files.modify.length > 0) {
          planText += `**Files to Modify**: ${task.files.modify.join(', ')}\n`;
        }
        if (task.files.test && task.files.test.length > 0) {
          planText += `**Test Files**: ${task.files.test.join(', ')}\n`;
        }

        planText += `\n---\n\n`;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: planText,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleGenerateSmartPlan',
        operation: 'generating smart plan',
        data: { featureDescription: (args as { featureDescription?: string } | null)?.featureDescription },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleGenerateSmartPlan',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Smart plan generation failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle recall-memory tool
   */
  async handleRecallMemory(args: unknown): Promise<CallToolResult> {
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
   * Handle add-observations tool
   *
   * Adds new observations to existing entities in the Knowledge Graph.
   */
  async handleAddObservations(args: unknown): Promise<CallToolResult> {
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
