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
    console.log(GitEducationTemplates.whatIsVersionControl);
    console.log('');
    console.log(GitEducationTemplates.benefits);
    console.log('');
    console.log(GitEducationTemplates.noGitHubRequired);
    console.log('');

    // Ask if user wants to proceed
    console.log('🤔 要為這個專案設置版本控制嗎？');
    console.log('');
    console.log('   [y] 是的，開始設置');
    console.log('   [l] 了解更多（查看詳細教學）');
    console.log('   [n] 不用了，稍後再說');
    console.log('');

    // In production, this would wait for user input
    // For now, simulate user choosing 'y'
    const proceed = await this.mockUserInput('[y/l/n]', 'y');

    if (proceed === 'n') {
      console.log('');
      console.log('好的！如果之後想要設置，隨時告訴我。');
      return;
    }

    if (proceed === 'l') {
      await this.showDetailedTutorial();
      return this.runFullSetup(); // Loop back
    }

    // Start the wizard
    console.clear();
    console.log(SetupWizard.welcome);
    console.log('');

    // Step 1: Get name
    console.log(SetupWizard.step1_name);
    const name = await this.mockUserInput('名字:', '用戶');

    // Step 2: Get email
    console.log('');
    console.log(SetupWizard.step2_email);
    const email = await this.mockUserInput('Email:', `${name}@localhost`);

    // Step 3: Choose automation level
    console.log('');
    console.log(SetupWizard.step3_automation);
    const levelInput = await this.mockUserInput('選擇 [0-3]:', '1');
    const automationLevel = Math.min(3, Math.max(0, parseInt(levelInput))) as 0 | 1 | 2 | 3;

    // Step 4: Ask about tutorial
    console.log('');
    console.log('想要快速教學嗎？（只需要 2 分鐘）');
    console.log('[y] 是的  [n] 不用了');
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
      console.log('');
      console.log('⚙️  正在設置...');
      console.log('');

      // Initialize Git
      await this.friendlyCommands.initialize(options.name, options.email);

      // Configure Git Assistant
      await this.gitAssistant.loadConfig();
      await this.gitAssistant.setAutomationLevel(options.automationLevel);
      await this.gitAssistant.saveConfig();

      // Show completion message
      console.log('');
      console.log(SetupWizard.complete);
      console.log('');

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
      console.error('');
      console.error('❌ 設置過程發生錯誤:', this.getErrorMessage(error));
      console.error('');
      console.error('請稍後再試，或手動執行：git init');
    }
  }

  /**
   * Show quick tutorial (2 minutes)
   */
  private async showQuickTutorial(): Promise<void> {
    console.log('');
    console.log(GitEducationTemplates.quickTutorial);
    console.log('');

    // Practical demonstration
    console.log('╭─────────────────────────────────────────────────────────────╮');
    console.log('│  🎯 實際示範                                                │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│                                                             │');
    console.log('│  讓我們實際試試看：                                         │');
    console.log('│                                                             │');
    console.log('│  1. 先查看目前狀態                                          │');
    console.log('│     指令：status                                            │');
    console.log('│                                                             │');

    await this.friendlyCommands.status();

    console.log('│                                                             │');
    console.log('│  2. 查看歷史版本                                            │');
    console.log('│     指令：list-versions                                     │');
    console.log('│                                                             │');

    await this.friendlyCommands.listVersions(5);

    console.log('│                                                             │');
    console.log('│  🎉 完成！你已經學會基本操作了                              │');
    console.log('│                                                             │');
    console.log('│  接下來：                                                   │');
    console.log('│  • 開始工作和修改代碼                                       │');
    console.log('│  • 系統會在適當時機提醒你儲存版本                           │');
    console.log('│  • 需要幫助時輸入 git-help                                  │');
    console.log('│                                                             │');
    console.log('╰─────────────────────────────────────────────────────────────╯');
    console.log('');
  }

  /**
   * Show detailed tutorial with all information
   */
  private async showDetailedTutorial(): Promise<void> {
    console.clear();

    console.log('📚 詳細教學');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    console.log(GitEducationTemplates.whatIsVersionControl);
    console.log('');

    console.log('按 Enter 繼續...');
    await this.mockUserInput('', '');

    console.log(GitEducationTemplates.benefits);
    console.log('');

    console.log('按 Enter 繼續...');
    await this.mockUserInput('', '');

    console.log(GitEducationTemplates.noGitHubRequired);
    console.log('');

    console.log('按 Enter 繼續...');
    await this.mockUserInput('', '');

    console.log(GitEducationTemplates.quickTutorial);
    console.log('');

    console.log('按 Enter 繼續...');
    await this.mockUserInput('', '');

    console.log(GitEducationTemplates.commonScenarios);
    console.log('');

    console.log('按 Enter 繼續...');
    await this.mockUserInput('', '');

    console.log(GitEducationTemplates.automationLevels);
    console.log('');

    console.log('按 Enter 繼續...');
    await this.mockUserInput('', '');

    console.log(GitEducationTemplates.githubOptional);
    console.log('');

    console.log('教學完成！');
    console.log('');
  }

  /**
   * Quick setup for existing Git projects (Scenario B)
   */
  async setupForExistingGit(): Promise<void> {
    console.log('✅ 已偵測到 Git 版本控制');
    console.log('');
    console.log('我可以幫你：');
    console.log('  1. 設置自動化等級（智能提醒、半自動、全自動）');
    console.log('  2. 啟用本地自動備份');
    console.log('  3. 設置 GitHub 整合（可選）');
    console.log('');
    console.log('要進行配置嗎？');
    console.log('[y] 是的  [n] 不用了，保持現狀');
    console.log('');

    const configure = await this.mockUserInput('[y/n]:', 'n');

    if (configure === 'y') {
      await this.configureExisting();
    } else {
      console.log('');
      console.log('好的！如果需要配置，隨時告訴我。');
      console.log('');
      console.log('💡 可用指令：');
      console.log('   set-automation-level <0-3>  - 設置自動化等級');
      console.log('   set-github-token <token>    - 啟用 GitHub 整合');
      console.log('   git-help                    - 查看完整指南');
      console.log('');
    }
  }

  /**
   * Configure Git Assistant for existing Git project
   */
  private async configureExisting(): Promise<void> {
    console.log('');
    console.log('⚙️  配置 Git Assistant');
    console.log('');

    // Load current config
    await this.gitAssistant.loadConfig();

    // Ask about automation level
    console.log(GitEducationTemplates.automationLevels);
    console.log('');
    console.log('選擇自動化等級 [0-3, 預設: 1]:');
    const levelInput = await this.mockUserInput('[0-3]:', '1');
    const automationLevel = Math.min(3, Math.max(0, parseInt(levelInput))) as 0 | 1 | 2 | 3;

    await this.gitAssistant.setAutomationLevel(automationLevel);

    // Ask about GitHub
    console.log('');
    console.log('要設置 GitHub 整合嗎？');
    console.log('[y] 是的，我有 GitHub token');
    console.log('[n] 不用了，只用本地 Git');
    const enableGitHub = await this.mockUserInput('[y/n]:', 'n');

    if (enableGitHub === 'y') {
      console.log('');
      console.log('請輸入 GitHub token:');
      console.log('(從 GitHub Settings → Developer settings → Personal access tokens 取得)');
      const token = await this.mockUserInput('Token:', '');

      if (token && token.trim().length > 0) {
        await this.gitAssistant.setGitHubToken(token);
        console.log('');
        console.log('✅ GitHub 整合已啟用！');
      }
    }

    console.log('');
    console.log('✅ 配置完成！');
    console.log('');

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

    console.log('📖 Git Assistant 完整指南');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    console.log('🎯 基本指令');
    console.log('───────────');
    console.log('  save-work "描述"         - 儲存目前工作');
    console.log('  list-versions [數量]     - 列出歷史版本（預設 10 個）');
    console.log('  go-back-to "識別"        - 回到指定版本');
    console.log('  show-changes             - 查看與上一版本的差異');
    console.log('  status                   - 查看目前狀態');
    console.log('  backup-now               - 立即創建本地備份');
    console.log('');

    console.log('⚙️  設置指令');
    console.log('───────────');
    console.log('  set-automation-level <0-3>  - 設置自動化等級');
    console.log('    0 = 完全手動');
    console.log('    1 = 智能提醒（推薦）');
    console.log('    2 = 半自動');
    console.log('    3 = 全自動');
    console.log('');
    console.log('  set-github-token <token>    - 啟用 GitHub 整合');
    console.log('');

    console.log('📚 教學指令');
    console.log('───────────');
    console.log('  git-help                 - 顯示這個幫助指南');
    console.log('  git-tutorial             - 重新觀看教學');
    console.log('');

    console.log('💡 常見問題');
    console.log('───────────');
    console.log('Q: 需要 GitHub 帳號嗎？');
    console.log('A: 不需要！完全在本機運作即可。');
    console.log('');
    console.log('Q: 如何回到之前的版本？');
    console.log('A: 使用 go-back-to "版本號" 或 go-back-to "昨天"');
    console.log('');
    console.log('Q: 會自動儲存嗎？');
    console.log('A: 取決於自動化等級。Level 1 會提醒，Level 3 會自動儲存。');
    console.log('');
    console.log('Q: 資料會丟失嗎？');
    console.log('A: 不會！所有版本都保留，還有本地備份。');
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
  }

  /**
   * Mock user input (in production, this would use readline or similar)
   */
  private async mockUserInput(prompt: string, defaultValue: string): Promise<string> {
    // In production, use readline or similar to get actual user input
    // For now, return default value
    console.log(`${prompt} ${defaultValue}`);
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
