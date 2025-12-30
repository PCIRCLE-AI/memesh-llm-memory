// src/planning/PlanningEngine.ts
import type { AgentRegistry } from '../orchestrator/AgentRegistry.js';

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

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
  private generateTDDSteps(phase: any): string[] {
    return [
      `Write test for ${phase.description}`,
      `Run test to verify it fails`,
      `Implement minimal code to pass test`,
      `Verify test passes`,
      `Commit changes`,
    ];
  }

  /**
   * Assign appropriate agent based on task characteristics
   */
  private assignAgent(phase: any): string | undefined {
    const agents = this.agentRegistry.getAllAgents();

    // Simple keyword matching (will be enhanced with LearningManager)
    if (phase.description.toLowerCase().includes('security')) {
      const securityAgent = agents.find((a) =>
        a.capabilities?.includes('security-audit')
      );
      return securityAgent?.id;
    }

    if (phase.description.toLowerCase().includes('test')) {
      const testAgent = agents.find((a) =>
        a.capabilities?.includes('test-generation')
      );
      return testAgent?.id;
    }

    return undefined; // Let router decide
  }

  /**
   * Identify implementation phases from requirements
   */
  private identifyPhases(request: PlanRequest): any[] {
    // Simplified phase identification
    const phases = [];

    if (request.requirements) {
      // Each requirement gets broken down into multiple sub-tasks
      for (const req of request.requirements) {
        // Sub-task 1: Setup/Preparation
        phases.push({
          description: `Setup for ${req}`,
          priority: 'high',
          files: {},
        });

        // Sub-task 2: Core implementation
        phases.push({
          description: req,
          priority: 'high',
          files: {},
        });
      }
    } else {
      // Default single phase
      phases.push({
        description: request.featureDescription,
        priority: 'high',
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
