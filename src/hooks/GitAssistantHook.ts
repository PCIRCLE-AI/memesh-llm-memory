/**
 * Git Assistant Hook System
 *
 * Provides intelligent Git assistance for users without software development background.
 * Features:
 * - Auto-detect projects without Git
 * - Friendly explanations before setup
 * - Permission-based automation
 * - Optional GitHub integration (auto-enabled when token provided)
 * - 4 automation levels: Manual (0) → Smart Reminders (1) → Semi-Auto (2) → Full-Auto (3)
 */

import { MCPToolInterface } from '../core/MCPToolInterface';
import { FriendlyGitCommands } from './FriendlyGitCommands';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface GitAssistantConfig {
  enabled: boolean;
  automationLevel: 0 | 1 | 2 | 3; // 0=manual, 1=reminders, 2=semi-auto, 3=full-auto
  thresholds: {
    fileCount: number;       // Trigger when N files changed
    lineCount: number;       // Trigger when N lines changed
    timeInterval: number;    // Trigger after N minutes
  };
  notifications: {
    style: 'toast' | 'modal' | 'status-bar';
    position: 'top-right' | 'bottom-right' | 'center';
  };
  versionDescription: {
    mode: 'ai-only' | 'ai-editable' | 'templates';
  };
  localBackup: {
    enabled: boolean;
    interval: 'hourly' | 'daily' | 'weekly';
    location: string;
  };
  github: {
    enabled: boolean;      // Auto-enabled when token provided
    token?: string;
    autoSync: boolean;
  };
}

export interface ChangeStatistics {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  lastCommitTime: Date | null;
  currentSessionStart: Date;
}

export interface CommitSuggestion {
  confidence: number;        // 0-1 score
  reason: string;           // Why suggesting now
  suggestedMessage: string; // AI-generated commit message
  changedFiles: string[];
  pattern: 'feature-complete' | 'bug-fix' | 'refactor' | 'periodic' | 'manual';
}

export class GitAssistantHook {
  private mcp: MCPToolInterface;
  private friendlyCommands: FriendlyGitCommands;
  private config: GitAssistantConfig;
  private changeStats: ChangeStatistics;
  private configPath: string;

  constructor(mcp: MCPToolInterface, configPath?: string) {
    this.mcp = mcp;
    this.friendlyCommands = new FriendlyGitCommands(mcp);
    this.configPath = configPath || path.join(process.env.HOME || '', '.claude-code-buddy', 'git-assistant-config.json');

    // Initialize with default config (will load from file if exists)
    this.config = this.getDefaultConfig();
    this.changeStats = this.initializeChangeStats();
  }

  /**
   * Default configuration (Level 1: Smart Reminders - RECOMMENDED)
   */
  private getDefaultConfig(): GitAssistantConfig {
    return {
      enabled: true,
      automationLevel: 1, // Start with smart reminders
      thresholds: {
        fileCount: 10,
        lineCount: 100,
        timeInterval: 30, // minutes
      },
      notifications: {
        style: 'toast',
        position: 'bottom-right',
      },
      versionDescription: {
        mode: 'ai-editable',
      },
      localBackup: {
        enabled: true,
        interval: 'daily',
        location: path.join(process.env.HOME || '', '.claude-code-buddy-backups'),
      },
      github: {
        enabled: false, // Will auto-enable when token provided
        autoSync: false,
      },
    };
  }

  private initializeChangeStats(): ChangeStatistics {
    return {
      filesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      lastCommitTime: null,
      currentSessionStart: new Date(),
    };
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(configData);
      this.config = { ...this.config, ...loadedConfig };

      // Auto-enable GitHub if token is provided
      if (this.config.github.token && this.config.github.token.trim() !== '') {
        this.config.github.enabled = true;
        console.log('✅ GitHub integration auto-enabled (token detected)');
      }
    } catch (error) {
      // Config file doesn't exist, use defaults
      await this.saveConfig();
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Hook: project:init
   * Triggered when user starts working on a new project or opens existing project
   */
  async onProjectInit(projectPath: string): Promise<void> {
    if (!this.config.enabled) return;

    const hasGit = await this.hasGitRepo(projectPath);

    if (!hasGit) {
      await this.handleProjectWithoutGit(projectPath);
    } else {
      await this.handleProjectWithGit(projectPath);
    }
  }

  /**
   * Hook: file:changed
   * Triggered when files are modified
   */
  async onFileChanged(filePaths: string[]): Promise<void> {
    if (!this.config.enabled) return;
    if (this.config.automationLevel === 0) return; // Manual mode, no tracking

    // Update statistics
    this.changeStats.filesChanged += filePaths.length;

    // Get diff stats for line counts
    try {
      const diffResult = await this.mcp.bash({
        command: 'git diff --numstat',
      });

      const lines = diffResult.stdout.trim().split('\n');
      for (const line of lines) {
        const [added, removed] = line.split('\t');
        if (added && added !== '-') this.changeStats.linesAdded += parseInt(added);
        if (removed && removed !== '-') this.changeStats.linesRemoved += parseInt(removed);
      }
    } catch (error) {
      // Ignore errors (might not be in a git repo)
    }

    // Check if we should suggest commit
    await this.checkAndSuggestCommit();
  }

  /**
   * Hook: workflow:feature-complete
   * AI detects that a feature is complete
   */
  async onFeatureComplete(featureName: string, files: string[]): Promise<void> {
    if (!this.config.enabled) return;
    if (this.config.automationLevel === 0) return;

    const suggestion: CommitSuggestion = {
      confidence: 0.9,
      reason: `AI detected feature completion: ${featureName}`,
      suggestedMessage: `feat: ${featureName}`,
      changedFiles: files,
      pattern: 'feature-complete',
    };

    await this.handleCommitSuggestion(suggestion);
  }

  /**
   * Hook: timer:interval
   * Periodic check (runs every N minutes)
   */
  async onTimerInterval(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.config.automationLevel === 0) return;

    const now = new Date();
    const minutesSinceLastCommit = this.changeStats.lastCommitTime
      ? (now.getTime() - this.changeStats.lastCommitTime.getTime()) / 60000
      : (now.getTime() - this.changeStats.currentSessionStart.getTime()) / 60000;

    if (minutesSinceLastCommit >= this.config.thresholds.timeInterval) {
      await this.checkAndSuggestCommit();
    }
  }

  /**
   * Scenario A: Project without Git
   * Show educational explanation and ask permission to set up
   */
  private async handleProjectWithoutGit(projectPath: string): Promise<void> {
    console.log('\n🔍 偵測到專案尚未使用版本控制');
    console.log('');
    console.log('╭─────────────────────────────────────────────────────────────╮');
    console.log('│  💡 什麼是版本控制？                                         │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│                                                             │');
    console.log('│  類比 1: 遊戲存檔點                                          │');
    console.log('│  就像玩遊戲時可以儲存進度，隨時回到之前的存檔點             │');
    console.log('│                                                             │');
    console.log('│  類比 2: 拍照記錄                                            │');
    console.log('│  就像拍照記錄專案的每個階段，可以回顧和比較                 │');
    console.log('│                                                             │');
    console.log('│  類比 3: 時光機器                                            │');
    console.log('│  可以隨時回到過去任何一個時間點的代碼狀態                   │');
    console.log('│                                                             │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  ✅ 版本控制可以幫你：                                       │');
    console.log('│     • 記錄每次修改                                          │');
    console.log('│     • 回到之前的版本                                        │');
    console.log('│     • 安心實驗新功能（壞了可以復原）                        │');
    console.log('│     • 了解專案如何演進                                      │');
    console.log('│                                                             │');
    console.log('│  📝 完全在本機運作，不需要 GitHub 或網路                    │');
    console.log('╰─────────────────────────────────────────────────────────────╯');
    console.log('');

    // Level 1+: Suggest setup
    if (this.config.automationLevel >= 1) {
      console.log('🤔 要為這個專案設置版本控制嗎？');
      console.log('   [y] 是的，幫我設置  [n] 不用了  [l] 了解更多');
      console.log('');

      // In real implementation, this would wait for user input
      // For now, we'll record the suggestion to Knowledge Graph
      await this.mcp.memory.createEntities({
        entities: [{
          name: `Git Setup Suggestion ${new Date().toISOString()}`,
          entityType: 'git_suggestion',
          observations: [
            `Project: ${projectPath}`,
            `Reason: No .git directory found`,
            `Automation Level: ${this.config.automationLevel}`,
            `Status: Waiting for user response`,
          ],
        }],
      });
    }
  }

  /**
   * Scenario B: Project with Git (maintenance mode)
   * Monitor changes and provide smart suggestions
   */
  private async handleProjectWithGit(projectPath: string): Promise<void> {
    console.log('✅ 已偵測到 Git 版本控制');

    // Get last commit info
    try {
      const lastCommitResult = await this.mcp.bash({
        command: 'git log -1 --format="%ar|%s"',
      });

      const [timeAgo, message] = lastCommitResult.stdout.trim().split('|');
      console.log(`📝 最後版本：${message} (${timeAgo})`);

      // Update change stats
      this.changeStats.lastCommitTime = await this.getLastCommitDate();
    } catch (error) {
      console.log('ℹ️  尚無任何版本記錄');
    }

    // Check for GitHub token and offer GitHub integration
    if (!this.config.github.enabled && !this.config.github.token) {
      console.log('');
      console.log('💡 提示：如果想要雲端備份，可以稍後提供 GitHub token');
      console.log('   （完全可選，本地版本控制不需要 GitHub）');
    } else if (this.config.github.enabled) {
      console.log('☁️  GitHub 整合：已啟用');
    }

    console.log('');
  }

  /**
   * Check if we should suggest a commit based on thresholds
   */
  private async checkAndSuggestCommit(): Promise<void> {
    const { fileCount, lineCount } = this.config.thresholds;

    const shouldSuggest =
      this.changeStats.filesChanged >= fileCount ||
      (this.changeStats.linesAdded + this.changeStats.linesRemoved) >= lineCount;

    if (!shouldSuggest) return;

    // Generate AI commit message
    const changedFiles = await this.getChangedFiles();
    const aiMessage = await this.generateCommitMessage(changedFiles);

    const suggestion: CommitSuggestion = {
      confidence: 0.75,
      reason: `已修改 ${this.changeStats.filesChanged} 個檔案，${this.changeStats.linesAdded + this.changeStats.linesRemoved} 行變更`,
      suggestedMessage: aiMessage,
      changedFiles,
      pattern: 'periodic',
    };

    await this.handleCommitSuggestion(suggestion);
  }

  /**
   * Handle commit suggestion based on automation level
   */
  private async handleCommitSuggestion(suggestion: CommitSuggestion): Promise<void> {
    switch (this.config.automationLevel) {
      case 0: // Manual - do nothing
        break;

      case 1: // Smart Reminders - suggest with approval
        await this.showCommitReminder(suggestion);
        break;

      case 2: // Semi-Auto - prepare commit, one-click approve
        await this.prepareCommitForApproval(suggestion);
        break;

      case 3: // Full-Auto - auto-commit and notify
        await this.autoCommit(suggestion);
        break;
    }
  }

  /**
   * Level 1: Show reminder notification
   */
  private async showCommitReminder(suggestion: CommitSuggestion): Promise<void> {
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  💡 建議儲存版本                                            │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  ${suggestion.reason}`);
    console.log(`│  信心度：${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log('│                                                             │');
    console.log(`│  建議描述：${suggestion.suggestedMessage}`);
    console.log('│                                                             │');
    console.log(`│  已修改 ${suggestion.changedFiles.length} 個檔案`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  [s] 儲存版本  [e] 編輯描述  [v] 查看變更  [x] 稍後提醒   │');
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('');

    // Record suggestion to Knowledge Graph
    await this.mcp.memory.createEntities({
      entities: [{
        name: `Commit Suggestion ${new Date().toISOString()}`,
        entityType: 'commit_suggestion',
        observations: [
          `Confidence: ${suggestion.confidence}`,
          `Reason: ${suggestion.reason}`,
          `Suggested Message: ${suggestion.suggestedMessage}`,
          `Pattern: ${suggestion.pattern}`,
          `Files: ${suggestion.changedFiles.length}`,
          `Automation Level: ${this.config.automationLevel}`,
        ],
      }],
    });
  }

  /**
   * Level 2: Prepare commit, ask for quick approval
   */
  private async prepareCommitForApproval(suggestion: CommitSuggestion): Promise<void> {
    console.log('');
    console.log('🚀 準備建立版本...');
    console.log(`   描述：${suggestion.suggestedMessage}`);
    console.log(`   檔案：${suggestion.changedFiles.length} 個`);
    console.log('');
    console.log('   [Enter] 確認並儲存  [e] 編輯  [x] 取消');
    console.log('');
  }

  /**
   * Level 3: Auto-commit and notify
   */
  private async autoCommit(suggestion: CommitSuggestion): Promise<void> {
    try {
      await this.friendlyCommands.saveWork(suggestion.suggestedMessage);

      console.log('');
      console.log('✅ 已自動儲存版本');
      console.log(`   描述：${suggestion.suggestedMessage}`);
      console.log(`   檔案：${suggestion.changedFiles.length} 個`);
      console.log('');

      // Sync to GitHub if enabled
      if (this.config.github.enabled && this.config.github.autoSync) {
        await this.syncToGitHub();
      }

      // Reset change stats
      this.changeStats = this.initializeChangeStats();
      this.changeStats.lastCommitTime = new Date();

    } catch (error) {
      console.error('❌ 自動儲存失敗:', error);
    }
  }

  /**
   * Sync to GitHub (if token provided)
   */
  private async syncToGitHub(): Promise<void> {
    if (!this.config.github.enabled || !this.config.github.token) {
      return;
    }

    try {
      console.log('☁️  正在同步到 GitHub...');

      await this.mcp.bash({
        command: 'git push origin main',
      });

      console.log('✅ GitHub 同步完成');
    } catch (error) {
      console.log('⚠️  GitHub 同步失敗（將在下次重試）');
    }
  }

  /**
   * Utility: Check if directory has Git repo
   */
  private async hasGitRepo(projectPath: string): Promise<boolean> {
    try {
      const gitDir = path.join(projectPath, '.git');
      await fs.access(gitDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility: Get list of changed files
   */
  private async getChangedFiles(): Promise<string[]> {
    try {
      const statusResult = await this.mcp.bash({
        command: 'git status --short',
      });

      return statusResult.stdout
        .trim()
        .split('\n')
        .map(line => line.substring(3).trim())
        .filter(file => file.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Utility: Generate AI commit message
   */
  private async generateCommitMessage(changedFiles: string[]): Promise<string> {
    // In real implementation, this would use Claude/GPT to analyze changes
    // For now, use a simple heuristic

    if (changedFiles.some(f => f.includes('test'))) {
      return 'test: 新增/更新測試';
    }
    if (changedFiles.some(f => f.includes('.md'))) {
      return 'docs: 更新文檔';
    }
    if (changedFiles.length === 1) {
      return `update: ${path.basename(changedFiles[0])}`;
    }

    return `update: 修改 ${changedFiles.length} 個檔案`;
  }

  /**
   * Utility: Get last commit date
   */
  private async getLastCommitDate(): Promise<Date | null> {
    try {
      const result = await this.mcp.bash({
        command: 'git log -1 --format=%ct',
      });

      const timestamp = parseInt(result.stdout.trim());
      return new Date(timestamp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Public API: Set GitHub token (auto-enables GitHub integration)
   */
  async setGitHubToken(token: string): Promise<void> {
    this.config.github.token = token;
    this.config.github.enabled = true; // Auto-enable
    await this.saveConfig();

    console.log('✅ GitHub token 已設置，GitHub 整合已自動啟用');
  }

  /**
   * Public API: Update automation level
   */
  async setAutomationLevel(level: 0 | 1 | 2 | 3): Promise<void> {
    this.config.automationLevel = level;
    await this.saveConfig();

    const levelNames = ['完全手動', '智能提醒', '半自動', '全自動'];
    console.log(`✅ 自動化等級已更新：Level ${level} (${levelNames[level]})`);
  }
}
