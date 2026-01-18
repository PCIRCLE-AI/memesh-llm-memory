/**
 * MCP Tool Interface
 *
 * Provides a standardized interface for agents to interact with MCP (Model Context Protocol) tools.
 * Centralizes tool registration, invocation, and dependency checking with convenient helper methods
 * for common operations like filesystem access, memory/knowledge graph manipulation, browser
 * automation with Playwright, and shell command execution.
 *
 * Features:
 * - Tool registration and metadata management
 * - Standardized tool invocation interface
 * - Dependency checking for required tools
 * - Helper namespaces for common tool categories:
 *   - `filesystem`: File operations (read, write)
 *   - `memory`: Knowledge graph operations (create entities, search nodes)
 *   - `playwright`: Browser automation (navigate, click, type, screenshot)
 *   - `bash`: Shell command execution
 *
 * @example
 * ```typescript
 * import { MCPToolInterface } from './MCPToolInterface.js';
 *
 * const mcpTools = new MCPToolInterface();
 *
 * // Register MCP tools
 * mcpTools.registerTool('filesystem', {
 *   description: 'File system operations',
 *   methods: ['readFile', 'writeFile', 'listDirectory']
 * });
 *
 * // Use filesystem helper
 * const content = await mcpTools.filesystem.readFile('/path/to/file.txt');
 * await mcpTools.filesystem.writeFile({
 *   path: '/path/to/output.txt',
 *   content: 'Hello, world!'
 * });
 *
 * // Use memory/knowledge graph helper
 * const results = await mcpTools.memory.searchNodes('project architecture');
 * await mcpTools.memory.createEntities({
 *   entities: [{
 *     name: 'Feature Implementation',
 *     entityType: 'milestone',
 *     observations: ['Completed API integration', 'Added unit tests']
 *   }]
 * });
 *
 * // Check tool availability
 * const check = mcpTools.checkRequiredTools(['filesystem', 'memory']);
 * if (!check.allAvailable) {
 *   console.warn('Missing tools:', check.missing);
 * }
 * ```
 */

import { spawn } from 'child_process';
import path from 'path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NotFoundError, OperationError, ValidationError } from '../errors/index.js';

/**
 * Tool metadata structure
 */
export interface ToolMetadata {
  /** Human-readable description of the tool */
  description: string;

  /** Available methods/operations for this tool */
  methods: string[];
}

/**
 * Tool invocation result
 */
export interface ToolInvocationResult {
  /** Whether the invocation was successful */
  success: boolean;

  /** Result data from the tool (if any) */
  data?: unknown;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Tool dependency check result
 */
export interface ToolDependencyCheck {
  /** Whether all required tools are available */
  allAvailable: boolean;

  /** List of missing tools */
  missing: string[];
}

export interface ToolDispatcher {
  routeToolCall(params: { name: string; arguments: Record<string, unknown> }): Promise<CallToolResult>;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CommandPolicyDecision {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

export interface CommandPolicy {
  evaluate(command: string): CommandPolicyDecision;
}

export interface CommandRunner {
  run(command: string, timeoutMs?: number): Promise<CommandResult>;
}

export interface MemoryEntityInput {
  name: string;
  entityType: string;
  observations: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateEntitiesInput {
  entities: MemoryEntityInput[];
}

export interface MemoryProvider {
  createEntities(input: CreateEntitiesInput): Promise<void>;
  searchNodes(query: string): Promise<unknown[]>;
}

export interface MCPToolInterfaceOptions {
  toolDispatcher?: ToolDispatcher;
  commandPolicy?: CommandPolicy;
  commandRunner?: CommandRunner;
  memoryProvider?: MemoryProvider;
}

/**
 * MCP Tool Interface Class
 *
 * Central registry and invocation point for all MCP tools.
 * Agents use this interface to interact with MCP tools in a standardized way.
 */
export class MCPToolInterface {
  private tools: Map<string, ToolMetadata> = new Map();
  private toolDispatcher?: ToolDispatcher;
  private commandPolicy: CommandPolicy;
  private commandRunner: CommandRunner;
  private memoryProvider?: MemoryProvider;

  constructor(options: MCPToolInterfaceOptions = {}) {
    this.toolDispatcher = options.toolDispatcher;
    this.commandPolicy = options.commandPolicy || createDefaultCommandPolicy();
    this.commandRunner = options.commandRunner || createDefaultCommandRunner();
    this.memoryProvider = options.memoryProvider;
  }

  attachToolDispatcher(dispatcher: ToolDispatcher): void {
    this.toolDispatcher = dispatcher;
  }

  attachMemoryProvider(provider: MemoryProvider): void {
    this.memoryProvider = provider;
  }

  /**
   * Check if memory operations are available
   */
  supportsMemory(): boolean {
    return Boolean(this.memoryProvider) || this.isToolRegistered('memory');
  }

  setCommandPolicy(policy: CommandPolicy): void {
    this.commandPolicy = policy;
  }

  /**
   * Filesystem helper methods
   * Provides convenient access to filesystem MCP tool operations
   */
  public filesystem = {
    /**
     * Read file content
     * @param path - File path to read
     * @returns Promise<string> File content
     */
    readFile: async (path: string): Promise<string> => {
      const result = await this.invokeTool('filesystem', 'readFile', { path });
      if (result.success && result.data) {
        return (result.data as Record<string, unknown>).content as string || '';
      }
      return '';
    },

    /**
     * Write file content
     *
     * Writes content to a file, creating the file if it doesn't exist
     * or overwriting it if it does.
     *
     * @param opts - Write options
     * @param opts.path - Target file path (absolute or relative)
     * @param opts.content - Content to write to the file
     * @returns Promise<void>
     *
     * @example
     * ```typescript
     * // Write JSON data
     * await mcpTools.filesystem.writeFile({
     *   path: 'data/output.json',
     *   content: JSON.stringify({ results: [...] }, null, 2)
     * });
     *
     * // Write generated code
     * await mcpTools.filesystem.writeFile({
     *   path: 'generated/schema.ts',
     *   content: generatedTypeScriptCode
     * });
     *
     * // Write log file
     * await mcpTools.filesystem.writeFile({
     *   path: 'logs/execution.log',
     *   content: `Execution completed at ${new Date().toISOString()}`
     * });
     * ```
     */
    writeFile: async (opts: { path: string; content: string }): Promise<void> => {
      await this.invokeTool('filesystem', 'writeFile', opts);
    },
  };

  /**
   * Memory helper methods
   *
   * Provides convenient access to memory/knowledge graph MCP tool operations.
   * Enables structured knowledge storage and retrieval for project context,
   * decisions, lessons learned, and system architecture.
   *
   * @example
   * ```typescript
   * // Store project milestone
   * await mcpTools.memory.createEntities({
   *   entities: [{
   *     name: 'API Integration v2.0',
   *     entityType: 'milestone',
   *     observations: [
   *       'Completed RESTful API endpoints',
   *       'Added authentication middleware',
   *       'Achieved 95% test coverage'
   *     ]
   *   }]
   * });
   *
   * // Search for architecture decisions
   * const results = await mcpTools.memory.searchNodes('database schema');
   * console.log(`Found ${results.length} related nodes`);
   * ```
   */
  public memory = {
    /**
     * Create entities in knowledge graph
     *
     * Creates new entities (nodes) in the knowledge graph with associated
     * observations and metadata. Useful for storing project milestones,
     * decisions, lessons learned, and system architecture information.
     *
     * @param opts - Entity creation options
     * @param opts.entities - Array of entities to create
     * @returns Promise<void>
     *
     * @example
     * ```typescript
     * // Store lesson learned
     * await mcpTools.memory.createEntities({
     *   entities: [{
     *     name: 'Authentication Bug Fix 2025-01-01',
     *     entityType: 'lesson_learned',
     *     observations: [
     *       'Root cause: JWT token expiry not properly handled',
     *       'Fix: Added token refresh mechanism',
     *       'Prevention: Added integration tests for auth flow'
     *     ]
     *   }]
     * });
     *
     * // Store architecture decision
     * await mcpTools.memory.createEntities({
     *   entities: [{
     *     name: 'PostgreSQL Database Selection',
     *     entityType: 'architecture_decision',
     *     observations: [
     *       'Chosen PostgreSQL over MongoDB',
     *       'Reason: Complex relational queries required',
     *       'Trade-off: More rigid schema but better data integrity'
     *     ]
     *   }]
     * });
     * ```
     */
    createEntities: async (opts: CreateEntitiesInput): Promise<void> => {
      if (this.memoryProvider) {
        await this.memoryProvider.createEntities(opts);
        return;
      }
      await this.invokeTool(
        'memory',
        'createEntities',
        opts as unknown as Record<string, unknown>
      );
    },

    /**
     * Search nodes in knowledge graph
     *
     * Searches the knowledge graph for entities matching a query string.
     * Searches across entity names, types, and observation content.
     *
     * @param query - Search query (entity name, type, or pattern)
     * @returns Promise<unknown[]> Array of matching entities
     *
     * @example
     * ```typescript
     * // Search for API-related entities
     * const apiNodes = await mcpTools.memory.searchNodes('API endpoints');
     * console.log(`Found ${apiNodes.length} API-related nodes`);
     *
     * // Search for recent decisions
     * const decisions = await mcpTools.memory.searchNodes('architecture decision');
     *
     * // Search for specific component
     * const authNodes = await mcpTools.memory.searchNodes('authentication');
     * authNodes.forEach(node => {
     *   console.log(`Entity: ${node.name}, Type: ${node.entityType}`);
     * });
     * ```
     */
    searchNodes: async (query: string): Promise<unknown[]> => {
      if (this.memoryProvider) {
        return await this.memoryProvider.searchNodes(query);
      }
      const result = await this.invokeTool('memory', 'searchNodes', { query });
      if (result.success && result.data && Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    },
  };

  /**
   * Playwright helper methods
   * Provides convenient access to Playwright MCP tool operations for browser automation
   */
  public playwright = {
    /**
     * Navigate to a URL
     * @param url - URL to navigate to
     * @returns Promise<void>
     */
    navigate: async (url: string): Promise<void> => {
      await this.invokeTool('playwright', 'navigate', { url });
    },

    /**
     * Take an accessibility snapshot of the current page
     * @returns Promise<unknown> Page snapshot
     */
    snapshot: async (): Promise<unknown> => {
      const result = await this.invokeTool('playwright', 'snapshot', {});
      return result.data || {};
    },

    /**
     * Click an element on the page
     * @param opts - Click options {element, ref}
     * @returns Promise<void>
     */
    click: async (opts: { element: string; ref: string }): Promise<void> => {
      await this.invokeTool('playwright', 'click', opts);
    },

    /**
     * Type text into an element
     * @param opts - Type options {element, ref, text, submit?}
     * @returns Promise<void>
     */
    type: async (opts: {
      element: string;
      ref: string;
      text: string;
      submit?: boolean;
    }): Promise<void> => {
      await this.invokeTool('playwright', 'type', opts);
    },

    /**
     * Wait for a condition
     * @param opts - Wait options {text?, time?}
     * @returns Promise<void>
     */
    waitFor: async (opts: { text?: string; time?: number }): Promise<void> => {
      await this.invokeTool('playwright', 'waitFor', opts);
    },

    /**
     * Take a screenshot
     * @param opts - Screenshot options {filename?, fullPage?}
     * @returns Promise<void>
     */
    takeScreenshot: async (opts: {
      filename?: string;
      fullPage?: boolean;
    }): Promise<void> => {
      await this.invokeTool('playwright', 'takeScreenshot', opts);
    },

    /**
     * Evaluate JavaScript expression on page
     * @param opts - Evaluate options {function}
     * @returns Promise<unknown> Evaluation result
     */
    evaluate: async (opts: { function: string }): Promise<unknown> => {
      const result = await this.invokeTool('playwright', 'evaluate', opts);
      return result.data || null;
    },

    /**
     * Close the browser
     * @returns Promise<void>
     */
    close: async (): Promise<void> => {
      await this.invokeTool('playwright', 'close', {});
    },
  };

  /**
   * Bash command execution helper
   * Provides vetted access to shell command execution.
   */
  public bash = async (opts: {
    command: string;
    timeout?: number;
    confirmed?: boolean;
    confirmationReason?: string;
  }): Promise<CommandResult> => {
    const { command, timeout, confirmed } = opts;

    if (!command || !command.trim()) {
      throw new ValidationError('Command is required', {
        component: 'MCPToolInterface',
        method: 'bash',
        providedValue: command,
      });
    }

    let decision: CommandPolicyDecision;
    try {
      decision = this.commandPolicy.evaluate(command);
    } catch (error) {
      throw new OperationError(
        `Command policy evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        { command }
      );
    }

    if (!decision.allowed) {
      throw new OperationError(
        decision.reason ? `Command blocked: ${decision.reason}` : 'Command blocked by policy',
        { command }
      );
    }

    if (decision.requiresConfirmation && !confirmed) {
      throw new OperationError(
        'Command requires confirmation. Re-run with confirmed: true.',
        { command }
      );
    }

    const result = await this.commandRunner.run(command, timeout);

    if (result.exitCode !== 0) {
      throw new OperationError(
        `Command failed with exit code ${result.exitCode}`,
        { command, stdout: result.stdout, stderr: result.stderr }
      );
    }

    return result;
  };

  /**
   * Register an MCP tool
   *
   * @param toolName - Name of the tool to register
   * @param metadata - Tool metadata (description, methods)
   * @returns True if registration successful
   */
  registerTool(toolName: string, metadata: ToolMetadata): boolean {
    if (!toolName || !metadata) {
      return false;
    }

    this.tools.set(toolName, metadata);
    return true;
  }

  /**
   * Check if a tool is registered
   *
   * @param toolName - Name of the tool to check
   * @returns True if tool is registered
   */
  isToolRegistered(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get list of all registered tools
   *
   * @returns Array of registered tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Invoke an MCP tool
   *
   * @param toolName - Name of the tool to invoke
   * @param method - Method to call on the tool
   * @param params - Parameters to pass to the tool
   * @returns Promise<ToolInvocationResult> Result of the invocation
   * @throws Error if tool is not registered or method is invalid
   */
  async invokeTool(
    toolName: string,
    method: string,
    params: Record<string, unknown>
  ): Promise<ToolInvocationResult> {
    // Check if tool is registered
    if (!this.isToolRegistered(toolName)) {
      throw new NotFoundError(
        `Tool "${toolName}" is not registered`,
        'tool',
        toolName,
        { method, params }
      );
    }

    // Get tool metadata
    const metadata = this.tools.get(toolName);

    // Check if method is available
    if (!metadata?.methods.includes(method)) {
      throw new NotFoundError(
        `Method "${method}" not available for tool "${toolName}"`,
        'method',
        method,
        { toolName, availableMethods: metadata?.methods || [] }
      );
    }

    throw new OperationError(
      'External MCP tool invocation is not configured. Attach a ToolDispatcher for in-process tools.',
      {
        toolName,
        method,
        params,
      }
    );
  }

  /**
   * Invoke a CCB tool directly via in-process dispatcher
   *
   * @param toolName - MCP tool name (e.g., "buddy-do", "get-session-health")
   * @param args - Tool arguments
   * @returns ToolInvocationResult with MCP CallToolResult payload
   */
  async invokeToolByName(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolInvocationResult> {
    if (!this.toolDispatcher) {
      throw new OperationError('Tool dispatcher is not attached', {
        toolName,
        args,
      });
    }

    const result = await this.toolDispatcher.routeToolCall({
      name: toolName,
      arguments: args,
    });

    return {
      success: !result.isError,
      data: result,
      error: result.isError ? 'Tool execution failed' : undefined,
    };
  }

  /**
   * Check if all required tools are available
   *
   * @param requiredTools - Array of required tool names
   * @returns ToolDependencyCheck Result of the check
   */
  checkRequiredTools(requiredTools: string[]): ToolDependencyCheck {
    const missing: string[] = [];

    for (const tool of requiredTools) {
      if (!this.isToolRegistered(tool)) {
        missing.push(tool);
      }
    }

    return {
      allAvailable: missing.length === 0,
      missing,
    };
  }

  /**
   * Get metadata for a specific tool
   *
   * @param toolName - Name of the tool
   * @returns ToolMetadata or undefined if not found
   */
  getToolMetadata(toolName: string): ToolMetadata | undefined {
    return this.tools.get(toolName);
  }
}

const DEFAULT_ALLOWED_BINARIES = new Set([
  'rg',
  'ls',
  'pwd',
  'cat',
  'stat',
  'head',
  'tail',
  'node',
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'python',
  'python3',
  'pip',
  'pip3',
  'pytest',
  'vitest',
  'jest',
  'mocha',
  'tsc',
  'eslint',
  'prettier',
  'go',
  'cargo',
  'make',
]);

const DEFAULT_CONFIRM_BINARIES = new Set([
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'python',
  'python3',
  'pip',
  'pip3',
  'go',
  'cargo',
  'make',
]);

function createDefaultCommandPolicy(): CommandPolicy {
  return {
    evaluate: (command: string): CommandPolicyDecision => {
      const tokens = parseCommandLine(command);
      if (tokens.length === 0) {
        return { allowed: false, requiresConfirmation: false, reason: 'Empty command' };
      }

      const [binary] = tokens;
      const normalizedBinary = path.basename(binary);

      if (!DEFAULT_ALLOWED_BINARIES.has(normalizedBinary)) {
        return {
          allowed: false,
          requiresConfirmation: false,
          reason: `Command not allowed by default: ${normalizedBinary}`,
        };
      }

      return {
        allowed: true,
        requiresConfirmation: DEFAULT_CONFIRM_BINARIES.has(normalizedBinary),
      };
    },
  };
}

function createDefaultCommandRunner(): CommandRunner {
  return {
    run: async (command: string, timeoutMs?: number): Promise<CommandResult> => {
      const tokens = parseCommandLine(command);
      if (tokens.length === 0) {
        return { exitCode: 1, stdout: '', stderr: 'No command provided' };
      }

      const [binary, ...args] = tokens;
      const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';
      let settled = false;

      return await new Promise<CommandResult>((resolve) => {
        const finish = (exitCode: number, extraStderr?: string) => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          if (extraStderr) {
            stderr += stderr ? `\n${extraStderr}` : extraStderr;
          }
          resolve({ exitCode, stdout, stderr });
        };

        const timeoutId = timeoutMs && timeoutMs > 0 ? setTimeout(() => {
          child.kill('SIGTERM');
          finish(124, 'Command timed out');
        }, timeoutMs) : undefined;

        child.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        child.on('error', (error) => {
          finish(1, error.message);
        });

        child.on('close', (code) => {
          finish(code ?? 1);
        });
      });
    },
  };
}

function parseCommandLine(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | '\'' | null = null;
  let escape = false;

  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];

    if (escape) {
      current += char;
      escape = false;
      continue;
    }

    if (char === '\\\\' && quote !== '\'') {
      escape = true;
      continue;
    }

    if ((char === '\"' || char === '\'') && !quote) {
      quote = char;
      continue;
    }

    if (quote && char === quote) {
      quote = null;
      continue;
    }

    if (!quote && /\\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escape) {
    current += '\\\\';
  }

  if (quote) {
    throw new Error('Unterminated quote in command');
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
