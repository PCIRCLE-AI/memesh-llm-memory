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

// Tutorial command (placeholder for now)
program
  .command('tutorial')
  .description('Interactive 5-minute tutorial')
  .action(() => {
    console.log(chalk.yellow('\n🎓 Interactive Tutorial'));
    console.log(chalk.dim('Coming soon! For now, see:'));
    console.log(chalk.cyan('https://memesh.pcircle.ai/tutorial\n'));
  });

// Dashboard command (placeholder)
program
  .command('dashboard')
  .description('View session health dashboard')
  .action(() => {
    console.log(chalk.yellow('\n📊 Session Dashboard'));
    console.log(chalk.dim('Coming soon! For now, use buddy tools in Claude Code.\n'));
  });

// Stats command (placeholder)
program
  .command('stats')
  .description('View usage statistics')
  .action(() => {
    console.log(chalk.yellow('\n📈 Usage Statistics'));
    console.log(chalk.dim('Coming soon! Track your MeMesh usage.\n'));
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
  .action(() => {
    console.log(chalk.yellow('\n⚙️  Configuration'));
    console.log(chalk.dim('Coming soon! View your MeMesh config.\n'));
  });

config
  .command('validate')
  .description('Validate MCP configuration')
  .action(() => {
    console.log(chalk.yellow('\n✓ Validate Configuration'));
    console.log(chalk.dim('Coming soon! Test your MeMesh setup.\n'));
  });

// Help command (override default to show better format)
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Examples:'));
  console.log('  $ memesh setup           # Configure MeMesh interactively');
  console.log('  $ memesh tutorial        # Learn MeMesh in 5 minutes');
  console.log('  $ memesh dashboard       # View session health');
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
