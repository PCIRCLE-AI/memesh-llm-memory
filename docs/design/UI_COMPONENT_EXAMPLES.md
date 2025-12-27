# Smart Agents UI Component Examples

**Ready-to-use code examples and visual mockups**

Version: 1.0
Date: 2025-12-28

---

## 1. Attribution Message Examples

### Success Attribution

**Minimal Version** (One-liner):
```
✨ smart-agents: Code Review completed in 1.8s ($0.0021) - saved ~15min
```

**Standard Version** (Card):
```
┌─ ✨ smart-agents Success ────────────────────────────────┐
│                                                          │
│  Task:       Code Review                                │
│  Agent:      code-reviewer                              │
│  Quality:    3 issues found, 2 auto-fixed               │
│  Time:       1.8s (faster than 2.1s estimate)           │
│  Cost:       $0.0021 (within budget)                    │
│  Saved you:  ~15 minutes of manual review               │
│                                                          │
│  [View Full Report] [Run Next Task] [Dismiss]           │
└──────────────────────────────────────────────────────────┘
```

**Detailed Version** (With metrics):
```
╔═══════════════════════════════════════════════════════════╗
║ ✨ smart-agents Task Completed                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Task:       Code Review - authentication.ts             ║
║  Agent:      code-reviewer (specialized)                 ║
║  Complexity: 5/10 (Medium)                               ║
║                                                           ║
║  ┌─ Quality Metrics ──────────────────────────────────┐  ║
║  │ Issues found:        3                             │  ║
║  │ • Critical:          0                             │  ║
║  │ • Major:             1 (auto-fixed ✓)              │  ║
║  │ • Minor:             2 (suggestions provided)      │  ║
║  │ Code quality score:  8.5/10 (Excellent)            │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                           ║
║  ┌─ Performance ──────────────────────────────────────┐  ║
║  │ Execution time:  1.8s (↓ 0.3s vs estimate)         │  ║
║  │ Cost:            $0.0021 (within budget)            │  ║
║  │ Tokens used:     1,342 (input: 734, output: 608)   │  ║
║  │ Speed:           86x faster than manual             │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                           ║
║  ┌─ Impact ───────────────────────────────────────────┐  ║
║  │ Time saved:      ~15 minutes                        │  ║
║  │ Value saved:     ~$20 (at $80/hour developer rate)  │  ║
║  │ Productivity:    You completed 8 reviews today!     │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                           ║
║  Actions:                                                 ║
║  (v) View full report  (n) Next task  (d) Dismiss        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### Error Attribution

**Helpful Error** (With solutions):
```
┌─ ❌ smart-agents Error ──────────────────────────────────┐
│                                                          │
│  Error:  API quota exceeded                             │
│  Agent:  architecture-senior                            │
│  Task:   security-analysis (80% complete)               │
│                                                          │
│  What happened:                                         │
│  Daily quota limit reached for Claude API.              │
│  Current usage: 150/150 requests                        │
│  Quota resets: 9h 34m (at 23:59:42)                     │
│                                                          │
│  Impact:                                                │
│  Task could not complete. Partial results saved.        │
│                                                          │
│  Suggested solutions:                                   │
│  1. ⏰ Wait and retry (auto-retry at 23:59:42)          │
│  2. 🔄 Switch to Ollama (free, local, unlimited)        │
│     Command: smart-agents retry --provider ollama       │
│  3. 💰 Increase quota (+$5/month → 200 req/day)         │
│     Command: smart-agents config set-quota 200          │
│  4. 📋 Queue for later (auto-retry when quota resets)   │
│     Command: smart-agents queue task-004                │
│                                                          │
│  [Switch Provider] [Queue Task] [View Details]          │
└──────────────────────────────────────────────────────────┘
```

**Bug Report** (One-click GitHub issue):
```
┌─ ❌ smart-agents Internal Error ─────────────────────────┐
│                                                          │
│  Error:  TypeError: Cannot read property 'tokens'       │
│  Agent:  test-automator                                 │
│  Task:   Generate unit tests for auth.ts                │
│                                                          │
│  This appears to be a bug in smart-agents.              │
│  Would you like to report it automatically?             │
│                                                          │
│  ┌─ Issue Preview ────────────────────────────────────┐ │
│  │ Title: TypeError in test-automator                │ │
│  │                                                    │ │
│  │ **Error**: Cannot read property 'tokens'...       │ │
│  │ **Stack Trace**: (attached)                       │ │
│  │ **System**: macOS 14.6, Node 20.10, v2.0.0        │ │
│  │ **Logs**: Full logs attached                      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Yes, Report Bug] [No, Just Show Logs]                 │
└──────────────────────────────────────────────────────────┘

(If "Yes, Report Bug"):

✓ GitHub issue created: #142
🔗 https://github.com/user/smart-agents/issues/142
📋 Stack trace, logs, and system info attached
👥 Maintainers notified

Thank you for helping improve smart-agents!
```

---

## 2. Progress Indicator Variations

### Inline Progress (Minimal)

**Single Agent**:
```
architect-001 ████████████░░░░░░░░ 60%  2.3s  $0.004
```

**Multiple Agents** (Stacked):
```
architect-001  ████████████░░░░░░░░ 60%  2.3s  $0.004
coder-002      ████░░░░░░░░░░░░░░░░ 20%  1.1s  $0.001
reviewer-003   ██████████████░░░░░░ 70%  3.8s  $0.002
```

**Multiple Agents** (One-liner):
```
Agents: architect-001 (60%) • coder-002 (20%) • reviewer-003 (70%)
```

### Card-Based Progress

**Compact Card**:
```
┌─ Agent Progress ──────────────────────────────────┐
│ architect-001                                     │
│ ████████████░░░░░░░░ 60%                          │
│ Task: Security analysis | Time: 2.3s | Cost: $4  │
└───────────────────────────────────────────────────┘
```

**Detailed Card**:
```
╔═══════════════════════════════════════════════════╗
║ 🤖 Agent: architecture-senior                     ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  Task:      Analyze authentication system         ║
║  Status:    ⚙️  Analyzing security patterns...    ║
║                                                   ║
║  Progress:  ████████████████████░░░░░░ 80%        ║
║             2.3s / ~2.8s estimated                ║
║                                                   ║
║  Cost:      $0.0042 / ~$0.0048 estimated          ║
║  Tokens:    2,341 / ~2,500 estimated              ║
║                                                   ║
║  (p)ause | (c)ancel | (v)iew logs                 ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

### Background Agent Indicators

**Minimal** (Status bar):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3 agents running
```

**Compact** (Footer):
```
Background: architect-001 (60%) • coder-002 (30%) • 1 queued
```

**Expandable**:
```
┌─ Background Agents (3) ──────────────────────────┐
│ ▶ architect-001  60%  Running  $0.004           │
│ ▶ coder-002      30%  Running  $0.001           │
│ ▶ reviewer-003   Queued                         │
└──────────────────────────────────────────────────┘

Press 'b' to expand
```

---

## 3. Dashboard Mockups (Real Terminal Output)

### Compact Dashboard (60-80 chars)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🤖 Smart Agents v2.0                       Status: ✓ Healthy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────┐
│ 💰 Cost Tracking                                               │
├────────────────────────────────────────────────────────────────┤
│  Today:    $0.42 / $10    ████░░░░░░░░░░  4%                   │
│  Month:    $8.35 / $35    ████████████░░ 24%                   │
│  Tasks:    127 total                                           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 💻 System Resources                                            │
├────────────────────────────────────────────────────────────────┤
│  CPU:      60%   ████████░░░░░░░░                              │
│  Memory:   70%   ██████████░░░░░░                              │
│  Status:   ✓ Optimal (4.8 GB available)                        │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 🤖 Agents                                                      │
├────────────────────────────────────────────────────────────────┤
│  Active:    3 agents                                           │
│  Idle:      2 agents                                           │
│  Teams:     2 teams                                            │
│  Messages:  127 total                                          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 📋 Active Tasks (2)                                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  architect-001  ████████████░░░░░░░░ 60%  2.3s  $0.004         │
│  Security analysis                                             │
│                                                                │
│  coder-002      ████░░░░░░░░░░░░░░░░ 20%  1.1s  $0.001         │
│  Code refactoring                                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(r)efresh | (a)gents | (t)asks | (h)elp | (q)uit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Last update: 14:23:45 (auto-refresh in 5s)
>
```

### Standard Dashboard (80-120 chars)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                    🤖 Smart Agents Dashboard v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Last Updated: 2025-12-28 14:23:45                                                  Status: ✓ Healthy

┌────────────────────────────┬────────────────────────────┬──────────────────────────────────┐
│ 💰 Cost Tracking           │ 💻 System Resources        │ 🤖 Agent Status                  │
├────────────────────────────┼────────────────────────────┼──────────────────────────────────┤
│                            │                            │                                  │
│  Daily:    $0.42 / $10     │  CPU:    ████████░░ 60%    │  Active:     3                   │
│  ████░░░░░░░░░░ 4%         │  Memory: ██████████░ 70%   │  Idle:       2                   │
│                            │  Disk:   ████░░░░░░ 20%    │  Error:      0                   │
│  Monthly:  $8.35 / $35     │                            │                                  │
│  ████████████░░ 24%        │  Available: 4.8 GB         │  Teams:      2                   │
│                            │  Status: ✓ Optimal         │  Messages:   127                 │
│  Tasks:    127 total       │                            │                                  │
│  Avg Cost: $0.0066         │                            │                                  │
│                            │                            │                                  │
└────────────────────────────┴────────────────────────────┴──────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📊 Active Tasks (2)                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                            │
│  🤖 task-001  Architecture Analysis                                                     Running ●          │
│     Agent: architecture-senior | Complexity: 8/10 | Cost: $0.0042 | Time: 2.3s                            │
│     ████████████████░░░░ 80%                                                                               │
│                                                                                                            │
│  🤖 task-002  Code Review                                                                Running ●          │
│     Agent: code-reviewer | Complexity: 5/10 | Cost: $0.0018 | Time: 1.1s                                  │
│     ████░░░░░░░░░░░░░░░░ 20%                                                                               │
│                                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 💬 Recent Activity (Last 5)                                                                                │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                            │
│  14:23:45  ✅ Task completed: test-automation-suite                                                        │
│            Agent: test-automator | Cost: $0.0021 | Time: 3.2s                                             │
│                                                                                                            │
│  14:21:32  ⚡ Agent spawned: code-reviewer                                                                 │
│            Capability: code-quality-analysis                                                               │
│                                                                                                            │
│  14:19:18  ● Task started: architecture-analysis                                                           │
│            Estimated cost: $0.0042 | Complexity: 8/10                                                      │
│                                                                                                            │
│  14:15:04  ✅ Batch completed: 5 tasks                                                                     │
│            Total cost: $0.021 | Average time: 2.1s/task                                                   │
│                                                                                                            │
│  14:12:47  ⚠️  Memory usage high (85%)                                                                     │
│            Reduced concurrent tasks from 3 to 2                                                            │
│                                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commands: (r)efresh | (a)gents | (t)asks | (s)ettings | (h)elp | (q)uit | Auto-refresh: 5s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

>
```

### Wide Dashboard (120+ chars) - Adds Productivity Column

```
┌──────────────────────┬──────────────────────┬────────────────────┬──────────────────────┬──────────────────────┐
│ 💰 Cost              │ 💻 Resources         │ 🤖 Agents          │ 📊 Productivity      │ 🎯 Quick Actions     │
├──────────────────────┼──────────────────────┼────────────────────┼──────────────────────┼──────────────────────┤
│ Daily:   $0.42 / $10 │ CPU:    60%          │ Active:    3       │ Time saved: 2.4h     │ (r) Refresh          │
│ Monthly: $8.35 / $35 │ Memory: 70%          │ Idle:      2       │ Tasks done: 127      │ (n) New task         │
│ Tasks:   127         │ Status: ✓ Optimal    │ Teams:     2       │ Efficiency: 86x      │ (a) Agents           │
│ Avg:     $0.0066     │ Avail:  4.8 GB       │ Errors:    0       │ Success:    100%     │ (h) Help             │
└──────────────────────┴──────────────────────┴────────────────────┴──────────────────────┴──────────────────────┘
```

---

## 4. Interactive Elements

### Expandable Agent List

**Collapsed**:
```
┌─ Active Agents (3) ────────────────────────────────────┐
│ ▶ architect-001  80%  Running  $0.004                 │
│ ▶ coder-002      30%  Running  $0.001                 │
│ ▶ reviewer-003   70%  Running  $0.002                 │
└────────────────────────────────────────────────────────┘

Press Enter or 'd' to expand
```

**Expanded** (Arrow keys to navigate, Enter to collapse):
```
┌─ Active Agents (3) ──────────────────────────────────────────┐
│ ▼ architect-001                            ← Currently focused│
│   ├─ Task:     Analyze authentication system                 │
│   ├─ Status:   Analyzing security patterns...                │
│   ├─ Progress: ████████████████░░░░ 80%                      │
│   ├─ Time:     2.3s / ~2.8s estimated                        │
│   ├─ Cost:     $0.0042 / ~$0.0048 estimated                  │
│   ├─ Tokens:   2,341 / ~2,500 estimated                      │
│   └─ Actions:  (p)ause | (c)ancel | (v)iew logs | (h)ide    │
│                                                              │
│ ▶ coder-002      30%  Running  $0.001                        │
│ ▶ reviewer-003   70%  Running  $0.002                        │
└──────────────────────────────────────────────────────────────┘

↑/↓: Navigate | Enter: Expand/Collapse | d: Hide details
```

### Agent Control Menu

**Pause Confirmation**:
```
┌─ Pause Agent? ────────────────────────────────────────┐
│                                                       │
│  Agent:     architect-001                            │
│  Task:      Security analysis                        │
│  Progress:  80% complete                             │
│  Time:      ~0.5s remaining                          │
│  Cost:      $0.0033 so far                           │
│                                                       │
│  Pausing will:                                       │
│  • Stop execution immediately                        │
│  • Save current state                                │
│  • Allow resume later                                │
│                                                       │
│  Pause this agent? (y/N):                            │
└───────────────────────────────────────────────────────┘
```

**Cancel Confirmation**:
```
┌─ Cancel Agent? ───────────────────────────────────────┐
│                                                       │
│  ⚠️  Warning: This action cannot be undone           │
│                                                       │
│  Agent:     architect-001                            │
│  Progress:  80% complete                             │
│  Cost:      $0.0033 (will be charged)                │
│                                                       │
│  Canceling will:                                     │
│  • Stop execution permanently                        │
│  • Charge for tokens used so far                     │
│  • Save partial results (if available)               │
│  • Cannot resume later                               │
│                                                       │
│  Type 'CANCEL' to confirm:                           │
└───────────────────────────────────────────────────────┘
```

### Toast Notifications

**Bottom-Right Placement**:
```
[Main dashboard content...]






                                   ┌─ 🎉 Milestone! ─────┐
                                   │ 10 hours saved!     │
                                   │ Keep it up! 💪      │
                                   └─────────────────────┘
                                     Auto-dismiss in 3s
```

**Top-Right Placement** (Alternative):
```
┌─ ✅ Success ──────┐
│ Task completed!  │
└──────────────────┘
[Main dashboard content...]
```

**Multiple Toasts** (Stacked):
```
                                   ┌─ ✅ Task complete ──┐
                                   │ Code review done   │
                                   └────────────────────┘
                                   ┌─ ℹ️  Info ──────────┐
                                   │ 2 agents idle      │
                                   └────────────────────┘
```

---

## 5. Animation Frames

### Spinner Animation (80ms per frame)

```
Frame 1:  ⠋  Analyzing task...
Frame 2:  ⠙  Analyzing task...
Frame 3:  ⠹  Analyzing task...
Frame 4:  ⠸  Analyzing task...
Frame 5:  ⠼  Analyzing task...
Frame 6:  ⠴  Analyzing task...
Frame 7:  ⠦  Analyzing task...
Frame 8:  ⠧  Analyzing task...
Frame 9:  ⠇  Analyzing task...
Frame 10: ⠏  Analyzing task...
[Loop back to Frame 1]
```

### Progress Bar Smooth Transition (100ms per step)

```
Starting: [░░░░░░░░░░░░░░░░░░░░] 0%

Step 1:   [█░░░░░░░░░░░░░░░░░░░] 5%
Step 2:   [██░░░░░░░░░░░░░░░░░░] 10%
Step 3:   [███░░░░░░░░░░░░░░░░░] 15%
Step 4:   [████░░░░░░░░░░░░░░░░] 20%
...
Step 20:  [████████████████████] 100%

Completed: ✅ Done in 2.3s
```

### Pulse Animation (1 second cycle)

```
Frame 1: ● Agent working...      [Bright - ANSI 255]
Frame 2: ● Agent working...      [75% brightness - ANSI 250]
Frame 3: ○ Agent working...      [50% brightness - ANSI 245]
Frame 4: ○ Agent working...      [75% brightness - ANSI 250]
Frame 5: ● Agent working...      [Bright - ANSI 255]
[Loop]
```

---

## 6. Code Implementation Examples

### TypeScript Component: Spinner

```typescript
import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class Spinner {
  private spinner: Ora;

  constructor(text: string) {
    this.spinner = ora({
      text: chalk.gray(text),
      spinner: 'dots',
      color: 'blue',
    });
  }

  start(text?: string): this {
    if (text) this.spinner.text = chalk.gray(text);
    this.spinner.start();
    return this;
  }

  update(text: string): this {
    this.spinner.text = chalk.gray(text);
    return this;
  }

  succeed(text: string): void {
    this.spinner.succeed(chalk.green(text));
  }

  fail(text: string): void {
    this.spinner.fail(chalk.red(text));
  }

  warn(text: string): void {
    this.spinner.warn(chalk.yellow(text));
  }

  stop(): void {
    this.spinner.stop();
  }
}

// Usage:
const spinner = new Spinner('Analyzing task...');
spinner.start();
// ... do work ...
spinner.succeed('Analysis complete');
```

### TypeScript Component: Attribution Message

```typescript
import boxen from 'boxen';
import chalk from 'chalk';

export interface SuccessAttributionOptions {
  task: string;
  agent: string;
  quality?: string;
  time: string;
  timeEstimate?: string;
  cost: string;
  timeSaved: string;
}

export class AttributionMessage {
  static success(options: SuccessAttributionOptions): string {
    const {
      task,
      agent,
      quality,
      time,
      timeEstimate,
      cost,
      timeSaved,
    } = options;

    const timeComparison = timeEstimate
      ? `(faster than ${timeEstimate} estimate)`
      : '';

    const content = `
${chalk.bold('Task:')}       ${task}
${chalk.bold('Agent:')}      ${agent}
${quality ? `${chalk.bold('Quality:')}    ${quality}` : ''}
${chalk.bold('Time:')}       ${time} ${chalk.dim(timeComparison)}
${chalk.bold('Cost:')}       ${cost} (within budget)
${chalk.bold('Saved you:')}  ${timeSaved}

${chalk.dim('[View Full Report] [Run Next Task] [Dismiss]')}
    `.trim();

    return boxen(content, {
      title: chalk.green.bold('✨ smart-agents Success'),
      titleAlignment: 'left',
      padding: 1,
      borderColor: 'green',
      borderStyle: 'round',
      width: 60,
    });
  }

  static error(error: string, agent: string, suggestions: string[]): string {
    const content = `
${chalk.bold('Error:')}  ${error}
${chalk.bold('Agent:')}  ${agent}

${chalk.bold('Suggested solutions:')}
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${chalk.dim('[View Details] [Report Bug] [Dismiss]')}
    `.trim();

    return boxen(content, {
      title: chalk.red.bold('❌ smart-agents Error'),
      titleAlignment: 'left',
      padding: 1,
      borderColor: 'red',
      borderStyle: 'round',
      width: 60,
    });
  }
}

// Usage:
const message = AttributionMessage.success({
  task: 'Code Review',
  agent: 'code-reviewer',
  quality: '3 issues found, 2 auto-fixed',
  time: '1.8s',
  timeEstimate: '2.1s',
  cost: '$0.0021',
  timeSaved: '~15 minutes',
});
console.log(message);
```

### TypeScript Component: Progress Bar

```typescript
import cliProgress from 'cli-progress';
import chalk from 'chalk';

export class ProgressBar {
  private bar: cliProgress.SingleBar;
  private total: number;

  constructor(total: number, label: string = 'Progress') {
    this.total = total;
    this.bar = new cliProgress.SingleBar({
      format: `${chalk.blue('{bar}')} {percentage}% | ${label}: {task}`,
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

  complete(message: string = 'Completed'): void {
    this.bar.update(this.total, { task: message });
    this.bar.stop();
  }

  stop(): void {
    this.bar.stop();
  }
}

// Usage:
const progress = new ProgressBar(100, 'Analyzing task');
progress.update(50, 'Processing tokens...');
progress.complete('Analysis complete');
```

---

## 7. Color Scheme Examples

### ANSI 256-Color Palette

```typescript
import chalk from 'chalk';

// Brand Colors
export const brandPrimary = chalk.hex('#667eea');    // Purple-Blue
export const brandAccent = chalk.hex('#764ba2');     // Deep Purple

// Status Colors
export const success = chalk.hex('#10b981');         // Green
export const warning = chalk.hex('#f59e0b');         // Amber
export const error = chalk.hex('#ef4444');           // Red
export const info = chalk.hex('#3b82f6');            // Blue

// Text Colors
export const textPrimary = chalk.hex('#e5e5e5');     // Near White
export const textSecondary = chalk.hex('#9ca3af');   // Gray
export const textMuted = chalk.hex('#6b7280');       // Dark Gray

// Usage:
console.log(brandPrimary('🤖 Smart Agents'));
console.log(success('✅ Task completed'));
console.log(error('❌ Error occurred'));
console.log(textSecondary('Updated: 14:23:45'));
```

### Gradient Text

```typescript
import gradient from 'gradient-string';

const brandGradient = gradient(['#667eea', '#764ba2']);

console.log(brandGradient(`
   _____ __  __          _____ _______
  / ____|  \\/  |   /\\   |  __ \\__   __|
 | (___ | \\  / |  /  \\  | |__) | | |
  \\___ \\| |\\/| | / /\\ \\ |  _  /  | |
  ____) | |  | |/ ____ \\| | \\ \\  | |
 |_____/|_|  |_/_/    \\_\\_|  \\_\\ |_|
`));
```

---

## 8. Accessibility Examples

### Screen Reader Friendly Output

```typescript
export function formatForScreenReader(
  type: 'success' | 'error' | 'warning' | 'info',
  message: string
): string {
  const prefix = {
    success: '[SUCCESS]',
    error: '[ERROR]',
    warning: '[WARNING]',
    info: '[INFO]',
  }[type];

  return `${prefix} ${message}`;
}

// Usage:
console.log(formatForScreenReader('success', 'Task completed: Code Review'));
console.log(formatForScreenReader('error', 'API quota exceeded'));

// Output (screen reader):
// [SUCCESS] Task completed: Code Review
// [ERROR] API quota exceeded
```

### Keyboard Navigation Example

```typescript
import readline from 'readline';

export class KeyboardNavigator {
  private readline: readline.Interface;
  private currentIndex = 0;
  private items: string[];

  constructor(items: string[]) {
    this.items = items;
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.setupKeyHandlers();
  }

  private setupKeyHandlers(): void {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      if (key.name === 'up') {
        this.currentIndex = Math.max(0, this.currentIndex - 1);
        this.render();
      } else if (key.name === 'down') {
        this.currentIndex = Math.min(
          this.items.length - 1,
          this.currentIndex + 1
        );
        this.render();
      } else if (key.name === 'return') {
        this.select(this.currentIndex);
      } else if (key.ctrl && key.name === 'c') {
        process.exit(0);
      }
    });
  }

  private render(): void {
    console.clear();
    this.items.forEach((item, index) => {
      const prefix = index === this.currentIndex ? '>' : ' ';
      console.log(`${prefix} ${item}`);
    });
  }

  private select(index: number): void {
    console.log(`\nSelected: ${this.items[index]}`);
    this.close();
  }

  private close(): void {
    this.readline.close();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  }

  start(): void {
    this.render();
  }
}

// Usage:
const navigator = new KeyboardNavigator([
  'View agents',
  'View tasks',
  'Settings',
  'Help',
  'Quit',
]);
navigator.start();
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-28
**Status**: Ready for Use
**Next Steps**: Implement components in `/src/ui/components/`
