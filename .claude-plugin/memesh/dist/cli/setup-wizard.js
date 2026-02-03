import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ProgressIndicator } from '../ui/ProgressIndicator.js';
import { logger } from '../utils/logger.js';
export class SetupWizard {
    progress;
    constructor() {
        this.progress = new ProgressIndicator();
    }
    async run() {
        console.log(boxen(chalk.bold.cyan('🚀 MeMesh Configuration Wizard'), {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        }));
        console.log(chalk.dim('\nThis wizard will help you configure MeMesh in 3 easy steps.\n'));
        try {
            const config = await this.detectEnvironment();
            await this.configureEnvironment();
            const configured = await this.configureMCP(config);
            if (!configured) {
                console.log(chalk.yellow('\n⚠️  Setup cancelled'));
                return;
            }
            await this.validateSetup(config);
            this.showSuccessMessage();
        }
        catch (error) {
            this.handleError(error);
        }
    }
    async detectEnvironment() {
        this.progress.start([
            'Detecting Claude Code installation',
            'Locating configuration directory',
            'Checking existing configuration',
        ]);
        const claudeCodePath = await this.findClaudeCode();
        this.progress.nextStep();
        const mcpConfigPath = this.getMCPConfigPath();
        this.progress.nextStep();
        const hasExisting = await fs.pathExists(mcpConfigPath);
        this.progress.nextStep();
        this.progress.complete('Environment detected');
        const config = {
            claudeCodePath,
            mcpConfigPath,
            autoDetected: !!claudeCodePath,
        };
        console.log(chalk.bold('\n📋 Detection Results:\n'));
        if (claudeCodePath) {
            console.log(`${chalk.green('✓')} Claude Code: ${chalk.cyan(claudeCodePath)}`);
        }
        else {
            console.log(`${chalk.yellow('⚠')} Claude Code: ${chalk.dim('Not found (will configure manually)')}`);
        }
        console.log(`${chalk.green('✓')} Config directory: ${chalk.cyan(path.dirname(mcpConfigPath))}`);
        if (hasExisting) {
            console.log(`${chalk.yellow('⚠')} Existing config: ${chalk.dim('Will be backed up')}`);
        }
        return config;
    }
    async configureEnvironment() {
        console.log(chalk.bold('\n🔧 Environment Configuration\n'));
        const projectRoot = process.cwd();
        const envPath = path.join(projectRoot, '.env');
        const envExamplePath = path.join(projectRoot, '.env.example');
        const tokenScriptPath = path.join(projectRoot, 'scripts/generate-a2a-token.sh');
        const hasEnv = await fs.pathExists(envPath);
        if (!hasEnv) {
            const { shouldCreateEnv } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'shouldCreateEnv',
                    message: 'Create .env file from template?',
                    default: true,
                },
            ]);
            if (shouldCreateEnv) {
                if (await fs.pathExists(envExamplePath)) {
                    await fs.copy(envExamplePath, envPath);
                    console.log(chalk.green('  ✓ Created .env from template'));
                }
                else {
                    await fs.writeFile(envPath, '# MeMesh Configuration\n');
                    console.log(chalk.green('  ✓ Created .env file'));
                }
            }
        }
        else {
            console.log(chalk.green('  ✓ .env file already exists'));
        }
        let hasToken = false;
        if (await fs.pathExists(envPath)) {
            const envContent = await fs.readFile(envPath, 'utf-8');
            hasToken = /^MEMESH_A2A_TOKEN=.+$/m.test(envContent);
        }
        if (!hasToken) {
            const { shouldGenerateToken } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'shouldGenerateToken',
                    message: 'Generate A2A authentication token?',
                    default: true,
                },
            ]);
            if (shouldGenerateToken) {
                if (await fs.pathExists(tokenScriptPath)) {
                    const spinner = ProgressIndicator.simple('Generating A2A token...');
                    try {
                        const { execFile } = await import('child_process');
                        const { promisify } = await import('util');
                        const execFileAsync = promisify(execFile);
                        await execFileAsync('bash', [tokenScriptPath], {
                            cwd: projectRoot,
                        });
                        spinner.succeed(chalk.green('A2A token generated successfully'));
                    }
                    catch (error) {
                        spinner.fail(chalk.yellow('Failed to generate token automatically'));
                        console.log(chalk.dim('  Run manually: bash scripts/generate-a2a-token.sh'));
                    }
                }
                else {
                    console.log(chalk.yellow('  ⚠ Token generator not found (scripts/generate-a2a-token.sh)'));
                    console.log(chalk.dim('  Manually add MEMESH_A2A_TOKEN to .env with a secure random value'));
                }
            }
        }
        else {
            console.log(chalk.green('  ✓ A2A token already configured'));
        }
        console.log('');
    }
    async configureMCP(config) {
        console.log(chalk.bold('\n🔧 Configuration\n'));
        const { shouldConfigure } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldConfigure',
                message: 'Configure MeMesh MCP server automatically?',
                default: true,
            },
        ]);
        if (!shouldConfigure) {
            return false;
        }
        if (await fs.pathExists(config.mcpConfigPath)) {
            const backupPath = `${config.mcpConfigPath}.backup-${Date.now()}`;
            await fs.copy(config.mcpConfigPath, backupPath);
            console.log(chalk.dim(`  Backed up existing config to: ${path.basename(backupPath)}`));
        }
        const spinner = ProgressIndicator.simple('Generating MCP configuration...');
        try {
            const mcpConfig = this.generateMCPConfig();
            await fs.ensureDir(path.dirname(config.mcpConfigPath));
            await fs.writeJSON(config.mcpConfigPath, mcpConfig, { spaces: 2 });
            spinner.succeed(chalk.green('MCP configuration generated'));
            return true;
        }
        catch (error) {
            spinner.fail(chalk.red('Failed to generate configuration'));
            throw error;
        }
    }
    async validateSetup(config) {
        console.log(chalk.bold('\n🔍 Validation\n'));
        const spinner = ProgressIndicator.simple('Testing MCP configuration...');
        try {
            const configContent = await fs.readJSON(config.mcpConfigPath);
            if (!configContent.mcpServers || !configContent.mcpServers.memesh) {
                throw new Error('Invalid MCP configuration structure');
            }
            spinner.succeed(chalk.green('Configuration is valid'));
            console.log(chalk.dim('\n  💡 Connection test will be performed when Claude Code starts'));
        }
        catch (error) {
            spinner.fail(chalk.red('Configuration validation failed'));
            throw error;
        }
    }
    async findClaudeCode() {
        const platform = os.platform();
        const possiblePaths = [];
        if (platform === 'darwin') {
            possiblePaths.push('/Applications/Claude Code.app', path.join(os.homedir(), 'Applications/Claude Code.app'));
        }
        else if (platform === 'win32') {
            possiblePaths.push(path.join(os.homedir(), 'AppData/Local/Programs/Claude Code/Claude Code.exe'), 'C:\\Program Files\\Claude Code\\Claude Code.exe');
        }
        else {
            possiblePaths.push('/usr/local/bin/claude-code', '/usr/bin/claude-code', path.join(os.homedir(), '.local/bin/claude-code'));
        }
        for (const possiblePath of possiblePaths) {
            if (await fs.pathExists(possiblePath)) {
                return possiblePath;
            }
        }
        return undefined;
    }
    getMCPConfigPath() {
        const platform = os.platform();
        const homeDir = os.homedir();
        if (platform === 'darwin') {
            return path.join(homeDir, 'Library/Application Support/Claude/claude_desktop_config.json');
        }
        else if (platform === 'win32') {
            return path.join(process.env.APPDATA || '', 'Claude/claude_desktop_config.json');
        }
        else {
            return path.join(homeDir, '.config/Claude/claude_desktop_config.json');
        }
    }
    generateMCPConfig() {
        const memeshPath = this.getMemeshExecutablePath();
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
    getMemeshExecutablePath() {
        const globalNodeModules = this.getGlobalNodeModulesPath();
        const globalMemeshPath = path.join(globalNodeModules, '@pcircle/memesh/dist/mcp/server-bootstrap.js');
        return globalMemeshPath;
    }
    getGlobalNodeModulesPath() {
        const platform = os.platform();
        if (platform === 'win32') {
            return path.join(process.env.APPDATA || '', 'npm/node_modules');
        }
        else {
            return '/usr/local/lib/node_modules';
        }
    }
    showSuccessMessage() {
        const message = `
${chalk.bold.green('✅ Setup Complete!')}

MeMesh has been configured successfully.

${chalk.bold('Next Steps:')}

${chalk.cyan('1.')} Restart Claude Code
   ${chalk.dim('Close and reopen Claude Code to load MeMesh')}

${chalk.cyan('2.')} Verify installation
   ${chalk.dim('In Claude Code, type: buddy-help')}

${chalk.cyan('3.')} Try your first command
   ${chalk.dim('buddy-do "explain MeMesh features"')}
   ${chalk.dim('buddy-remember "project decisions"')}

${chalk.bold('📖 Documentation:')}
   Quick Start: https://memesh.pcircle.ai/quick-start
   User Guide:  https://memesh.pcircle.ai/guide
   Tutorial:    ${chalk.cyan('memesh tutorial')}

${chalk.bold('🆘 Need Help?')}
   Issues: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
   Report: ${chalk.cyan('memesh report-issue')}
`;
        console.log(boxen(message, {
            padding: 1,
            borderColor: 'green',
            borderStyle: 'round',
        }));
    }
    handleError(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Setup failed', { error: errorMessage });
        const message = `
${chalk.bold.red('❌ Setup Failed')}

${chalk.dim('Error:')} ${errorMessage}

${chalk.bold('Troubleshooting:')}

${chalk.cyan('1.')} Check permissions
   ${chalk.dim('Ensure you can write to the config directory')}

${chalk.cyan('2.')} Manual configuration
   ${chalk.dim('See: https://memesh.pcircle.ai/manual-setup')}

${chalk.cyan('3.')} Get help
   ${chalk.dim('Report issue: memesh report-issue')}
   ${chalk.dim('GitHub: github.com/PCIRCLE-AI/claude-code-buddy/issues')}
`;
        console.log(boxen(message, {
            padding: 1,
            borderColor: 'red',
            borderStyle: 'round',
        }));
    }
}
export async function runSetupWizard() {
    const wizard = new SetupWizard();
    await wizard.run();
}
//# sourceMappingURL=setup-wizard.js.map