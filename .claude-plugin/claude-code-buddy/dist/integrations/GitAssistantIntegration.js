import { GitAssistantHook } from '../hooks/GitAssistantHook.js';
import { GitSetupWizard } from '../hooks/GitSetupWizard.js';
import { FriendlyGitCommands } from '../hooks/FriendlyGitCommands.js';
import * as path from 'path';
import * as fs from 'fs/promises';
export class GitAssistantIntegration {
    mcp;
    gitAssistant;
    setupWizard;
    friendlyCommands;
    constructor(mcp) {
        this.mcp = mcp;
        this.gitAssistant = new GitAssistantHook(mcp);
        this.setupWizard = new GitSetupWizard(mcp);
        this.friendlyCommands = new FriendlyGitCommands(mcp);
    }
    async initialize(projectPath) {
        const targetPath = projectPath || process.cwd();
        await this.gitAssistant.loadConfig();
        await this.gitAssistant.onProjectInit(targetPath);
    }
    async hasGit(projectPath) {
        const targetPath = projectPath || process.cwd();
        try {
            const gitDir = path.join(targetPath, '.git');
            await fs.access(gitDir);
            return true;
        }
        catch {
            return false;
        }
    }
    async setupNewProject() {
        await this.setupWizard.runFullSetup();
    }
    async configureExistingProject() {
        await this.setupWizard.setupForExistingGit();
    }
    async onFilesChanged(filePaths) {
        await this.gitAssistant.onFileChanged(filePaths);
    }
    async onFeatureComplete(featureName, files) {
        await this.gitAssistant.onFeatureComplete(featureName, files);
    }
    async onTimerInterval() {
        await this.gitAssistant.onTimerInterval();
    }
    async saveWork(description, autoBackup = true) {
        await this.friendlyCommands.saveWork(description, autoBackup);
    }
    async listVersions(limit) {
        return await this.friendlyCommands.listVersions(limit);
    }
    async goBackTo(identifier) {
        await this.friendlyCommands.goBackTo(identifier);
    }
    async showChanges(compareWith) {
        return await this.friendlyCommands.showChanges(compareWith);
    }
    async status() {
        await this.friendlyCommands.status();
    }
    async createBackup() {
        return await this.friendlyCommands.createLocalBackup();
    }
    async setAutomationLevel(level) {
        await this.gitAssistant.setAutomationLevel(level);
    }
    async setGitHubToken(token) {
        await this.gitAssistant.setGitHubToken(token);
    }
    async showHelp() {
        await this.setupWizard.showHelp();
    }
}
export async function createGitAssistant(mcp, projectPath) {
    const integration = new GitAssistantIntegration(mcp);
    await integration.initialize(projectPath);
    return integration;
}
export { FriendlyGitCommands };
export { GitSetupWizard };
export { GitAssistantHook };
//# sourceMappingURL=GitAssistantIntegration.js.map