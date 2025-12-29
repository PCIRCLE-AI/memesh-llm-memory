/**
 * MCP Tool Interface
 *
 * Provides a standardized interface for agents to interact with MCP tools.
 * Handles tool registration, invocation, and dependency checking.
 */

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

/**
 * MCP Tool Interface Class
 *
 * Central registry and invocation point for all MCP tools.
 * Agents use this interface to interact with MCP tools in a standardized way.
 */
export class MCPToolInterface {
  private tools: Map<string, ToolMetadata> = new Map();

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
     * @param opts - Write options {path, content}
     * @returns Promise<void>
     */
    writeFile: async (opts: { path: string; content: string }): Promise<void> => {
      await this.invokeTool('filesystem', 'writeFile', opts);
    },
  };

  /**
   * Memory helper methods
   * Provides convenient access to memory/knowledge graph MCP tool operations
   */
  public memory = {
    /**
     * Create entities in knowledge graph
     * @param opts - Entity creation options
     * @returns Promise<void>
     */
    createEntities: async (opts: Record<string, unknown>): Promise<void> => {
      await this.invokeTool('memory', 'createEntities', opts);
    },
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
      throw new Error(`Tool "${toolName}" is not registered`);
    }

    // Get tool metadata
    const metadata = this.tools.get(toolName);

    // Check if method is available
    if (!metadata?.methods.includes(method)) {
      throw new Error(
        `Method "${method}" not available for tool "${toolName}"`
      );
    }

    // KNOWN LIMITATION: MCP tool invocation not yet implemented in v2.1.0
    // This is a documented limitation of the current MCP Server Pattern
    //
    // TODO for v3.0: Implement actual MCP client connection
    // - Connect to MCP server via stdio/HTTP
    // - Call tool with proper request/response protocol
    // - Handle errors and timeouts
    //
    // Current workaround: Agents using MCPToolInterface should handle this error
    // and use alternative methods (direct API calls, fallback mechanisms)
    throw new Error(
      `MCP tool invocation not yet implemented (v2.1.0 limitation).\n` +
      `Tool: ${toolName}, Method: ${method}\n\n` +
      `This is a known limitation of the current MCP Server Pattern.\n` +
      `In v2.1.0, agents work via prompt enhancement instead of direct tool calls.\n\n` +
      `For implementation guidance, see:\n` +
      `- https://github.com/modelcontextprotocol/specification\n` +
      `- docs/architecture/MCP_TOOL_INVOCATION.md`
    );
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
