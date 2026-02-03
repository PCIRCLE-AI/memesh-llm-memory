import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import { ProgressIndicator } from '../ui/ProgressIndicator.js';
import boxen from 'boxen';
export class ConfigManager {
    static getConfigPath() {
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
    static getConfigPathDescription() {
        const platform = os.platform();
        if (platform === 'darwin') {
            return '~/Library/Application Support/Claude/claude_desktop_config.json';
        }
        else if (platform === 'win32') {
            return '%APPDATA%\\Claude\\claude_desktop_config.json';
        }
        else {
            return '~/.config/Claude/claude_desktop_config.json';
        }
    }
    static async readConfig() {
        const configPath = this.getConfigPath();
        try {
            if (!(await fs.pathExists(configPath))) {
                return null;
            }
            const content = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            logger.error('Failed to read config', { error });
            return null;
        }
    }
    static async writeConfig(config) {
        const configPath = this.getConfigPath();
        try {
            await fs.ensureDir(path.dirname(configPath));
            await fs.writeJSON(configPath, config, { spaces: 2 });
            return true;
        }
        catch (error) {
            logger.error('Failed to write config', { error });
            return false;
        }
    }
    static async validateConfig() {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
        };
        const configPath = this.getConfigPath();
        if (!(await fs.pathExists(configPath))) {
            result.valid = false;
            result.errors.push('Configuration file does not exist');
            return result;
        }
        let config;
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(content);
            result.config = config;
        }
        catch (error) {
            result.valid = false;
            result.errors.push(`Invalid JSON syntax: ${error instanceof Error ? error.message : String(error)}`);
            return result;
        }
        if (!config.mcpServers) {
            result.warnings.push('No MCP servers configured');
        }
        if (!config.mcpServers?.memesh) {
            result.valid = false;
            result.errors.push('MeMesh MCP server not configured');
            return result;
        }
        const memeshConfig = config.mcpServers.memesh;
        if (!memeshConfig.command) {
            result.errors.push('MeMesh server: missing "command" field');
            result.valid = false;
        }
        if (!memeshConfig.args || !Array.isArray(memeshConfig.args)) {
            result.errors.push('MeMesh server: missing or invalid "args" field');
            result.valid = false;
        }
        if (memeshConfig.args && memeshConfig.args.length > 0) {
            const executablePath = memeshConfig.args[0];
            if (!(await fs.pathExists(executablePath))) {
                result.warnings.push(`MeMesh executable not found: ${executablePath}`);
            }
        }
        return result;
    }
    static generateDefaultConfig() {
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
    static findMemeshPath() {
        const platform = os.platform();
        let globalNodeModules;
        if (platform === 'win32') {
            globalNodeModules = path.join(process.env.APPDATA || '', 'npm/node_modules');
        }
        else {
            globalNodeModules = '/usr/local/lib/node_modules';
        }
        const globalMemeshPath = path.join(globalNodeModules, '@pcircle/memesh/dist/mcp/server-bootstrap.js');
        return globalMemeshPath;
    }
    static highlightJSON(obj) {
        const json = JSON.stringify(obj, null, 2);
        return json
            .split('\n')
            .map((line) => {
            line = line.replace(/"([^"]+)":/g, (match, key) => {
                return `${chalk.cyan(`"${key}"`)}:`;
            });
            line = line.replace(/: "([^"]*)"/g, (match, value) => {
                return `: ${chalk.green(`"${value}"`)}`;
            });
            line = line.replace(/\b(true|false)\b/g, (match) => {
                return chalk.yellow(match);
            });
            line = line.replace(/\bnull\b/g, chalk.gray('null'));
            line = line.replace(/[{}[\]]/g, (match) => chalk.dim(match));
            return line;
        })
            .join('\n');
    }
    static async openInEditor() {
        const configPath = this.getConfigPath();
        if (!(await fs.pathExists(configPath))) {
            console.log(chalk.yellow('⚠️  Configuration file does not exist. Run "memesh setup" first.'));
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
    static getDefaultEditor() {
        const platform = os.platform();
        if (platform === 'darwin') {
            return 'open -e';
        }
        else if (platform === 'win32') {
            return 'notepad';
        }
        else {
            return 'nano';
        }
    }
    static async backupConfig() {
        const configPath = this.getConfigPath();
        if (!(await fs.pathExists(configPath))) {
            return null;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${configPath}.backup-${timestamp}`;
        try {
            await fs.copy(configPath, backupPath);
            return backupPath;
        }
        catch (error) {
            logger.error('Failed to backup config', { error });
            return null;
        }
    }
}
export async function showConfig() {
    const configPath = ConfigManager.getConfigPath();
    const pathDescription = ConfigManager.getConfigPathDescription();
    console.log(boxen(chalk.bold.cyan('⚙️  MeMesh Configuration'), {
        padding: 1,
        borderColor: 'cyan',
        borderStyle: 'round',
    }));
    console.log(chalk.bold('\n📍 Configuration File:'));
    console.log(chalk.dim(`   ${pathDescription}`));
    console.log(chalk.gray(`   ${configPath}\n`));
    if (!(await fs.pathExists(configPath))) {
        console.log(chalk.yellow('⚠️  Configuration file not found. Run "memesh setup" to configure.'));
        return;
    }
    const config = await ConfigManager.readConfig();
    if (!config) {
        console.log(chalk.red('❌ Failed to read configuration file'));
        return;
    }
    console.log(chalk.bold('📄 Configuration:\n'));
    console.log(ConfigManager.highlightJSON(config));
    if (config.mcpServers?.memesh) {
        const memeshConfig = config.mcpServers.memesh;
        console.log(chalk.bold('\n🔧 MeMesh Server:'));
        console.log(chalk.dim('   Command:   ') + chalk.cyan(memeshConfig.command));
        console.log(chalk.dim('   Script:    ') + chalk.cyan(memeshConfig.args.join(' ')));
        if (memeshConfig.args.length > 0) {
            const executablePath = memeshConfig.args[0];
            const exists = await fs.pathExists(executablePath);
            if (exists) {
                console.log(chalk.dim('   Status:    ') + chalk.green('✓ Installed'));
            }
            else {
                console.log(chalk.dim('   Status:    ') +
                    chalk.yellow('⚠ Executable not found'));
            }
        }
    }
    console.log();
}
export async function validateConfig() {
    const configPath = ConfigManager.getConfigPath();
    console.log(boxen(chalk.bold.cyan('🔍 Configuration Validation'), {
        padding: 1,
        borderColor: 'cyan',
        borderStyle: 'round',
    }));
    console.log(chalk.bold('\n📍 Configuration File:'));
    console.log(chalk.gray(`   ${configPath}\n`));
    const spinner = ProgressIndicator.simple('Validating configuration...');
    const result = await ConfigManager.validateConfig();
    spinner.stop();
    if (result.errors.length === 0) {
        console.log(chalk.green('\n✅ Configuration is valid!\n'));
    }
    else {
        console.log(chalk.red('\n❌ Configuration has errors:\n'));
        result.errors.forEach((error) => {
            console.log(chalk.red(`   • ${error}`));
        });
        console.log();
    }
    if (result.warnings.length > 0) {
        console.log(chalk.yellow('⚠️  Warnings:\n'));
        result.warnings.forEach((warning) => {
            console.log(chalk.yellow(`   • ${warning}`));
        });
        console.log();
    }
    if (result.config?.mcpServers?.memesh) {
        const memeshConfig = result.config.mcpServers.memesh;
        console.log(chalk.bold('🔧 MeMesh Server Configuration:'));
        console.log(chalk.dim('   Command:   ') + chalk.cyan(memeshConfig.command));
        console.log(chalk.dim('   Script:    ') + chalk.cyan(memeshConfig.args.join(' ')));
        console.log();
    }
    if (result.valid) {
        console.log(boxen(chalk.bold('✓ Next Steps:\n\n') +
            chalk.dim('1. Restart Claude Code to load MeMesh\n') +
            chalk.dim('2. Verify connection: type "buddy-help" in Claude Code\n') +
            chalk.dim('3. Test features: try "buddy-do" or "buddy-remember"'), {
            padding: 1,
            borderColor: 'green',
            borderStyle: 'round',
        }));
    }
    else {
        console.log(boxen(chalk.bold('🔧 Fix Configuration:\n\n') +
            chalk.dim('Run: ') +
            chalk.cyan('memesh setup') +
            chalk.dim(' to reconfigure\n') +
            chalk.dim('Or: ') +
            chalk.cyan('memesh config edit') +
            chalk.dim(' to edit manually'), {
            padding: 1,
            borderColor: 'red',
            borderStyle: 'round',
        }));
    }
    console.log();
}
export async function editConfig() {
    const configPath = ConfigManager.getConfigPath();
    console.log(boxen(chalk.bold.cyan('✏️  Edit Configuration'), {
        padding: 1,
        borderColor: 'cyan',
        borderStyle: 'round',
    }));
    console.log(chalk.bold('\n📍 Configuration File:'));
    console.log(chalk.gray(`   ${configPath}\n`));
    if (!(await fs.pathExists(configPath))) {
        console.log(chalk.yellow('⚠️  Configuration file does not exist. Run "memesh setup" first.\n'));
        return;
    }
    const backupPath = await ConfigManager.backupConfig();
    if (backupPath) {
        console.log(chalk.dim(`📦 Backup created: ${path.basename(backupPath)}\n`));
    }
    console.log(chalk.dim('Opening configuration in editor...\n'));
    const success = await ConfigManager.openInEditor();
    if (success) {
        console.log(chalk.green('\n✅ Configuration saved'));
        console.log(chalk.dim('\nValidating configuration...\n'));
        const result = await ConfigManager.validateConfig();
        if (result.valid) {
            console.log(chalk.green('✅ Configuration is valid'));
        }
        else {
            console.log(chalk.red('❌ Configuration has errors:'));
            result.errors.forEach((error) => {
                console.log(chalk.red(`   • ${error}`));
            });
            if (backupPath) {
                console.log(chalk.yellow(`\n⚠️  You can restore from backup: ${path.basename(backupPath)}`));
            }
        }
    }
    else {
        console.log(chalk.yellow('\n⚠️  Editor closed without saving'));
    }
    console.log();
}
export async function resetConfig() {
    const configPath = ConfigManager.getConfigPath();
    console.log(boxen(chalk.bold.red('🔄 Reset Configuration'), {
        padding: 1,
        borderColor: 'red',
        borderStyle: 'round',
    }));
    console.log(chalk.bold('\n📍 Configuration File:'));
    console.log(chalk.gray(`   ${configPath}\n`));
    const { confirmReset } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmReset',
            message: chalk.yellow('Are you sure you want to reset configuration to defaults?'),
            default: false,
        },
    ]);
    if (!confirmReset) {
        console.log(chalk.dim('\nReset cancelled.\n'));
        return;
    }
    const backupPath = await ConfigManager.backupConfig();
    if (backupPath) {
        console.log(chalk.green(`\n✅ Backup created: ${path.basename(backupPath)}`));
    }
    const spinner = ProgressIndicator.simple('Resetting configuration...');
    const defaultConfig = ConfigManager.generateDefaultConfig();
    const success = await ConfigManager.writeConfig(defaultConfig);
    spinner.stop();
    if (success) {
        console.log(chalk.green('\n✅ Configuration reset to defaults\n'));
        console.log(chalk.bold('📄 New Configuration:\n'));
        console.log(ConfigManager.highlightJSON(defaultConfig));
        console.log(boxen(chalk.bold('✓ Next Steps:\n\n') +
            chalk.dim('1. Restart Claude Code to apply changes\n') +
            chalk.dim('2. Verify: type "buddy-help" in Claude Code'), {
            padding: 1,
            borderColor: 'green',
            borderStyle: 'round',
            margin: { top: 1 },
        }));
    }
    else {
        console.log(chalk.red('\n❌ Failed to reset configuration'));
        if (backupPath) {
            console.log(chalk.yellow(`\n⚠️  You can restore from backup: ${path.basename(backupPath)}`));
        }
    }
    console.log();
}
//# sourceMappingURL=config.js.map