/**
 * Skills Knowledge Integrator
 *
 * Extracts Claude Code best practices from .claude/skills and integrates them
 * into workflow recommendations.
 *
 * Core Principles:
 * - Scan .claude/skills for skill documentation
 * - Extract Claude Code tool usage patterns
 * - Learn about subagent dispatching, background workers, task tools
 * - Update workflow recommendations with latest practices
 *
 * Features:
 * - Automatic skill scanning
 * - Pattern extraction from skill files
 * - Best practice database
 * - Recommendation enhancement
 *
 * @example
 * ```typescript
 * const integrator = new SkillsKnowledgeIntegrator();
 * await integrator.scanSkills();
 *
 * const practices = integrator.getBestPractices('parallel-agents');
 * console.log(practices); // Subagent dispatching patterns
 * ```
 */

import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import type { WorkflowPhase } from './WorkflowGuidanceEngine.js';
import { logger } from '../utils/logger.js';

/**
 * Best practice extracted from skills
 */
export interface BestPractice {
  /** Practice ID */
  id: string;

  /** Practice name */
  name: string;

  /** Which phase this practice applies to */
  phase?: WorkflowPhase;

  /** Tool or feature this practice involves */
  tool: string;

  /** Description of the practice */
  description: string;

  /** When to use this practice */
  whenToUse: string;

  /** Example usage */
  example?: string;

  /** Source skill file */
  source: string;
}

/**
 * Skills Knowledge Integrator
 *
 * Integrates Claude Code skills knowledge into workflow system.
 */
export class SkillsKnowledgeIntegrator {
  private skillsPath: string;
  private bestPractices: Map<string, BestPractice[]> = new Map();
  private skillsLoaded: boolean = false;

  constructor(skillsPath?: string) {
    this.skillsPath = skillsPath || this.resolveSkillsPath();
  }

  /**
   * Resolve .claude/skills path
   */
  private resolveSkillsPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    return resolve(homeDir, '.claude', 'skills');
  }

  /**
   * Scan all skills and extract best practices
   */
  async scanSkills(): Promise<void> {
    try {
      const files = await fs.readdir(this.skillsPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = join(this.skillsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        await this.extractPracticesFromSkill(file, content);
      }

      this.skillsLoaded = true;
      logger.info('[SkillsKnowledgeIntegrator] Scanned skills', {
        filesScanned: mdFiles.length,
        practicesExtracted: this.getTotalPracticesCount(),
      });
    } catch (error) {
      logger.warn('[SkillsKnowledgeIntegrator] Failed to scan skills', {
        path: this.skillsPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Extract best practices from a skill file
   */
  private async extractPracticesFromSkill(filename: string, content: string): Promise<void> {
    const practices: BestPractice[] = [];

    // Pattern 1: Subagent dispatching
    if (
      content.includes('subagent') ||
      content.includes('parallel') ||
      content.includes('dispatch')
    ) {
      practices.push({
        id: `${filename}-subagent-dispatch`,
        name: 'Parallel Subagent Dispatching',
        tool: 'Task',
        description: 'Dispatch multiple subagents in parallel for independent tasks',
        whenToUse:
          'When you have 2+ independent tasks that can be worked on without dependencies',
        example:
          'Use Task tool with multiple parallel invocations for concurrent work',
        source: filename,
      });
    }

    // Pattern 2: Background workers
    if (content.includes('background') || content.includes('async')) {
      practices.push({
        id: `${filename}-background-worker`,
        name: 'Background Worker Pattern',
        tool: 'Task',
        description: 'Run long-running tasks in background',
        whenToUse: 'When task takes > 2 minutes and you can continue other work',
        example: 'Use run_in_background parameter for Task tool',
        source: filename,
      });
    }

    // Pattern 3: Task tool usage
    if (content.includes('TaskCreate') || content.includes('TaskUpdate')) {
      practices.push({
        id: `${filename}-task-management`,
        name: 'Task Tool Management',
        tool: 'TaskCreate',
        description: 'Use task tools to track multi-step work',
        whenToUse: 'For complex tasks requiring 3+ steps or multiple operations',
        example: 'Create tasks, update status, mark completed',
        source: filename,
      });
    }

    // Pattern 4: Code review practices
    if (content.includes('code-review') || content.includes('review-pr')) {
      practices.push({
        id: `${filename}-code-review`,
        name: 'Code Review Best Practices',
        phase: 'test-complete',
        tool: 'code-reviewer',
        description: 'Use code-reviewer subagent for thorough review',
        whenToUse: 'After tests pass, before committing code',
        example: 'Dispatch code-reviewer subagent with specific files',
        source: filename,
      });
    }

    // Pattern 5: TDD practices
    if (content.includes('test-driven') || content.includes('tdd')) {
      practices.push({
        id: `${filename}-tdd`,
        name: 'Test-Driven Development',
        phase: 'code-written',
        tool: 'vitest',
        description: 'Write tests before implementation',
        whenToUse: 'When implementing new features or fixing bugs',
        example: 'Create test file first, write failing test, then implement',
        source: filename,
      });
    }

    // Pattern 6: Planning before execution
    if (content.includes('planning') || content.includes('writing-plans')) {
      practices.push({
        id: `${filename}-planning`,
        name: 'Planning Before Execution',
        tool: 'EnterPlanMode',
        description: 'Plan implementation before writing code',
        whenToUse: 'For non-trivial tasks or multi-file changes',
        example: 'Use EnterPlanMode to create implementation plan',
        source: filename,
      });
    }

    // Add extracted practices
    for (const practice of practices) {
      const key = practice.tool;
      const existing = this.bestPractices.get(key) || [];
      existing.push(practice);
      this.bestPractices.set(key, existing);
    }
  }

  /**
   * Get best practices for a specific tool
   */
  getBestPractices(tool: string): BestPractice[] {
    return this.bestPractices.get(tool) || [];
  }

  /**
   * Get all best practices
   */
  getAllPractices(): BestPractice[] {
    const all: BestPractice[] = [];
    for (const practices of this.bestPractices.values()) {
      all.push(...practices);
    }
    return all;
  }

  /**
   * Get practices for a workflow phase
   */
  getPracticesForPhase(phase: WorkflowPhase): BestPractice[] {
    return this.getAllPractices().filter((p) => p.phase === phase);
  }

  /**
   * Get total count of extracted practices
   */
  private getTotalPracticesCount(): number {
    let count = 0;
    for (const practices of this.bestPractices.values()) {
      count += practices.length;
    }
    return count;
  }

  /**
   * Check if skills have been loaded
   */
  isLoaded(): boolean {
    return this.skillsLoaded;
  }

  /**
   * Reload skills
   */
  async reload(): Promise<void> {
    this.bestPractices.clear();
    this.skillsLoaded = false;
    await this.scanSkills();
  }

  /**
   * Get recommendation enhancements for a phase
   *
   * Returns additional recommendations based on skills knowledge.
   */
  getRecommendationEnhancements(phase: WorkflowPhase): string[] {
    const practices = this.getPracticesForPhase(phase);
    return practices.map((p) => `${p.name}: ${p.description} (${p.whenToUse})`);
  }
}
