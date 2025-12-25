# Smart Agents Design System - Quick Start Guide

**Get started implementing the Smart Agents v2.0 design system in 30 minutes**

---

## 1. Prerequisites

- Node.js 18+ installed
- TypeScript knowledge
- Familiarity with terminal environments
- Basic understanding of the Smart Agents architecture

---

## 2. Install Dependencies (5 minutes)

```bash
cd smart-agents

# Install terminal UI libraries
npm install --save \
  chalk@^5.0.0 \
  ora@^6.0.0 \
  cli-progress@^3.12.0 \
  boxen@^7.0.0 \
  cli-table3@^0.6.0 \
  figures@^5.0.0 \
  gradient-string@^2.0.0 \
  inquirer@^9.0.0 \
  commander@^11.0.0

# Install type definitions
npm install --save-dev \
  @types/cli-progress@^3.11.0 \
  @types/inquirer@^9.0.0
```

---

## 3. Create UI Directory Structure (2 minutes)

```bash
mkdir -p src/ui/components
touch src/ui/colors.ts
touch src/ui/components/Spinner.ts
touch src/ui/components/ProgressBar.ts
touch src/ui/components/Card.ts
touch src/ui/components/Table.ts
touch src/cli.ts
```

---

## 4. Implement Core Colors (5 minutes)

**File**: `src/ui/colors.ts`

```typescript
import chalk from 'chalk';
import gradient from 'gradient-string';

// Brand Colors
export const colors = {
  primary: chalk.hex('#667eea'),
  accent: chalk.hex('#764ba2'),
  success: chalk.hex('#10b981'),
  warning: chalk.hex('#f59e0b'),
  error: chalk.hex('#ef4444'),
  info: chalk.hex('#3b82f6'),
  text: {
    primary: chalk.hex('#e5e5e5'),
    secondary: chalk.hex('#9ca3af'),
    muted: chalk.hex('#6b7280'),
  },
} as const;

export const brandGradient = gradient(['#667eea', '#764ba2']);

export const statusIcon = {
  success: colors.success('✓'),
  error: colors.error('✖'),
  warning: colors.warning('⚠'),
  info: colors.info('ℹ'),
  running: colors.info('●'),
  idle: chalk.white('○'),
} as const;
```

**Test it**:
```bash
npx tsx -e "import { colors, brandGradient } from './src/ui/colors.js'; console.log(brandGradient('Smart Agents v2.0')); console.log(colors.success('✓ Colors working!'));"
```

---

## 5. Create Spinner Component (3 minutes)

**File**: `src/ui/components/Spinner.ts`

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

  succeed(text: string): void {
    this.spinner.succeed(colors.success(text));
  }

  fail(text: string): void {
    this.spinner.fail(colors.error(text));
  }

  stop(): void {
    this.spinner.stop();
  }
}
```

**Test it**:
```typescript
// test-spinner.ts
import { Spinner } from './src/ui/components/Spinner.js';

const spinner = new Spinner('Loading...');
spinner.start();
setTimeout(() => spinner.succeed('Done!'), 2000);
```

```bash
npx tsx test-spinner.ts
```

---

## 6. Create Progress Bar Component (3 minutes)

**File**: `src/ui/components/ProgressBar.ts`

```typescript
import { SingleBar } from 'cli-progress';
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
    });

    this.bar.start(total, 0, { task: 'Initializing...' });
  }

  update(current: number, task: string): void {
    this.bar.update(current, { task });
  }

  complete(): void {
    this.bar.stop();
  }
}
```

**Test it**:
```typescript
// test-progress.ts
import { ProgressBar } from './src/ui/components/ProgressBar.js';

const progress = new ProgressBar(100, 'Testing');
let i = 0;
const interval = setInterval(() => {
  progress.update(i, `Step ${i}/100`);
  i += 10;
  if (i > 100) {
    progress.complete();
    clearInterval(interval);
  }
}, 200);
```

```bash
npx tsx test-progress.ts
```

---

## 7. Create Card Component (3 minutes)

**File**: `src/ui/components/Card.ts`

```typescript
import boxen from 'boxen';
import { colors } from '../colors.js';

export interface CardOptions {
  title?: string;
  borderColor?: string;
}

export class Card {
  static render(content: string, options: CardOptions = {}): string {
    const { title, borderColor = '#667eea' } = options;

    return boxen(content, {
      title: title ? colors.primary.bold(title) : undefined,
      titleAlignment: 'left',
      padding: 1,
      borderColor,
      borderStyle: 'round',
    });
  }

  static success(title: string, content: string): string {
    return this.render(content, { title: `✅ ${title}`, borderColor: '#10b981' });
  }

  static error(title: string, content: string): string {
    return this.render(content, { title: `❌ ${title}`, borderColor: '#ef4444' });
  }

  static info(title: string, content: string): string {
    return this.render(content, { title: `ℹ️  ${title}`, borderColor: '#3b82f6' });
  }
}
```

**Test it**:
```typescript
// test-card.ts
import { Card } from './src/ui/components/Card.js';

console.log(Card.success('Task Completed', 'Cost: $0.0042\nTime: 2.3s'));
console.log(Card.info('System Status', 'Memory: 4.8 GB available\nCPU: 60%'));
console.log(Card.error('Error', 'API quota exceeded'));
```

```bash
npx tsx test-card.ts
```

---

## 8. Create Table Component (3 minutes)

**File**: `src/ui/components/Table.ts`

```typescript
import Table from 'cli-table3';
import { colors } from '../colors.js';

export class DataTable {
  private table: Table.Table;

  constructor(headers: string[]) {
    this.table = new Table({
      head: headers.map(h => colors.text.muted.bold(h)),
      style: {
        head: [],
        border: ['gray'],
      },
    });
  }

  addRow(...cells: (string | number)[]): this {
    this.table.push(cells.map(c => colors.text.primary(String(c))));
    return this;
  }

  render(): string {
    return this.table.toString();
  }
}
```

**Test it**:
```typescript
// test-table.ts
import { DataTable } from './src/ui/components/Table.js';

const table = new DataTable(['Agent', 'Status', 'Tasks', 'Cost']);
table
  .addRow('architecture-senior', 'Busy', 12, '$0.0085')
  .addRow('code-reviewer', 'Idle', 8, '$0.0032');

console.log(table.render());
```

```bash
npx tsx test-table.ts
```

---

## 9. Create Basic CLI (5 minutes)

**File**: `src/cli.ts`

```typescript
#!/usr/bin/env node

import { program } from 'commander';
import { Orchestrator } from './orchestrator/index.js';
import { Spinner } from './ui/components/Spinner.js';
import { Card } from './ui/components/Card.js';
import { colors, brandGradient } from './ui/colors.js';

const pkg = require('../package.json');

program
  .name('smart-agents')
  .description('Intelligent AI Agent Ecosystem')
  .version(pkg.version);

program
  .command('run <task>')
  .description('Execute a task')
  .action(async (taskDesc: string) => {
    console.log(brandGradient('\n🤖 Smart Agents v2.0\n'));

    const spinner = new Spinner('Analyzing task...');
    spinner.start();

    try {
      const orchestrator = new Orchestrator();
      const result = await orchestrator.executeTask({
        id: `task-${Date.now()}`,
        description: taskDesc,
      });

      spinner.succeed('Task completed');

      console.log(Card.success('Success', `
Agent: ${result.routing.selectedAgent}
Cost: $${result.cost.toFixed(6)}
Time: ${result.executionTimeMs}ms
Complexity: ${result.analysis.complexity}/10
      `.trim()));

      console.log('\n' + colors.text.primary('Response:'));
      console.log(result.response);

    } catch (error) {
      spinner.fail('Task failed');
      console.error(Card.error('Error', String(error)));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show system status')
  .action(async () => {
    const orchestrator = new Orchestrator();
    const status = await orchestrator.getSystemStatus();

    console.log(Card.info('System Status', `
Memory: ${status.resources.availableMemoryMB}MB (${status.resources.memoryUsagePercent}% used)
Daily Cost: $${status.costStats.monthlySpend.toFixed(4)}
Budget: $${status.costStats.monthlyBudget} (${status.costStats.remainingBudget.toFixed(2)} left)
    `.trim()));
  });

program.parse();
```

**Update package.json**:
```json
{
  "bin": {
    "smart-agents": "./dist/cli.js"
  }
}
```

**Build and test**:
```bash
npm run build
node dist/cli.js --help
node dist/cli.js status
```

---

## 10. Test the Complete System (1 minute)

```bash
# Test all components
npm run build

# Test CLI
node dist/cli.js run "Write a hello world function"

# Test status
node dist/cli.js status

# Test help
node dist/cli.js --help
```

---

## 11. Next Steps

### Immediate (Week 1)
- [ ] Implement remaining components (Dashboard, etc.)
- [ ] Add keyboard navigation
- [ ] Integrate with existing Orchestrator

### Short-term (Week 2-3)
- [ ] Create blessed-based dashboard
- [ ] Add real-time updates
- [ ] Enhance web dashboard

### Long-term (Week 4+)
- [ ] Performance optimization
- [ ] Cross-platform testing
- [ ] Complete documentation

---

## 12. Quick Reference

### Import Components

```typescript
// Colors
import { colors, brandGradient, statusIcon } from './ui/colors.js';

// Components
import { Spinner } from './ui/components/Spinner.js';
import { ProgressBar } from './ui/components/ProgressBar.js';
import { Card } from './ui/components/Card.js';
import { DataTable } from './ui/components/Table.js';
```

### Common Patterns

**Show spinner during async operation**:
```typescript
const spinner = new Spinner('Processing...');
spinner.start();
try {
  await someAsyncOperation();
  spinner.succeed('Done!');
} catch (error) {
  spinner.fail('Failed');
}
```

**Display progress**:
```typescript
const progress = new ProgressBar(100, 'Task');
for (let i = 0; i <= 100; i += 10) {
  progress.update(i, `Step ${i}/100`);
  await delay(100);
}
progress.complete();
```

**Show info card**:
```typescript
console.log(Card.info('Title', `
  Line 1: Value
  Line 2: Value
`.trim()));
```

**Display data table**:
```typescript
const table = new DataTable(['Col1', 'Col2', 'Col3']);
table.addRow('A', 'B', 'C');
console.log(table.render());
```

---

## 13. Design Resources

### Documentation
- **DESIGN_SYSTEM.md** - Complete design specification
- **TERMINAL_UI_MOCKUPS.md** - All interface mockups
- **UI_IMPLEMENTATION_GUIDE.md** - Detailed implementation guide
- **BRANDING_GUIDE.md** - Complete branding guidelines
- **DESIGN_SUMMARY.md** - Executive summary

### Key Design Values
- **Colors**: #667eea (primary), #764ba2 (accent)
- **Spacing**: 8pt grid (4/8/16/24/32/48/64px)
- **Typography**: SF Mono, 14px body, 28px h1
- **Icons**: Unicode emoji (🤖 💰 ✓ ❌ ⚠️ ℹ️)

---

## 14. Troubleshooting

### Colors not showing
```bash
# Check terminal color support
echo $TERM
# Should be: xterm-256color or similar

# Force color support
export FORCE_COLOR=1
```

### TypeScript errors
```bash
# Rebuild
npm run build

# Check types
npm run typecheck
```

### Components not found
```bash
# Verify installation
npm list chalk ora boxen cli-progress cli-table3

# Reinstall if needed
npm install
```

---

## 15. Support

### Get Help
- Review full documentation in `/docs` folder
- Check examples in design documents
- Run `smart-agents --help` for CLI reference

### Report Issues
- Design inconsistencies
- Accessibility problems
- Performance issues
- Terminal compatibility bugs

---

**Quick Start Version**: 1.0.0
**Estimated Time**: 30 minutes
**Difficulty**: Beginner
**Last Updated**: 2025-12-26

✅ You're now ready to implement the Smart Agents v2.0 design system!
