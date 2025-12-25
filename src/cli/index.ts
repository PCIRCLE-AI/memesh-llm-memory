#!/usr/bin/env node
/**
 * Smart Agents CLI
 *
 * Main entry point for the command-line interface
 */

import { Command } from 'commander';
import { createCredentialCommand } from './commands/credential.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get package version
 */
function getVersion(): string {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Create main CLI program
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('smart-agents')
    .description('Universal LLM orchestration and agent management system')
    .version(getVersion());

  // Register commands
  program.addCommand(createCredentialCommand());

  return program;
}

/**
 * Run CLI
 */
export async function run() {
  const program = createCLI();
  await program.parseAsync(process.argv);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
