/**
 * Tool Handlers Module
 *
 * Handles all MCP tool operations except Git-related tools. Provides handlers for:
 * - Smart agent operations (task routing, dashboard, agent/skill listing)
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
import { PlanningEngine } from '../../planning/PlanningEngine.js';
import { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { HumanInLoopUI } from '../HumanInLoopUI.js';
import { recallMemoryTool } from '../tools/recall-memory.js';
import { createEntitiesTool } from '../tools/create-entities.js';
import { addObservationsTool } from '../tools/add-observations.js';
import { createRelationsTool } from '../tools/create-relations.js';
import { generateCIConfigTool } from '../tools/devops-generate-ci-config.js';
import { analyzeDeploymentTool } from '../tools/devops-analyze-deployment.js';
import { setupCITool } from '../tools/devops-setup-ci.js';
import { createWorkflowTool } from '../tools/workflow-create.js';
import { listWorkflowsTool } from '../tools/workflow-list.js';
import type { DevOpsEngineerAgent } from '../../agents/DevOpsEngineerAgent.js';
import type { WorkflowOrchestrator } from '../../agents/WorkflowOrchestrator.js';
import { Task, AgentType, TaskAnalysis, RoutingDecision } from '../../orchestrator/types.js';
import { handleError, logError, formatMCPError } from '../../utils/errorHandler.js';

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
   * @param planningEngine - Task decomposition and planning
   * @param projectMemoryManager - Project-specific memory system
   * @param knowledgeGraph - Knowledge graph for entity/relation storage
   * @param ui - Human-in-loop UI formatter
   * @param devopsEngineer - DevOps engineer agent for CI/CD automation
   * @param workflowOrchestrator - Workflow orchestrator for Opal and n8n
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
    private planningEngine: PlanningEngine,
    private projectMemoryManager: ProjectMemoryManager,
    private knowledgeGraph: KnowledgeGraph,
    private ui: HumanInLoopUI,
    private devopsEngineer: DevOpsEngineerAgent,
    private workflowOrchestrator: WorkflowOrchestrator
  ) {}

  /**
   * Handle buddy_agents tool - List all available agents
   *
   * Returns a formatted list of all registered agents grouped by category.
   * Each agent includes name, description, and category.
   *
   * **Agent Categories**:
   * - code: Development agents (frontend, backend, etc.)
   * - testing: Testing and QA agents
   * - design: UI/UX design agents
   * - analysis: Code analysis and review agents
   * - documentation: Documentation generation agents
   * - deployment: DevOps and deployment agents
   * - general: General-purpose agents
   *
   * @returns Promise resolving to formatted agent list
   *
   * @example
   * ```typescript
   * const result = await handleListAgents();
   * // Returns:
   * // 🤖 Claude Code Buddy - Available Agents
   * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   * // Total: 12 specialized agents
   * //
   * // 💻 Code (4)
   * //   • frontend-developer: Builds React/Vue/Angular components
   * //   • backend-developer: Creates APIs and backend logic
   * //   ...
   * ```
   */
  async handleListAgents(): Promise<CallToolResult> {
    try {
      const agents = this.agentRegistry.getAllAgents();

      // Group agents by category
      const categories = new Map<string, typeof agents>();
      agents.forEach(agent => {
        const category = agent.category || 'general';
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(agent);
      });

      // Build output
      let output = '🤖 Claude Code Buddy - Available Agents\n';
      output += '━'.repeat(60) + '\n\n';
      output += `**Total**: ${agents.length} specialized agents\n\n`;

      // Category emojis
      const categoryEmojis: Record<string, string> = {
        code: '💻',
        design: '🎨',
        testing: '🧪',
        analysis: '🔍',
        documentation: '📚',
        deployment: '🚀',
        general: '🌐',
      };

      // List agents by category
      categories.forEach((categoryAgents, category) => {
        const emoji = categoryEmojis[category] || '📦';
        output += `${emoji} **${category.charAt(0).toUpperCase() + category.slice(1)}** (${categoryAgents.length})\n\n`;

        categoryAgents.forEach(agent => {
          output += `  • **${agent.name}**\n`;
          output += `    ${agent.description}\n\n`;
        });
      });

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
        method: 'handleListAgents',
        operation: 'listing available agents',
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleListAgents',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ List agents failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle buddy_skills tool - List all skills
   */
  async handleListSkills(input: { filter?: string }): Promise<CallToolResult> {
    try {
      const filter = input.filter || 'all';

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
        data: { filter: input.filter },
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
  async handleUninstall(input: {
    keepData?: boolean;
    keepConfig?: boolean;
    dryRun?: boolean
  }): Promise<CallToolResult> {
    try {
      // Extract uninstall options from validated input
      const options = {
        keepData: input.keepData,
        keepConfig: input.keepConfig,
        dryRun: input.dryRun,
      };

      // Perform uninstallation
      const report = await this.uninstallManager.uninstall(options);

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
        data: { options: input },
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
  async handleGetWorkflowGuidance(input: {
    phase: string;
    filesChanged?: string[];
    testsPassing?: boolean
  }): Promise<CallToolResult> {
    try {
      const result = await this.developmentButler.processCheckpoint(
        input.phase,
        input
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
        data: { phase: input.phase },
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
  async handleRecordTokenUsage(input: {
    inputTokens: number;
    outputTokens: number
  }): Promise<CallToolResult> {
    try {
      this.developmentButler.getTokenTracker().recordUsage({
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
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
        data: { inputTokens: input.inputTokens, outputTokens: input.outputTokens },
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
   * Handle generate-smart-plan tool (Phase 2)
   */
  async handleGenerateSmartPlan(input: {
    featureDescription: string;
    requirements?: string[];
    constraints?: string[]
  }): Promise<CallToolResult> {
    try {
      // Generate plan using PlanningEngine
      const plan = await this.planningEngine.generatePlan({
        featureDescription: input.featureDescription,
        requirements: input.requirements,
        constraints: input.constraints,
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
          planText += `- **Suggested Agent**: ${task.suggestedAgent}\n`;
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
        data: { featureDescription: input.featureDescription },
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
  async handleRecallMemory(input: {
    query: string;
    limit?: number
  }): Promise<CallToolResult> {
    try {
      const result = await recallMemoryTool.handler(
        input,
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
        data: { query: input.query, limit: input.limit },
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
   * Handle create-entities tool
   *
   * Creates new entities in the Knowledge Graph for manual knowledge recording.
   */
  async handleCreateEntities(input: {
    entities: Array<{
      name: string;
      entityType: string;
      observations: string[];
      metadata?: Record<string, unknown>;
    }>;
  }): Promise<CallToolResult> {
    try {
      const result = await createEntitiesTool.handler(
        input,
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
        data: { entityCount: input.entities.length },
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
  async handleAddObservations(input: {
    observations: Array<{
      entityName: string;
      contents: string[];
    }>;
  }): Promise<CallToolResult> {
    try {
      const result = await addObservationsTool.handler(
        input,
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
        data: { observationCount: input.observations.length },
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
  async handleCreateRelations(input: {
    relations: Array<{
      from: string;
      to: string;
      relationType: string;
      metadata?: Record<string, unknown>;
    }>;
  }): Promise<CallToolResult> {
    try {
      const result = await createRelationsTool.handler(
        input,
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
        data: { relationCount: input.relations.length },
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
   * Handle devops-generate-ci-config tool
   *
   * Generates CI/CD configuration files for GitHub Actions or GitLab CI.
   *
   */
  async handleGenerateCIConfig(input: {
    platform: 'github-actions' | 'gitlab-ci';
    testCommand: string;
    buildCommand: string;
    deployCommand?: string;
    nodeVersion?: string;
    enableCaching?: boolean;
  }): Promise<CallToolResult> {
    try {
      const result = await generateCIConfigTool.handler(
        input,
        this.devopsEngineer
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ Failed to generate CI config: ${result.error}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `🚀 CI/CD Configuration Generated

Platform: ${result.platform}
Config File: ${result.configFileName}

${result.instructions}

──────────────────────────────────────
Configuration Content:
──────────────────────────────────────

${result.config}
`,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleGenerateCIConfig',
        operation: 'generating CI/CD config',
        data: { platform: input.platform },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleGenerateCIConfig',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to generate CI config: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle devops-analyze-deployment tool
   *
   * Analyzes deployment readiness by running tests, build, and checking git status.
   *
   */
  async handleAnalyzeDeployment(input: {
    testCommand?: string;
    buildCommand?: string;
  }): Promise<CallToolResult> {
    try {
      const result = await analyzeDeploymentTool.handler(
        input,
        this.devopsEngineer
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ Deployment analysis failed: ${result.error}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: result.summary || 'Deployment analysis completed',
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleAnalyzeDeployment',
        operation: 'analyzing deployment readiness',
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleAnalyzeDeployment',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to analyze deployment: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle devops-setup-ci tool
   *
   * Complete CI/CD setup that generates config, writes to file, and records to Knowledge Graph.
   */
  async handleSetupCI(input: {
    platform: 'github-actions' | 'gitlab-ci';
    testCommand: string;
    buildCommand: string;
  }): Promise<CallToolResult> {
    try {
      const result = await setupCITool.handler(
        input,
        this.devopsEngineer
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `❌ CI setup failed: ${result.error}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `${result.message}

${result.nextSteps}

──────────────────────────────────────
Configuration Details:
──────────────────────────────────────

Config File: ${result.details?.configFile || result.configFileName}
Test Command: ${result.details?.testCommand || input.testCommand}
Build Command: ${result.details?.buildCommand || input.buildCommand}
`,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleSetupCI',
        operation: 'setting up CI/CD',
        data: { platform: input.platform },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleSetupCI',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to setup CI: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle workflow-create tool
   *
   * Creates automated workflows using Google Opal or n8n.
   * Automatically selects the best platform based on description.
   *
   * @param input - Workflow creation arguments
   * @returns Tool execution result
   */
  async handleCreateWorkflow(input: {
    description: string;
    platform?: 'opal' | 'n8n' | 'auto';
    priority?: 'speed' | 'production';
  }): Promise<CallToolResult> {
    try {
      const result = await createWorkflowTool.handler(
        input,
        this.workflowOrchestrator
      );

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
        method: 'handleCreateWorkflow',
        operation: 'creating workflow',
        data: { description: input.description, platform: input.platform },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleCreateWorkflow',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to create workflow: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle workflow-list tool
   *
   * Lists all workflows from Google Opal and n8n platforms.
   *
   * @param input - Workflow list arguments
   * @returns Tool execution result
   */
  async handleListWorkflows(input: {
    platform?: 'opal' | 'n8n' | 'all';
  }): Promise<CallToolResult> {
    try {
      const result = await listWorkflowsTool.handler(
        input,
        this.workflowOrchestrator
      );

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
        method: 'handleListWorkflows',
        operation: 'listing workflows',
        data: { platform: input.platform },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleListWorkflows',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to list workflows: ${handled.message}`,
          },
        ],
      };
    }
  }
}
