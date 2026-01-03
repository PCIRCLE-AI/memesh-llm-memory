#!/usr/bin/env node
import { Command } from 'commander';
import { createCredentialCommand } from './commands/credential.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
function getVersion() {
    try {
        const packagePath = join(__dirname, '../../package.json');
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        return packageJson.version || '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
export function createCLI() {
    const program = new Command();
    program
        .name('smart-agents')
        .description('Universal LLM orchestration and agent management system')
        .version(getVersion());
    program.addCommand(createCredentialCommand());
    return program;
}
export async function run() {
    const program = createCLI();
    await program.parseAsync(process.argv);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    run().catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map