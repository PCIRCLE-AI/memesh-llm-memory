/**
 * Git Setup Wizard
 *
 * Interactive wizard to guide users through Git initialization.
 * Provides educational content and friendly prompts.
 */

import { MCPToolInterface } from '../core/MCPToolInterface';
import { FriendlyGitCommands } from './FriendlyGitCommands';
import { GitAssistantHook, GitAssistantConfig } from './GitAssistantHook';
import { GitEducationTemplates, SetupWizard } from '../templates/git-education-templates';
import { logger } from '../utils/logger.js';

export interface SetupOptions {
  name: string;
  email: string;
  automationLevel: 0 | 1 | 2 | 3;
  showTutorial: boolean;
}

export class GitSetupWizard {
  private mcp: MCPToolInterface;
  private friendlyCommands: FriendlyGitCommands;
  private gitAssistant: GitAssistantHook;

  constructor(mcp: MCPToolInterface) {
    this.mcp = mcp;
    this.friendlyCommands = new FriendlyGitCommands(mcp);
    this.gitAssistant = new GitAssistantHook(mcp);
  }

  /**
   * Run the full setup wizard (Scenario A: Project without Git)
   */
  async runFullSetup(): Promise<void> {
    console.clear();

    // Step 0: Show what is version control
    logger.info(GitEducationTemplates.whatIsVersionControl);
    logger.info('');
    logger.info(GitEducationTemplates.benefits);
    logger.info('');
    logger.info(GitEducationTemplates.noGitHubRequired);
    logger.info('');

    // Ask if user wants to proceed
    logger.info('🤔 要為這個專案設置版本控制嗎？');
    logger.info('');
    logger.info('   [y] 是的，開始設置');
    logger.info('   [l] 了解更多（查看詳細教學）');
    logger.info('   [n] 不用了，稍後再說');
    logger.info('');

    // In production, this would wait for user input
    // For now, simulate user choosing 'y'
    const proceed = await this.mockUserInput('[y/l/n]', 'y');

    if (proceed === 'n') {
      logger.info('');
      logger.info('好的！如果之後想要設置，隨時告訴我。');
      return;
    }

    if (proceed === 'l') {
      await this.showDetailedTutorial();
      return this.runFullSetup(); // Loop back
    }

    // Start the wizard
    console.clear();
    logger.info(SetupWizard.welcome);
    logger.info('');

    // Step 1: Get name
    logger.info(SetupWizard.step1_name);
    const name = await this.mockUserInput('名字:', '用戶');

    // Step 2: Get email
    logger.info('');
    logger.info(SetupWizard.step2_email);
    const email = await this.mockUserInput('Email:', `${name}@localhost`);

    // Step 3: Choose automation level
    logger.info('');
    logger.info(SetupWizard.step3_automation);
    const levelInput = await this.mockUserInput('選擇 [0-3]:', '1');
    const automationLevel = Math.min(3, Math.max(0, parseInt(levelInput))) as 0 | 1 | 2 | 3;

    // Step 4: Ask about tutorial
    logger.info('');
    logger.info('想要快速教學嗎？（只需要 2 分鐘）');
    logger.info('[y] 是的  [n] 不用了');
    const showTutorial = await this.mockUserInput('[y/n]:', 'y') === 'y';

    // Execute setup
    const options: SetupOptions = {
      name,
      email,
      automationLevel,
      showTutorial,
    };

    await this.executeSetup(options);
  }

  /**
   * Execute the setup with gathered options
   */
  private async executeSetup(options: SetupOptions): Promise<void> {
    try {
      logger.info('');
      logger.info('⚙️  正在設置...');
      logger.info('');

      // Initialize Git
      await this.friendlyCommands.initialize(options.name, options.email);

      // Configure Git Assistant
      await this.gitAssistant.loadConfig();
      await this.gitAssistant.setAutomationLevel(options.automationLevel);
      await this.gitAssistant.saveConfig();

      // Show completion message
      logger.info('');
      logger.info(SetupWizard.complete);
      logger.info('');

      // Show tutorial if requested
      if (options.showTutorial) {
        await this.showQuickTutorial();
      }

      // Record setup to Knowledge Graph
      await this.mcp.memory.createEntities({
        entities: [{
          name: `Git Setup ${new Date().toISOString()}`,
          entityType: 'git_setup',
          observations: [
            `Project: ${process.cwd()}`,
            `Name: ${options.name}`,
            `Email: ${options.email}`,
            `Automation Level: ${options.automationLevel}`,
            `Tutorial Shown: ${options.showTutorial}`,
            `Setup Completed: ${new Date().toLocaleString('zh-TW')}`,
          ],
        }],
      });

    } catch (error: unknown) {
      logger.error('');
      logger.error('❌ 設置過程發生錯誤:', this.getErrorMessage(error));
      logger.error('');
      logger.error('請稍後再試，或手動執行：git init');
    }
  }

  /**
   * Show quick tutorial (2 minutes)
   */
  private async showQuickTutorial(): Promise<void> {
    logger.info('');
    logger.info(GitEducationTemplates.quickTutorial);
    logger.info('');

    // Practical demonstration
    logger.info('╭─────────────────────────────────────────────────────────────╮');
    logger.info('│  🎯 實際示範                                                │');
    logger.info('├─────────────────────────────────────────────────────────────┤');
    logger.info('│                                                             │');
    logger.info('│  讓我們實際試試看：                                         │');
    logger.info('│                                                             │');
    logger.info('│  1. 先查看目前狀態                                          │');
    logger.info('│     指令：status                                            │');
    logger.info('│                                                             │');

    await this.friendlyCommands.status();

    logger.info('│                                                             │');
    logger.info('│  2. 查看歷史版本                                            │');
    logger.info('│     指令：list-versions                                     │');
    logger.info('│                                                             │');

    await this.friendlyCommands.listVersions(5);

    logger.info('│                                                             │');
    logger.info('│  🎉 完成！你已經學會基本操作了                              │');
    logger.info('│                                                             │');
    logger.info('│  接下來：                                                   │');
    logger.info('│  • 開始工作和修改代碼                                       │');
    logger.info('│  • 系統會在適當時機提醒你儲存版本                           │');
    logger.info('│  • 需要幫助時輸入 git-help                                  │');
    logger.info('│                                                             │');
    logger.info('╰─────────────────────────────────────────────────────────────╯');
    logger.info('');
  }

  /**
   * Show detailed tutorial with all information
   */
  private async showDetailedTutorial(): Promise<void> {
    console.clear();

    logger.info('📚 詳細教學');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');

    logger.info(GitEducationTemplates.whatIsVersionControl);
    logger.info('');

    logger.info('按 Enter 繼續...');
    await this.mockUserInput('', '');

    logger.info(GitEducationTemplates.benefits);
    logger.info('');

    logger.info('按 Enter 繼續...');
    await this.mockUserInput('', '');

    logger.info(GitEducationTemplates.noGitHubRequired);
    logger.info('');

    logger.info('按 Enter 繼續...');
    await this.mockUserInput('', '');

    logger.info(GitEducationTemplates.quickTutorial);
    logger.info('');

    logger.info('按 Enter 繼續...');
    await this.mockUserInput('', '');

    logger.info(GitEducationTemplates.commonScenarios);
    logger.info('');

    logger.info('按 Enter 繼續...');
    await this.mockUserInput('', '');

    logger.info(GitEducationTemplates.automationLevels);
    logger.info('');

    logger.info('按 Enter 繼續...');
    await this.mockUserInput('', '');

    logger.info(GitEducationTemplates.githubOptional);
    logger.info('');

    logger.info('教學完成！');
    logger.info('');
  }

  /**
   * Quick setup for existing Git projects (Scenario B)
   */
  async setupForExistingGit(): Promise<void> {
    logger.info('✅ 已偵測到 Git 版本控制');
    logger.info('');
    logger.info('我可以幫你：');
    logger.info('  1. 設置自動化等級（智能提醒、半自動、全自動）');
    logger.info('  2. 啟用本地自動備份');
    logger.info('  3. 設置 GitHub 整合（可選）');
    logger.info('');
    logger.info('要進行配置嗎？');
    logger.info('[y] 是的  [n] 不用了，保持現狀');
    logger.info('');

    const configure = await this.mockUserInput('[y/n]:', 'n');

    if (configure === 'y') {
      await this.configureExisting();
    } else {
      logger.info('');
      logger.info('好的！如果需要配置，隨時告訴我。');
      logger.info('');
      logger.info('💡 可用指令：');
      logger.info('   set-automation-level <0-3>  - 設置自動化等級');
      logger.info('   set-github-token <token>    - 啟用 GitHub 整合');
      logger.info('   git-help                    - 查看完整指南');
      logger.info('');
    }
  }

  /**
   * Configure Git Assistant for existing Git project
   */
  private async configureExisting(): Promise<void> {
    logger.info('');
    logger.info('⚙️  配置 Git Assistant');
    logger.info('');

    // Load current config
    await this.gitAssistant.loadConfig();

    // Ask about automation level
    logger.info(GitEducationTemplates.automationLevels);
    logger.info('');
    logger.info('選擇自動化等級 [0-3, 預設: 1]:');
    const levelInput = await this.mockUserInput('[0-3]:', '1');
    const automationLevel = Math.min(3, Math.max(0, parseInt(levelInput))) as 0 | 1 | 2 | 3;

    await this.gitAssistant.setAutomationLevel(automationLevel);

    // Ask about GitHub
    logger.info('');
    logger.info('要設置 GitHub 整合嗎？');
    logger.info('[y] 是的，我有 GitHub token');
    logger.info('[n] 不用了，只用本地 Git');
    const enableGitHub = await this.mockUserInput('[y/n]:', 'n');

    if (enableGitHub === 'y') {
      logger.info('');
      logger.info('請輸入 GitHub token:');
      logger.info('(從 GitHub Settings → Developer settings → Personal access tokens 取得)');
      const token = await this.mockUserInput('Token:', '');

      if (token && token.trim().length > 0) {
        await this.gitAssistant.setGitHubToken(token);
        logger.info('');
        logger.info('✅ GitHub 整合已啟用！');
      }
    }

    logger.info('');
    logger.info('✅ 配置完成！');
    logger.info('');

    // Record configuration to Knowledge Graph
    await this.mcp.memory.createEntities({
      entities: [{
        name: `Git Assistant Config ${new Date().toISOString()}`,
        entityType: 'git_config',
        observations: [
          `Project: ${process.cwd()}`,
          `Automation Level: ${automationLevel}`,
          `GitHub Enabled: ${enableGitHub === 'y'}`,
          `Configured: ${new Date().toLocaleString('zh-TW')}`,
        ],
      }],
    });
  }

  /**
   * Show help guide
   */
  async showHelp(): Promise<void> {
    console.clear();

    logger.info('📖 Git Assistant 完整指南');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');

    logger.info('🎯 基本指令');
    logger.info('───────────');
    logger.info('  save-work "描述"         - 儲存目前工作');
    logger.info('  list-versions [數量]     - 列出歷史版本（預設 10 個）');
    logger.info('  go-back-to "識別"        - 回到指定版本');
    logger.info('  show-changes             - 查看與上一版本的差異');
    logger.info('  status                   - 查看目前狀態');
    logger.info('  backup-now               - 立即創建本地備份');
    logger.info('');

    logger.info('⚙️  設置指令');
    logger.info('───────────');
    logger.info('  set-automation-level <0-3>  - 設置自動化等級');
    logger.info('    0 = 完全手動');
    logger.info('    1 = 智能提醒（推薦）');
    logger.info('    2 = 半自動');
    logger.info('    3 = 全自動');
    logger.info('');
    logger.info('  set-github-token <token>    - 啟用 GitHub 整合');
    logger.info('');

    logger.info('📚 教學指令');
    logger.info('───────────');
    logger.info('  git-help                 - 顯示這個幫助指南');
    logger.info('  git-tutorial             - 重新觀看教學');
    logger.info('');

    logger.info('💡 常見問題');
    logger.info('───────────');
    logger.info('Q: 需要 GitHub 帳號嗎？');
    logger.info('A: 不需要！完全在本機運作即可。');
    logger.info('');
    logger.info('Q: 如何回到之前的版本？');
    logger.info('A: 使用 go-back-to "版本號" 或 go-back-to "昨天"');
    logger.info('');
    logger.info('Q: 會自動儲存嗎？');
    logger.info('A: 取決於自動化等級。Level 1 會提醒，Level 3 會自動儲存。');
    logger.info('');
    logger.info('Q: 資料會丟失嗎？');
    logger.info('A: 不會！所有版本都保留，還有本地備份。');
    logger.info('');

    logger.info('═══════════════════════════════════════════════════════════════');
  }

  /**
   * Mock user input (in production, this would use readline or similar)
   */
  private async mockUserInput(prompt: string, defaultValue: string): Promise<string> {
    // In production, use readline or similar to get actual user input
    // For now, return default value
    logger.info(`${prompt} ${defaultValue}`);
    return defaultValue;
  }

  /**
   * Get error message from unknown error type
   * Type-safe helper for error handling
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
