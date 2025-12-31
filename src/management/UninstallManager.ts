/**
 * Uninstall Manager
 *
 * Handles clean uninstallation of Claude Code Buddy with user control over data retention.
 * Provides detailed reporting of removed, kept, and failed items.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SkillManager } from '../skills/SkillManager.js';
import { logger } from '../utils/logger.js';

/**
 * Uninstall options
 */
export interface UninstallOptions {
  keepData?: boolean;    // Keep evolution patterns, task history
  keepConfig?: boolean;  // Keep configuration files
  dryRun?: boolean;      // Show what would be removed without actually removing
}

/**
 * Uninstall report
 */
export interface UninstallReport {
  removed: string[];  // Items successfully removed
  kept: string[];     // Items kept as requested
  errors: string[];   // Errors encountered
  dryRun: boolean;    // Was this a dry run
}

/**
 * Uninstall Manager Class
 *
 * Manages the uninstallation process for Claude Code Buddy.
 */
export class UninstallManager {
  private skillManager: SkillManager;
  private smartAgentsDir: string;
  private dataDir: string;

  constructor(skillManager?: SkillManager) {
    this.skillManager = skillManager || new SkillManager();

    // Default directories
    this.smartAgentsDir = path.join(os.homedir(), '.claude-code-buddy');
    this.dataDir = path.join(this.smartAgentsDir, 'data');
  }

  /**
   * Perform uninstallation
   *
   * @param options - Uninstall options
   * @returns Detailed uninstall report
   */
  async uninstall(options: UninstallOptions = {}): Promise<UninstallReport> {
    const report: UninstallReport = {
      removed: [],
      kept: [],
      errors: [],
      dryRun: options.dryRun || false,
    };

    const actionVerb = options.dryRun ? 'Would remove' : 'Removed';
    const keepVerb = options.dryRun ? 'Would keep' : 'Kept';

    // 1. Remove Claude Code Buddy skills (sa:* prefix)
    try {
      const skills = await this.skillManager.listSmartAgentsSkills();

      if (skills.length > 0) {
        if (!options.dryRun) {
          for (const skill of skills) {
            await this.skillManager.deleteSkill(skill);
          }
        }
        report.removed.push(
          `${actionVerb} ${skills.length} Claude Code Buddy skill${skills.length === 1 ? '' : 's'}: ${skills.join(', ')}`
        );
      } else {
        report.removed.push('No Claude Code Buddy skills found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      report.errors.push(`Skills: ${errorMessage}`);
    }

    // 2. Remove configuration files (optional)
    if (!options.keepConfig) {
      try {
        const configExists = await this.pathExists(this.smartAgentsDir);

        if (configExists) {
          if (!options.dryRun) {
            // Remove everything except data if keepData is true
            if (options.keepData) {
              // Remove config files but keep data directory
              const entries = await fs.readdir(this.smartAgentsDir, { withFileTypes: true });

              for (const entry of entries) {
                if (entry.name === 'data') continue;

                const entryPath = path.join(this.smartAgentsDir, entry.name);

                // Security check 1: Ensure path is within smartAgentsDir
                const resolvedPath = await fs.realpath(entryPath).catch(() => entryPath);
                const resolvedBaseDir = await fs.realpath(this.smartAgentsDir);

                if (!resolvedPath.startsWith(resolvedBaseDir)) {
                  logger.warn(`Skipped suspicious path: ${entry.name} (points outside directory)`);
                  report.errors.push(`Skipped suspicious path: ${entry.name} (points outside directory)`);
                  continue;
                }

                // Security check 2: Don't follow symlinks
                const stats = await fs.lstat(entryPath);
                if (stats.isSymbolicLink()) {
                  logger.warn(`Skipped symlink: ${entry.name} (potential security risk)`);
                  report.errors.push(`Skipped symlink: ${entry.name} (potential security risk)`);
                  continue;
                }

                // Safe to delete
                await fs.rm(entryPath, { recursive: true, force: true });
              }
              report.removed.push(`${actionVerb} configuration files (kept data)`);
            } else {
              // Remove entire directory including data
              await fs.rm(this.smartAgentsDir, { recursive: true, force: true });
              report.removed.push(`${actionVerb} configuration directory (~/.claude-code-buddy/)`);
            }
          } else {
            report.removed.push(`${actionVerb} configuration directory (~/.claude-code-buddy/)`);
          }
        } else {
          report.removed.push('Configuration directory not found (already clean)');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        report.errors.push(`Configuration: ${errorMessage}`);
      }
    } else {
      report.kept.push(`${keepVerb} configuration files (~/.claude-code-buddy/)`);
    }

    // 3. Clean data files (optional)
    if (!options.keepData) {
      try {
        const dataExists = await this.pathExists(this.dataDir);

        if (dataExists) {
          if (!options.dryRun && !options.keepConfig) {
            // Only remove if we haven't already removed the whole directory
            await fs.rm(this.dataDir, { recursive: true, force: true });
          }

          if (!options.keepConfig) {
            // Already included in config removal
          } else {
            if (!options.dryRun) {
              await fs.rm(this.dataDir, { recursive: true, force: true });
            }
            report.removed.push(`${actionVerb} user data (evolution patterns, task history)`);
          }
        } else {
          // Only report if we kept config (otherwise it's already mentioned)
          if (options.keepConfig) {
            report.removed.push('User data directory not found');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        report.errors.push(`Data: ${errorMessage}`);
      }
    } else {
      report.kept.push(`${keepVerb} user data (evolution patterns, task history)`);
    }

    // 4. Note: MCP server registration
    // Cannot automatically remove MCP server registration from Docker MCP
    // User needs to manually remove via MCP tools
    report.removed.push(
      'Note: If installed via MCP, manually remove server registration using MCP tools'
    );

    return report;
  }

  /**
   * Check if a path exists
   */
  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format uninstall report for display
   *
   * @param report - Uninstall report
   * @returns Formatted report string
   */
  formatReport(report: UninstallReport): string {
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

    // Removed items
    if (report.removed.length > 0) {
      output += report.dryRun ? '📋 Would Remove:\n' : '✅ Removed:\n';
      report.removed.forEach(item => {
        output += `  • ${item}\n`;
      });
      output += '\n';
    }

    // Kept items
    if (report.kept.length > 0) {
      output += '📦 Kept (as requested):\n';
      report.kept.forEach(item => {
        output += `  • ${item}\n`;
      });
      output += '\n';
    }

    // Errors
    if (report.errors.length > 0) {
      output += '❌ Errors:\n';
      report.errors.forEach(error => {
        output += `  • ${error}\n`;
      });
      output += '\n';
    } else {
      if (!report.dryRun) {
        output += '❌ Errors:\n  (none)\n\n';
      }
    }

    output += '━'.repeat(64) + '\n\n';

    if (report.dryRun) {
      output += '💡 To actually uninstall, run without --dry-run flag\n';
    } else {
      output += '💡 To reinstall: Add claude-code-buddy MCP server again\n';
      output += '💡 Project repository: https://github.com/PCIRCLE-AI/claude-code-buddy\n';
    }

    return output;
  }

  /**
   * Get uninstall preview (dry run)
   *
   * @param options - Uninstall options
   * @returns Preview report
   */
  async preview(options: UninstallOptions = {}): Promise<UninstallReport> {
    return this.uninstall({ ...options, dryRun: true });
  }
}
