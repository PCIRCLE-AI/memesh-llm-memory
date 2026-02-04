/**
 * Daemon CLI Commands
 *
 * Commands for managing the MeMesh daemon:
 * - memesh daemon status    Show daemon status
 * - memesh daemon stop      Stop daemon (graceful)
 * - memesh daemon stop -f   Force stop daemon
 * - memesh daemon restart   Restart daemon
 * - memesh daemon logs      View daemon logs
 * - memesh daemon info      Detailed diagnostics
 */

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

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════
const DEFAULT_LOG_LINES = 50;
const SHUTDOWN_TIMEOUT_MS = 10000;
const PID_CHECK_INTERVAL_MS = 100;
const CONNECTION_TIMEOUT_MS = 5000;
const STATUS_CHECK_TIMEOUT_MS = 2000;
const MIN_LOG_LINES = 1;
const MAX_LOG_LINES = 10000;

/**
 * Format error for structured logging
 */
function formatError(error: unknown): { message: string; stack?: string } {
  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}

/**
 * Validate that a path is within the expected data directory (security check)
 * Prevents path traversal attacks
 * @returns true if path is within the expected directory
 */
function isPathWithinDataDir(targetPath: string): boolean {
  const dataDir = getDataDirectory();
  const normalizedTarget = path.resolve(targetPath);
  const normalizedDataDir = path.resolve(dataDir);

  // Ensure the target path starts with the data directory
  return normalizedTarget.startsWith(normalizedDataDir + path.sep) ||
         normalizedTarget === normalizedDataDir;
}

/**
 * Validate that a path exists and is a regular file
 * @returns true if valid, false otherwise
 */
function validateLogPath(logPath: string): { valid: boolean; error?: string } {
  // Security check: ensure path is within data directory
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

    // Check read permission by attempting to open
    fs.accessSync(logPath, fs.constants.R_OK);

    return { valid: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      return { valid: false, error: 'Permission denied reading log file' };
    }
    return { valid: false, error: `Cannot access log file: ${formatError(error).message}` };
  }
}

/**
 * Parse and validate the lines option
 * @returns validated number or null if invalid
 */
function parseAndValidateLines(linesOption: string): number | null {
  const parsed = parseInt(linesOption, 10);

  if (isNaN(parsed)) {
    return null;
  }

  if (parsed < MIN_LOG_LINES || parsed > MAX_LOG_LINES) {
    return null;
  }

  return parsed;
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Wait for a process to exit
 */
async function waitForPidExit(pid: number, timeout: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!DaemonLockManager.isPidAlive(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, PID_CHECK_INTERVAL_MS));
  }

  return false;
}

/**
 * Get recent error lines from log file using piped processes
 *
 * SECURITY: Uses separate spawn processes with pipes instead of shell command
 * interpolation to prevent shell injection attacks.
 *
 * @param logPath Path to the log file (must be validated before calling)
 * @param tailLines Number of lines to read from end of file
 * @param errorLines Number of error lines to return
 * @returns String containing recent error lines
 */
async function getRecentLogErrors(
  logPath: string,
  tailLines: number,
  errorLines: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Spawn tail process - reads last N lines from file
    // Arguments are passed as array, no shell interpolation
    const tail1 = spawn('tail', ['-n', String(tailLines), logPath]);

    // Spawn grep process - filters for error lines
    const grep = spawn('grep', ['-i', 'error']);

    // Spawn final tail process - limits to last N errors
    const tail2 = spawn('tail', ['-n', String(errorLines)]);

    // Pipe: tail1 -> grep -> tail2
    tail1.stdout.pipe(grep.stdin);
    grep.stdout.pipe(tail2.stdin);

    // Handle errors from any process in the pipeline
    tail1.on('error', (err) => reject(err));
    grep.on('error', (err) => reject(err));
    tail2.on('error', (err) => reject(err));

    // Handle tail1 close - propagate to grep
    tail1.on('close', (code) => {
      if (code !== 0 && code !== null) {
        // tail error (e.g., file not found)
        grep.stdin.end();
      }
    });

    // Handle grep close - propagate to tail2
    grep.on('close', (code) => {
      tail2.stdin.end();
      // grep exit code 1 means no matches (not an error)
      if (code !== 0 && code !== 1 && code !== null) {
        reject(new Error(`grep exited with code ${code}`));
      }
    });

    // Collect output from final tail
    let output = '';
    tail2.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    // Resolve when final process completes
    tail2.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve(output);
      } else {
        reject(Object.assign(new Error(`tail exited with code ${code}`), { code }));
      }
    });
  });
}

/**
 * Create daemon command group
 */
export function createDaemonCommand(): Command {
  const daemon = new Command('daemon')
    .description('Manage MeMesh daemon process');

  // ═══════════════════════════════════════════════════════════
  // daemon status
  // ═══════════════════════════════════════════════════════════
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

        // Check if PID is alive
        const isAlive = DaemonLockManager.isPidAlive(lockInfo.pid);

        // Check if socket is responding
        const isResponding = await transport.isRunning(STATUS_CHECK_TIMEOUT_MS);

        if (isAlive && isResponding) {
          console.log(chalk.yellow('Status: ') + chalk.green('Running ✓'));
        } else if (isAlive && !isResponding) {
          console.log(chalk.yellow('Status: ') + chalk.red('Not Responding ⚠'));
        } else {
          console.log(chalk.yellow('Status: ') + chalk.red('Stale (zombie lock)'));
        }

        console.log(chalk.yellow('PID: ') + lockInfo.pid);
        console.log(chalk.yellow('Version: ') + lockInfo.version);
        console.log(chalk.yellow('Started: ') + new Date(lockInfo.startTime).toLocaleString());
        console.log(chalk.yellow('Uptime: ') + formatUptime(Date.now() - lockInfo.startTime));
        console.log(chalk.yellow('Clients: ') + lockInfo.clientCount);
        console.log(chalk.yellow('Socket: ') + transport.getPath());
        console.log('═'.repeat(50));
      } catch (error) {
        logger.error('Daemon status failed', formatError(error));
        console.error(chalk.red('Failed to get daemon status:'), formatError(error).message);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════
  // daemon stop
  // ═══════════════════════════════════════════════════════════
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
          // Force kill
          console.log(chalk.yellow(`Force killing daemon (PID: ${lockInfo.pid})...`));

          try {
            process.kill(lockInfo.pid, 'SIGKILL');
            await DaemonLockManager.forceClearLock();
            console.log(chalk.green('Daemon force killed.'));
          } catch (error: any) {
            if (error.code === 'ESRCH') {
              // Process already dead
              await DaemonLockManager.forceClearLock();
              console.log(chalk.green('Daemon was not running, lock cleared.'));
            } else {
              throw error;
            }
          }
        } else {
          // Graceful shutdown
          console.log(chalk.yellow('Requesting graceful shutdown...'));

          const transport = new IpcTransport();

          try {
            const socket = await transport.connect({ timeout: CONNECTION_TIMEOUT_MS });

            // Send shutdown message
            const shutdownMsg = createShutdown('user_requested', CONNECTION_TIMEOUT_MS);
            socket.write(serializeMessage(shutdownMsg));

            // Wait for socket to drain before ending
            await new Promise<void>((resolve, reject) => {
              socket.once('error', reject);
              socket.once('close', resolve);
              // Use end() which waits for data to be flushed
              socket.end(() => {
                // Data flushed, socket will close
              });
            }).catch(() => {
              // Ignore socket errors during shutdown - daemon may close first
            });

            // Wait for shutdown
            const exited = await waitForPidExit(lockInfo.pid, SHUTDOWN_TIMEOUT_MS);

            if (exited) {
              console.log(chalk.green('Daemon stopped gracefully.'));
            } else {
              console.log(chalk.yellow('Daemon did not stop within timeout.'));
              console.log(chalk.dim('Use --force to force kill.'));
            }
          } catch (error) {
            console.log(chalk.red('Could not connect to daemon for graceful shutdown.'));
            console.log(chalk.dim('Use --force to force kill.'));
          }
        }
      } catch (error) {
        logger.error('Daemon stop failed', formatError(error));
        console.error(chalk.red('Failed to stop daemon:'), formatError(error).message);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════
  // daemon restart
  // ═══════════════════════════════════════════════════════════
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

            // Wait for old daemon to exit
            await waitForPidExit(lockInfo.pid, SHUTDOWN_TIMEOUT_MS);
            console.log(chalk.green('Old daemon stopped.'));
          } catch {
            // Ignore connection errors - daemon might already be dead
            await DaemonLockManager.forceClearLock();
          }
        }

        console.log(chalk.cyan('\nNote: A new daemon will start automatically when'));
        console.log(chalk.cyan('Claude Code connects to MeMesh.\n'));
        console.log(chalk.green('Restart preparation complete.'));
      } catch (error) {
        logger.error('Daemon restart failed', formatError(error));
        console.error(chalk.red('Failed to restart daemon:'), formatError(error).message);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════
  // daemon logs
  // ═══════════════════════════════════════════════════════════
  daemon
    .command('logs')
    .description('View daemon logs')
    .option('-n, --lines <number>', `Number of lines to show (${MIN_LOG_LINES}-${MAX_LOG_LINES})`, String(DEFAULT_LOG_LINES))
    .option('-f, --follow', 'Follow log output')
    .action(async (options) => {
      try {
        // Validate lines option
        const lines = parseAndValidateLines(options.lines);
        if (lines === null) {
          console.log(chalk.red(`Invalid --lines value: "${options.lines}"`));
          console.log(chalk.dim(`Must be a positive integer between ${MIN_LOG_LINES} and ${MAX_LOG_LINES}.`));
          process.exit(1);
        }

        const logPath = path.join(getDataDirectory(), 'logs', 'memesh.log');

        // Validate log path exists and is accessible
        const validation = validateLogPath(logPath);
        if (!validation.valid) {
          if (validation.error === 'Log file does not exist') {
            console.log(chalk.yellow('No daemon logs found.'));
            console.log(chalk.dim(`Expected location: ${logPath}`));
          } else {
            console.log(chalk.red(validation.error || 'Invalid log path'));
          }
          return;
        }

        // Convert lines to string for command args
        const linesArg = String(lines);

        if (options.follow) {
          // Follow mode using tail -f
          console.log(chalk.dim(`Following ${logPath} (Ctrl+C to stop)\n`));

          const tail = spawn('tail', ['-f', '-n', linesArg, logPath], {
            stdio: 'inherit',
          });

          process.on('SIGINT', () => {
            tail.kill();
            process.exit(0);
          });

          await new Promise(() => {}); // Wait forever
        } else {
          // Show last N lines using execFile (safer than exec)
          try {
            const { stdout } = await execFileAsync('tail', ['-n', linesArg, logPath]);
            if (stdout.trim() === '') {
              console.log(chalk.yellow('Log file is empty.'));
            } else {
              console.log(stdout);
            }
          } catch (error) {
            const errInfo = formatError(error);
            if (errInfo.message.includes('EACCES') || errInfo.message.includes('permission')) {
              console.log(chalk.red('Permission denied reading log file.'));
            } else {
              console.log(chalk.yellow('No logs available.'));
            }
          }
        }
      } catch (error) {
        logger.error('Daemon logs failed', formatError(error));
        console.error(chalk.red('Failed to view logs:'), formatError(error).message);
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════
  // daemon info
  // ═══════════════════════════════════════════════════════════
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

        // System information
        console.log(chalk.cyan('\n📌 System Information'));
        console.log(chalk.yellow('  Platform: ') + process.platform);
        console.log(chalk.yellow('  Node.js: ') + process.version);
        console.log(chalk.yellow('  Data Dir: ') + dataDir);
        console.log(chalk.yellow('  IPC Path: ') + transport.getPath());
        console.log(chalk.yellow('  IPC Type: ') + (transport.isWindows() ? 'Named Pipe' : 'Unix Socket'));

        // Lock file info
        console.log(chalk.cyan('\n📌 Lock File'));
        const lockPath = path.join(dataDir, 'daemon.lock');

        if (fs.existsSync(lockPath)) {
          console.log(chalk.yellow('  Path: ') + lockPath);
          console.log(chalk.yellow('  Content: '));
          console.log(chalk.dim('    ' + JSON.stringify(lockInfo, null, 2).replace(/\n/g, '\n    ')));
        } else {
          console.log(chalk.dim('  No lock file found'));
        }

        // Connection test
        console.log(chalk.cyan('\n📌 Connection Test'));
        const latency = await transport.ping();

        if (latency !== null) {
          console.log(chalk.green('  ✓ Connection successful') + chalk.dim(` (${latency}ms)`));
        } else {
          console.log(chalk.red('  ✗ Connection failed'));
        }

        // Resource usage (Unix only)
        if (lockInfo && DaemonLockManager.isPidAlive(lockInfo.pid)) {
          console.log(chalk.cyan('\n📌 Resource Usage'));

          if (process.platform !== 'win32') {
            try {
              const { stdout } = await execFileAsync('ps', [
                '-p', String(lockInfo.pid),
                '-o', '%cpu,%mem,rss,vsz',
              ]);
              console.log(chalk.dim(stdout));
            } catch {
              console.log(chalk.dim('  Unable to get resource usage'));
            }
          } else {
            console.log(chalk.dim('  Resource usage not available on Windows'));
          }
        }

        // Recent errors - use streaming with piped processes for efficiency
        // SECURITY FIX: Avoid shell interpolation by using separate spawn processes with pipes
        console.log(chalk.cyan('\n📌 Recent Errors (last 5)'));
        const logPath = path.join(dataDir, 'logs', 'memesh.log');

        // Validate log path is within data directory (security check)
        if (!isPathWithinDataDir(logPath)) {
          console.log(chalk.red('  Invalid log path'));
        } else if (fs.existsSync(logPath)) {
          try {
            // SECURITY FIX: Use piped spawn processes instead of sh -c with string interpolation
            // This prevents shell injection even if logPath somehow bypasses validation
            const recentErrors = await getRecentLogErrors(logPath, 1000, 5);

            if (recentErrors.trim()) {
              console.log(chalk.dim(recentErrors.trim()));
            } else {
              console.log(chalk.green('  No recent errors'));
            }
          } catch (error: any) {
            // grep returns exit code 1 when no matches found - this is not an error
            if (error.code === 1 && !error.stderr) {
              console.log(chalk.green('  No recent errors'));
            } else {
              console.log(chalk.green('  No recent errors'));
            }
          }
        } else {
          console.log(chalk.dim('  No logs available'));
        }

        console.log('\n' + '═'.repeat(60));
      } catch (error) {
        logger.error('Daemon info failed', formatError(error));
        console.error(chalk.red('Failed to get diagnostics:'), formatError(error).message);
        process.exit(1);
      }
    });

  return daemon;
}
