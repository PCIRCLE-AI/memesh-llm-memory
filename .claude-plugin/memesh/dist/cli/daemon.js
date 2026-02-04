import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { DaemonLockManager } from '../mcp/daemon/DaemonLockManager.js';
import { IpcTransport } from '../mcp/daemon/IpcTransport.js';
import { createShutdown, serializeMessage } from '../mcp/daemon/DaemonProtocol.js';
import { getDataDirectory } from '../utils/PathResolver.js';
import { logger } from '../utils/logger.js';
const execFileAsync = promisify(execFile);
const DEFAULT_LOG_LINES = 50;
const SHUTDOWN_TIMEOUT_MS = 10000;
const PID_CHECK_INTERVAL_MS = 100;
const CONNECTION_TIMEOUT_MS = 5000;
const STATUS_CHECK_TIMEOUT_MS = 2000;
const MIN_LOG_LINES = 1;
const MAX_LOG_LINES = 10000;
function formatError(error) {
    return {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    };
}
function isPathWithinDataDir(targetPath) {
    const dataDir = getDataDirectory();
    const normalizedTarget = path.resolve(targetPath);
    const normalizedDataDir = path.resolve(dataDir);
    return normalizedTarget.startsWith(normalizedDataDir + path.sep) ||
        normalizedTarget === normalizedDataDir;
}
function validateLogPath(logPath) {
    if (!isPathWithinDataDir(logPath)) {
        return { valid: false, error: 'Log path is outside the expected data directory' };
    }
    if (!fs.existsSync(logPath)) {
        return { valid: false, error: 'Log file does not exist' };
    }
    try {
        const stat = fs.statSync(logPath);
        if (!stat.isFile()) {
            return { valid: false, error: 'Log path is not a regular file' };
        }
        fs.accessSync(logPath, fs.constants.R_OK);
        return { valid: true };
    }
    catch (error) {
        if (error.code === 'EACCES') {
            return { valid: false, error: 'Permission denied reading log file' };
        }
        return { valid: false, error: `Cannot access log file: ${formatError(error).message}` };
    }
}
function parseAndValidateLines(linesOption) {
    const parsed = parseInt(linesOption, 10);
    if (isNaN(parsed)) {
        return null;
    }
    if (parsed < MIN_LOG_LINES || parsed > MAX_LOG_LINES) {
        return null;
    }
    return parsed;
}
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m`;
    if (minutes > 0)
        return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
async function waitForPidExit(pid, timeout) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (!DaemonLockManager.isPidAlive(pid)) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, PID_CHECK_INTERVAL_MS));
    }
    return false;
}
async function getRecentLogErrors(logPath, tailLines, errorLines) {
    return new Promise((resolve, reject) => {
        const tail1 = spawn('tail', ['-n', String(tailLines), logPath]);
        const grep = spawn('grep', ['-i', 'error']);
        const tail2 = spawn('tail', ['-n', String(errorLines)]);
        tail1.stdout.pipe(grep.stdin);
        grep.stdout.pipe(tail2.stdin);
        tail1.on('error', (err) => reject(err));
        grep.on('error', (err) => reject(err));
        tail2.on('error', (err) => reject(err));
        tail1.on('close', (code) => {
            if (code !== 0 && code !== null) {
                grep.stdin.end();
            }
        });
        grep.on('close', (code) => {
            tail2.stdin.end();
            if (code !== 0 && code !== 1 && code !== null) {
                reject(new Error(`grep exited with code ${code}`));
            }
        });
        let output = '';
        tail2.stdout.on('data', (data) => {
            output += data.toString();
        });
        tail2.on('close', (code) => {
            if (code === 0 || code === null) {
                resolve(output);
            }
            else {
                reject(Object.assign(new Error(`tail exited with code ${code}`), { code }));
            }
        });
    });
}
export function createDaemonCommand() {
    const daemon = new Command('daemon')
        .description('Manage MeMesh daemon process');
    daemon
        .command('status')
        .description('Show daemon status')
        .action(async () => {
        try {
            const lockInfo = await DaemonLockManager.readLock();
            const transport = new IpcTransport();
            console.log(chalk.bold('\n📊 MeMesh Daemon Status\n'));
            console.log('═'.repeat(50));
            if (!lockInfo) {
                console.log(chalk.yellow('Status: ') + chalk.red('Not Running'));
                console.log(chalk.dim('No daemon lock file found.'));
                console.log('═'.repeat(50));
                return;
            }
            const isAlive = DaemonLockManager.isPidAlive(lockInfo.pid);
            const isResponding = await transport.isRunning(STATUS_CHECK_TIMEOUT_MS);
            if (isAlive && isResponding) {
                console.log(chalk.yellow('Status: ') + chalk.green('Running ✓'));
            }
            else if (isAlive && !isResponding) {
                console.log(chalk.yellow('Status: ') + chalk.red('Not Responding ⚠'));
            }
            else {
                console.log(chalk.yellow('Status: ') + chalk.red('Stale (zombie lock)'));
            }
            console.log(chalk.yellow('PID: ') + lockInfo.pid);
            console.log(chalk.yellow('Version: ') + lockInfo.version);
            console.log(chalk.yellow('Started: ') + new Date(lockInfo.startTime).toLocaleString());
            console.log(chalk.yellow('Uptime: ') + formatUptime(Date.now() - lockInfo.startTime));
            console.log(chalk.yellow('Clients: ') + lockInfo.clientCount);
            console.log(chalk.yellow('Socket: ') + transport.getPath());
            console.log('═'.repeat(50));
        }
        catch (error) {
            logger.error('Daemon status failed', formatError(error));
            console.error(chalk.red('Failed to get daemon status:'), formatError(error).message);
            process.exit(1);
        }
    });
    daemon
        .command('stop')
        .description('Stop the daemon')
        .option('-f, --force', 'Force kill without graceful shutdown')
        .action(async (options) => {
        try {
            const lockInfo = await DaemonLockManager.readLock();
            if (!lockInfo) {
                console.log(chalk.yellow('Daemon is not running.'));
                return;
            }
            if (options.force) {
                console.log(chalk.yellow(`Force killing daemon (PID: ${lockInfo.pid})...`));
                try {
                    process.kill(lockInfo.pid, 'SIGKILL');
                    await DaemonLockManager.forceClearLock();
                    console.log(chalk.green('Daemon force killed.'));
                }
                catch (error) {
                    if (error.code === 'ESRCH') {
                        await DaemonLockManager.forceClearLock();
                        console.log(chalk.green('Daemon was not running, lock cleared.'));
                    }
                    else {
                        throw error;
                    }
                }
            }
            else {
                console.log(chalk.yellow('Requesting graceful shutdown...'));
                const transport = new IpcTransport();
                try {
                    const socket = await transport.connect({ timeout: CONNECTION_TIMEOUT_MS });
                    const shutdownMsg = createShutdown('user_requested', CONNECTION_TIMEOUT_MS);
                    socket.write(serializeMessage(shutdownMsg));
                    await new Promise((resolve, reject) => {
                        socket.once('error', reject);
                        socket.once('close', resolve);
                        socket.end(() => {
                        });
                    }).catch(() => {
                    });
                    const exited = await waitForPidExit(lockInfo.pid, SHUTDOWN_TIMEOUT_MS);
                    if (exited) {
                        console.log(chalk.green('Daemon stopped gracefully.'));
                    }
                    else {
                        console.log(chalk.yellow('Daemon did not stop within timeout.'));
                        console.log(chalk.dim('Use --force to force kill.'));
                    }
                }
                catch (error) {
                    console.log(chalk.red('Could not connect to daemon for graceful shutdown.'));
                    console.log(chalk.dim('Use --force to force kill.'));
                }
            }
        }
        catch (error) {
            logger.error('Daemon stop failed', formatError(error));
            console.error(chalk.red('Failed to stop daemon:'), formatError(error).message);
            process.exit(1);
        }
    });
    daemon
        .command('restart')
        .description('Restart the daemon')
        .action(async () => {
        try {
            console.log(chalk.yellow('Restarting daemon...'));
            const lockInfo = await DaemonLockManager.readLock();
            if (lockInfo) {
                const transport = new IpcTransport();
                try {
                    const socket = await transport.connect({ timeout: CONNECTION_TIMEOUT_MS });
                    const shutdownMsg = createShutdown('user_requested', CONNECTION_TIMEOUT_MS);
                    socket.write(serializeMessage(shutdownMsg));
                    socket.end();
                    await waitForPidExit(lockInfo.pid, SHUTDOWN_TIMEOUT_MS);
                    console.log(chalk.green('Old daemon stopped.'));
                }
                catch {
                    await DaemonLockManager.forceClearLock();
                }
            }
            console.log(chalk.cyan('\nNote: A new daemon will start automatically when'));
            console.log(chalk.cyan('Claude Code connects to MeMesh.\n'));
            console.log(chalk.green('Restart preparation complete.'));
        }
        catch (error) {
            logger.error('Daemon restart failed', formatError(error));
            console.error(chalk.red('Failed to restart daemon:'), formatError(error).message);
            process.exit(1);
        }
    });
    daemon
        .command('logs')
        .description('View daemon logs')
        .option('-n, --lines <number>', `Number of lines to show (${MIN_LOG_LINES}-${MAX_LOG_LINES})`, String(DEFAULT_LOG_LINES))
        .option('-f, --follow', 'Follow log output')
        .action(async (options) => {
        try {
            const lines = parseAndValidateLines(options.lines);
            if (lines === null) {
                console.log(chalk.red(`Invalid --lines value: "${options.lines}"`));
                console.log(chalk.dim(`Must be a positive integer between ${MIN_LOG_LINES} and ${MAX_LOG_LINES}.`));
                process.exit(1);
            }
            const logPath = path.join(getDataDirectory(), 'logs', 'memesh.log');
            const validation = validateLogPath(logPath);
            if (!validation.valid) {
                if (validation.error === 'Log file does not exist') {
                    console.log(chalk.yellow('No daemon logs found.'));
                    console.log(chalk.dim(`Expected location: ${logPath}`));
                }
                else {
                    console.log(chalk.red(validation.error || 'Invalid log path'));
                }
                return;
            }
            const linesArg = String(lines);
            if (options.follow) {
                console.log(chalk.dim(`Following ${logPath} (Ctrl+C to stop)\n`));
                const tail = spawn('tail', ['-f', '-n', linesArg, logPath], {
                    stdio: 'inherit',
                });
                process.on('SIGINT', () => {
                    tail.kill();
                    process.exit(0);
                });
                await new Promise(() => { });
            }
            else {
                try {
                    const { stdout } = await execFileAsync('tail', ['-n', linesArg, logPath]);
                    if (stdout.trim() === '') {
                        console.log(chalk.yellow('Log file is empty.'));
                    }
                    else {
                        console.log(stdout);
                    }
                }
                catch (error) {
                    const errInfo = formatError(error);
                    if (errInfo.message.includes('EACCES') || errInfo.message.includes('permission')) {
                        console.log(chalk.red('Permission denied reading log file.'));
                    }
                    else {
                        console.log(chalk.yellow('No logs available.'));
                    }
                }
            }
        }
        catch (error) {
            logger.error('Daemon logs failed', formatError(error));
            console.error(chalk.red('Failed to view logs:'), formatError(error).message);
            process.exit(1);
        }
    });
    daemon
        .command('info')
        .description('Show detailed diagnostic information')
        .action(async () => {
        try {
            const lockInfo = await DaemonLockManager.readLock();
            const transport = new IpcTransport();
            const dataDir = getDataDirectory();
            console.log(chalk.bold('\n🔍 MeMesh Daemon Diagnostics\n'));
            console.log('═'.repeat(60));
            console.log(chalk.cyan('\n📌 System Information'));
            console.log(chalk.yellow('  Platform: ') + process.platform);
            console.log(chalk.yellow('  Node.js: ') + process.version);
            console.log(chalk.yellow('  Data Dir: ') + dataDir);
            console.log(chalk.yellow('  IPC Path: ') + transport.getPath());
            console.log(chalk.yellow('  IPC Type: ') + (transport.isWindows() ? 'Named Pipe' : 'Unix Socket'));
            console.log(chalk.cyan('\n📌 Lock File'));
            const lockPath = path.join(dataDir, 'daemon.lock');
            if (fs.existsSync(lockPath)) {
                console.log(chalk.yellow('  Path: ') + lockPath);
                console.log(chalk.yellow('  Content: '));
                console.log(chalk.dim('    ' + JSON.stringify(lockInfo, null, 2).replace(/\n/g, '\n    ')));
            }
            else {
                console.log(chalk.dim('  No lock file found'));
            }
            console.log(chalk.cyan('\n📌 Connection Test'));
            const latency = await transport.ping();
            if (latency !== null) {
                console.log(chalk.green('  ✓ Connection successful') + chalk.dim(` (${latency}ms)`));
            }
            else {
                console.log(chalk.red('  ✗ Connection failed'));
            }
            if (lockInfo && DaemonLockManager.isPidAlive(lockInfo.pid)) {
                console.log(chalk.cyan('\n📌 Resource Usage'));
                if (process.platform !== 'win32') {
                    try {
                        const { stdout } = await execFileAsync('ps', [
                            '-p', String(lockInfo.pid),
                            '-o', '%cpu,%mem,rss,vsz',
                        ]);
                        console.log(chalk.dim(stdout));
                    }
                    catch {
                        console.log(chalk.dim('  Unable to get resource usage'));
                    }
                }
                else {
                    console.log(chalk.dim('  Resource usage not available on Windows'));
                }
            }
            console.log(chalk.cyan('\n📌 Recent Errors (last 5)'));
            const logPath = path.join(dataDir, 'logs', 'memesh.log');
            if (!isPathWithinDataDir(logPath)) {
                console.log(chalk.red('  Invalid log path'));
            }
            else if (fs.existsSync(logPath)) {
                try {
                    const recentErrors = await getRecentLogErrors(logPath, 1000, 5);
                    if (recentErrors.trim()) {
                        console.log(chalk.dim(recentErrors.trim()));
                    }
                    else {
                        console.log(chalk.green('  No recent errors'));
                    }
                }
                catch (error) {
                    if (error.code === 1 && !error.stderr) {
                        console.log(chalk.green('  No recent errors'));
                    }
                    else {
                        console.log(chalk.green('  No recent errors'));
                    }
                }
            }
            else {
                console.log(chalk.dim('  No logs available'));
            }
            console.log('\n' + '═'.repeat(60));
        }
        catch (error) {
            logger.error('Daemon info failed', formatError(error));
            console.error(chalk.red('Failed to get diagnostics:'), formatError(error).message);
            process.exit(1);
        }
    });
    return daemon;
}
//# sourceMappingURL=daemon.js.map