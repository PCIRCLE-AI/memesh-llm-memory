/**
 * Friendly Git Commands
 *
 * User-friendly wrapper for Git operations.
 * Translates complex Git commands into simple, intuitive operations.
 *
 * Examples:
 * - saveWork("完成登入功能") instead of git add . && git commit -m "..."
 * - listVersions() instead of git log
 * - goBackTo("昨天的版本") instead of git checkout <hash>
 */

import { MCPToolInterface } from '../core/MCPToolInterface';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface VersionInfo {
  number: number;
  hash: string;
  message: string;
  author: string;
  date: Date;
  timeAgo: string;
}

export interface ChangesSummary {
  addedLines: number;
  removedLines: number;
  modifiedFiles: string[];
  summary: string;
}

export class FriendlyGitCommands {
  private mcp: MCPToolInterface;

  constructor(mcp: MCPToolInterface) {
    this.mcp = mcp;
  }

  /**
   * 儲存目前工作
   * save-work "description"
   *
   * Equivalent to: git add . && git commit -m "description"
   */
  async saveWork(description: string, autoBackup: boolean = true): Promise<void> {
    try {
      console.log('💾 正在儲存工作...');

      // Stage all changes
      await this.mcp.bash({
        command: 'git add .',
      });

      // Commit
      await this.mcp.bash({
        command: `git commit -m "${this.escapeShellArg(description)}"`,
      });

      // Auto backup if enabled
      if (autoBackup) {
        await this.createLocalBackup();
      }

      console.log('✅ 工作已儲存');
      console.log(`📝 描述: ${description}`);
      console.log(`🕐 時間: ${new Date().toLocaleString('zh-TW')}`);

      // Record to Knowledge Graph
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

    } catch (error: unknown) {
      console.error('❌ 儲存失敗:', this.getErrorMessage(error));
      throw error;
    }
  }

  /**
   * 列出歷史版本
   * list-versions [limit]
   *
   * Equivalent to: git log --oneline -n <limit>
   */
  async listVersions(limit: number = 10): Promise<VersionInfo[]> {
    try {
      const result = await this.mcp.bash({
        command: `git log --format="%H|%s|%an|%ar|%at" -n ${limit}`,
      });

      const commits = result.stdout.trim().split('\n').filter(line => line.length > 0);

      const versions: VersionInfo[] = commits.map((commit, index) => {
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

      console.log('📚 最近的版本：\n');
      versions.forEach(v => {
        console.log(`${v.number}. ${v.message}`);
        console.log(`   (版本號: ${v.hash}, ${v.timeAgo})\n`);
      });

      return versions;

    } catch (error) {
      console.error('❌ 無法列出版本（專案可能還沒有任何版本）');
      return [];
    }
  }

  /**
   * 回到之前的版本
   * go-back-to "identifier"
   *
   * Identifier can be:
   * - Version number (e.g., "2", "第2個版本")
   * - Hash (e.g., "a1b2c3d4")
   * - Relative time (e.g., "昨天", "2天前")
   */
  async goBackTo(identifier: string): Promise<void> {
    try {
      console.log(`🔍 正在尋找版本: ${identifier}...`);

      let commitHash: string;

      // Try to parse as version number
      const numberMatch = identifier.match(/\d+/);
      if (numberMatch) {
        const number = parseInt(numberMatch[0]);
        const versions = await this.listVersions(number);
        if (versions[number - 1]) {
          commitHash = versions[number - 1].hash;
        } else {
          throw new Error(`找不到第 ${number} 個版本`);
        }
      }
      // Try relative time
      else if (identifier.includes('昨天') || identifier.includes('yesterday')) {
        commitHash = await this.findCommitByTime('yesterday');
      }
      else if (identifier.match(/(\d+)\s*天前/)) {
        const days = parseInt(identifier.match(/(\d+)\s*天前/)![1]);
        commitHash = await this.findCommitByTime(`${days} days ago`);
      }
      // Assume it's a hash
      else {
        commitHash = identifier;
      }

      // Checkout
      await this.mcp.bash({
        command: `git checkout ${commitHash}`,
      });

      console.log('✅ 已回到該版本');
      console.log(`ℹ️  版本號: ${commitHash}`);

      // Show warning about detached HEAD
      console.log('');
      console.log('⚠️  提醒：你現在處於「查看舊版本」模式');
      console.log('   如果要繼續開發，請先儲存當前狀態：');
      console.log('   save-work "從這個版本繼續開發"');

    } catch (error: unknown) {
      console.error('❌ 無法回到該版本:', this.getErrorMessage(error));
      throw error;
    }
  }

  /**
   * 查看變更
   * show-changes [compareWith]
   *
   * Equivalent to: git diff HEAD~1 (or git diff <compareWith>)
   */
  async showChanges(compareWith?: string): Promise<ChangesSummary> {
    try {
      const compareTarget = compareWith || 'HEAD~1';

      const result = await this.mcp.bash({
        command: `git diff ${compareTarget} --numstat`,
      });

      const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);

      let addedLines = 0;
      let removedLines = 0;
      const modifiedFiles: string[] = [];

      for (const line of lines) {
        const [added, removed, file] = line.split('\t');
        if (added && added !== '-') addedLines += parseInt(added);
        if (removed && removed !== '-') removedLines += parseInt(removed);
        if (file) modifiedFiles.push(file);
      }

      const summary = this.generateChangesSummary(addedLines, removedLines, modifiedFiles);

      console.log('📊 與上一版本的差異：\n');
      console.log(summary);
      console.log('');

      return {
        addedLines,
        removedLines,
        modifiedFiles,
        summary,
      };

    } catch (error) {
      console.error('❌ 無法查看變更');
      return {
        addedLines: 0,
        removedLines: 0,
        modifiedFiles: [],
        summary: '沒有變更',
      };
    }
  }

  /**
   * 創建本地備份
   * backup-now
   */
  async createLocalBackup(): Promise<string> {
    const backupDir = path.join(
      os.homedir(),
      '.smart-agents-backups',
      path.basename(process.cwd())
    );

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(backupDir, timestamp);

    try {
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });

      // Copy entire project (including .git)
      await this.mcp.bash({
        command: `cp -r . "${backupPath}"`,
      });

      // Clean up old backups (keep last 10)
      const backups = await fs.readdir(backupDir);
      const sortedBackups = backups.sort().reverse();

      for (const backup of sortedBackups.slice(10)) {
        await fs.rm(path.join(backupDir, backup), { recursive: true });
      }

      console.log(`✅ 備份已建立: ${backupPath}`);

      return backupPath;

    } catch (error: unknown) {
      console.error('❌ 備份失敗:', this.getErrorMessage(error));
      throw error;
    }
  }

  /**
   * 查看目前狀態
   * status
   *
   * Equivalent to: git status
   */
  async status(): Promise<void> {
    try {
      const result = await this.mcp.bash({
        command: 'git status --short',
      });

      const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);

      if (lines.length === 0) {
        console.log('✅ 目前沒有未儲存的變更');
        return;
      }

      console.log('📝 目前狀態：\n');

      const modified = lines.filter(line => line.startsWith(' M'));
      const added = lines.filter(line => line.startsWith('A'));
      const deleted = lines.filter(line => line.startsWith(' D'));
      const untracked = lines.filter(line => line.startsWith('??'));

      if (modified.length > 0) {
        console.log(`✏️  已修改: ${modified.length} 個檔案`);
        modified.slice(0, 3).forEach(line => console.log(`   - ${line.substring(3)}`));
        if (modified.length > 3) console.log(`   ... 還有 ${modified.length - 3} 個`);
        console.log('');
      }

      if (added.length > 0) {
        console.log(`➕ 已新增: ${added.length} 個檔案`);
        added.slice(0, 3).forEach(line => console.log(`   - ${line.substring(3)}`));
        if (added.length > 3) console.log(`   ... 還有 ${added.length - 3} 個`);
        console.log('');
      }

      if (deleted.length > 0) {
        console.log(`❌ 已刪除: ${deleted.length} 個檔案`);
        deleted.slice(0, 3).forEach(line => console.log(`   - ${line.substring(3)}`));
        if (deleted.length > 3) console.log(`   ... 還有 ${deleted.length - 3} 個`);
        console.log('');
      }

      if (untracked.length > 0) {
        console.log(`❓ 未追蹤: ${untracked.length} 個檔案`);
        untracked.slice(0, 3).forEach(line => console.log(`   - ${line.substring(3)}`));
        if (untracked.length > 3) console.log(`   ... 還有 ${untracked.length - 3} 個`);
        console.log('');
      }

      console.log('💡 提示: 使用 save-work "描述" 儲存這些變更');

    } catch (error) {
      console.error('❌ 無法查看狀態');
    }
  }

  /**
   * 初始化 Git（內部使用）
   */
  async initialize(name: string, email: string): Promise<void> {
    try {
      console.log('⚙️  正在初始化 Git...');

      // Init
      await this.mcp.bash({
        command: 'git init',
      });

      // Configure
      await this.mcp.bash({
        command: `git config user.name "${this.escapeShellArg(name)}"`,
      });

      await this.mcp.bash({
        command: `git config user.email "${this.escapeShellArg(email)}"`,
      });

      console.log('✅ Git 初始化完成');

      // Create first commit
      console.log('📝 正在建立第一個版本...');

      await this.saveWork('Initial commit (專案開始)');

      console.log('');
      console.log('🎉 版本控制已經準備好了！');
      console.log('');
      console.log('📚 常用指令：');
      console.log('   save-work "描述"     - 儲存目前工作');
      console.log('   list-versions        - 查看歷史版本');
      console.log('   show-changes         - 查看變更');
      console.log('   status               - 查看目前狀態');
      console.log('');

    } catch (error: unknown) {
      console.error('❌ 初始化失敗:', this.getErrorMessage(error));
      throw error;
    }
  }

  // ==================== Utility Methods ====================

  private escapeShellArg(arg: string): string {
    return arg.replace(/"/g, '\\"');
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

  private async findCommitByTime(timeSpec: string): Promise<string> {
    const result = await this.mcp.bash({
      command: `git log --since="${timeSpec}" --format="%H" -n 1`,
    });

    const hash = result.stdout.trim();
    if (!hash) {
      throw new Error(`找不到符合時間條件的版本: ${timeSpec}`);
    }

    return hash.substring(0, 8);
  }

  private generateChangesSummary(added: number, removed: number, files: string[]): string {
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
