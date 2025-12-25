# Smart Agents UI Implementation Guide

**Complete guide for implementing the Smart Agents v2.0 visual design system**

---

## 1. Overview

This guide provides step-by-step instructions for implementing the elegant, lightweight terminal UI and web dashboard for Smart Agents v2.0.

**Implementation Timeline**:
- Phase 1 (Week 1): Core terminal UI components
- Phase 2 (Week 2): Interactive dashboard
- Phase 3 (Week 3): Web UI enhancements
- Phase 4 (Week 4): Polish and optimization

---

## 2. Dependencies Installation

### 2.1 Terminal UI Libraries

```bash
npm install --save \
  chalk@^5.0.0 \
  ora@^6.0.0 \
  cli-progress@^3.12.0 \
  boxen@^7.0.0 \
  cli-table3@^0.6.0 \
  figures@^5.0.0 \
  gradient-string@^2.0.0 \
  inquirer@^9.0.0 \
  blessed@^0.1.81 \
  blessed-contrib@^4.11.0
```

### 2.2 Type Definitions

```bash
npm install --save-dev \
  @types/cli-progress@^3.11.0 \
  @types/inquirer@^9.0.0 \
  @types/blessed@^0.1.0
```

---

## 3. Core UI Components

### 3.1 Color Utilities (`src/ui/colors.ts`)

```typescript
import chalk from 'chalk';
import gradient from 'gradient-string';

// Brand Colors
export const colors = {
  // Primary Brand
  primary: chalk.hex('#667eea'),
  accent: chalk.hex('#764ba2'),

  // Status Colors
  success: chalk.hex('#10b981'),
  warning: chalk.hex('#f59e0b'),
  error: chalk.hex('#ef4444'),
  info: chalk.hex('#3b82f6'),

  // Neutral Colors
  text: {
    primary: chalk.hex('#e5e5e5'),
    secondary: chalk.hex('#9ca3af'),
    muted: chalk.hex('#6b7280'),
  },

  // Backgrounds
  bg: chalk.hex('#0f0f23'),
  surface: chalk.hex('#1a1a2e'),
  border: chalk.hex('#2d2d44'),
} as const;

// Brand Gradient
export const brandGradient = gradient(['#667eea', '#764ba2']);

// Status Indicators
export const statusIcon = {
  success: colors.success('✓'),
  error: colors.error('✖'),
  warning: colors.warning('⚠'),
  info: colors.info('ℹ'),
  running: colors.info('●'),
  idle: chalk.white('○'),
} as const;

// Utility Functions
export const bold = chalk.bold;
export const dim = chalk.dim;
export const italic = chalk.italic;
export const underline = chalk.underline;
```

### 3.2 Progress Bar Component (`src/ui/components/ProgressBar.ts`)

```typescript
import { SingleBar, Presets } from 'cli-progress';
import { colors } from '../colors.js';

export class ProgressBar {
  private bar: SingleBar;

  constructor(total: number, label: string = 'Progress') {
    this.bar = new SingleBar({
      format: `${colors.primary('{bar}')} {percentage}% | ${label}: {task}`,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      barsize: 40,
      stream: process.stdout,
      noTTYOutput: false,
    });

    this.bar.start(total, 0, { task: 'Initializing...' });
  }

  update(current: number, task: string): void {
    this.bar.update(current, { task });
  }

  complete(message: string = 'Completed'): void {
    this.bar.update(this.bar.getTotal(), { task: message });
    this.bar.stop();
  }

  stop(): void {
    this.bar.stop();
  }
}

// Usage Example:
/*
const progress = new ProgressBar(100, 'Analyzing task');
progress.update(50, 'Processing tokens...');
progress.complete('Analysis complete');
*/
```

### 3.3 Spinner Component (`src/ui/components/Spinner.ts`)

```typescript
import ora, { Ora } from 'ora';
import { colors } from '../colors.js';

export class Spinner {
  private spinner: Ora;

  constructor(text: string) {
    this.spinner = ora({
      text: colors.text.secondary(text),
      spinner: 'dots',
      color: 'blue',
    });
  }

  start(text?: string): this {
    if (text) this.spinner.text = colors.text.secondary(text);
    this.spinner.start();
    return this;
  }

  update(text: string): this {
    this.spinner.text = colors.text.secondary(text);
    return this;
  }

  succeed(text: string): void {
    this.spinner.succeed(colors.success(text));
  }

  fail(text: string): void {
    this.spinner.fail(colors.error(text));
  }

  warn(text: string): void {
    this.spinner.warn(colors.warning(text));
  }

  info(text: string): void {
    this.spinner.info(colors.info(text));
  }

  stop(): void {
    this.spinner.stop();
  }
}

// Usage Example:
/*
const spinner = new Spinner('Analyzing task complexity...');
spinner.start();
await analyzeTask();
spinner.succeed('Task analysis complete');
*/
```

### 3.4 Card Component (`src/ui/components/Card.ts`)

```typescript
import boxen from 'boxen';
import { colors } from '../colors.js';

export interface CardOptions {
  title?: string;
  padding?: number;
  borderColor?: string;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'classic';
}

export class Card {
  static render(content: string, options: CardOptions = {}): string {
    const {
      title,
      padding = 1,
      borderColor = '#667eea',
      borderStyle = 'round',
    } = options;

    return boxen(content, {
      title: title ? colors.primary.bold(title) : undefined,
      titleAlignment: 'left',
      padding,
      borderColor,
      borderStyle,
      width: 80, // Configurable
    });
  }

  static info(title: string, content: string): string {
    return this.render(content, {
      title: `ℹ️  ${title}`,
      borderColor: '#3b82f6',
    });
  }

  static success(title: string, content: string): string {
    return this.render(content, {
      title: `✅ ${title}`,
      borderColor: '#10b981',
    });
  }

  static error(title: string, content: string): string {
    return this.render(content, {
      title: `❌ ${title}`,
      borderColor: '#ef4444',
    });
  }

  static warning(title: string, content: string): string {
    return this.render(content, {
      title: `⚠️  ${title}`,
      borderColor: '#f59e0b',
    });
  }
}

// Usage Example:
/*
const card = Card.success('Task Completed', `
  Task ID: task-001
  Agent: architecture-senior
  Cost: $0.0042
  Time: 2.3s
`);
console.log(card);
*/
```

### 3.5 Table Component (`src/ui/components/Table.ts`)

```typescript
import Table from 'cli-table3';
import { colors } from '../colors.js';

export interface TableColumn {
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export class DataTable {
  private table: Table.Table;

  constructor(columns: TableColumn[]) {
    this.table = new Table({
      head: columns.map(col => colors.text.muted.bold(col.header)),
      colWidths: columns.map(col => col.width),
      colAligns: columns.map(col => col.align || 'left'),
      style: {
        head: [],
        border: ['gray'],
      },
      chars: {
        'top': '─',
        'top-mid': '┬',
        'top-left': '┌',
        'top-right': '┐',
        'bottom': '─',
        'bottom-mid': '┴',
        'bottom-left': '└',
        'bottom-right': '┘',
        'left': '│',
        'left-mid': '├',
        'mid': '─',
        'mid-mid': '┼',
        'right': '│',
        'right-mid': '┤',
        'middle': '│',
      },
    });
  }

  addRow(...cells: (string | number)[]): this {
    this.table.push(cells.map(cell => colors.text.primary(String(cell))));
    return this;
  }

  render(): string {
    return this.table.toString();
  }
}

// Usage Example:
/*
const table = new DataTable([
  { header: 'Agent', width: 20 },
  { header: 'Status', width: 10 },
  { header: 'Tasks', width: 8, align: 'right' },
  { header: 'Avg Cost', width: 10, align: 'right' },
]);

table
  .addRow('architecture-senior', 'Busy', 12, '$0.0085')
  .addRow('code-reviewer', 'Idle', 8, '$0.0032')
  .addRow('test-automator', 'Busy', 23, '$0.0021');

console.log(table.render());
*/
```

---

## 4. Dashboard Implementation

### 4.1 Main Dashboard (`src/ui/Dashboard.ts`)

```typescript
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { Orchestrator } from '../orchestrator/index.js';
import { colors } from './colors.js';

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private grid: any; // contrib.grid
  private orchestrator: Orchestrator;
  private refreshInterval?: NodeJS.Timeout;

  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator;
    this.screen = blessed.screen();
    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

    this.setupLayout();
    this.setupKeybindings();
  }

  private setupLayout(): void {
    // Header
    const header = this.grid.set(0, 0, 1, 12, blessed.box, {
      content: '{center}🤖 Smart Agents Dashboard v2.0{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
        bold: true,
      },
    });

    // Cost Widget
    const costWidget = this.grid.set(1, 0, 3, 4, contrib.gauge, {
      label: '💰 Daily Cost',
      stroke: 'blue',
      fill: 'white',
    });

    // Resources Widget
    const resourcesWidget = this.grid.set(1, 4, 3, 4, contrib.donut, {
      label: '💻 Resources',
      radius: 8,
      arcWidth: 3,
      remainColor: 'black',
      data: [
        { label: 'CPU', percent: 60, color: 'blue' },
        { label: 'Memory', percent: 70, color: 'green' },
      ],
    });

    // Agents Widget
    const agentsWidget = this.grid.set(1, 8, 3, 4, blessed.box, {
      label: '🤖 Agents',
      border: { type: 'line' },
      style: { border: { fg: 'blue' } },
    });

    // Tasks Table
    const tasksTable = this.grid.set(4, 0, 4, 12, contrib.table, {
      keys: true,
      vi: true,
      label: '📊 Active Tasks',
      columnSpacing: 2,
      columnWidth: [15, 30, 10, 10, 10],
    });

    // Activity Log
    const activityLog = this.grid.set(8, 0, 4, 12, contrib.log, {
      label: '💬 Recent Activity',
      tags: true,
      style: {
        fg: 'white',
        border: { fg: 'blue' },
      },
    });

    // Store widgets
    this.widgets = {
      header,
      costWidget,
      resourcesWidget,
      agentsWidget,
      tasksTable,
      activityLog,
    };
  }

  private setupKeybindings(): void {
    // Quit
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    // Refresh
    this.screen.key(['r'], () => {
      this.refresh();
    });

    // Help
    this.screen.key(['h', '?'], () => {
      this.showHelp();
    });

    // Agents view
    this.screen.key(['a'], () => {
      this.showAgents();
    });

    // Tasks view
    this.screen.key(['t'], () => {
      this.showTasks();
    });

    // Settings
    this.screen.key(['s'], () => {
      this.showSettings();
    });
  }

  private async refresh(): Promise<void> {
    try {
      const status = await this.orchestrator.getSystemStatus();

      // Update cost widget
      const costPercent = (status.costStats.monthlySpend / status.costStats.monthlyBudget) * 100;
      this.widgets.costWidget.setPercent(Math.round(costPercent));

      // Update resources
      this.widgets.resourcesWidget.setData([
        { label: 'CPU', percent: 60, color: 'blue' },
        { label: 'Memory', percent: status.resources.memoryUsagePercent, color: 'green' },
        { label: 'Disk', percent: 20, color: 'yellow' },
      ]);

      // Update agents
      const agentsContent = await this.getAgentsContent();
      this.widgets.agentsWidget.setContent(agentsContent);

      // Update tasks
      const tasksData = await this.getTasksData();
      this.widgets.tasksTable.setData(tasksData);

      // Add activity log entry
      this.widgets.activityLog.log(`${new Date().toLocaleTimeString()} Dashboard refreshed`);

      this.screen.render();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }

  private async getAgentsContent(): Promise<string> {
    // Fetch agents data from collaboration manager
    return `
  Active:    3
  Idle:      2
  Error:     0

  Total:     5 agents
  Teams:     2 teams
    `.trim();
  }

  private async getTasksData(): Promise<any> {
    return {
      headers: ['ID', 'Description', 'Agent', 'Progress', 'Cost'],
      data: [
        ['task-001', 'Architecture Analysis', 'arch-senior', '80%', '$0.0042'],
        ['task-002', 'Code Review', 'code-reviewer', '20%', '$0.0018'],
      ],
    };
  }

  private showHelp(): void {
    const helpBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '50%',
      height: '50%',
      label: '📚 Help',
      border: { type: 'line' },
      style: { border: { fg: 'blue' } },
      tags: true,
      content: `
{center}Keyboard Shortcuts{/center}

r         Refresh dashboard
a         View agents
t         View tasks
s         Settings
h, ?      Help
q, Ctrl+C Quit

{center}Press any key to close{/center}
      `.trim(),
    });

    this.screen.append(helpBox);
    helpBox.focus();
    helpBox.key(['escape', 'q', 'enter'], () => {
      helpBox.destroy();
      this.screen.render();
    });

    this.screen.render();
  }

  private showAgents(): void {
    // TODO: Implement agents view
  }

  private showTasks(): void {
    // TODO: Implement tasks view
  }

  private showSettings(): void {
    // TODO: Implement settings view
  }

  start(): void {
    // Initial refresh
    this.refresh();

    // Auto-refresh every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, 5000);

    this.screen.render();
  }

  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private widgets: any;
}

// Usage:
/*
import { Orchestrator } from './orchestrator/index.js';
import { Dashboard } from './ui/Dashboard.js';

const orchestrator = new Orchestrator();
const dashboard = new Dashboard(orchestrator);
dashboard.start();
*/
```

### 4.2 CLI Entry Point (`src/cli.ts`)

```typescript
#!/usr/bin/env node

import { program } from 'commander';
import { Orchestrator } from './orchestrator/index.js';
import { Dashboard } from './ui/Dashboard.js';
import { Spinner } from './ui/components/Spinner.js';
import { Card } from './ui/components/Card.js';
import { DataTable } from './ui/components/Table.js';
import { colors, brandGradient } from './ui/colors.js';

const pkg = require('../package.json');

program
  .name('smart-agents')
  .description('Intelligent AI Agent Ecosystem')
  .version(pkg.version);

// Dashboard command (default)
program
  .command('dashboard', { isDefault: true })
  .description('Start interactive dashboard')
  .action(async () => {
    const orchestrator = new Orchestrator();
    const dashboard = new Dashboard(orchestrator);

    console.log(brandGradient.multiline(`
   _____ __  __          _____ _______
  / ____|  \/  |   /\\   |  __ \\__   __|
 | (___ | \\  / |  /  \\  | |__) | | |
  \\___ \\| |\\/| | / /\\ \\ |  _  /  | |
  ____) | |  | |/ ____ \\| | \\ \\  | |
 |_____/|_|  |_/_/    \\_\\_|  \\_\\ |_|
    `));

    console.log(colors.text.secondary(`v${pkg.version} - Intelligent AI Agent Ecosystem\n`));

    const spinner = new Spinner('Initializing...');
    spinner.start();

    await new Promise(resolve => setTimeout(resolve, 1000));
    spinner.succeed('System ready');

    dashboard.start();
  });

// Run task command
program
  .command('run <task>')
  .description('Execute a single task')
  .option('-a, --agent <name>', 'Force specific agent')
  .option('-p, --provider <name>', 'Force specific provider')
  .action(async (taskDesc: string, options: any) => {
    const orchestrator = new Orchestrator();

    console.log(Card.info('Task Execution', `
Description: ${taskDesc}
Agent: ${options.agent || 'Auto-select'}
Provider: ${options.provider || 'Auto-select'}
    `.trim()));

    const spinner = new Spinner('Analyzing task...');
    spinner.start();

    try {
      const result = await orchestrator.executeTask({
        id: `task-${Date.now()}`,
        description: taskDesc,
      });

      spinner.succeed('Task completed');

      console.log(Card.success('Task Completed', `
Agent: ${result.routing.selectedAgent}
Cost: $${result.cost.toFixed(6)}
Time: ${result.executionTimeMs}ms
Complexity: ${result.analysis.complexity}/10
      `.trim()));

      console.log('\nResponse:');
      console.log(colors.text.primary(result.response));

    } catch (error) {
      spinner.fail('Task failed');
      console.error(Card.error('Execution Error', String(error)));
      process.exit(1);
    }
  });

// Agents command
program
  .command('agents')
  .description('List all registered agents')
  .action(async () => {
    // TODO: Implement agents list
  });

// Status command
program
  .command('status')
  .description('Show system status')
  .action(async () => {
    const orchestrator = new Orchestrator();
    const status = await orchestrator.getSystemStatus();

    console.log(Card.info('System Status', `
Resources:
  Memory: ${status.resources.availableMemoryMB}MB available (${status.resources.memoryUsagePercent}% used)

Cost:
  Daily: $${status.costStats.monthlySpend.toFixed(4)}
  Budget: $${status.costStats.monthlyBudget.toFixed(2)}
  Remaining: $${status.costStats.remainingBudget.toFixed(2)}

Recommendation: ${status.recommendation}
    `.trim()));
  });

// Parse arguments
program.parse();
```

---

## 5. Web Dashboard Enhancements

### 5.1 Enhanced Stylesheet (`src/dashboard/public/styles.css`)

```css
/* Add to existing styles */

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

/* Card entrance animation */
.card {
  animation: slideIn 0.3s ease-out;
}

/* Loading skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    #1a1a2e 0%,
    #2d2d44 50%,
    #1a1a2e 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

/* Status badges with glow */
.status-healthy {
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

.status-warning {
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
}

.status-error {
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}

/* Hover effects */
.card {
  transition: all 0.2s ease-out;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

/* Progress bar gradient */
.progress-fill {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
}

/* Responsive Typography */
@media (max-width: 768px) {
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 18px; }
  .metric-value { font-size: 24px; }
}

/* Dark mode enhancements */
body.dark {
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
}

/* Tooltip */
.tooltip {
  position: relative;
  cursor: help;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background: #2d2d44;
  color: #e5e5e5;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.tooltip:hover::after {
  opacity: 1;
}
```

### 5.2 Enhanced JavaScript (`src/dashboard/public/app.js`)

```javascript
// Add real-time updates with WebSocket
class DashboardWebSocket {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.setupHandlers();
  }

  setupHandlers() {
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleUpdate(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(() => this.reconnect(), 5000);
    };
  }

  handleUpdate(data) {
    switch (data.type) {
      case 'task-started':
        this.notifyTaskStarted(data);
        break;
      case 'task-completed':
        this.notifyTaskCompleted(data);
        break;
      case 'agent-status':
        this.updateAgentStatus(data);
        break;
    }
  }

  notifyTaskStarted(data) {
    showNotification('Task Started', `${data.taskId} - ${data.agent}`, 'info');
  }

  notifyTaskCompleted(data) {
    showNotification('Task Completed', `Cost: $${data.cost}`, 'success');
  }

  reconnect() {
    this.ws = new WebSocket(this.ws.url);
    this.setupHandlers();
  }
}

// Toast notifications
function showNotification(title, message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <strong>${title}</strong>
    <p>${message}</p>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize WebSocket
// const ws = new DashboardWebSocket('ws://localhost:3001/ws');
```

---

## 6. Testing the UI

### 6.1 Component Tests (`src/ui/__tests__/components.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { colors } from '../colors.js';
import { Card } from '../components/Card.js';

describe('UI Components', () => {
  describe('Card', () => {
    it('should render basic card', () => {
      const card = Card.render('Test content');
      expect(card).toContain('Test content');
    });

    it('should render success card with title', () => {
      const card = Card.success('Success', 'Operation completed');
      expect(card).toContain('Success');
      expect(card).toContain('Operation completed');
    });
  });
});
```

---

## 7. Performance Optimization

### 7.1 Terminal Output Throttling

```typescript
// Throttle terminal updates to prevent flickering
export class ThrottledRenderer {
  private lastRender = 0;
  private minInterval = 100; // ms

  render(fn: () => void): void {
    const now = Date.now();
    if (now - this.lastRender >= this.minInterval) {
      fn();
      this.lastRender = now;
    }
  }
}
```

### 7.2 Lazy Loading

```typescript
// Load heavy components only when needed
export async function loadDashboard() {
  const { Dashboard } = await import('./ui/Dashboard.js');
  return Dashboard;
}
```

---

## 8. Accessibility

### 8.1 Screen Reader Support

```typescript
// Add ARIA-style labels to terminal output
export function accessibleCard(content: string, role: string = 'info'): string {
  return `[${role.toUpperCase()}] ${content}`;
}
```

### 8.2 Keyboard Navigation

Already implemented in blessed dashboard with:
- Tab / Shift+Tab: Navigate widgets
- Arrow keys: Navigate lists
- Enter: Select
- Esc: Cancel

---

## 9. Deployment Checklist

- [ ] Install all dependencies
- [ ] Build TypeScript (`npm run build`)
- [ ] Test terminal UI in different terminal emulators
- [ ] Test web dashboard in different browsers
- [ ] Verify color contrast (WCAG AAA)
- [ ] Test responsive layouts (narrow/standard/wide)
- [ ] Performance benchmarks (< 100ms render)
- [ ] Memory usage monitoring
- [ ] Cross-platform testing (macOS/Linux/Windows)
- [ ] Documentation updated
- [ ] Examples provided

---

## 10. Next Steps

### Week 1
- [ ] Implement core UI components (Colors, Spinner, ProgressBar, Card, Table)
- [ ] Create basic CLI commands (run, status, agents)
- [ ] Test in terminal

### Week 2
- [ ] Implement blessed-based dashboard
- [ ] Add keyboard navigation
- [ ] Integrate with Orchestrator

### Week 3
- [ ] Enhance web dashboard
- [ ] Add WebSocket support
- [ ] Implement notifications

### Week 4
- [ ] Polish animations
- [ ] Optimize performance
- [ ] Complete documentation
- [ ] User testing

---

## 11. Resources

### Documentation
- [Chalk](https://github.com/chalk/chalk) - Terminal colors
- [Ora](https://github.com/sindresorhus/ora) - Spinners
- [Boxen](https://github.com/sindresorhus/boxen) - Boxes
- [Blessed](https://github.com/chjj/blessed) - Terminal UI framework
- [Commander](https://github.com/tj/commander.js) - CLI framework

### Design References
- GitHub CLI - https://cli.github.com/
- Vercel CLI - https://vercel.com/docs/cli
- Railway CLI - https://railway.app/

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-26
**Status**: Ready for Implementation
