import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { NotFoundError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
export class FriendlyGitCommands {
    mcp;
    constructor(mcp) {
        this.mcp = mcp;
    }
    async saveWork(description, autoBackup = true) {
        try {
            logger.info('💾 正在儲存工作...');
            await this.mcp.bash({
                command: 'git add .',
            });
            await this.mcp.bash({
                command: `git commit -m "${this.escapeShellArg(description)}"`,
            });
            if (autoBackup) {
                await this.createLocalBackup();
            }
            logger.info('✅ 工作已儲存');
            logger.info(`📝 描述: ${description}`);
            logger.info(`🕐 時間: ${new Date().toLocaleString('zh-TW')}`);
            await this.mcp.memory.createEntities({
                entities: [{
                        name: `Git Commit ${new Date().toISOString()}`,
                        entityType: 'git_commit',
                        observations: [
                            `Message: ${description}`,
                            `Timestamp: ${new Date().toISOString()}`,
                            `Auto-backup: ${autoBackup}`,
                        ],
                    }],
            });
        }
        catch (error) {
            logger.error('❌ 儲存失敗:', this.getErrorMessage(error));
            throw error;
        }
    }
    async listVersions(limit = 10) {
        try {
            const result = await this.mcp.bash({
                command: `git log --format="%H|%s|%an|%ar|%at" -n ${limit}`,
            });
            const commits = result.stdout.trim().split('\n').filter(line => line.length > 0);
            const versions = commits.map((commit, index) => {
                const [hash, message, author, timeAgo, timestamp] = commit.split('|');
                return {
                    number: index + 1,
                    hash: hash.substring(0, 8),
                    message,
                    author,
                    date: new Date(parseInt(timestamp) * 1000),
                    timeAgo,
                };
            });
            logger.info('📚 最近的版本：\n');
            versions.forEach(v => {
                logger.info(`${v.number}. ${v.message}`);
                logger.info(`   (版本號: ${v.hash}, ${v.timeAgo})\n`);
            });
            return versions;
        }
        catch (error) {
            logger.error('❌ 無法列出版本（專案可能還沒有任何版本）');
            return [];
        }
    }
    async goBackTo(identifier) {
        try {
            logger.info(`🔍 正在尋找版本: ${identifier}...`);
            let commitHash;
            const numberMatch = identifier.match(/\d+/);
            if (numberMatch) {
                const number = parseInt(numberMatch[0]);
                const versions = await this.listVersions(number);
                if (versions[number - 1]) {
                    commitHash = versions[number - 1].hash;
                }
                else {
                    throw new NotFoundError(`找不到第 ${number} 個版本`, 'gitVersion', String(number), {
                        component: 'FriendlyGitCommands',
                        method: 'resolveIdentifier',
                        requestedVersion: number,
                        availableVersions: versions.length,
                        action: 'use a version number between 1 and ' + versions.length,
                    });
                }
            }
            else if (identifier.includes('昨天') || identifier.includes('yesterday')) {
                commitHash = await this.findCommitByTime('yesterday');
            }
            else if (identifier.match(/(\d+)\s*天前/)) {
                const days = parseInt(identifier.match(/(\d+)\s*天前/)[1]);
                commitHash = await this.findCommitByTime(`${days} days ago`);
            }
            else {
                commitHash = identifier;
            }
            await this.mcp.bash({
                command: `git checkout ${commitHash}`,
            });
            logger.info('✅ 已回到該版本');
            logger.info(`ℹ️  版本號: ${commitHash}`);
            logger.info('');
            logger.info('⚠️  提醒：你現在處於「查看舊版本」模式');
            logger.info('   如果要繼續開發，請先儲存當前狀態：');
            logger.info('   save-work "從這個版本繼續開發"');
        }
        catch (error) {
            logger.error('❌ 無法回到該版本:', this.getErrorMessage(error));
            throw error;
        }
    }
    async showChanges(compareWith) {
        try {
            const compareTarget = compareWith || 'HEAD~1';
            const result = await this.mcp.bash({
                command: `git diff ${compareTarget} --numstat`,
            });
            const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);
            let addedLines = 0;
            let removedLines = 0;
            const modifiedFiles = [];
            for (const line of lines) {
                const [added, removed, file] = line.split('\t');
                if (added && added !== '-')
                    addedLines += parseInt(added);
                if (removed && removed !== '-')
                    removedLines += parseInt(removed);
                if (file)
                    modifiedFiles.push(file);
            }
            const summary = this.generateChangesSummary(addedLines, removedLines, modifiedFiles);
            logger.info('📊 與上一版本的差異：\n');
            logger.info(summary);
            logger.info('');
            return {
                addedLines,
                removedLines,
                modifiedFiles,
                summary,
            };
        }
        catch (error) {
            logger.error('❌ 無法查看變更');
            return {
                addedLines: 0,
                removedLines: 0,
                modifiedFiles: [],
                summary: '沒有變更',
            };
        }
    }
    async createLocalBackup() {
        const backupDir = path.join(os.homedir(), '.claude-code-buddy-backups', path.basename(process.cwd()));
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupPath = path.join(backupDir, timestamp);
        try {
            await fs.mkdir(backupDir, { recursive: true });
            await this.mcp.bash({
                command: `cp -r . "${backupPath}"`,
            });
            const backups = await fs.readdir(backupDir);
            const sortedBackups = backups.sort().reverse();
            for (const backup of sortedBackups.slice(10)) {
                await fs.rm(path.join(backupDir, backup), { recursive: true });
            }
            logger.info(`✅ 備份已建立: ${backupPath}`);
            return backupPath;
        }
        catch (error) {
            logger.error('❌ 備份失敗:', this.getErrorMessage(error));
            throw error;
        }
    }
    async status() {
        try {
            const result = await this.mcp.bash({
                command: 'git status --short',
            });
            const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);
            if (lines.length === 0) {
                logger.info('✅ 目前沒有未儲存的變更');
                return;
            }
            logger.info('📝 目前狀態：\n');
            const modified = lines.filter(line => line.startsWith(' M'));
            const added = lines.filter(line => line.startsWith('A'));
            const deleted = lines.filter(line => line.startsWith(' D'));
            const untracked = lines.filter(line => line.startsWith('??'));
            if (modified.length > 0) {
                logger.info(`✏️  已修改: ${modified.length} 個檔案`);
                modified.slice(0, 3).forEach(line => logger.info(`   - ${line.substring(3)}`));
                if (modified.length > 3)
                    logger.info(`   ... 還有 ${modified.length - 3} 個`);
                logger.info('');
            }
            if (added.length > 0) {
                logger.info(`➕ 已新增: ${added.length} 個檔案`);
                added.slice(0, 3).forEach(line => logger.info(`   - ${line.substring(3)}`));
                if (added.length > 3)
                    logger.info(`   ... 還有 ${added.length - 3} 個`);
                logger.info('');
            }
            if (deleted.length > 0) {
                logger.info(`❌ 已刪除: ${deleted.length} 個檔案`);
                deleted.slice(0, 3).forEach(line => logger.info(`   - ${line.substring(3)}`));
                if (deleted.length > 3)
                    logger.info(`   ... 還有 ${deleted.length - 3} 個`);
                logger.info('');
            }
            if (untracked.length > 0) {
                logger.info(`❓ 未追蹤: ${untracked.length} 個檔案`);
                untracked.slice(0, 3).forEach(line => logger.info(`   - ${line.substring(3)}`));
                if (untracked.length > 3)
                    logger.info(`   ... 還有 ${untracked.length - 3} 個`);
                logger.info('');
            }
            logger.info('💡 提示: 使用 save-work "描述" 儲存這些變更');
        }
        catch (error) {
            logger.error('❌ 無法查看狀態');
        }
    }
    async initialize(name, email) {
        try {
            logger.info('⚙️  正在初始化 Git...');
            await this.mcp.bash({
                command: 'git init',
            });
            await this.mcp.bash({
                command: `git config user.name "${this.escapeShellArg(name)}"`,
            });
            await this.mcp.bash({
                command: `git config user.email "${this.escapeShellArg(email)}"`,
            });
            logger.info('✅ Git 初始化完成');
            logger.info('📝 正在建立第一個版本...');
            await this.saveWork('Initial commit (專案開始)');
            logger.info('');
            logger.info('🎉 版本控制已經準備好了！');
            logger.info('');
            logger.info('📚 常用指令：');
            logger.info('   save-work "描述"     - 儲存目前工作');
            logger.info('   list-versions        - 查看歷史版本');
            logger.info('   show-changes         - 查看變更');
            logger.info('   status               - 查看目前狀態');
            logger.info('');
        }
        catch (error) {
            logger.error('❌ 初始化失敗:', this.getErrorMessage(error));
            throw error;
        }
    }
    escapeShellArg(arg) {
        return arg.replace(/"/g, '\\"');
    }
    getErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
    async findCommitByTime(timeSpec) {
        const result = await this.mcp.bash({
            command: `git log --since="${timeSpec}" --format="%H" -n 1`,
        });
        const hash = result.stdout.trim();
        if (!hash) {
            throw new NotFoundError(`找不到符合時間條件的版本: ${timeSpec}`, 'gitCommit', timeSpec, {
                component: 'FriendlyGitCommands',
                method: 'findCommitByTime',
                timeSpec: timeSpec,
                action: 'try a different time specification or check git log',
            });
        }
        return hash.substring(0, 8);
    }
    generateChangesSummary(added, removed, files) {
        const summary = [];
        summary.push(`✅ 新增了 ${added} 行`);
        summary.push(`❌ 刪除了 ${removed} 行`);
        summary.push(`📁 修改了 ${files.length} 個檔案`);
        if (files.length > 0) {
            summary.push('');
            summary.push('修改的檔案：');
            files.slice(0, 5).forEach(file => {
                summary.push(`  • ${file}`);
            });
            if (files.length > 5) {
                summary.push(`  ... 還有 ${files.length - 5} 個檔案`);
            }
        }
        return summary.join('\n');
    }
}
//# sourceMappingURL=FriendlyGitCommands.js.map