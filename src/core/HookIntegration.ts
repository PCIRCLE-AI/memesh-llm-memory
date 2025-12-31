/**
 * Hook Integration
 *
 * Bridges Claude Code hooks with the Development Butler checkpoint detection system.
 * Monitors tool execution and triggers appropriate checkpoints.
 */

import { CheckpointDetector } from './CheckpointDetector.js';
import { DevelopmentButler } from '../agents/DevelopmentButler.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import type { MCPToolInterface } from './MCPToolInterface.js';

/**
 * Tool use data from Claude Code hooks
 */
export interface ToolUseData {
  toolName: string;
  arguments?: any;
  success: boolean;
  duration?: number;
  tokensUsed?: number;
  output?: string;
}

/**
 * Checkpoint detected from tool use
 */
interface Checkpoint {
  name: string;
  data: Record<string, unknown>;
}

/**
 * Checkpoint context passed to callbacks
 */
export interface CheckpointContext {
  checkpoint: string;
  data: Record<string, unknown>;
  toolName: string;
}

/**
 * Hook Integration Class
 *
 * Monitors tool execution from Claude Code hooks and triggers
 * Development Butler checkpoints when relevant patterns are detected.
 */
export class HookIntegration {
  private detector: CheckpointDetector;
  private butler: DevelopmentButler;
  private triggerCallbacks: Array<(context: CheckpointContext) => void> = [];
  private projectMemory?: ProjectAutoTracker;

  constructor(
    checkpointDetector: CheckpointDetector,
    developmentButler: DevelopmentButler
  ) {
    this.detector = checkpointDetector;
    this.butler = developmentButler;
  }

  /**
   * Initialize project memory tracking
   * Call this after construction to enable automatic memory recording
   */
  initializeProjectMemory(mcp: MCPToolInterface): void {
    this.projectMemory = new ProjectAutoTracker(mcp);
  }

  /**
   * Detect checkpoint from tool use data
   *
   * @param toolData - Tool execution data from hooks
   * @returns Checkpoint if detected, null otherwise
   */
  async detectCheckpointFromToolUse(
    toolData: ToolUseData
  ): Promise<Checkpoint | null> {
    // Only process successful tool executions
    if (!toolData.success) {
      return null;
    }

    const { toolName, arguments: args } = toolData;

    // Detect code-written checkpoint (Write tool)
    if (toolName === 'Write') {
      return {
        name: 'code-written',
        data: {
          files: [args.file_path],
          hasTests: this.isTestFile(args.file_path),
          type: 'new-file',
        },
      };
    }

    // Detect code-written checkpoint (Edit tool)
    if (toolName === 'Edit') {
      return {
        name: 'code-written',
        data: {
          files: [args.file_path],
          hasTests: this.isTestFile(args.file_path),
          type: 'modification',
        },
      };
    }

    // Detect test-complete checkpoint (Bash running tests)
    if (toolName === 'Bash' && this.isTestCommand(args.command)) {
      const testResults = this.parseTestOutput(toolData.output || '');
      return {
        name: 'test-complete',
        data: testResults,
      };
    }

    // Detect commit-ready checkpoint (git add)
    if (toolName === 'Bash' && this.isGitAddCommand(args.command)) {
      return {
        name: 'commit-ready',
        data: {
          command: args.command,
        },
      };
    }

    return null;
  }

  /**
   * Process tool use and trigger checkpoint if detected
   *
   * @param toolData - Tool execution data from hooks
   */
  async processToolUse(toolData: ToolUseData): Promise<void> {
    const checkpoint = await this.detectCheckpointFromToolUse(toolData);

    if (checkpoint) {
      // Trigger the checkpoint through the detector
      await this.detector.triggerCheckpoint(checkpoint.name, checkpoint.data);

      // Call all registered callbacks
      const context: CheckpointContext = {
        checkpoint: checkpoint.name,
        data: checkpoint.data,
        toolName: toolData.toolName,
      };

      for (const callback of this.triggerCallbacks) {
        callback(context);
      }

      // Record to project memory if initialized
      if (this.projectMemory) {
        await this.recordToProjectMemory(checkpoint, toolData);
      }
    }

    // Track tokens if available
    if (this.projectMemory && toolData.tokensUsed) {
      const tokenHook = this.projectMemory.createTokenHook();
      await tokenHook(toolData.tokensUsed);
    }
  }

  /**
   * Record checkpoint events to project memory
   */
  private async recordToProjectMemory(
    checkpoint: Checkpoint,
    toolData: ToolUseData
  ): Promise<void> {
    if (!this.projectMemory) return;

    // Record code changes
    if (checkpoint.name === 'code-written' && checkpoint.data.files) {
      const fileChangeHook = this.projectMemory.createFileChangeHook();
      const files = checkpoint.data.files as string[];
      const type = checkpoint.data.type as string;
      await fileChangeHook(files, `Code ${type}`);
    }

    // Record test results
    if (checkpoint.name === 'test-complete') {
      const testResultHook = this.projectMemory.createTestResultHook();
      const { total, passed, failed } = checkpoint.data as {
        total: number;
        passed: number;
        failed: number;
      };
      await testResultHook({
        total,
        passed,
        failed,
        failures: [], // TODO: Extract from test output
      });
    }
  }

  /**
   * Register callback for butler triggers
   *
   * @param callback - Callback to execute when butler is triggered
   */
  onButlerTrigger(callback: (context: CheckpointContext) => void): void {
    this.triggerCallbacks.push(callback);
  }

  /**
   * Check if file path is a test file
   */
  private isTestFile(filePath: string): boolean {
    return (
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/tests/')
    );
  }

  /**
   * Check if command is a test command
   */
  private isTestCommand(command: string): boolean {
    return (
      command.includes('npm test') ||
      command.includes('npm run test') ||
      command.includes('vitest') ||
      command.includes('jest') ||
      command.includes('mocha')
    );
  }

  /**
   * Check if command is git add
   */
  private isGitAddCommand(command: string): boolean {
    return command.trim().startsWith('git add');
  }

  /**
   * Parse test output to extract results
   */
  private parseTestOutput(output: string): {
    total: number;
    passed: number;
    failed: number;
  } {
    // Simple parser - look for patterns like "34 tests passed, 2 failed"
    const passedMatch = output.match(/(\d+)\s+(?:tests?\s+)?passed/i);
    const failedMatch = output.match(/(\d+)\s+(?:tests?\s+)?failed/i);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    const total = passed + failed;

    return { total, passed, failed };
  }
}
