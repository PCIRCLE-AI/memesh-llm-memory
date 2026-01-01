/**
 * Git Assistant Integration for Claude Code Buddy
 *
 * Exposes Git Assistant functionality to Claude Code and other Claude Code Buddy agents.
 * Provides hook points for automatic Git management.
 */

import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { GitAssistantHook } from '../hooks/GitAssistantHook.js';
import { GitSetupWizard } from '../hooks/GitSetupWizard.js';
import { FriendlyGitCommands } from '../hooks/FriendlyGitCommands.js';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Main integration class for Git Assistant
 */
export class GitAssistantIntegration {
  private mcp: MCPToolInterface;
  private gitAssistant: GitAssistantHook;
  private setupWizard: GitSetupWizard;
  private friendlyCommands: FriendlyGitCommands;

  constructor(mcp: MCPToolInterface) {
    this.mcp = mcp;
    this.gitAssistant = new GitAssistantHook(mcp);
    this.setupWizard = new GitSetupWizard(mcp);
    this.friendlyCommands = new FriendlyGitCommands(mcp);
  }

  /**
   * Initialize Git Assistant for the current project
   * Called when user starts working on a project
   */
  async initialize(projectPath?: string): Promise<void> {
    const targetPath = projectPath || process.cwd();

    // Load configuration
    await this.gitAssistant.loadConfig();

    // Trigger project:init hook
    await this.gitAssistant.onProjectInit(targetPath);
  }

  /**
   * Check if project has Git initialized
   */
  async hasGit(projectPath?: string): Promise<boolean> {
    const targetPath = projectPath || process.cwd();
    try {
      const gitDir = path.join(targetPath, '.git');
      await fs.access(gitDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup Git for a new project (Scenario A)
   */
  async setupNewProject(): Promise<void> {
    await this.setupWizard.runFullSetup();
  }

  /**
   * Configure Git Assistant for existing Git project (Scenario B)
   */
  async configureExistingProject(): Promise<void> {
    await this.setupWizard.setupForExistingGit();
  }

  /**
   * Handle file changes (called by Claude Code Buddy when files are modified)
   */
  async onFilesChanged(filePaths: string[]): Promise<void> {
    await this.gitAssistant.onFileChanged(filePaths);
  }

  /**
   * Notify when a feature is complete (AI detection)
   */
  async onFeatureComplete(featureName: string, files: string[]): Promise<void> {
    await this.gitAssistant.onFeatureComplete(featureName, files);
  }

  /**
   * Periodic timer check (runs every N minutes)
   */
  async onTimerInterval(): Promise<void> {
    await this.gitAssistant.onTimerInterval();
  }

  /**
   * User-facing commands (callable by Claude Code)
   */

  async saveWork(description: string, autoBackup: boolean = true): Promise<void> {
    await this.friendlyCommands.saveWork(description, autoBackup);
  }

  async listVersions(limit?: number): Promise<any[]> {
    return await this.friendlyCommands.listVersions(limit);
  }

  async goBackTo(identifier: string): Promise<void> {
    await this.friendlyCommands.goBackTo(identifier);
  }

  async showChanges(compareWith?: string): Promise<any> {
    return await this.friendlyCommands.showChanges(compareWith);
  }

  async status(): Promise<void> {
    await this.friendlyCommands.status();
  }

  async createBackup(): Promise<string> {
    return await this.friendlyCommands.createLocalBackup();
  }

  /**
   * Configuration commands
   */

  async setAutomationLevel(level: 0 | 1 | 2 | 3): Promise<void> {
    await this.gitAssistant.setAutomationLevel(level);
  }

  async setGitHubToken(token: string): Promise<void> {
    await this.gitAssistant.setGitHubToken(token);
  }

  /**
   * Help and tutorials
   */

  async showHelp(): Promise<void> {
    await this.setupWizard.showHelp();
  }
}

/**
 * Factory function to create and initialize Git Assistant
 */
export async function createGitAssistant(mcp: MCPToolInterface, projectPath?: string): Promise<GitAssistantIntegration> {
  const integration = new GitAssistantIntegration(mcp);
  await integration.initialize(projectPath);
  return integration;
}

/**
 * Export friendly commands for direct use
 */
export { FriendlyGitCommands };
export { GitSetupWizard };
export { GitAssistantHook };
