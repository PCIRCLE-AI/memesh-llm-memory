/**
 * Tool Handlers Module (Facade)
 *
 * Thin dispatcher that delegates to focused sub-handlers:
 * - MemoryToolHandler: entity/relation/recall/mistake operations
 * - SystemToolHandler: skills, uninstall, test generation
 * - HookToolHandler: hook tool use tracking
 *
 * External callers (ToolRouter) use this class unchanged.
 *
 * @module ToolHandlers
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SkillManager } from '../../skills/index.js';
import { UninstallManager } from '../../management/index.js';
import { CheckpointDetector } from '../../core/CheckpointDetector.js';
import { HookIntegration } from '../../core/HookIntegration.js';
import { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import { UnifiedMemoryStore } from '../../memory/UnifiedMemoryStore.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { HumanInLoopUI } from '../HumanInLoopUI.js';
import { SamplingClient } from '../SamplingClient.js';
import { MemoryToolHandler } from './MemoryToolHandler.js';
import { SystemToolHandler } from './SystemToolHandler.js';
import { HookToolHandler } from './HookToolHandler.js';

/**
 * Tool Handlers Class (Facade)
 *
 * Centralized handler for all non-Git MCP tools. Each public method corresponds
 * to a specific tool and is called by ToolRouter based on the tool name.
 *
 * Internally delegates to focused sub-handlers, each with only the
 * dependencies they need.
 */
export class ToolHandlers {
  private memoryHandler: MemoryToolHandler;
  private systemHandler: SystemToolHandler;
  private hookHandler: HookToolHandler;

  constructor(
    skillManager: SkillManager,
    uninstallManager: UninstallManager,
    checkpointDetector: CheckpointDetector,
    hookIntegration: HookIntegration,
    projectMemoryManager: ProjectMemoryManager | undefined,
    knowledgeGraph: KnowledgeGraph | undefined,
    _ui: HumanInLoopUI,
    samplingClient: SamplingClient,
    unifiedMemoryStore: UnifiedMemoryStore | undefined
  ) {
    this.memoryHandler = new MemoryToolHandler(
      knowledgeGraph,
      projectMemoryManager,
      unifiedMemoryStore
    );

    this.systemHandler = new SystemToolHandler(
      skillManager,
      uninstallManager,
      samplingClient
    );

    this.hookHandler = new HookToolHandler(
      checkpointDetector,
      hookIntegration
    );
  }

  /**
   * Handle buddy_skills tool - List all skills
   */
  async handleListSkills(args: unknown): Promise<CallToolResult> {
    return this.systemHandler.handleListSkills(args);
  }

  /**
   * Handle buddy_uninstall tool - Uninstall MeMesh
   */
  async handleUninstall(args: unknown): Promise<CallToolResult> {
    return this.systemHandler.handleUninstall(args);
  }

  /**
   * Handle hook-tool-use tool
   */
  async handleHookToolUse(args: unknown): Promise<CallToolResult> {
    return this.hookHandler.handleHookToolUse(
      args,
      this.memoryHandler.isCloudOnlyMode(),
      (toolName) => this.memoryHandler.cloudOnlyModeError(toolName)
    );
  }

  /**
   * Handle recall-memory tool
   */
  async handleRecallMemory(args: unknown): Promise<CallToolResult> {
    return this.memoryHandler.handleRecallMemory(args);
  }

  /**
   * Handle create-entities tool
   */
  async handleCreateEntities(args: unknown): Promise<CallToolResult> {
    return this.memoryHandler.handleCreateEntities(args);
  }

  /**
   * Handle buddy-record-mistake tool
   */
  async handleBuddyRecordMistake(args: unknown): Promise<CallToolResult> {
    return this.memoryHandler.handleBuddyRecordMistake(args);
  }

  /**
   * Handle add-observations tool
   */
  async handleAddObservations(args: unknown): Promise<CallToolResult> {
    return this.memoryHandler.handleAddObservations(args);
  }

  /**
   * Handle create-relations tool
   */
  async handleCreateRelations(args: unknown): Promise<CallToolResult> {
    return this.memoryHandler.handleCreateRelations(args);
  }

  /**
   * Handle generate-tests tool
   */
  async handleGenerateTests(args: unknown): Promise<CallToolResult> {
    return this.systemHandler.handleGenerateTests(args);
  }
}
