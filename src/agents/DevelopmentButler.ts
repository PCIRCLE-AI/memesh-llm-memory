/**
 * Development Butler Agent
 *
 * Core agent that monitors development workflow, analyzes code changes,
 * provides recommendations, and coordinates with specialized agents.
 */

import { CheckpointDetector } from '../core/CheckpointDetector.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { WorkflowGuidanceEngine, WorkflowContext, WorkflowGuidance, WorkflowPhase } from '../core/WorkflowGuidanceEngine.js';
import { FeedbackCollector } from '../evolution/FeedbackCollector.js';
import type { LearningManager } from '../evolution/LearningManager.js';
import { SessionTokenTracker } from '../core/SessionTokenTracker.js';
import { SessionContextMonitor } from '../core/SessionContextMonitor.js';
import { ClaudeMdReloader } from '../mcp/ClaudeMdReloader.js';
import type { SessionHealth } from '../core/SessionContextMonitor.js';
import { StateError, NotFoundError } from '../errors/index.js';

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

  // Workflow guidance integration
  private guidanceEngine?: WorkflowGuidanceEngine;
  private feedbackCollector?: FeedbackCollector;
  private activeRequests: Map<string, WorkflowGuidance> = new Map();

  // Context monitoring integration
  private tokenTracker: SessionTokenTracker;
  private contextMonitor: SessionContextMonitor;
  private claudeMdReloader: ClaudeMdReloader;

  constructor(
    checkpointDetector: CheckpointDetector,
    toolInterface: MCPToolInterface,
    learningManager?: LearningManager
  ) {
    this.checkpointDetector = checkpointDetector;
    this.toolInterface = toolInterface;

    // Initialize workflow guidance if learning manager provided
    if (learningManager) {
      this.guidanceEngine = new WorkflowGuidanceEngine(learningManager);
      this.feedbackCollector = new FeedbackCollector(learningManager);
    }

    // Initialize context monitoring
    this.tokenTracker = new SessionTokenTracker({ tokenLimit: 200000 });
    this.contextMonitor = new SessionContextMonitor(this.tokenTracker);
    this.claudeMdReloader = new ClaudeMdReloader();

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
   * Get token tracker (for testing and monitoring)
   */
  getTokenTracker(): SessionTokenTracker {
    return this.tokenTracker;
  }

  /**
   * Get context monitor (for testing and monitoring)
   */
  getContextMonitor(): SessionContextMonitor {
    return this.contextMonitor;
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

  /**
   * Process checkpoint and provide workflow guidance with context monitoring
   *
   * @param checkpointName - Name of the checkpoint
   * @param data - Checkpoint data
   * @returns Workflow guidance with formatted request and session health
   */
  async processCheckpoint(
    checkpointName: string,
    data: Record<string, unknown>
  ): Promise<{
    guidance: WorkflowGuidance;
    formattedRequest: string;
    requestId: string;
    sessionHealth: SessionHealth;
  }> {
    if (!this.guidanceEngine) {
      throw new StateError('Workflow guidance not initialized. Provide LearningManager to constructor.', {
        component: 'DevelopmentButler',
        method: 'processCheckpoint',
        requiredDependency: 'LearningManager',
      });
    }

    // Build workflow context from checkpoint data
    const context: WorkflowContext = {
      phase: checkpointName as WorkflowPhase,
      filesChanged: data.filesChanged as string[] | undefined,
      testsPassing: data.testsPassing as boolean | undefined,
      reviewed: data.reviewed as boolean | undefined,
    };

    // Get workflow guidance
    const guidance = this.guidanceEngine.analyzeWorkflow(context);

    // Format as non-blocking confirmation request
    const topRecommendation = guidance.recommendations[0];
    const alternatives = guidance.recommendations.slice(1, 4);

    const formattedRequest = this.formatWorkflowGuidanceRequest(
      topRecommendation,
      alternatives,
      guidance.confidence,
      guidance.reasoning
    );

    // Track active request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeRequests.set(requestId, guidance);

    // Check session health
    const sessionHealth = this.contextMonitor.checkSessionHealth();

    // If critical warnings, prepend to recommendations
    if (sessionHealth.status === 'critical') {
      const criticalWarnings = sessionHealth.warnings
        .filter((w) => w.level === 'critical')
        .map((w) => `⚠️ ${w.message}`)
        .join('\n');

      const criticalRecs = sessionHealth.recommendations
        .filter((r) => r.priority === 'critical')
        .map((r) => `• ${r.description}: ${r.reasoning}`)
        .join('\n');

      const enhancedRequest = `
🚨 CRITICAL SESSION ALERTS:
${criticalWarnings}

Recommended Actions:
${criticalRecs}

---
${formattedRequest}
      `.trim();

      return { guidance, formattedRequest: enhancedRequest, requestId, sessionHealth };
    }

    return {
      guidance,
      formattedRequest,
      requestId,
      sessionHealth,
    };
  }

  /**
   * Format workflow guidance as user-friendly request
   */
  private formatWorkflowGuidanceRequest(
    topRecommendation: WorkflowGuidance['recommendations'][0],
    alternatives: WorkflowGuidance['recommendations'],
    confidence: number,
    reasoning: string[]
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('═══════════════════════════════════════════════════');
    lines.push('🔄 Workflow Guidance');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');

    // Top recommendation
    const confidencePercent = Math.round(confidence * 100);
    lines.push(`✨ Recommended Action: ${topRecommendation.action} (${confidencePercent}% confidence)`);
    lines.push(`   Priority: ${topRecommendation.priority}`);
    lines.push('');

    // Description
    lines.push(`📝 ${topRecommendation.description}`);
    lines.push('');

    // Reasoning
    lines.push('💡 Reasoning:');
    reasoning.forEach((reason) => {
      if (reason && reason.trim()) {
        lines.push(`   • ${reason}`);
      }
    });
    lines.push(`   • ${topRecommendation.reasoning}`);
    lines.push('');

    // Estimated time
    if (topRecommendation.estimatedTime) {
      lines.push(`⏱️  Estimated time: ${topRecommendation.estimatedTime}`);
      lines.push('');
    }

    // Alternatives
    if (alternatives.length > 0) {
      lines.push('🔄 Alternative Actions:');
      alternatives.forEach((alt, index) => {
        lines.push(`   ${index + 1}. ${alt.action} (${alt.priority} priority) - ${alt.description}`);
      });
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Record user response to workflow guidance
   *
   * @param requestId - Request identifier
   * @param response - User's response
   */
  async recordUserResponse(
    requestId: string,
    response: {
      accepted: boolean;
      wasOverridden: boolean;
      selectedAction?: string;
    }
  ): Promise<void> {
    const guidance = this.activeRequests.get(requestId);
    if (!guidance) {
      throw new NotFoundError(
        `Request ${requestId} not found in active requests`,
        'request',
        requestId,
        { activeRequestsCount: this.activeRequests.size }
      );
    }

    if (!this.feedbackCollector) {
      throw new StateError('Feedback collector not initialized', {
        component: 'DevelopmentButler',
        method: 'recordUserResponse',
        requiredDependency: 'FeedbackCollector (via LearningManager)',
      });
    }

    // Record feedback for learning
    await this.feedbackCollector.recordRoutingApproval({
      taskId: requestId,
      recommendedAgent: guidance.recommendations[0].action as any, // Cast to AgentType for compatibility
      selectedAgent: (response.selectedAction || guidance.recommendations[0].action) as any,
      wasOverridden: response.wasOverridden,
      confidence: guidance.confidence,
    });

    // Clean up
    this.activeRequests.delete(requestId);
  }

  /**
   * Execute CLAUDE.md reload
   *
   * @param requestId - Request identifier
   * @returns Result of reload operation
   */
  async executeContextReload(requestId: string): Promise<{
    success: boolean;
    resourceUpdate?: unknown;
    error?: string;
  }> {
    // Check cooldown
    if (!this.claudeMdReloader.canReload()) {
      return {
        success: false,
        error: 'Reload cooldown active (5 minutes)',
      };
    }

    try {
      const resourceUpdate = this.claudeMdReloader.generateReloadRequest();

      this.claudeMdReloader.recordReload({
        reason: 'token-threshold',
        triggeredBy: 'user',
        metadata: { requestId },
      });

      return { success: true, resourceUpdate };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
