import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SkillManager } from '../skills/SkillManager.js';
import { logger } from '../utils/logger.js';
export class UninstallManager {
    skillManager;
    smartAgentsDir;
    dataDir;
    constructor(skillManager) {
        this.skillManager = skillManager || new SkillManager();
        this.smartAgentsDir = path.join(os.homedir(), '.claude-code-buddy');
        this.dataDir = path.join(this.smartAgentsDir, 'data');
    }
    async uninstall(options = {}) {
        const report = {
            removed: [],
            kept: [],
            errors: [],
            dryRun: options.dryRun || false,
        };
        const actionVerb = options.dryRun ? 'Would remove' : 'Removed';
        const keepVerb = options.dryRun ? 'Would keep' : 'Kept';
        try {
            const skills = await this.skillManager.listSmartAgentsSkills();
            if (skills.length > 0) {
                if (!options.dryRun) {
                    for (const skill of skills) {
                        await this.skillManager.deleteSkill(skill);
                    }
                }
                report.removed.push(`${actionVerb} ${skills.length} Claude Code Buddy skill${skills.length === 1 ? '' : 's'}: ${skills.join(', ')}`);
            }
            else {
                report.removed.push('No Claude Code Buddy skills found');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            report.errors.push(`Skills: ${errorMessage}`);
        }
        if (!options.keepConfig) {
            try {
                const configExists = await this.pathExists(this.smartAgentsDir);
                if (configExists) {
                    if (!options.dryRun) {
                        if (options.keepData) {
                            const entries = await fs.readdir(this.smartAgentsDir, { withFileTypes: true });
                            for (const entry of entries) {
                                if (entry.name === 'data')
                                    continue;
                                const entryPath = path.join(this.smartAgentsDir, entry.name);
                                const resolvedPath = await fs.realpath(entryPath).catch(() => entryPath);
                                const resolvedBaseDir = await fs.realpath(this.smartAgentsDir);
                                if (!resolvedPath.startsWith(resolvedBaseDir)) {
                                    logger.warn(`Skipped suspicious path: ${entry.name} (points outside directory)`);
                                    report.errors.push(`Skipped suspicious path: ${entry.name} (points outside directory)`);
                                    continue;
                                }
                                const stats = await fs.lstat(entryPath);
                                if (stats.isSymbolicLink()) {
                                    logger.warn(`Skipped symlink: ${entry.name} (potential security risk)`);
                                    report.errors.push(`Skipped symlink: ${entry.name} (potential security risk)`);
                                    continue;
                                }
                                await fs.rm(entryPath, { recursive: true, force: true });
                            }
                            report.removed.push(`${actionVerb} configuration files (kept data)`);
                        }
                        else {
                            await fs.rm(this.smartAgentsDir, { recursive: true, force: true });
                            report.removed.push(`${actionVerb} configuration directory (~/.claude-code-buddy/)`);
                        }
                    }
                    else {
                        report.removed.push(`${actionVerb} configuration directory (~/.claude-code-buddy/)`);
                    }
                }
                else {
                    report.removed.push('Configuration directory not found (already clean)');
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                report.errors.push(`Configuration: ${errorMessage}`);
            }
        }
        else {
            report.kept.push(`${keepVerb} configuration files (~/.claude-code-buddy/)`);
        }
        if (!options.keepData) {
            try {
                const dataExists = await this.pathExists(this.dataDir);
                if (dataExists) {
                    if (!options.dryRun && !options.keepConfig) {
                        await fs.rm(this.dataDir, { recursive: true, force: true });
                    }
                    if (!options.keepConfig) {
                    }
                    else {
                        if (!options.dryRun) {
                            await fs.rm(this.dataDir, { recursive: true, force: true });
                        }
                        report.removed.push(`${actionVerb} user data (evolution patterns, task history)`);
                    }
                }
                else {
                    if (options.keepConfig) {
                        report.removed.push('User data directory not found');
                    }
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                report.errors.push(`Data: ${errorMessage}`);
            }
        }
        else {
            report.kept.push(`${keepVerb} user data (evolution patterns, task history)`);
        }
        report.removed.push('Note: If installed via MCP, manually remove server registration using MCP tools');
        return report;
    }
    async pathExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    formatReport(report) {
        const boxTop = '╔' + '═'.repeat(62) + '╗';
        const boxBottom = '╚' + '═'.repeat(62) + '╝';
        const title = report.dryRun
            ? '  🔍  Claude Code Buddy Uninstallation Preview (Dry Run)'
            : '  🗑️  Claude Code Buddy Uninstallation Report';
        let output = boxTop + '\n';
        output += '║' + title.padEnd(62) + '║\n';
        output += boxBottom + '\n\n';
        if (report.dryRun) {
            output += '⚠️  DRY RUN MODE - No changes were made\n';
            output += '━'.repeat(64) + '\n\n';
        }
        if (report.removed.length > 0) {
            output += report.dryRun ? '📋 Would Remove:\n' : '✅ Removed:\n';
            report.removed.forEach(item => {
                output += `  • ${item}\n`;
            });
            output += '\n';
        }
        if (report.kept.length > 0) {
            output += '📦 Kept (as requested):\n';
            report.kept.forEach(item => {
                output += `  • ${item}\n`;
            });
            output += '\n';
        }
        if (report.errors.length > 0) {
            output += '❌ Errors:\n';
            report.errors.forEach(error => {
                output += `  • ${error}\n`;
            });
            output += '\n';
        }
        else {
            if (!report.dryRun) {
                output += '❌ Errors:\n  (none)\n\n';
            }
        }
        output += '━'.repeat(64) + '\n\n';
        if (report.dryRun) {
            output += '💡 To actually uninstall, run without --dry-run flag\n';
        }
        else {
            output += '💡 To reinstall: Add claude-code-buddy MCP server again\n';
            output += '💡 Project repository: https://github.com/PCIRCLE-AI/claude-code-buddy\n';
        }
        return output;
    }
    async preview(options = {}) {
        return this.uninstall({ ...options, dryRun: true });
    }
}
//# sourceMappingURL=UninstallManager.js.map