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
import { HumanInLoopUI } from '../HumanInLoopUI.js';
import { recallMemoryTool } from '../tools/recall-memory.js';
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
    private planningEngine: PlanningEngine,
    private projectMemoryManager: ProjectMemoryManager,
    private ui: HumanInLoopUI
  ) {}

  /**
   * Handle evolution_dashboard / sa_dashboard tool
   *
   * Generates a comprehensive dashboard showing evolution metrics, learning progress,
   * and performance statistics for all agents. Supports multiple output formats.
   *
   * **Available Formats**:
   * - **summary** (default): High-level overview with charts
   * - **detailed**: Full metrics + learning progress breakdown
   * - **json**: Machine-readable JSON export
   * - **csv**: CSV export for data analysis
   * - **markdown**: Markdown-formatted report
   *
   * @param input - Dashboard options
   * @param input.format - Output format (summary|detailed)
   * @param input.exportFormat - Export format (json|csv|markdown)
   * @param input.includeCharts - Whether to include ASCII charts (default: true)
   * @param input.chartHeight - Chart height in lines (default: 8)
   * @returns Promise resolving to formatted dashboard text
   *
   * @example
   * ```typescript
   * // Get summary dashboard
   * await handleEvolutionDashboard({ format: 'summary' });
   *
   * // Export as JSON
   * await handleEvolutionDashboard({ exportFormat: 'json' });
   *
   * // Detailed with custom chart size
   * await handleEvolutionDashboard({
   *   format: 'detailed',
   *   chartHeight: 12
   * });
   * ```
   */
  async handleEvolutionDashboard(input: {
    format?: string;
    exportFormat?: string;
    includeCharts?: boolean;
    chartHeight?: number;
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const format = input.format || 'summary';
      const exportFormat = input.exportFormat;
      const includeCharts = input.includeCharts !== false;
      const chartHeight = input.chartHeight || 8;

      let dashboardText: string;

      // If export format is specified, use export methods
      if (exportFormat === 'json') {
        dashboardText = this.evolutionMonitor.exportAsJSON();
      } else if (exportFormat === 'csv') {
        dashboardText = this.evolutionMonitor.exportAsCSV();
      } else if (exportFormat === 'markdown') {
        dashboardText = this.evolutionMonitor.exportAsMarkdown();
      } else if (format === 'detailed') {
        // Detailed format: formatted dashboard + learning progress
        dashboardText = this.evolutionMonitor.formatDashboard({
          includeCharts,
          chartHeight,
        });

        // Add detailed learning progress
        const progress = this.evolutionMonitor.getLearningProgress();
        const activeAgents = progress.filter(p => p.learnedPatterns > 0);

        if (activeAgents.length > 0) {
          dashboardText += '\n\n📋 Detailed Learning Progress:\n';
          activeAgents.forEach(agent => {
            dashboardText += `\n${agent.agentId}:\n`;
            dashboardText += `  - Total Executions: ${agent.totalExecutions}\n`;
            dashboardText += `  - Learned Patterns: ${agent.learnedPatterns}\n`;
            dashboardText += `  - Applied Adaptations: ${agent.appliedAdaptations}\n`;
            dashboardText += `  - Success Rate Improvement: ${agent.successRateImprovement >= 0 ? '+' : ''}${(agent.successRateImprovement * 100).toFixed(1)}%\n`;
            dashboardText += `  - Last Learning: ${agent.lastLearningDate ? agent.lastLearningDate.toISOString() : 'Never'}\n`;
          });
        }
      } else {
        // Summary format: use formatted dashboard with chart options
        dashboardText = this.evolutionMonitor.formatDashboard({
          includeCharts,
          chartHeight,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: dashboardText,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleEvolutionDashboard',
        operation: 'generating evolution dashboard',
        data: { format: input.format, exportFormat: input.exportFormat },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleEvolutionDashboard',
      });

      return {
        content: [
          {
            type: 'text',
            text: `❌ Evolution dashboard failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle sa_agents tool - List all available agents
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
  async handleListAgents(): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
            text: `❌ List agents failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle sa_skills tool - List all skills
   */
  async handleListSkills(input: { filter?: string }): Promise<{ content: Array<{ type: string; text: string }> }> {
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
      output += '  • sa_skills - List all skills\n';
      output += '  • sa_skills --filter claude-code-buddy - List only sa: skills\n';
      output += '  • sa_skills --filter user - List only user skills\n';
      output += '\n📚 Skill Naming Convention:\n';
      output += '  • sa:<name> - Claude Code Buddy generated skills\n';
      output += '  • <name> - User-installed skills\n';

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
            text: `❌ List skills failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle sa_uninstall tool - Uninstall Claude Code Buddy
   */
  async handleUninstall(input: {
    keepData?: boolean;
    keepConfig?: boolean;
    dryRun?: boolean
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
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
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.developmentButler.processCheckpoint(
        input.phase,
        input
      );

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
            text: `❌ Workflow guidance failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle get-session-health tool
   */
  async handleGetSessionHealth(): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const health = this.developmentButler.getContextMonitor().checkSessionHealth();

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
            text: `❌ Session health check failed: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle reload-context tool
   */
  async handleReloadContext(input: { reason: string }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const requestId = `manual_${Date.now()}`;
      const result = await this.developmentButler.executeContextReload(requestId);

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
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
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      this.developmentButler.getTokenTracker().recordUsage({
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
      });

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
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
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
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
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
            text: `❌ Failed to recall memory: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle smart_route_task / sa_task tool
   *
   * Intelligently routes a task to the most appropriate agent using:
   * 1. TaskAnalyzer: Analyzes task complexity, requirements, domain
   * 2. AgentRouter: Selects best agent based on analysis
   * 3. PromptEnhancer: Generates optimized prompt for selected agent
   *
   * Returns a human-in-loop confirmation request with:
   * - Recommended agent
   * - Confidence score
   * - Reasoning (top 3 factors)
   * - Alternative agent suggestions
   *
   * **Workflow**:
   * ```
   * User task → TaskAnalyzer → AgentRouter → PromptEnhancer → Claude
   *                ↓              ↓              ↓
   *            Complexity    Best Agent    Enhanced Prompt
   * ```
   *
   * @param input - Task routing request
   * @param input.taskDescription - Detailed task description
   * @param input.priority - Task priority (0-10, default: 5)
   * @returns Promise resolving to confirmation request with routing recommendation
   *
   * @example
   * ```typescript
   * await handleSmartRouteTask({
   *   taskDescription: 'Create a responsive login form with validation',
   *   priority: 8
   * });
   *
   * // Returns confirmation:
   * // 🎯 Recommended Agent: frontend-developer (confidence: 92%)
   * // Reasoning:
   * //   1. Task involves UI component creation
   * //   2. Requires form validation logic
   * //   3. Mentions responsive design
   * // Alternatives:
   * //   • ui-designer (75%) - UI design expertise
   * //   • general-agent (50%) - Fallback option
   * ```
   */
  async handleSmartRouteTask(input: {
    taskDescription: string;
    priority?: number
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Create task
    const task: Task = {
      id: this.generateTaskId(),
      description: input.taskDescription,
      priority: input.priority,
    };

    try {
      // Route task through pipeline
      const result = await this.router.routeTask(task);

      // Generate alternatives (top 2-3 other suitable agents)
      const alternatives = this.generateAlternatives(result.routing.selectedAgent, result.analysis);

      // Create confirmation request
      const confirmationRequest = {
        taskDescription: task.description,
        recommendedAgent: result.routing.selectedAgent,
        confidence: this.estimateConfidence(result.analysis, result.routing),
        reasoning: result.routing.reasoning.split('. ').slice(0, 3).filter(r => r.length > 0),
        alternatives,
      };

      // Format using HumanInLoopUI
      const formattedConfirmation = this.ui.formatConfirmationRequest(confirmationRequest);

      // Return formatted confirmation
      return {
        content: [
          {
            type: 'text',
            text: formattedConfirmation,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'ToolHandlers',
        method: 'handleSmartRouteTask',
        operation: 'routing task',
        data: { taskDescription: input.taskDescription, taskId: task.id },
      });

      const handled = handleError(error, {
        component: 'ToolHandlers',
        method: 'handleSmartRouteTask',
      });

      return {
        content: [
          {
            type: 'text',
            text: `❌ Smart routing failed: ${handled.message}\n\nPlease try again or use a specific agent directly.`,
          },
        ],
      };
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alternative agent options
   */
  private generateAlternatives(
    selectedAgent: AgentType,
    analysis: TaskAnalysis
  ): Array<{ agent: AgentType; confidence: number; reason: string }> {
    const alternatives: Array<{ agent: AgentType; confidence: number; reason: string }> = [];

    // Get fallback agent if available
    const agentsByCategory = this.agentRegistry.getAgentsByCategory(
      this.agentRegistry.getAgent(selectedAgent)?.category || 'general'
    );

    // Add agents from same category (excluding selected)
    agentsByCategory
      .filter(a => a.name !== selectedAgent)
      .slice(0, 2)
      .forEach((agent, index) => {
        alternatives.push({
          agent: agent.name,
          confidence: 0.7 - index * 0.1,
          reason: `Alternative from ${agent.category} category`,
        });
      });

    // Add general-agent as fallback if not already selected
    if (selectedAgent !== 'general-agent' && alternatives.length < 3) {
      alternatives.push({
        agent: 'general-agent',
        confidence: 0.5,
        reason: 'General-purpose fallback',
      });
    }

    return alternatives.slice(0, 3);
  }

  /**
   * Estimate confidence based on analysis
   */
  private estimateConfidence(analysis: TaskAnalysis, routing: RoutingDecision): number {
    // Simple confidence estimation based on complexity match
    const baseConfidence = 0.75;

    // Higher confidence for specific agent matches
    if (routing.selectedAgent !== 'general-agent') {
      return Math.min(baseConfidence + 0.15, 0.95);
    }

    return baseConfidence;
  }
}
