import { FriendlyGitCommands } from './FriendlyGitCommands.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger.js';
export class GitAssistantHook {
    mcp;
    friendlyCommands;
    config;
    changeStats;
    configPath;
    constructor(mcp, configPath) {
        this.mcp = mcp;
        this.friendlyCommands = new FriendlyGitCommands(mcp);
        this.configPath = configPath || path.join(process.env.HOME || '', '.claude-code-buddy', 'git-assistant-config.json');
        this.config = this.getDefaultConfig();
        this.changeStats = this.initializeChangeStats();
    }
    getDefaultConfig() {
        return {
            enabled: true,
            automationLevel: 1,
            thresholds: {
                fileCount: 10,
                lineCount: 100,
                timeInterval: 30,
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
                enabled: false,
                autoSync: false,
            },
        };
    }
    initializeChangeStats() {
        return {
            filesChanged: 0,
            linesAdded: 0,
            linesRemoved: 0,
            lastCommitTime: null,
            currentSessionStart: new Date(),
        };
    }
    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf-8');
            const loadedConfig = JSON.parse(configData);
            this.config = { ...this.config, ...loadedConfig };
            if (this.config.github.token && this.config.github.token.trim() !== '') {
                this.config.github.enabled = true;
                logger.info('✅ GitHub integration auto-enabled (token detected)');
            }
        }
        catch (error) {
            await this.saveConfig();
        }
    }
    async saveConfig() {
        const configDir = path.dirname(this.configPath);
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    }
    async onProjectInit(projectPath) {
        if (!this.config.enabled)
            return;
        const hasGit = await this.hasGitRepo(projectPath);
        if (!hasGit) {
            await this.handleProjectWithoutGit(projectPath);
        }
        else {
            await this.handleProjectWithGit(projectPath);
        }
    }
    async onFileChanged(filePaths) {
        if (!this.config.enabled)
            return;
        if (this.config.automationLevel === 0)
            return;
        this.changeStats.filesChanged += filePaths.length;
        try {
            const diffResult = await this.mcp.bash({
                command: 'git diff --numstat',
            });
            const lines = diffResult.stdout.trim().split('\n');
            for (const line of lines) {
                const [added, removed] = line.split('\t');
                if (added && added !== '-')
                    this.changeStats.linesAdded += parseInt(added);
                if (removed && removed !== '-')
                    this.changeStats.linesRemoved += parseInt(removed);
            }
        }
        catch (error) {
        }
        await this.checkAndSuggestCommit();
    }
    async onFeatureComplete(featureName, files) {
        if (!this.config.enabled)
            return;
        if (this.config.automationLevel === 0)
            return;
        const suggestion = {
            confidence: 0.9,
            reason: `AI detected feature completion: ${featureName}`,
            suggestedMessage: `feat: ${featureName}`,
            changedFiles: files,
            pattern: 'feature-complete',
        };
        await this.handleCommitSuggestion(suggestion);
    }
    async onTimerInterval() {
        if (!this.config.enabled)
            return;
        if (this.config.automationLevel === 0)
            return;
        const now = new Date();
        const minutesSinceLastCommit = this.changeStats.lastCommitTime
            ? (now.getTime() - this.changeStats.lastCommitTime.getTime()) / 60000
            : (now.getTime() - this.changeStats.currentSessionStart.getTime()) / 60000;
        if (minutesSinceLastCommit >= this.config.thresholds.timeInterval) {
            await this.checkAndSuggestCommit();
        }
    }
    async handleProjectWithoutGit(projectPath) {
        logger.info('\n🔍 偵測到專案尚未使用版本控制');
        logger.info('');
        logger.info('╭─────────────────────────────────────────────────────────────╮');
        logger.info('│  💡 什麼是版本控制？                                         │');
        logger.info('├─────────────────────────────────────────────────────────────┤');
        logger.info('│                                                             │');
        logger.info('│  類比 1: 遊戲存檔點                                          │');
        logger.info('│  就像玩遊戲時可以儲存進度，隨時回到之前的存檔點             │');
        logger.info('│                                                             │');
        logger.info('│  類比 2: 拍照記錄                                            │');
        logger.info('│  就像拍照記錄專案的每個階段，可以回顧和比較                 │');
        logger.info('│                                                             │');
        logger.info('│  類比 3: 時光機器                                            │');
        logger.info('│  可以隨時回到過去任何一個時間點的代碼狀態                   │');
        logger.info('│                                                             │');
        logger.info('├─────────────────────────────────────────────────────────────┤');
        logger.info('│  ✅ 版本控制可以幫你：                                       │');
        logger.info('│     • 記錄每次修改                                          │');
        logger.info('│     • 回到之前的版本                                        │');
        logger.info('│     • 安心實驗新功能（壞了可以復原）                        │');
        logger.info('│     • 了解專案如何演進                                      │');
        logger.info('│                                                             │');
        logger.info('│  📝 完全在本機運作，不需要 GitHub 或網路                    │');
        logger.info('╰─────────────────────────────────────────────────────────────╯');
        logger.info('');
        if (this.config.automationLevel >= 1) {
            logger.info('🤔 要為這個專案設置版本控制嗎？');
            logger.info('   [y] 是的，幫我設置  [n] 不用了  [l] 了解更多');
            logger.info('');
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
    async handleProjectWithGit(projectPath) {
        logger.info('✅ 已偵測到 Git 版本控制');
        try {
            const lastCommitResult = await this.mcp.bash({
                command: 'git log -1 --format="%ar|%s"',
            });
            const [timeAgo, message] = lastCommitResult.stdout.trim().split('|');
            logger.info(`📝 最後版本：${message} (${timeAgo})`);
            this.changeStats.lastCommitTime = await this.getLastCommitDate();
        }
        catch (error) {
            logger.info('ℹ️  尚無任何版本記錄');
        }
        if (!this.config.github.enabled && !this.config.github.token) {
            logger.info('');
            logger.info('💡 提示：如果想要雲端備份，可以稍後提供 GitHub token');
            logger.info('   （完全可選，本地版本控制不需要 GitHub）');
        }
        else if (this.config.github.enabled) {
            logger.info('☁️  GitHub 整合：已啟用');
        }
        logger.info('');
    }
    async checkAndSuggestCommit() {
        const { fileCount, lineCount } = this.config.thresholds;
        const shouldSuggest = this.changeStats.filesChanged >= fileCount ||
            (this.changeStats.linesAdded + this.changeStats.linesRemoved) >= lineCount;
        if (!shouldSuggest)
            return;
        const changedFiles = await this.getChangedFiles();
        const aiMessage = await this.generateCommitMessage(changedFiles);
        const suggestion = {
            confidence: 0.75,
            reason: `已修改 ${this.changeStats.filesChanged} 個檔案，${this.changeStats.linesAdded + this.changeStats.linesRemoved} 行變更`,
            suggestedMessage: aiMessage,
            changedFiles,
            pattern: 'periodic',
        };
        await this.handleCommitSuggestion(suggestion);
    }
    async handleCommitSuggestion(suggestion) {
        switch (this.config.automationLevel) {
            case 0:
                break;
            case 1:
                await this.showCommitReminder(suggestion);
                break;
            case 2:
                await this.prepareCommitForApproval(suggestion);
                break;
            case 3:
                await this.autoCommit(suggestion);
                break;
        }
    }
    async showCommitReminder(suggestion) {
        logger.info('');
        logger.info('┌─────────────────────────────────────────────────────────────┐');
        logger.info('│  💡 建議儲存版本                                            │');
        logger.info('├─────────────────────────────────────────────────────────────┤');
        logger.info(`│  ${suggestion.reason}`);
        logger.info(`│  信心度：${(suggestion.confidence * 100).toFixed(0)}%`);
        logger.info('│                                                             │');
        logger.info(`│  建議描述：${suggestion.suggestedMessage}`);
        logger.info('│                                                             │');
        logger.info(`│  已修改 ${suggestion.changedFiles.length} 個檔案`);
        logger.info('├─────────────────────────────────────────────────────────────┤');
        logger.info('│  [s] 儲存版本  [e] 編輯描述  [v] 查看變更  [x] 稍後提醒   │');
        logger.info('└─────────────────────────────────────────────────────────────┘');
        logger.info('');
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
    async prepareCommitForApproval(suggestion) {
        logger.info('');
        logger.info('🚀 準備建立版本...');
        logger.info(`   描述：${suggestion.suggestedMessage}`);
        logger.info(`   檔案：${suggestion.changedFiles.length} 個`);
        logger.info('');
        logger.info('   [Enter] 確認並儲存  [e] 編輯  [x] 取消');
        logger.info('');
    }
    async autoCommit(suggestion) {
        try {
            await this.friendlyCommands.saveWork(suggestion.suggestedMessage);
            logger.info('');
            logger.info('✅ 已自動儲存版本');
            logger.info(`   描述：${suggestion.suggestedMessage}`);
            logger.info(`   檔案：${suggestion.changedFiles.length} 個`);
            logger.info('');
            if (this.config.github.enabled && this.config.github.autoSync) {
                await this.syncToGitHub();
            }
            this.changeStats = this.initializeChangeStats();
            this.changeStats.lastCommitTime = new Date();
        }
        catch (error) {
            logger.error('❌ 自動儲存失敗:', error);
        }
    }
    async syncToGitHub() {
        if (!this.config.github.enabled || !this.config.github.token) {
            return;
        }
        try {
            logger.info('☁️  正在同步到 GitHub...');
            await this.mcp.bash({
                command: 'git push origin main',
            });
            logger.info('✅ GitHub 同步完成');
        }
        catch (error) {
            logger.info('⚠️  GitHub 同步失敗（將在下次重試）');
        }
    }
    async hasGitRepo(projectPath) {
        try {
            const gitDir = path.join(projectPath, '.git');
            await fs.access(gitDir);
            return true;
        }
        catch {
            return false;
        }
    }
    async getChangedFiles() {
        try {
            const statusResult = await this.mcp.bash({
                command: 'git status --short',
            });
            return statusResult.stdout
                .trim()
                .split('\n')
                .map(line => line.substring(3).trim())
                .filter(file => file.length > 0);
        }
        catch {
            return [];
        }
    }
    async generateCommitMessage(changedFiles) {
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
    async getLastCommitDate() {
        try {
            const result = await this.mcp.bash({
                command: 'git log -1 --format=%ct',
            });
            const timestamp = parseInt(result.stdout.trim());
            return new Date(timestamp * 1000);
        }
        catch {
            return null;
        }
    }
    async setGitHubToken(token) {
        this.config.github.token = token;
        this.config.github.enabled = true;
        await this.saveConfig();
        logger.info('✅ GitHub token 已設置，GitHub 整合已自動啟用');
    }
    async setAutomationLevel(level) {
        this.config.automationLevel = level;
        await this.saveConfig();
        const levelNames = ['完全手動', '智能提醒', '半自動', '全自動'];
        logger.info(`✅ 自動化等級已更新：Level ${level} (${levelNames[level]})`);
    }
}
//# sourceMappingURL=GitAssistantHook.js.map