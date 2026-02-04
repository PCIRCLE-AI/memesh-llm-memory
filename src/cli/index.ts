#!/usr/bin/env node

/**
 * MeMesh CLI Entry Point
 *
 * Handles user-facing CLI commands:
 * - memesh setup         Interactive configuration wizard
 * - memesh tutorial      Interactive tutorial
 * - memesh dashboard     Session health dashboard
 * - memesh stats         Usage statistics
 * - memesh report-issue  Bug reporting
 * - memesh config        Configuration management
 * - memesh --version     Show version
 * - memesh --help        Show help
 *
 * Note: When run without arguments (via MCP), starts MCP server
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { runSetupWizard } from './setup-wizard.js';
import { runTutorial } from './tutorial.js';
import { runDashboard } from './dashboard.js';
import { runStats } from './stats.js';
import { showConfig, validateConfig, editConfig, resetConfig } from './config.js';
import { createDaemonCommand } from './daemon.js';
import { logger } from '../utils/logger.js';

// Read version from package.json
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

const program = new Command();

program
  .name('memesh')
  .description('MeMesh - Your AI memory mesh for Claude Code')
  .version(packageJson.version, '-v, --version', 'Show version number');

// Setup command
program
  .command('setup')
  .description('Interactive configuration wizard')
  .action(async () => {
    try {
      await runSetupWizard();
    } catch (error) {
      logger.error('Setup wizard failed', { error });
      console.error(chalk.red('Setup failed:'), error);
      process.exit(1);
    }
  });

// Tutorial command
program
  .command('tutorial')
  .description('Interactive 5-minute tutorial')
  .action(async () => {
    try {
      await runTutorial();
    } catch (error) {
      logger.error('Tutorial failed', { error });
      console.error(chalk.red('Tutorial failed:'), error);
      process.exit(1);
    }
  });

// Dashboard command
program
  .command('dashboard')
  .description('View session health dashboard with real-time monitoring')
  .action(async () => {
    try {
      await runDashboard();
    } catch (error) {
      logger.error('Dashboard failed', { error });
      console.error(chalk.red('Dashboard failed:'), error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('View usage statistics and analytics')
  .option('-d, --day', 'Show last 24 hours')
  .option('-w, --week', 'Show last 7 days')
  .option('-m, --month', 'Show last 30 days')
  .option('-a, --all', 'Show all time (default)')
  .option('--json', 'Export as JSON')
  .option('--csv', 'Export as CSV')
  .option('-v, --verbose', 'Show detailed statistics')
  .action(async (options) => {
    try {
      // Determine time range
      let range: 'day' | 'week' | 'month' | 'all' = 'all';
      if (options.day) range = 'day';
      else if (options.week) range = 'week';
      else if (options.month) range = 'month';

      // Determine export format
      let exportFormat: 'json' | 'csv' | undefined;
      if (options.json) exportFormat = 'json';
      else if (options.csv) exportFormat = 'csv';

      await runStats({
        range,
        export: exportFormat,
        verbose: options.verbose,
      });
    } catch (error) {
      logger.error('Stats command failed', { error });
      console.error(chalk.red('Stats failed:'), error);
      process.exit(1);
    }
  });

// Report issue command (placeholder)
program
  .command('report-issue')
  .description('Report a bug or issue')
  .action(() => {
    console.log(chalk.yellow('\n🐛 Report Issue'));
    console.log(chalk.dim('For now, please report issues at:'));
    console.log(
      chalk.cyan('https://github.com/PCIRCLE-AI/claude-code-buddy/issues\n')
    );
  });

// Config commands
const config = program
  .command('config')
  .description('Manage MeMesh configuration');

config
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    try {
      await showConfig();
    } catch (error) {
      logger.error('Failed to show config', { error });
      console.error(chalk.red('Failed to show configuration:'), error);
      process.exit(1);
    }
  });

config
  .command('validate')
  .description('Validate MCP configuration')
  .action(async () => {
    try {
      await validateConfig();
    } catch (error) {
      logger.error('Failed to validate config', { error });
      console.error(chalk.red('Failed to validate configuration:'), error);
      process.exit(1);
    }
  });

config
  .command('edit')
  .description('Edit configuration in default editor')
  .action(async () => {
    try {
      await editConfig();
    } catch (error) {
      logger.error('Failed to edit config', { error });
      console.error(chalk.red('Failed to edit configuration:'), error);
      process.exit(1);
    }
  });

config
  .command('reset')
  .description('Reset configuration to defaults')
  .action(async () => {
    try {
      await resetConfig();
    } catch (error) {
      logger.error('Failed to reset config', { error });
      console.error(chalk.red('Failed to reset configuration:'), error);
      process.exit(1);
    }
  });

// Daemon commands
program.addCommand(createDaemonCommand());

// Help command (override default to show better format)
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Examples:'));
  console.log('  $ memesh setup           # Configure MeMesh interactively');
  console.log('  $ memesh tutorial        # Learn MeMesh in 5 minutes');
  console.log('  $ memesh dashboard       # View session health');
  console.log('  $ memesh daemon status   # Check daemon status');
  console.log('  $ memesh daemon logs -f  # Follow daemon logs');
  console.log('');
  console.log(chalk.bold('Documentation:'));
  console.log('  Quick Start: https://memesh.pcircle.ai/quick-start');
  console.log('  User Guide:  https://memesh.pcircle.ai/guide');
  console.log('');
  console.log(chalk.bold('Support:'));
  console.log('  Issues:      https://github.com/PCIRCLE-AI/claude-code-buddy/issues');
  console.log('  Discussions: https://github.com/PCIRCLE-AI/claude-code-buddy/discussions');
  console.log('');
});

/**
 * Run the CLI program
 */
export async function runCLI(): Promise<void> {
  // Parse arguments
  program.parse(process.argv);

  // If no command specified, show help
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}
