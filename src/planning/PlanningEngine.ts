// src/planning/PlanningEngine.ts
import type { AgentRegistry } from '../orchestrator/AgentRegistry.js';
import type { LearningManager } from '../evolution/LearningManager.js';
import type { ContextualPattern } from '../evolution/types.js';

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Implementation phase for internal task generation
 */
interface Phase {
  description: string;
  priority?: TaskPriority;
  dependencies?: string[];
  files?: {
    create?: string[];
    modify?: string[];
    test?: string[];
  };
}

/**
 * Single task in plan
 */
export interface PlanTask {
  id: string;
  description: string;
  steps: string[];
  suggestedAgent?: string;
  estimatedDuration: string;
  priority: TaskPriority;
  dependencies: string[]; // Task IDs this depends on
  files: {
    create?: string[];
    modify?: string[];
    test?: string[];
  };
}

/**
 * Complete implementation plan
 */
export interface ImplementationPlan {
  title: string;
  goal: string;
  architecture: string;
  techStack: string[];
  tasks: PlanTask[];
  totalEstimatedTime: string;
}

/**
 * Plan generation request
 */
export interface PlanRequest {
  featureDescription: string;
  requirements?: string[];
  constraints?: string[];
  existingContext?: Record<string, unknown>;
}

/**
 * Core planning engine that generates implementation plans
 */
export class PlanningEngine {
  constructor(
    private agentRegistry: AgentRegistry,
    private learningManager?: LearningManager
  ) {}

  /**
   * Generate complete implementation plan
   */
  async generatePlan(request: PlanRequest): Promise<ImplementationPlan> {
    // Validate input
    if (!request.featureDescription?.trim()) {
      throw new Error('featureDescription is required and cannot be empty');
    }

    if (request.featureDescription.length > 1000) {
      throw new Error('featureDescription exceeds maximum length of 1000 characters');
    }

    // Validate requirements array
    if (request.requirements && !Array.isArray(request.requirements)) {
      throw new Error('requirements must be an array');
    }

    const tasks = await this.generateTasks(request);
    const totalTime = this.estimateTotalTime(tasks);

    return {
      title: `Implementation Plan: ${request.featureDescription}`,
      goal: this.generateGoal(request),
      architecture: this.generateArchitectureOverview(request),
      techStack: this.identifyTechStack(request),
      tasks,
      totalEstimatedTime: totalTime,
    };
  }

  /**
   * Generate bite-sized tasks following TDD workflow
   */
  private async generateTasks(request: PlanRequest): Promise<PlanTask[]> {
    const tasks: PlanTask[] = [];
    let taskCounter = 1;

    // Get learned patterns if LearningManager is available
    const learnedPatterns = await this.getLearnedPatterns(request);

    // Example: Break down feature into phases
    let phases = this.identifyPhases(request);

    // Apply learned ordering to phases
    if (learnedPatterns.length > 0) {
      phases = this.applyLearnedOrdering(phases, learnedPatterns);
    }

    for (const phase of phases) {
      const task: PlanTask = {
        id: `task-${taskCounter++}`,
        description: this.enhanceDescriptionWithLearning(phase, learnedPatterns),
        steps: this.generateTDDStepsWithLearning(phase, learnedPatterns),
        suggestedAgent: this.assignAgent(phase),
        estimatedDuration: '2-5 minutes',
        priority: this.calculatePriorityWithLearning(phase, learnedPatterns),
        dependencies: phase.dependencies || [],
        files: phase.files || {},
      };
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Generate 5-step TDD workflow for task
   */
  private generateTDDSteps(phase: Phase): string[] {
    return [
      `Write test for ${phase.description}`,
      `Run test to verify it fails`,
      `Implement minimal code to pass test`,
      `Verify test passes`,
      `Commit changes`,
    ];
  }

  /**
   * Assign appropriate agent based on task characteristics and registry
   */
  private assignAgent(phase: any): string | undefined {
    const agents = this.agentRegistry.getAllAgents();
    const description = phase.description.toLowerCase();

    // Define capability keywords for each task type
    const capabilityKeywords: Record<string, string[]> = {
      'code-review': ['review', 'quality', 'best practices', 'validation'],
      'security-audit': ['security', 'authentication', 'authorization'],
      'performance': ['optimize', 'performance', 'bottleneck', 'cache'],
      'frontend': ['ui', 'component', 'frontend', 'react', 'interface'],
      'backend': ['api', 'backend', 'server', 'endpoint'],
      'database': ['database', 'migration', 'schema', 'query'],
      'test': ['test', 'coverage', 'e2e', 'unit'],
      'test-generation': ['test', 'coverage', 'e2e', 'unit'],
      'test-execution': ['test', 'coverage', 'e2e', 'unit'],
      'debugging': ['debug', 'fix', 'issue', 'bug'],
    };

    // Score each agent based on capability match
    const scores = agents.map((agent) => {
      let score = 0;
      const capabilities = agent.capabilities || [];

      for (const capability of capabilities) {
        const keywords = capabilityKeywords[capability] || [];
        for (const keyword of keywords) {
          if (description.includes(keyword)) {
            // Give higher weight to 'review' keyword for code-review tasks
            if (capability === 'code-review' && keyword === 'review') {
              score += 2;
            } else {
              score += 1;
            }
          }
        }
      }

      return { agent, score };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Return highest scoring agent (if score > 0)
    if (scores[0].score > 0) {
      return scores[0].agent.name;
    }

    return undefined; // No strong match, let router decide
  }

  /**
   * Identify implementation phases from requirements
   */
  private identifyPhases(request: PlanRequest): Phase[] {
    // Simplified phase identification
    const phases: Phase[] = [];

    if (request.requirements) {
      // Each requirement gets broken down into multiple sub-tasks
      for (const req of request.requirements) {
        // Sub-task 1: Setup/Preparation
        phases.push({
          description: `Setup for ${req}`,
          priority: 'high' as TaskPriority,
          files: {},
        });

        // Sub-task 2: Core implementation
        phases.push({
          description: req,
          priority: 'high' as TaskPriority,
          files: {},
        });
      }
    } else {
      // Default single phase
      phases.push({
        description: request.featureDescription,
        priority: 'high' as TaskPriority,
        files: {},
      });
    }

    return phases;
  }

  private generateGoal(request: PlanRequest): string {
    return `Implement ${request.featureDescription}`;
  }

  private generateArchitectureOverview(request: PlanRequest): string {
    return 'TDD-driven implementation with agent-specific task allocation';
  }

  private identifyTechStack(request: PlanRequest): string[] {
    return ['TypeScript', 'Vitest', 'Smart Agents Infrastructure'];
  }

  private estimateTotalTime(tasks: PlanTask[]): string {
    const avgMinutesPerTask = 3.5; // Average of 2-5 minutes
    const totalMinutes = tasks.length * avgMinutesPerTask;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get learned patterns from LearningManager
   */
  private async getLearnedPatterns(request: PlanRequest): Promise<ContextualPattern[]> {
    if (!this.learningManager) {
      return [];
    }

    try {
      // Get patterns for all registered agents
      const agents = this.agentRegistry.getAllAgents();
      const allPatterns: ContextualPattern[] = [];

      for (const agent of agents) {
        const patterns = await this.learningManager.getLearnedPatterns(agent.name);
        allPatterns.push(...patterns);
      }

      // Filter relevant patterns based on request context
      return this.filterRelevantPatterns(allPatterns, request);
    } catch (error) {
      // Silently return empty array if patterns can't be retrieved
      return [];
    }
  }

  /**
   * Filter patterns relevant to current request
   */
  private filterRelevantPatterns(
    patterns: ContextualPattern[],
    request: PlanRequest
  ): ContextualPattern[] {
    const domain = (request.existingContext?.domain as string) || '';
    const projectType = (request.existingContext?.projectType as string) || '';

    return patterns.filter((pattern) => {
      // Only include successful patterns with high confidence
      if (pattern.type !== 'success') return false;
      if (pattern.success_rate < 0.75) return false;
      if (pattern.observations < 5) return false;

      // Check if pattern context matches request (use partial matching for domain)
      const context = pattern.context;
      if (projectType && context.project_type && context.project_type !== projectType) return false;

      // Use partial domain matching - if either domain contains the other, it's a match
      if (domain && context.domain) {
        const domainMatches =
          domain.includes(context.domain) ||
          context.domain.includes(domain);
        if (!domainMatches) return false;
      }

      return true;
    });
  }

  /**
   * Apply learned ordering patterns to phases
   */
  private applyLearnedOrdering(
    phases: Phase[],
    patterns: ContextualPattern[]
  ): Phase[] {
    // Extract ordering actions from patterns
    const orderingActions: string[] = [];
    for (const pattern of patterns) {
      const actions = pattern.context.actions || [];
      orderingActions.push(...actions);
    }

    // Sort phases based on learned patterns (e.g., "security-first", "schema-before-API")
    const sortedPhases = [...phases].sort((a, b) => {
      const aDesc = a.description.toLowerCase();
      const bDesc = b.description.toLowerCase();

      // Check for "first" priority patterns
      for (const action of orderingActions) {
        if (action.includes('first')) {
          const keyword = action.replace('-first', '');
          if (aDesc.includes(keyword) && !bDesc.includes(keyword)) return -1;
          if (!aDesc.includes(keyword) && bDesc.includes(keyword)) return 1;
        }

        // Check for "before" patterns
        if (action.includes('before')) {
          const [before, after] = action.split('-before-');
          if (aDesc.includes(before) && bDesc.includes(after)) return -1;
          if (aDesc.includes(after) && bDesc.includes(before)) return 1;
        }
      }

      return 0; // Keep original order if no pattern matches
    });

    return sortedPhases;
  }

  /**
   * Enhance phase description with learned best practices
   */
  private enhanceDescriptionWithLearning(
    phase: Phase,
    patterns: ContextualPattern[]
  ): string {
    let description = phase.description;

    // Extract best practices from patterns
    const bestPractices: string[] = [];
    for (const pattern of patterns) {
      if (pattern.type === 'success' && pattern.context.actions) {
        bestPractices.push(...pattern.context.actions);
      }
    }

    // For API/backend tasks, always add the best practices
    const phaseDesc = phase.description.toLowerCase();
    if (
      phaseDesc.includes('api') ||
      phaseDesc.includes('authentication') ||
      phaseDesc.includes('authorization') ||
      phaseDesc.includes('endpoint')
    ) {
      // Filter for relevant best practices
      const relevantPractices = bestPractices.filter((practice) =>
        ['error-handling', 'input-validation', 'logging'].includes(practice)
      );

      if (relevantPractices.length > 0) {
        description += ` (Include: ${relevantPractices.join(', ')})`;
      }
    }

    return description;
  }

  /**
   * Generate TDD steps enhanced with learned patterns
   */
  private generateTDDStepsWithLearning(
    phase: Phase,
    patterns: ContextualPattern[]
  ): string[] {
    const baseSteps = this.generateTDDSteps(phase);

    // Extract learned actions
    const learnedActions: string[] = [];
    for (const pattern of patterns) {
      if (pattern.context.actions) {
        learnedActions.push(...pattern.context.actions);
      }
    }

    // Enhance step 3 (implementation) with learned actions
    if (learnedActions.length > 0) {
      const relevantActions = learnedActions.filter((action) =>
        ['error-handling', 'input-validation', 'logging'].includes(action)
      );

      if (relevantActions.length > 0) {
        baseSteps[2] = `${baseSteps[2]} with ${relevantActions.join(', ')}`;
      }
    }

    return baseSteps;
  }

  /**
   * Calculate priority based on learned patterns
   */
  private calculatePriorityWithLearning(
    phase: Phase,
    patterns: ContextualPattern[]
  ): TaskPriority {
    const basePriority = phase.priority || 'medium';

    // Check if this phase matches any critical learned patterns
    const criticalPatterns = patterns.filter(
      (p) =>
        p.type === 'success' &&
        p.success_rate > 0.85 &&
        p.context.actions?.some((action) =>
          phase.description.toLowerCase().includes(action.split('-')[0])
        )
    );

    if (criticalPatterns.length > 0) {
      return 'high';
    }

    return basePriority;
  }
}
