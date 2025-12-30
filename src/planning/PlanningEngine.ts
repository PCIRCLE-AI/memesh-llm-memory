// src/planning/PlanningEngine.ts
import type { AgentRegistry } from '../orchestrator/AgentRegistry.js';

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
  constructor(private agentRegistry: AgentRegistry) {}

  /**
   * Generate complete implementation plan
   */
  generatePlan(request: PlanRequest): ImplementationPlan {
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

    const tasks = this.generateTasks(request);
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
  private generateTasks(request: PlanRequest): PlanTask[] {
    const tasks: PlanTask[] = [];
    let taskCounter = 1;

    // Example: Break down feature into phases
    const phases = this.identifyPhases(request);

    for (const phase of phases) {
      const task: PlanTask = {
        id: `task-${taskCounter++}`,
        description: phase.description,
        steps: this.generateTDDSteps(phase),
        suggestedAgent: this.assignAgent(phase),
        estimatedDuration: '2-5 minutes',
        priority: phase.priority || 'medium',
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
}
