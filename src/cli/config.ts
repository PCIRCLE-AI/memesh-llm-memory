/**
 * Configuration Management for MeMesh
 *
 * Provides utilities for viewing, validating, editing, and resetting MeMesh configuration.
 *
 * Features:
 * - Show current configuration with syntax highlighting
 * - Validate MCP setup and test connection
 * - Open config in default editor
 * - Reset to default configuration (with confirmation)
 * - Platform-specific config path detection
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import { ProgressIndicator } from '../ui/ProgressIndicator.js';
import boxen from 'boxen';

/**
 * MCP Server Configuration
 */
interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Claude Code Configuration
 */
interface ClaudeCodeConfig {
  mcpServers?: {
    [key: string]: MCPServerConfig;
  };
  [key: string]: any;
}

/**
 * Configuration validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: ClaudeCodeConfig;
}

/**
 * Configuration utility class
 */
export class ConfigManager {
  /**
   * Get Claude Code config file path for current platform
   */
  static getConfigPath(): string {
    const platform = os.platform();
    const homeDir = os.homedir();

    if (platform === 'darwin') {
      // macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
      return path.join(
        homeDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
    } else if (platform === 'win32') {
      // Windows: %APPDATA%\Claude\claude_desktop_config.json
      return path.join(process.env.APPDATA || '', 'Claude/claude_desktop_config.json');
    } else {
      // Linux: ~/.config/Claude/claude_desktop_config.json
      return path.join(homeDir, '.config/Claude/claude_desktop_config.json');
    }
  }

  /**
   * Get platform-specific config directory description
   */
  static getConfigPathDescription(): string {
    const platform = os.platform();

    if (platform === 'darwin') {
      return '~/Library/Application Support/Claude/claude_desktop_config.json';
    } else if (platform === 'win32') {
      return '%APPDATA%\\Claude\\claude_desktop_config.json';
    } else {
      return '~/.config/Claude/claude_desktop_config.json';
    }
  }

  /**
   * Read and parse Claude Code configuration
   */
  static async readConfig(): Promise<ClaudeCodeConfig | null> {
    const configPath = this.getConfigPath();

    try {
      if (!(await fs.pathExists(configPath))) {
        return null;
      }

      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to read config', { error });
      return null;
    }
  }

  /**
   * Write Claude Code configuration
   */
  static async writeConfig(config: ClaudeCodeConfig): Promise<boolean> {
    const configPath = this.getConfigPath();

    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(configPath));

      // Write config
      await fs.writeJSON(configPath, config, { spaces: 2 });

      return true;
    } catch (error) {
      logger.error('Failed to write config', { error });
      return false;
    }
  }

  /**
   * Validate configuration
   */
  static async validateConfig(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const configPath = this.getConfigPath();

    // Check if config file exists
    if (!(await fs.pathExists(configPath))) {
      result.valid = false;
      result.errors.push('Configuration file does not exist');
      return result;
    }

    // Try to parse JSON
    let config: ClaudeCodeConfig;
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(content);
      result.config = config;
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Invalid JSON syntax: ${error instanceof Error ? error.message : String(error)}`
      );
      return result;
    }

    // Validate structure
    if (!config.mcpServers) {
      result.warnings.push('No MCP servers configured');
    }

    // Check for memesh server
    if (!config.mcpServers?.memesh) {
      result.valid = false;
      result.errors.push('MeMesh MCP server not configured');
      return result;
    }

    // Validate memesh server config
    const memeshConfig = config.mcpServers.memesh;

    if (!memeshConfig.command) {
      result.errors.push('MeMesh server: missing "command" field');
      result.valid = false;
    }

    if (!memeshConfig.args || !Array.isArray(memeshConfig.args)) {
      result.errors.push('MeMesh server: missing or invalid "args" field');
      result.valid = false;
    }

    // Check if memesh executable exists
    if (memeshConfig.args && memeshConfig.args.length > 0) {
      const executablePath = memeshConfig.args[0];
      if (!(await fs.pathExists(executablePath))) {
        result.warnings.push(
          `MeMesh executable not found: ${executablePath}`
        );
      }
    }

    return result;
  }

  /**
   * Generate default configuration
   */
  static generateDefaultConfig(): ClaudeCodeConfig {
    // Try to find global memesh installation
    const memeshPath = this.findMemeshPath();

    return {
      mcpServers: {
        memesh: {
          command: 'node',
          args: [memeshPath],
          env: {},
        },
      },
    };
  }

  /**
   * Find memesh installation path
   */
  private static findMemeshPath(): string {
    const platform = os.platform();

    // Try global node_modules
    let globalNodeModules: string;
    if (platform === 'win32') {
      globalNodeModules = path.join(process.env.APPDATA || '', 'npm/node_modules');
    } else {
      globalNodeModules = '/usr/local/lib/node_modules';
    }

    const globalMemeshPath = path.join(
      globalNodeModules,
      '@pcircle/memesh/dist/mcp/server-bootstrap.js'
    );

    // Return the path (may not exist yet, setup wizard will handle)
    return globalMemeshPath;
  }

  /**
   * Highlight JSON with colors
   */
  static highlightJSON(obj: any): string {
    const json = JSON.stringify(obj, null, 2);

    return json
      .split('\n')
      .map((line) => {
        // Highlight keys
        line = line.replace(/"([^"]+)":/g, (match, key) => {
          return `${chalk.cyan(`"${key}"`)}:`;
        });

        // Highlight string values
        line = line.replace(/: "([^"]*)"/g, (match, value) => {
          return `: ${chalk.green(`"${value}"`)}`;
        });

        // Highlight booleans
        line = line.replace(/\b(true|false)\b/g, (match) => {
          return chalk.yellow(match);
        });

        // Highlight null
        line = line.replace(/\bnull\b/g, chalk.gray('null'));

        // Highlight braces and brackets
        line = line.replace(/[{}[\]]/g, (match) => chalk.dim(match));

        return line;
      })
      .join('\n');
  }

  /**
   * Open config file in default editor
   */
  static async openInEditor(): Promise<boolean> {
    const configPath = this.getConfigPath();

    // Ensure config exists
    if (!(await fs.pathExists(configPath))) {
      console.log(
        chalk.yellow('⚠️  Configuration file does not exist. Run "memesh setup" first.')
      );
      return false;
    }

    const editor = process.env.EDITOR || process.env.VISUAL || this.getDefaultEditor();

    return new Promise((resolve) => {
      const child = spawn(editor, [configPath], {
        stdio: 'inherit',
        shell: true,
      });

      child.on('exit', (code) => {
        resolve(code === 0);
      });

      child.on('error', (error) => {
        logger.error('Failed to open editor', { error });
        console.error(chalk.red(`Failed to open editor: ${error.message}`));
        resolve(false);
      });
    });
  }

  /**
   * Get default editor for current platform
   */
  private static getDefaultEditor(): string {
    const platform = os.platform();

    if (platform === 'darwin') {
      return 'open -e'; // TextEdit on macOS
    } else if (platform === 'win32') {
      return 'notepad';
    } else {
      return 'nano'; // Fallback to nano on Linux
    }
  }

  /**
   * Create backup of config file
   */
  static async backupConfig(): Promise<string | null> {
    const configPath = this.getConfigPath();

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.backup-${timestamp}`;

    try {
      await fs.copy(configPath, backupPath);
      return backupPath;
    } catch (error) {
      logger.error('Failed to backup config', { error });
      return null;
    }
  }
}

/**
 * Show current configuration
 */
export async function showConfig(): Promise<void> {
  const configPath = ConfigManager.getConfigPath();
  const pathDescription = ConfigManager.getConfigPathDescription();

  console.log(
    boxen(chalk.bold.cyan('⚙️  MeMesh Configuration'), {
      padding: 1,
      borderColor: 'cyan',
      borderStyle: 'round',
    })
  );

  // Show config file location
  console.log(chalk.bold('\n📍 Configuration File:'));
  console.log(chalk.dim(`   ${pathDescription}`));
  console.log(chalk.gray(`   ${configPath}\n`));

  // Check if config exists
  if (!(await fs.pathExists(configPath))) {
    console.log(
      chalk.yellow(
        '⚠️  Configuration file not found. Run "memesh setup" to configure.'
      )
    );
    return;
  }

  // Read and display config
  const config = await ConfigManager.readConfig();

  if (!config) {
    console.log(chalk.red('❌ Failed to read configuration file'));
    return;
  }

  console.log(chalk.bold('📄 Configuration:\n'));
  console.log(ConfigManager.highlightJSON(config));

  // Show memesh-specific config
  if (config.mcpServers?.memesh) {
    const memeshConfig = config.mcpServers.memesh;

    console.log(chalk.bold('\n🔧 MeMesh Server:'));
    console.log(chalk.dim('   Command:   ') + chalk.cyan(memeshConfig.command));
    console.log(
      chalk.dim('   Script:    ') + chalk.cyan(memeshConfig.args.join(' '))
    );

    // Check if executable exists
    if (memeshConfig.args.length > 0) {
      const executablePath = memeshConfig.args[0];
      const exists = await fs.pathExists(executablePath);

      if (exists) {
        console.log(chalk.dim('   Status:    ') + chalk.green('✓ Installed'));
      } else {
        console.log(
          chalk.dim('   Status:    ') +
            chalk.yellow('⚠ Executable not found')
        );
      }
    }
  }

  console.log();
}

/**
 * Validate configuration and test connection
 */
export async function validateConfig(): Promise<void> {
  const configPath = ConfigManager.getConfigPath();

  console.log(
    boxen(chalk.bold.cyan('🔍 Configuration Validation'), {
      padding: 1,
      borderColor: 'cyan',
      borderStyle: 'round',
    })
  );

  console.log(chalk.bold('\n📍 Configuration File:'));
  console.log(chalk.gray(`   ${configPath}\n`));

  const spinner = ProgressIndicator.simple('Validating configuration...');

  // Run validation
  const result = await ConfigManager.validateConfig();

  spinner.stop();

  // Display results
  if (result.errors.length === 0) {
    console.log(chalk.green('\n✅ Configuration is valid!\n'));
  } else {
    console.log(chalk.red('\n❌ Configuration has errors:\n'));
    result.errors.forEach((error) => {
      console.log(chalk.red(`   • ${error}`));
    });
    console.log();
  }

  // Display warnings
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Warnings:\n'));
    result.warnings.forEach((warning) => {
      console.log(chalk.yellow(`   • ${warning}`));
    });
    console.log();
  }

  // Show MeMesh server details
  if (result.config?.mcpServers?.memesh) {
    const memeshConfig = result.config.mcpServers.memesh;

    console.log(chalk.bold('🔧 MeMesh Server Configuration:'));
    console.log(chalk.dim('   Command:   ') + chalk.cyan(memeshConfig.command));
    console.log(
      chalk.dim('   Script:    ') + chalk.cyan(memeshConfig.args.join(' '))
    );
    console.log();
  }

  // Connection test note
  if (result.valid) {
    console.log(
      boxen(
        chalk.bold('✓ Next Steps:\n\n') +
          chalk.dim('1. Restart Claude Code to load MeMesh\n') +
          chalk.dim('2. Verify connection: type "buddy-help" in Claude Code\n') +
          chalk.dim('3. Test features: try "buddy-do" or "buddy-remember"'),
        {
          padding: 1,
          borderColor: 'green',
          borderStyle: 'round',
        }
      )
    );
  } else {
    console.log(
      boxen(
        chalk.bold('🔧 Fix Configuration:\n\n') +
          chalk.dim('Run: ') +
          chalk.cyan('memesh setup') +
          chalk.dim(' to reconfigure\n') +
          chalk.dim('Or: ') +
          chalk.cyan('memesh config edit') +
          chalk.dim(' to edit manually'),
        {
          padding: 1,
          borderColor: 'red',
          borderStyle: 'round',
        }
      )
    );
  }

  console.log();
}

/**
 * Edit configuration in default editor
 */
export async function editConfig(): Promise<void> {
  const configPath = ConfigManager.getConfigPath();

  console.log(
    boxen(chalk.bold.cyan('✏️  Edit Configuration'), {
      padding: 1,
      borderColor: 'cyan',
      borderStyle: 'round',
    })
  );

  console.log(chalk.bold('\n📍 Configuration File:'));
  console.log(chalk.gray(`   ${configPath}\n`));

  // Check if config exists
  if (!(await fs.pathExists(configPath))) {
    console.log(
      chalk.yellow(
        '⚠️  Configuration file does not exist. Run "memesh setup" first.\n'
      )
    );
    return;
  }

  // Create backup before editing
  const backupPath = await ConfigManager.backupConfig();
  if (backupPath) {
    console.log(chalk.dim(`📦 Backup created: ${path.basename(backupPath)}\n`));
  }

  // Open in editor
  console.log(chalk.dim('Opening configuration in editor...\n'));

  const success = await ConfigManager.openInEditor();

  if (success) {
    console.log(chalk.green('\n✅ Configuration saved'));

    // Validate after editing
    console.log(chalk.dim('\nValidating configuration...\n'));

    const result = await ConfigManager.validateConfig();

    if (result.valid) {
      console.log(chalk.green('✅ Configuration is valid'));
    } else {
      console.log(chalk.red('❌ Configuration has errors:'));
      result.errors.forEach((error) => {
        console.log(chalk.red(`   • ${error}`));
      });

      if (backupPath) {
        console.log(
          chalk.yellow(
            `\n⚠️  You can restore from backup: ${path.basename(backupPath)}`
          )
        );
      }
    }
  } else {
    console.log(chalk.yellow('\n⚠️  Editor closed without saving'));
  }

  console.log();
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  const configPath = ConfigManager.getConfigPath();

  console.log(
    boxen(chalk.bold.red('🔄 Reset Configuration'), {
      padding: 1,
      borderColor: 'red',
      borderStyle: 'round',
    })
  );

  console.log(chalk.bold('\n📍 Configuration File:'));
  console.log(chalk.gray(`   ${configPath}\n`));

  // Confirm reset
  const { confirmReset } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmReset',
      message: chalk.yellow(
        'Are you sure you want to reset configuration to defaults?'
      ),
      default: false,
    },
  ]);

  if (!confirmReset) {
    console.log(chalk.dim('\nReset cancelled.\n'));
    return;
  }

  // Create backup
  const backupPath = await ConfigManager.backupConfig();
  if (backupPath) {
    console.log(chalk.green(`\n✅ Backup created: ${path.basename(backupPath)}`));
  }

  // Generate default config
  const spinner = ProgressIndicator.simple('Resetting configuration...');

  const defaultConfig = ConfigManager.generateDefaultConfig();
  const success = await ConfigManager.writeConfig(defaultConfig);

  spinner.stop();

  if (success) {
    console.log(chalk.green('\n✅ Configuration reset to defaults\n'));

    // Show new config
    console.log(chalk.bold('📄 New Configuration:\n'));
    console.log(ConfigManager.highlightJSON(defaultConfig));

    console.log(
      boxen(
        chalk.bold('✓ Next Steps:\n\n') +
          chalk.dim('1. Restart Claude Code to apply changes\n') +
          chalk.dim('2. Verify: type "buddy-help" in Claude Code'),
        {
          padding: 1,
          borderColor: 'green',
          borderStyle: 'round',
          margin: { top: 1 },
        }
      )
    );
  } else {
    console.log(chalk.red('\n❌ Failed to reset configuration'));

    if (backupPath) {
      console.log(
        chalk.yellow(`\n⚠️  You can restore from backup: ${path.basename(backupPath)}`)
      );
    }
  }

  console.log();
}
