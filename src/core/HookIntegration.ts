/**
 * Hook Integration - Claude Code Hooks Bridge
 *
 * Bridges Claude Code hooks with the Development Butler checkpoint detection system.
 * Monitors tool execution (Write, Edit, Bash) and automatically triggers appropriate
 * workflow checkpoints when relevant patterns are detected.
 *
 * Features:
 * - **Automatic Checkpoint Detection**: Detects checkpoints from tool execution patterns
 * - **Write/Edit Tool Monitoring**: Triggers 'code-written' checkpoint for file changes
 * - **Test Execution Detection**: Triggers 'test-complete' checkpoint for test commands
 * - **Git Integration**: Triggers 'commit-ready' for git add and 'committed' for git commit
 * - **Project Memory Recording**: Optionally records events to ProjectAutoTracker
 * - **Token Usage Tracking**: Monitors and records token consumption
 *
 * Checkpoint Patterns:
 * - **code-written**: Write/Edit tool → file modified/created
 * - **test-complete**: Bash tool → npm test/vitest/jest/mocha
 * - **commit-ready**: Bash tool → git add command
 * - **committed**: Bash tool → git commit command
 *
 * @example
 * ```typescript
 * import { HookIntegration } from './HookIntegration.js';
 * import { CheckpointDetector } from './CheckpointDetector.js';
 * import { DevelopmentButler } from '../agents/DevelopmentButler.js';
 *
 * const detector = new CheckpointDetector();
 * const butler = new DevelopmentButler(detector, mcpTools);
 * const hooks = new HookIntegration(detector, butler);
 *
 * // Optional: Enable project memory recording immediately
 * // (otherwise auto-initialized on first hook when memory support is available)
 * hooks.initializeProjectMemory(mcpTools);
 *
 * // Register callback for checkpoint triggers
 * hooks.onButlerTrigger((context) => {
 *   console.log(`Checkpoint ${context.checkpoint} triggered by ${context.toolName}`);
 * });
 *
 * // Process tool use from Claude Code hooks
 * await hooks.processToolUse({
 *   toolName: 'Write',
 *   arguments: { file_path: 'src/api/users.ts', content: '...' },
 *   success: true,
 *   duration: 150,
 *   tokensUsed: 1200
 * });
 * // Triggers 'code-written' checkpoint
 * ```
 */

import { CheckpointDetector } from './CheckpointDetector.js';
import { DevelopmentButler } from '../agents/DevelopmentButler.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import type { MCPToolInterface } from './MCPToolInterface.js';
import { logger } from '../utils/logger.js';
import { TestOutputParser, type TestResults } from './TestOutputParser.js';

/**
 * Tool use data from Claude Code hooks
 *
 * Represents execution data for a single tool call from Claude Code hooks.
 * Captures tool name, arguments, success status, performance metrics, and output.
 *
 * @example
 * ```typescript
 * // Write tool execution
 * const writeData: ToolUseData = {
 *   toolName: 'Write',
 *   arguments: { file_path: 'src/api/users.ts', content: 'export...' },
 *   success: true,
 *   duration: 150,
 *   tokensUsed: 1200
 * };
 *
 * // Bash test execution with output
 * const testData: ToolUseData = {
 *   toolName: 'Bash',
 *   arguments: { command: 'npm test' },
 *   success: true,
 *   duration: 5000,
 *   tokensUsed: 800,
 *   output: '34 tests passed, 2 failed'
 * };
 *
 * // Failed tool execution
 * const failedData: ToolUseData = {
 *   toolName: 'Edit',
 *   arguments: { file_path: 'config.ts', old_string: '...', new_string: '...' },
 *   success: false,
 *   duration: 50,
 *   output: 'Error: old_string not found'
 * };
 * ```
 */
export interface ToolUseData {
  /** Name of the tool executed (e.g., 'Write', 'Edit', 'Bash', 'Read') */
  toolName: string;

  /** Tool-specific arguments (varies by tool type) */
  arguments?: unknown;

  /** Whether the tool execution succeeded */
  success: boolean;

  /** Execution duration in milliseconds (optional) */
  duration?: number;

  /** Tokens consumed by this tool call (optional) */
  tokensUsed?: number;

  /** Tool output/result (optional, especially useful for Bash commands) */
  output?: string;
}

/**
 * Expected arguments for Write/Edit tool
 *
 * Type-safe interface for Write/Edit tool arguments structure.
 * Used for type casting when processing Write/Edit tool data.
 *
 * @example
 * ```typescript
 * const args = toolData.arguments as FileToolArgs;
 * console.log(`File modified: ${args.file_path}`);
 * ```
 */
interface FileToolArgs {
  /** Path to the file being written or edited */
  file_path: string;

  /** Additional tool-specific arguments (content, old_string, new_string, etc.) */
  [key: string]: unknown;
}

/**
 * Expected arguments for Bash tool
 *
 * Type-safe interface for Bash tool arguments structure.
 * Used for type casting when processing Bash command execution data.
 *
 * @example
 * ```typescript
 * const args = toolData.arguments as BashToolArgs;
 * if (args.command.includes('npm test')) {
 *   // Process test command
 * }
 * ```
 */
interface BashToolArgs {
  /** Shell command to execute */
  command: string;

  /** Additional tool-specific arguments (timeout, shell, etc.) */
  [key: string]: unknown;
}

/**
 * Checkpoint detected from tool use
 *
 * Represents a detected workflow checkpoint with associated context data.
 * Internal type used by detectCheckpointFromToolUse() to communicate
 * detected checkpoints before they are triggered.
 *
 * @example
 * ```typescript
 * const checkpoint: Checkpoint = {
 *   name: 'code-written',
 *   data: {
 *     files: ['src/api/users.ts'],
 *     hasTests: false,
 *     type: 'new-file'
 *   }
 * };
 * ```
 */
interface Checkpoint {
  /** Checkpoint name (e.g., 'code-written', 'test-complete', 'commit-ready', 'committed') */
  name: string;

  /** Checkpoint-specific context data */
  data: Record<string, unknown>;
}

/**
 * Checkpoint context passed to callbacks
 *
 * Context object passed to callbacks registered via onButlerTrigger().
 * Provides checkpoint name, associated data, and the tool that triggered it.
 *
 * @example
 * ```typescript
 * hooks.onButlerTrigger((context: CheckpointContext) => {
 *   console.log(`Checkpoint: ${context.checkpoint}`);
 *   console.log(`Triggered by: ${context.toolName}`);
 *   console.log('Data:', context.data);
 *
 *   if (context.checkpoint === 'test-complete') {
 *     const { total, passed, failed } = context.data;
 *     console.log(`Tests: ${passed}/${total} passed, ${failed} failed`);
 *   }
 * });
 * ```
 */
export interface CheckpointContext {
  /** Checkpoint name that was triggered */
  checkpoint: string;

  /** Checkpoint-specific context data */
  data: Record<string, unknown>;

  /** Name of the tool that triggered this checkpoint */
  toolName: string;
}

/**
 * Hook Integration Class
 *
 * Monitors tool execution from Claude Code hooks and triggers Development Butler
 * checkpoints when relevant workflow patterns are detected. Acts as the bridge
 * between Claude Code's tool execution hooks and the checkpoint-based workflow system.
 *
 * Detection Patterns:
 * - **Write/Edit tools** → 'code-written' checkpoint
 * - **Bash test commands** → 'test-complete' checkpoint
 * - **git add commands** → 'commit-ready' checkpoint
 * - **git commit commands** → 'committed' checkpoint
 *
 * @example
 * ```typescript
 * const detector = new CheckpointDetector();
 * const butler = new DevelopmentButler(detector, mcpTools);
 * const hooks = new HookIntegration(detector, butler);
 *
 * // Enable project memory immediately (optional)
 * // Auto-initialization also happens on first hook when memory is available
 * hooks.initializeProjectMemory(mcpTools);
 *
 * // Register callback for all checkpoint triggers
 * hooks.onButlerTrigger((context) => {
 *   console.log(`${context.checkpoint} triggered by ${context.toolName}`);
 * });
 *
 * // Process tool execution from hooks
 * await hooks.processToolUse({
 *   toolName: 'Write',
 *   arguments: { file_path: 'src/api.ts', content: '...' },
 *   success: true
 * });
 * ```
 */
export class HookIntegration {
  private detector: CheckpointDetector;
  private butler: DevelopmentButler;
  private triggerCallbacks: Array<(context: CheckpointContext) => void> = [];
  private projectMemory?: ProjectAutoTracker;
  private lastCheckpoint?: string;
  private testParser: TestOutputParser;
  private projectAutoTracker?: ProjectAutoTracker;

  /**
   * Create a new HookIntegration
   *
   * Initializes the hook integration bridge between Claude Code tool execution
   * and the checkpoint detection system. The integration is inactive until
   * processToolUse() is called with tool execution data.
   *
   * @param checkpointDetector - Checkpoint detector to trigger checkpoints through
   * @param developmentButler - Development Butler instance for workflow automation
   * @param projectAutoTracker - Optional ProjectAutoTracker for error recording
   *
   * @example
   * ```typescript
   * const detector = new CheckpointDetector();
   * const butler = new DevelopmentButler(detector, mcpTools);
   * const hooks = new HookIntegration(detector, butler);
   * ```
   */
  constructor(
    checkpointDetector: CheckpointDetector,
    developmentButler: DevelopmentButler,
    projectAutoTracker?: ProjectAutoTracker
  ) {
    this.detector = checkpointDetector;
    this.butler = developmentButler;
    this.testParser = new TestOutputParser();
    this.projectAutoTracker = projectAutoTracker;
  }

  /**
   * Initialize project memory tracking
   *
   * Enables automatic recording of workflow events to the project knowledge graph.
   * When enabled, checkpoints trigger automatic memory recording for code changes,
   * test results, and token usage. Call this after construction to enable.
   *
   * This is optional because processToolUse() will auto-initialize when memory
   * support is available.
   *
   * Recorded Events:
   * - **code-written**: File changes recorded with change type (new-file/modification)
   * - **test-complete**: Test results recorded (total, passed, failed)
   * - **Token usage**: Tracked for all successful tool executions
   *
   * @param mcp - MCP tool interface for memory operations
   *
   * @example
   * ```typescript
   * const hooks = new HookIntegration(detector, butler);
   *
   * // Enable project memory recording
   * hooks.initializeProjectMemory(mcpTools);
   *
   * // Now checkpoints will automatically record to project memory
   * await hooks.processToolUse({
   *   toolName: 'Write',
   *   arguments: { file_path: 'api.ts', content: '...' },
   *   success: true,
   *   tokensUsed: 1500
   * });
   * // Automatically records file change and token usage
   * ```
   */
  initializeProjectMemory(mcp: MCPToolInterface): void {
    if (this.projectMemory) {
      return;
    }

    this.projectMemory = new ProjectAutoTracker(mcp);
  }

  /**
   * Detect checkpoint from tool use data
   *
   * Analyzes tool execution data to determine if a workflow checkpoint should be
   * triggered. Only processes successful tool executions. Returns null for failed
   * tools or tools that don't match any checkpoint pattern.
   *
   * Detection Logic:
   * - **Write tool** → 'code-written' checkpoint (new file)
   * - **Edit tool** → 'code-written' checkpoint (modification)
   * - **Bash tool with test command** → 'test-complete' checkpoint
   * - **Bash tool with git add** → 'commit-ready' checkpoint
   * - **Bash tool with git commit** → 'committed' checkpoint
   *
   * Test Commands Detected:
   * - npm test / npm run test
   * - vitest
   * - jest
   * - mocha
   *
   * @param toolData - Tool execution data from Claude Code hooks
   * @returns Promise<Checkpoint | null> Checkpoint if detected, null for failed tools or non-checkpoint tools
   *
   * @example
   * ```typescript
   * // Write tool triggers code-written
   * const checkpoint1 = await hooks.detectCheckpointFromToolUse({
   *   toolName: 'Write',
   *   arguments: { file_path: 'src/api/users.ts', content: '...' },
   *   success: true
   * });
   * // Returns: { name: 'code-written', data: { files: [...], hasTests: false, type: 'new-file' } }
   *
   * // Test command triggers test-complete
   * const checkpoint2 = await hooks.detectCheckpointFromToolUse({
   *   toolName: 'Bash',
   *   arguments: { command: 'npm test' },
   *   success: true,
   *   output: '34 tests passed, 2 failed'
   * });
   * // Returns: { name: 'test-complete', data: { total: 36, passed: 34, failed: 2 } }
   *
   * // Failed tool returns null
   * const checkpoint3 = await hooks.detectCheckpointFromToolUse({
   *   toolName: 'Edit',
   *   arguments: { file_path: 'config.ts', ... },
   *   success: false
   * });
   * // Returns: null (only successful tools trigger checkpoints)
   *
   * // Non-checkpoint tool returns null
   * const checkpoint4 = await hooks.detectCheckpointFromToolUse({
   *   toolName: 'Read',
   *   arguments: { file_path: 'README.md' },
   *   success: true
   * });
   * // Returns: null (Read tool doesn't trigger checkpoints)
   * ```
   */
  async detectCheckpointFromToolUse(
    toolData: ToolUseData
  ): Promise<Checkpoint | null> {
    // Only process successful tool executions
    if (!toolData.success) {
      return null;
    }

    const { toolName, arguments: args } = toolData;

    // Validate args is an object before accessing properties
    if (!args || typeof args !== 'object') {
      return null;
    }

    // Detect code-written checkpoint (Write tool)
    if (toolName === 'Write') {
      const fileArgs = args as FileToolArgs;
      return {
        name: 'code-written',
        data: {
          files: [fileArgs.file_path],
          hasTests: this.isTestFile(fileArgs.file_path),
          type: 'new-file',
        },
      };
    }

    // Detect code-written checkpoint (Edit tool)
    if (toolName === 'Edit') {
      const fileArgs = args as FileToolArgs;
      return {
        name: 'code-written',
        data: {
          files: [fileArgs.file_path],
          hasTests: this.isTestFile(fileArgs.file_path),
          type: 'modification',
        },
      };
    }

    // Detect Bash-driven checkpoints
    if (toolName === 'Bash') {
      const bashArgs = args as BashToolArgs;

      if (this.isGitCommitCommand(bashArgs.command)) {
        return {
          name: 'committed',
          data: {
            command: bashArgs.command,
            message: this.extractGitCommitMessage(bashArgs.command),
          },
        };
      }

      if (this.isTestCommand(bashArgs.command)) {
        const testResults = this.testParser.parse(toolData.output || '');
        return {
          name: 'test-complete',
          data: testResults,
        };
      }

      if (this.isGitAddCommand(bashArgs.command)) {
        return {
          name: 'commit-ready',
          data: {
            command: bashArgs.command,
          },
        };
      }
    }

    return null;
  }

  /**
   * Process tool use and trigger checkpoint if detected
   *
   * Main entry point for processing tool execution from Claude Code hooks.
   * Detects checkpoints, triggers them through the detector, executes callbacks,
   * and optionally records to project memory. This method orchestrates the entire
   * hook integration workflow.
   *
   * Workflow:
   * 1. Detect checkpoint from tool data (detectCheckpointFromToolUse)
   * 2. If checkpoint detected:
   *    a. Trigger checkpoint through CheckpointDetector
   *    b. Execute all registered callbacks (onButlerTrigger)
   *    c. Record to project memory (if initialized)
   * 3. Track token usage (if project memory enabled and tokens available)
   *
   * @param toolData - Tool execution data from Claude Code hooks
   *
   * @example
   * ```typescript
   * const hooks = new HookIntegration(detector, butler);
   * hooks.initializeProjectMemory(mcpTools);
   *
   * // Register callback
   * hooks.onButlerTrigger((context) => {
   *   console.log(`Triggered: ${context.checkpoint}`);
   * });
   *
   * // Process Write tool - triggers code-written
   * await hooks.processToolUse({
   *   toolName: 'Write',
   *   arguments: { file_path: 'src/api.ts', content: '...' },
   *   success: true,
   *   tokensUsed: 1200
   * });
   * // Output: "Triggered: code-written"
   * // Recorded to project memory
   *
   * // Process failed tool - no checkpoint triggered
   * await hooks.processToolUse({
   *   toolName: 'Edit',
   *   arguments: { file_path: 'config.ts', ... },
   *   success: false
   * });
   * // No output, no checkpoint triggered
   *
   * // Process non-checkpoint tool - tracks tokens only
   * await hooks.processToolUse({
   *   toolName: 'Read',
   *   arguments: { file_path: 'README.md' },
   *   success: true,
   *   tokensUsed: 500
   * });
   * // No checkpoint, but token usage recorded
   * ```
   */
  async processToolUse(toolData: ToolUseData): Promise<void> {
    this.ensureProjectMemoryInitialized();

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
        await this.recordCheckpointProgress(checkpoint, toolData);
      }
    }

    // Auto-detect errors from command output
    if (toolData.output && this.shouldRecordError(toolData.output)) {
      const args = toolData.arguments as BashToolArgs;
      const command = args?.command || 'unknown command';
      await this.recordErrorFromOutput(toolData.output, command);
    }

    // Track tokens if available
    if (this.projectMemory && toolData.tokensUsed) {
      const tokenHook = this.projectMemory.createTokenHook();
      await tokenHook(toolData.tokensUsed);
    }
  }

  /**
   * Record checkpoint events to project memory
   *
   * Private helper that records checkpoint-specific data to the project knowledge graph
   * via ProjectAutoTracker. Only called if project memory was initialized via
   * initializeProjectMemory(). Handles different checkpoint types appropriately.
   *
   * Recorded Data by Checkpoint:
   * - **code-written**: File paths and change type (new-file/modification)
   * - **test-complete**: Test results (total, passed, failed counts)
   *
   * @param checkpoint - Detected checkpoint with context data
   * @param toolData - Original tool execution data
   *
   * @example
   * ```typescript
   * // Internal usage - called automatically by processToolUse()
   * // User doesn't call this directly
   *
   * // code-written checkpoint records file changes
   * await this.recordToProjectMemory(
   *   {
   *     name: 'code-written',
   *     data: { files: ['api.ts'], type: 'new-file', hasTests: false }
   *   },
   *   toolData
   * );
   * // Calls projectMemory.createFileChangeHook(['api.ts'], 'Code new-file')
   *
   * // test-complete checkpoint records test results
   * await this.recordToProjectMemory(
   *   {
   *     name: 'test-complete',
   *     data: { total: 36, passed: 34, failed: 2 }
   *   },
   *   toolData
   * );
   * // Calls projectMemory.createTestResultHook({ total: 36, passed: 34, failed: 2, failures: [] })
   * ```
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
      // Validate test results data structure
      if (!this.isValidTestResults(checkpoint.data)) {
        logger.warn('Invalid test results data structure, skipping memory record', {
          checkpoint: checkpoint.name,
          data: checkpoint.data,
        });
        return;
      }

      const testResultHook = this.projectMemory.createTestResultHook();

      // Extract test results with detailed failure information
      const testResults = checkpoint.data;
      const { total, passed, failed, failedTests } = testResults;

      // Convert FailedTest[] to string[] format expected by ProjectAutoTracker
      const failures = failedTests.map(test => {
        const parts: string[] = [];

        // Format: "[file]: TestName - Error" or "TestName - Error" or "TestName"
        if (test.file) {
          parts.push(`${test.file}:`);
        }
        parts.push(test.name);
        if (test.error) {
          parts.push(`- ${test.error}`);
        }

        return parts.join(' ');
      });

      await testResultHook({
        total,
        passed,
        failed,
        failures,
      });
    }
  }

  /** Checkpoint phases that trigger memory recording */
  private static readonly TRACKED_PHASES = new Set(['code-written', 'test-complete', 'commit-ready', 'committed']);

  /**
   * Record phase completion and commit events to project memory
   */
  private async recordCheckpointProgress(
    checkpoint: Checkpoint,
    toolData: ToolUseData
  ): Promise<void> {
    if (!this.projectMemory || !HookIntegration.TRACKED_PHASES.has(checkpoint.name)) {
      return;
    }

    // Flush pending changes for intermediate checkpoints
    if (checkpoint.name !== 'code-written' && checkpoint.name !== 'committed') {
      await this.projectMemory.flushPendingCodeChanges(checkpoint.name);
    }

    // Record commit metadata
    if (checkpoint.name === 'committed') {
      const { command, message } = checkpoint.data as { command?: string; message?: string | null };
      await this.projectMemory.recordCommit({
        command,
        message: message ?? undefined,
        output: toolData.output,
      });
    }

    // Avoid duplicate checkpoint records
    if (checkpoint.name === this.lastCheckpoint) {
      return;
    }

    const details = this.buildCheckpointDetails(checkpoint, toolData);
    await this.projectMemory.recordWorkflowCheckpoint(checkpoint.name, details);
    this.lastCheckpoint = checkpoint.name;
  }

  /**
   * Build human-friendly checkpoint details for memory recording
   */
  private buildCheckpointDetails(
    checkpoint: Checkpoint,
    toolData: ToolUseData
  ): string[] {
    const details: string[] = [`Trigger: ${toolData.toolName}`];
    const data = checkpoint.data;

    switch (checkpoint.name) {
      case 'code-written': {
        const files = (data.files as string[] | undefined) ?? [];
        details.push(`Files changed: ${files.length}`);
        break;
      }
      case 'test-complete': {
        const { total, passed, failed } = data as { total: number; passed: number; failed: number };
        if (total > 0) details.push(`Tests: ${passed}/${total} passed`);
        if (failed > 0) details.push(`Failed: ${failed}`);
        break;
      }
      case 'commit-ready': {
        const command = data.command as string | undefined;
        if (command) details.push(`Command: ${command}`);
        break;
      }
      case 'committed': {
        const message = data.message as string | null | undefined;
        if (message) details.push(`Message: ${message}`);
        break;
      }
    }

    if (toolData.duration) {
      details.push(`Duration: ${toolData.duration}ms`);
    }

    return details;
  }

  /**
   * Auto-initialize project memory when hooks are first used
   */
  private ensureProjectMemoryInitialized(): void {
    if (this.projectMemory) {
      return;
    }

    const mcp = this.butler.getToolInterface();
    if (!mcp.supportsMemory()) {
      return;
    }

    this.initializeProjectMemory(mcp);
  }

  /**
   * Register callback for butler triggers
   *
   * Registers a callback function that will be executed every time a checkpoint
   * is triggered. Multiple callbacks can be registered and will all execute
   * sequentially when any checkpoint is detected and triggered.
   *
   * Use cases:
   * - Logging checkpoint events
   * - UI notifications for workflow milestones
   * - Custom analytics tracking
   * - Triggering additional workflow actions
   *
   * @param callback - Callback to execute when any checkpoint is triggered
   *
   * @example
   * ```typescript
   * const hooks = new HookIntegration(detector, butler);
   *
   * // Register logging callback
   * hooks.onButlerTrigger((context) => {
   *   console.log(`[${new Date().toISOString()}] ${context.checkpoint}`);
   *   console.log(`Tool: ${context.toolName}`);
   *   console.log('Data:', context.data);
   * });
   *
   * // Register analytics callback
   * hooks.onButlerTrigger((context) => {
   *   analytics.track('workflow_checkpoint', {
   *     checkpoint: context.checkpoint,
   *     tool: context.toolName
   *   });
   * });
   *
   * // Register checkpoint-specific handlers
   * hooks.onButlerTrigger((context) => {
   *   if (context.checkpoint === 'test-complete') {
   *     const { passed, failed } = context.data;
   *     if (failed > 0) {
   *       notifyUser(`⚠️ ${failed} tests failed!`);
   *     }
   *   }
   * });
   *
   * // All registered callbacks will execute when checkpoint triggers
   * ```
   */
  onButlerTrigger(callback: (context: CheckpointContext) => void): void {
    this.triggerCallbacks.push(callback);
  }

  /** Patterns for detecting test files */
  private static readonly TEST_FILE_PATTERNS = ['.test.', '.spec.', '/tests/'];

  /** Patterns for detecting test commands */
  private static readonly TEST_COMMAND_PATTERNS = ['npm test', 'npm run test', 'vitest', 'jest', 'mocha'];

  /**
   * Check if file path is a test file
   *
   * @param filePath - File path to check
   * @returns True if file appears to be a test file
   */
  private isTestFile(filePath: string): boolean {
    return HookIntegration.TEST_FILE_PATTERNS.some(p => filePath.includes(p));
  }

  /**
   * Check if command is a test command
   *
   * @param command - Bash command to check
   * @returns True if command appears to be running tests
   */
  private isTestCommand(command: string): boolean {
    return HookIntegration.TEST_COMMAND_PATTERNS.some(p => command.includes(p));
  }

  /**
   * Check if command is git add
   *
   * @param command - Bash command to check
   * @returns True if command is git add
   */
  private isGitAddCommand(command: string): boolean {
    return command.trim().startsWith('git add');
  }

  /**
   * Check if command is git commit
   *
   * Determines if a bash command is a git commit command.
   * Used to detect committed checkpoint from Bash tool execution.
   *
   * @param command - Bash command to check
   * @returns True if command is git commit
   */
  private isGitCommitCommand(command: string): boolean {
    return this.findGitCommitSegment(command) !== null;
  }

  /**
   * Extract commit message from a git commit command
   *
   * Supports repeated -m flags and returns a combined message.
   * Returns null if no -m flag is present.
   *
   * @param command - Git commit command
   * @returns Commit message string or null
   */
  private extractGitCommitMessage(command: string): string | null {
    const segment = this.findGitCommitSegment(command);
    const source = segment ?? command;
    const messages: string[] = [];
    const regex = /-m\s+(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const message = match[1] ?? match[2] ?? match[3];
      if (message) {
        messages.push(message);
      }
    }

    return messages.length > 0 ? messages.join('\n') : null;
  }

  /**
   * Locate the git commit segment within a composite shell command
   */
  private findGitCommitSegment(command: string): string | null {
    const segments = command
      .split(/&&|;/)
      .map(segment => segment.trim())
      .filter(Boolean);

    for (const segment of segments) {
      if (/^git\s+commit(\s|$)/.test(segment)) {
        return segment;
      }
    }

    return null;
  }

  /**
   * Type guard to validate TestResults structure
   *
   * @param data - Unknown data to validate
   * @returns true if data matches TestResults interface
   */
  private isValidTestResults(data: unknown): data is TestResults {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;

    return (
      typeof obj.total === 'number' &&
      typeof obj.passed === 'number' &&
      typeof obj.failed === 'number' &&
      Array.isArray(obj.failedTests) &&
      obj.failedTests.every(
        (test: unknown) =>
          test &&
          typeof test === 'object' &&
          typeof (test as Record<string, unknown>).name === 'string'
      )
    );
  }

  /**
   * Check if command output contains error indicators
   */
  private shouldRecordError(output: string): boolean {
    const errorPatterns = [
      /error:/i,
      /exception:/i,
      /failed:/i,
      /\d+ failing/i,  // Test failures
      /build failed/i,
    ];

    return errorPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Extract and record error information from command output
   */
  private async recordErrorFromOutput(output: string, command: string): Promise<void> {
    // Simple heuristic: extract first line with error
    const lines = output.split('\n');
    const errorLine = lines.find(line =>
      /error:|exception:|failed:/i.test(line)
    );

    if (!errorLine || !this.projectAutoTracker) {
      return;
    }

    // Extract error type and message (simple heuristic)
    const match = errorLine.match(/(\w+Error|Exception|Failed):\s*(.+)/i);
    const errorType = match?.[1] || 'Unknown Error';
    const errorMessage = match?.[2] || errorLine.substring(0, 100);

    await this.projectAutoTracker.recordError({
      error_type: errorType,
      error_message: errorMessage,
      context: `Command: ${command}`,
      resolution: 'Detected during command execution',
    });
  }
}
