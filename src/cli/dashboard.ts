/**
 * MeMesh Dashboard - Real-time Session Health Monitoring
 *
 * Provides a beautiful terminal dashboard with:
 * - MCP server status
 * - Memory usage statistics
 * - Recent command history
 * - Error log summary
 * - Real-time updates
 * - Keyboard controls
 */

import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { HealthChecker, type SystemHealth, type ComponentHealth } from '../core/HealthCheck.js';
import { UnifiedMemoryStore } from '../memory/UnifiedMemoryStore.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { createInterface } from 'readline';

// ============================================================================
// Types
// ============================================================================

interface DashboardMetrics {
  systemHealth: SystemHealth;
  memoryStats: {
    totalEntities: number;
    recentActivities: string[];
    storageSize: string;
  };
  errorSummary: {
    recent: string[];
    count: number;
  };
  uptime: number;
}

// ============================================================================
// Constants
// ============================================================================

const REFRESH_INTERVAL = 5000; // 5 seconds
const MAX_RECENT_ACTIVITIES = 10;
const MAX_ERROR_LOGS = 5;
const LOG_DIR = path.join(process.cwd(), 'logs');

// ============================================================================
// Dashboard Metrics Collection
// ============================================================================

/**
 * Collect all dashboard metrics
 */
async function collectMetrics(): Promise<DashboardMetrics> {
  const startTime = Date.now();

  // Collect system health
  const healthChecker = new HealthChecker({ timeout: 3000 });
  const systemHealth = await healthChecker.checkAll();

  // Collect memory statistics
  const memoryStats = await collectMemoryStats();

  // Collect error logs
  const errorSummary = collectErrorLogs();

  // Calculate uptime
  const uptime = Math.floor(process.uptime());

  logger.debug('[Dashboard] Metrics collected', {
    duration: Date.now() - startTime,
    memoryStats,
    errorCount: errorSummary.count,
  });

  return {
    systemHealth,
    memoryStats,
    errorSummary,
    uptime,
  };
}

/**
 * Collect memory statistics from UnifiedMemoryStore
 */
async function collectMemoryStats(): Promise<DashboardMetrics['memoryStats']> {
  try {
    const store = await UnifiedMemoryStore.create();

    // Search for all memories (limit to recent)
    const recentMemories = await store.search('', { limit: MAX_RECENT_ACTIVITIES });

    const recentActivities = recentMemories.map(
      (m) => `[${m.type}] ${m.content.substring(0, 50)}${m.content.length > 50 ? '...' : ''}`
    );

    // Get database size
    const dbPath = path.join(process.cwd(), 'memesh.db');
    let storageSize = 'N/A';
    if (existsSync(dbPath)) {
      const stats = statSync(dbPath);
      const sizeKB = Math.round(stats.size / 1024);
      storageSize = sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(2)} MB`;
    }

    store.close();

    return {
      totalEntities: recentMemories.length,
      recentActivities,
      storageSize,
    };
  } catch (error) {
    logger.error('[Dashboard] Failed to collect memory stats', { error });
    return {
      totalEntities: 0,
      recentActivities: ['Error loading memory data'],
      storageSize: 'N/A',
    };
  }
}

/**
 * Collect recent error logs
 */
function collectErrorLogs(): DashboardMetrics['errorSummary'] {
  try {
    const errorLogPath = path.join(LOG_DIR, 'error.log');

    if (!existsSync(errorLogPath)) {
      return { recent: [], count: 0 };
    }

    const content = readFileSync(errorLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter((l) => l.trim());

    // Get last N error lines
    const recentErrors = lines.slice(-MAX_ERROR_LOGS).map((line) => {
      try {
        const parsed = JSON.parse(line);
        const timestamp = new Date(parsed.timestamp).toLocaleTimeString();
        return `[${timestamp}] ${parsed.message}`;
      } catch {
        return line.substring(0, 80);
      }
    });

    return {
      recent: recentErrors,
      count: lines.length,
    };
  } catch (error) {
    logger.warn('[Dashboard] Failed to read error logs', { error });
    return { recent: [], count: 0 };
  }
}

// ============================================================================
// Dashboard Rendering
// ============================================================================

/**
 * Render the dashboard UI
 */
function renderDashboard(metrics: DashboardMetrics): string {
  const output: string[] = [];

  // Clear screen
  output.push('\x1B[2J\x1B[0f');

  // Header
  output.push(
    boxen(chalk.bold.cyan('📊 MeMesh Dashboard - Real-time Session Health'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );

  // System Health Section
  output.push(renderSystemHealth(metrics.systemHealth));

  // Memory Statistics Section
  output.push(renderMemoryStats(metrics.memoryStats));

  // Recent Activities Section
  output.push(renderRecentActivities(metrics.memoryStats.recentActivities));

  // Error Summary Section
  if (metrics.errorSummary.count > 0) {
    output.push(renderErrorSummary(metrics.errorSummary));
  }

  // Footer with controls and uptime
  output.push(renderFooter(metrics.uptime));

  return output.join('\n');
}

/**
 * Render system health status
 */
function renderSystemHealth(health: SystemHealth): string {
  const table = new Table({
    head: [chalk.bold('Component'), chalk.bold('Status'), chalk.bold('Message'), chalk.bold('Duration')],
    colWidths: [20, 15, 50, 15],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  for (const component of health.components) {
    const statusIcon = getStatusIcon(component.status);
    const statusText = getStatusText(component.status);

    table.push([
      component.name,
      statusIcon + ' ' + statusText,
      component.message.substring(0, 47) + (component.message.length > 47 ? '...' : ''),
      `${component.durationMs}ms`,
    ]);
  }

  const overallStatus = getOverallStatusBadge(health);

  return (
    '\n' +
    chalk.bold('🏥 System Health') +
    ' ' +
    overallStatus +
    '\n' +
    table.toString() +
    '\n' +
    chalk.dim(`Total check duration: ${health.totalDurationMs}ms`)
  );
}

/**
 * Render memory statistics
 */
function renderMemoryStats(stats: DashboardMetrics['memoryStats']): string {
  const table = new Table({
    head: [chalk.bold('Metric'), chalk.bold('Value')],
    colWidths: [30, 50],
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
  });

  table.push(['Total Memory Entries', String(stats.totalEntities)]);
  table.push(['Database Size', stats.storageSize]);

  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  const memoryBar = renderMemoryBar(usagePercent);
  table.push(['Process Memory', `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%) ${memoryBar}`]);

  return '\n' + chalk.bold('🧠 Memory Statistics') + '\n' + table.toString();
}

/**
 * Render memory usage bar
 */
function renderMemoryBar(percent: number): string {
  const barLength = 20;
  const filled = Math.round((percent / 100) * barLength);
  const empty = barLength - filled;

  let color = chalk.green;
  if (percent > 90) color = chalk.red;
  else if (percent > 75) color = chalk.yellow;

  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

/**
 * Render recent activities
 */
function renderRecentActivities(activities: string[]): string {
  if (activities.length === 0) {
    return '\n' + chalk.bold('📝 Recent Activities') + '\n' + chalk.dim('  No recent activities');
  }

  const lines = activities.map((activity, index) => {
    return chalk.dim(`  ${index + 1}.`) + ' ' + activity;
  });

  return '\n' + chalk.bold('📝 Recent Activities') + ' ' + chalk.dim(`(Last ${activities.length})`) + '\n' + lines.join('\n');
}

/**
 * Render error summary
 */
function renderErrorSummary(summary: DashboardMetrics['errorSummary']): string {
  if (summary.recent.length === 0) {
    return '';
  }

  const lines = summary.recent.map((error) => {
    return chalk.red('  ✗ ') + chalk.dim(error);
  });

  return (
    '\n' +
    chalk.bold.red('⚠️  Error Summary') +
    ' ' +
    chalk.dim(`(${summary.count} total errors)`) +
    '\n' +
    lines.join('\n')
  );
}

/**
 * Render footer with controls and uptime
 */
function renderFooter(uptime: number): string {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

  return (
    '\n' +
    boxen(
      chalk.dim('Press ') +
        chalk.bold.cyan('r') +
        chalk.dim(' to refresh | ') +
        chalk.bold.cyan('q') +
        chalk.dim(' to quit') +
        '\n' +
        chalk.dim('Auto-refresh every 5 seconds | Uptime: ') +
        chalk.cyan(uptimeStr),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'gray',
        dimBorder: true,
      }
    )
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status icon
 */
function getStatusIcon(status: ComponentHealth['status']): string {
  switch (status) {
    case 'healthy':
      return chalk.green('✓');
    case 'degraded':
      return chalk.yellow('⚠');
    case 'unhealthy':
      return chalk.red('✗');
    case 'unknown':
      return chalk.gray('?');
  }
}

/**
 * Get status text with color
 */
function getStatusText(status: ComponentHealth['status']): string {
  switch (status) {
    case 'healthy':
      return chalk.green('Healthy');
    case 'degraded':
      return chalk.yellow('Degraded');
    case 'unhealthy':
      return chalk.red('Unhealthy');
    case 'unknown':
      return chalk.gray('Unknown');
  }
}

/**
 * Get overall status badge
 */
function getOverallStatusBadge(health: SystemHealth): string {
  const icon = getStatusIcon(health.status);
  const text = health.summary;

  let badge = '';
  switch (health.status) {
    case 'healthy':
      badge = chalk.green(`${icon} ${text}`);
      break;
    case 'degraded':
      badge = chalk.yellow(`${icon} ${text}`);
      break;
    case 'unhealthy':
      badge = chalk.red(`${icon} ${text}`);
      break;
    default:
      badge = chalk.gray(`${icon} ${text}`);
  }

  return badge;
}

// ============================================================================
// Dashboard Main Loop
// ============================================================================

/**
 * Run the interactive dashboard
 */
export async function runDashboard(): Promise<void> {
  console.log(chalk.cyan('\n📊 Initializing MeMesh Dashboard...\n'));

  let isRunning = true;
  let refreshTimer: NodeJS.Timeout | null = null;

  // Setup keyboard input
  if (process.stdin.isTTY) {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Enable raw mode for single-key input
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('data', (key: Buffer) => {
      const char = key.toString();

      if (char === 'q' || char === '\u0003') {
        // 'q' or Ctrl+C
        isRunning = false;
        if (refreshTimer) clearTimeout(refreshTimer);
        process.stdin.setRawMode(false);
        readline.close();
        console.log(chalk.yellow('\n👋 Dashboard closed.\n'));
        process.exit(0);
      } else if (char === 'r') {
        // Manual refresh
        refresh();
      }
    });
  }

  // Refresh function
  async function refresh(): Promise<void> {
    if (!isRunning) return;

    try {
      const metrics = await collectMetrics();
      const display = renderDashboard(metrics);
      console.log(display);

      // Schedule next refresh
      if (isRunning) {
        refreshTimer = setTimeout(refresh, REFRESH_INTERVAL);
      }
    } catch (error) {
      logger.error('[Dashboard] Refresh failed', { error });
      console.error(chalk.red('\n❌ Failed to refresh dashboard:'), error);

      if (isRunning) {
        refreshTimer = setTimeout(refresh, REFRESH_INTERVAL);
      }
    }
  }

  // Initial render
  await refresh();
}
