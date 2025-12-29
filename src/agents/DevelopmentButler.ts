/**
 * Development Butler Agent
 *
 * Core agent that monitors development workflow, analyzes code changes,
 * provides recommendations, and coordinates with specialized agents.
 */

import { CheckpointDetector } from '../core/CheckpointDetector.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';

/**
 * Code analysis result
 */
export interface CodeAnalysisResult {
  /** Whether analysis was performed */
  analyzed: boolean;

  /** Recommendations for the developer */
  recommendations: string[];

  /** Warnings about potential issues */
  warnings: string[];

  /** Suggested specialized agents */
  suggestedAgents: string[];

  /** Suggested actions */
  suggestedActions: string[];
}

/**
 * Test analysis result
 */
export interface TestAnalysisResult {
  /** Whether analysis was performed */
  analyzed: boolean;

  /** Status of tests (success, needs-attention, failed) */
  status: 'success' | 'needs-attention' | 'failed';

  /** Whether code is ready to commit */
  readyToCommit: boolean;

  /** Recommendations based on test results */
  recommendations?: string[];
}

/**
 * Commit readiness result
 */
export interface CommitReadinessResult {
  /** Whether code is ready to commit */
  ready: boolean;

  /** Blockers preventing commit */
  blockers: string[];

  /** Actions to perform before commit */
  preCommitActions: string[];
}

/**
 * Commit analysis result
 */
export interface CommitAnalysisResult {
  /** Suggested specialized agents */
  suggestedAgents: string[];

  /** Suggested actions */
  suggestedActions: string[];
}

/**
 * Workflow state
 */
export interface WorkflowState {
  /** Current workflow phase */
  phase: 'idle' | 'code-analysis' | 'test-analysis' | 'commit-ready';

  /** Last triggered checkpoint */
  lastCheckpoint?: string;

  /** Test results from last test run */
  lastTestResults?: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Development Butler Class
 *
 * Monitors development workflow, analyzes changes, and coordinates with
 * specialized agents to provide intelligent development assistance.
 */
export class DevelopmentButler {
  private checkpointDetector: CheckpointDetector;
  private toolInterface: MCPToolInterface;
  private initialized: boolean = false;
  private workflowState: WorkflowState = {
    phase: 'idle',
  };

  constructor(
    checkpointDetector: CheckpointDetector,
    toolInterface: MCPToolInterface
  ) {
    this.checkpointDetector = checkpointDetector;
    this.toolInterface = toolInterface;
    this.initialize();
  }

  /**
   * Initialize the butler by registering checkpoints
   */
  private initialize(): void {
    // Register essential checkpoints
    this.checkpointDetector.registerCheckpoint(
      'code-written',
      async (data) => {
        await this.analyzeCodeChanges(data);
        return { success: true };
      },
      {
        description: 'Triggered when code is written',
        category: 'development',
        priority: 'high',
      }
    );

    this.checkpointDetector.registerCheckpoint(
      'test-complete',
      async (data) => {
        await this.analyzeTestResults(data);
        return { success: true };
      },
      {
        description: 'Triggered when tests complete',
        category: 'testing',
        priority: 'high',
      }
    );

    this.checkpointDetector.registerCheckpoint(
      'commit-ready',
      async () => {
        await this.checkCommitReadiness();
        return { success: true };
      },
      {
        description: 'Triggered when preparing to commit',
        category: 'version-control',
        priority: 'high',
      }
    );

    this.initialized = true;
  }

  /**
   * Check if butler is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Analyze code changes
   *
   * @param data - Code change data
   * @returns Promise<CodeAnalysisResult>
   */
  async analyzeCodeChanges(
    data: Record<string, unknown>
  ): Promise<CodeAnalysisResult> {
    // Update workflow state
    this.workflowState.phase = 'code-analysis';
    this.workflowState.lastCheckpoint = 'code-written';

    const files = (data.files as string[]) || [];
    const hasTests = data.hasTests as boolean;
    const type = data.type as string;

    const recommendations: string[] = [];
    const warnings: string[] = [];
    const suggestedAgents: string[] = [];
    const suggestedActions: string[] = [];

    // Analyze new files
    if (type === 'new-file') {
      recommendations.push('Add tests for new endpoint');
      recommendations.push('Update API documentation');
    }

    // Check for missing tests
    if (hasTests === false) {
      warnings.push('No tests found for modified code');
      suggestedAgents.push('test-writer');
      suggestedActions.push('Generate tests');
    }

    // Check for test deletions
    if (type === 'test-deletion') {
      suggestedAgents.push('test-writer');
    }

    return {
      analyzed: true,
      recommendations,
      warnings,
      suggestedAgents,
      suggestedActions,
    };
  }

  /**
   * Analyze test results
   *
   * @param data - Test result data
   * @returns Promise<TestAnalysisResult>
   */
  async analyzeTestResults(
    data: Record<string, unknown>
  ): Promise<TestAnalysisResult> {
    // Update workflow state
    this.workflowState.phase = 'test-analysis';
    this.workflowState.lastCheckpoint = 'test-complete';

    const total = (data.total as number) || 0;
    const passed = (data.passed as number) || 0;
    const failed = (data.failed as number) || 0;

    // Store test results
    this.workflowState.lastTestResults = { total, passed, failed };

    let status: 'success' | 'needs-attention' | 'failed';
    let readyToCommit: boolean;
    const recommendations: string[] = [];

    // Calculate failure percentage
    const failurePercentage = total > 0 ? (failed / total) * 100 : 0;

    if (failed === 0) {
      status = 'success';
      readyToCommit = true;
    } else if (failurePercentage < 10) {
      // Small percentage of failures
      status = 'needs-attention';
      readyToCommit = false;
    } else {
      // Large percentage of failures
      status = 'failed';
      readyToCommit = false;
      recommendations.push('Fix failing tests before committing');
    }

    return {
      analyzed: true,
      status,
      readyToCommit,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  /**
   * Check commit readiness
   *
   * @returns Promise<CommitReadinessResult>
   */
  async checkCommitReadiness(): Promise<CommitReadinessResult> {
    const blockers: string[] = [];
    const preCommitActions: string[] = [
      'Run tests',
      'Check code quality',
    ];

    // Check if tests are passing
    if (
      this.workflowState.lastTestResults &&
      this.workflowState.lastTestResults.failed > 0
    ) {
      blockers.push('Tests failing');
    }

    const ready = blockers.length === 0;

    return {
      ready,
      blockers,
      preCommitActions,
    };
  }

  /**
   * Analyze commit
   *
   * @param data - Commit data
   * @returns Promise<CommitAnalysisResult>
   */
  async analyzeCommit(
    data: Record<string, unknown>
  ): Promise<CommitAnalysisResult> {
    const production = data.production as boolean;
    const suggestedAgents: string[] = [];
    const suggestedActions: string[] = [];

    if (production) {
      suggestedAgents.push('devops-engineer');
      suggestedActions.push('Prepare deployment');
    }

    return {
      suggestedAgents,
      suggestedActions,
    };
  }

  /**
   * Mark commit as completed
   */
  async commitCompleted(): Promise<void> {
    // Reset workflow state
    this.workflowState = {
      phase: 'idle',
    };
  }

  /**
   * Get current workflow state
   *
   * @returns WorkflowState
   */
  getWorkflowState(): WorkflowState {
    return { ...this.workflowState };
  }
}
