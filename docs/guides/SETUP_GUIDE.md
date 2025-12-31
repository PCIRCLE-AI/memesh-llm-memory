# Terminal UI Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd /Users/ktseng/Developer/Projects/claude-code-buddy

# Core UI framework
npm install ink ink-spinner ink-table

# Utilities
npm install chalk ora boxen cli-progress

# Dev dependencies (React types)
npm install -D @types/react
```

### 2. Test the POC

```bash
npx tsx examples/terminal-ui-poc.tsx
```

You should see a live dashboard with:
- Task progress bars
- Real-time updates
- Workflow diagram
- Log viewer

### 3. Press Ctrl+C to exit

---

## Integration with Orchestrator

### Step 1: Create Dashboard Module

```bash
mkdir -p src/dashboard/components
touch src/dashboard/index.tsx
touch src/dashboard/events.ts
touch src/dashboard/components/TaskCard.tsx
```

### Step 2: Define Event Types

**src/dashboard/events.ts**

```typescript
import { EventEmitter } from 'events';

export interface TaskEvent {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  agent?: string;
}

export interface LogEvent {
  timestamp: number;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  agent?: string;
}

export class DashboardEventBus extends EventEmitter {
  emitTaskUpdate(task: TaskEvent) {
    this.emit('task:update', task);
  }

  emitLog(log: LogEvent) {
    this.emit('log', log);
  }

  emitWorkflowStep(step: number) {
    this.emit('workflow:step', step);
  }
}

export const dashboardEvents = new DashboardEventBus();
```

### Step 3: Create Dashboard Component

**src/dashboard/index.tsx**

```typescript
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { DashboardEventBus, TaskEvent, LogEvent } from './events';
import TaskCard from './components/TaskCard';

interface DashboardProps {
  eventBus: DashboardEventBus;
}

const Dashboard: React.FC<DashboardProps> = ({ eventBus }) => {
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);

  useEffect(() => {
    const handleTaskUpdate = (task: TaskEvent) => {
      setTasks(prev => {
        const exists = prev.find(t => t.id === task.id);
        if (exists) {
          return prev.map(t => t.id === task.id ? task : t);
        }
        return [...prev, task];
      });
    };

    const handleLog = (log: LogEvent) => {
      setLogs(prev => [...prev, log].slice(-20)); // Keep last 20
    };

    eventBus.on('task:update', handleTaskUpdate);
    eventBus.on('log', handleLog);

    return () => {
      eventBus.off('task:update', handleTaskUpdate);
      eventBus.off('log', handleLog);
    };
  }, [eventBus]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2}>
        <Text bold>🤖 Claude Code Buddy Dashboard</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Active Tasks:</Text>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </Box>

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Box flexDirection="column">
          <Text bold dimColor>Recent Logs:</Text>
          {logs.slice(-5).map((log, i) => (
            <Text key={i} color={
              log.level === 'error' ? 'red' :
              log.level === 'success' ? 'green' :
              log.level === 'warning' ? 'yellow' : 'blue'
            }>
              [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export function startDashboard(eventBus: DashboardEventBus) {
  const { unmount } = render(<Dashboard eventBus={eventBus} />);
  return { unmount };
}
```

### Step 4: Integrate with Orchestrator

**src/orchestrator/index.ts**

```typescript
import { dashboardEvents, startDashboard } from '../dashboard';
import { AgentOrchestrator } from './AgentOrchestrator';

async function main() {
  // Start dashboard UI
  const { unmount } = startDashboard(dashboardEvents);

  // Create orchestrator
  const orchestrator = new AgentOrchestrator({
    eventBus: dashboardEvents
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    unmount();
    process.exit(0);
  });

  // Run tasks
  await orchestrator.executeTasks();
}

main().catch(console.error);
```

### Step 5: Emit Events from Agents

**src/agents/BaseAgent.ts**

```typescript
import { DashboardEventBus } from '../dashboard/events';

export class BaseAgent {
  constructor(
    protected name: string,
    protected eventBus: DashboardEventBus
  ) {}

  protected log(level: 'info' | 'success' | 'error', message: string) {
    this.eventBus.emitLog({
      timestamp: Date.now(),
      level,
      message: `[${this.name}] ${message}`,
      agent: this.name
    });
  }

  protected updateProgress(taskId: string, progress: number) {
    this.eventBus.emitTaskUpdate({
      id: taskId,
      name: this.name,
      status: progress === 100 ? 'complete' : 'running',
      progress,
      agent: this.name
    });
  }

  async execute(taskId: string) {
    this.log('info', 'Starting task...');
    this.updateProgress(taskId, 0);

    try {
      // Do work...
      for (let i = 0; i <= 100; i += 20) {
        await this.doWork();
        this.updateProgress(taskId, i);
      }

      this.log('success', 'Task completed!');
    } catch (error) {
      this.log('error', `Task failed: ${error.message}`);
      this.updateProgress(taskId, 100); // Mark as complete with error status
    }
  }

  protected async doWork() {
    // Override in subclass
  }
}
```

### Step 6: Add npm Script

**package.json**

```json
{
  "scripts": {
    "dashboard": "tsx src/orchestrator/index.ts",
    "dashboard:demo": "tsx examples/terminal-ui-poc.tsx"
  }
}
```

---

## Testing

### Unit Tests (vitest)

**src/dashboard/__tests__/Dashboard.test.tsx**

```typescript
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render as inkRender } from 'ink-testing-library';
import Dashboard from '../index';
import { DashboardEventBus } from '../events';

describe('Dashboard', () => {
  it('should display tasks', () => {
    const eventBus = new DashboardEventBus();
    const { lastFrame } = inkRender(<Dashboard eventBus={eventBus} />);

    eventBus.emitTaskUpdate({
      id: '1',
      name: 'Test Task',
      status: 'running',
      progress: 50
    });

    expect(lastFrame()).toContain('Test Task');
    expect(lastFrame()).toContain('50%');
  });
});
```

### Integration Test

```bash
# Run the POC and verify output
npm run dashboard:demo

# Expected: Should show live updates without crashes
```

---

## Customization

### Custom Colors

```typescript
import chalk from 'chalk';

const theme = {
  primary: chalk.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue
};

<Text color={theme.success('✓ Done!')}>
```

### Custom Spinners

```typescript
import Spinner from 'ink-spinner';

// Types: dots, line, pipe, dots2, etc.
<Spinner type="dots12" />
```

### Custom Borders

```typescript
<Box borderStyle="round">        // ╭─╮
<Box borderStyle="single">       // ┌─┐
<Box borderStyle="double">       // ╔═╗
<Box borderStyle="classic">      // +-+
```

---

## Performance Optimization

### 1. Throttle Updates

```typescript
import { throttle } from 'lodash';

const throttledUpdate = throttle((task) => {
  setTasks(prev => updateTask(prev, task));
}, 100); // Update max every 100ms
```

### 2. Limit Log History

```typescript
const [logs, setLogs] = useState<LogEvent[]>([]);

const addLog = (log: LogEvent) => {
  setLogs(prev => [...prev, log].slice(-50)); // Keep last 50
};
```

### 3. Memoize Components

```typescript
import { memo } from 'react';

const TaskCard = memo(({ task }) => {
  // ...
}, (prev, next) => prev.task.progress === next.task.progress);
```

---

## Troubleshooting

### Issue: UI not updating

**Cause:** Events not emitted correctly

**Fix:**
```typescript
// Make sure eventBus is the same instance
import { dashboardEvents } from './dashboard/events';

// Not this:
const eventBus = new DashboardEventBus(); // ❌ Creates new instance
```

---

### Issue: Flickering UI

**Cause:** Too frequent updates

**Fix:**
```typescript
// Throttle updates
import { throttle } from 'lodash';

const update = throttle(() => {
  // Update logic
}, 100);
```

---

### Issue: Unicode characters broken

**Cause:** Terminal doesn't support unicode

**Fix:**
```typescript
import isUnicodeSupported from 'is-unicode-supported';

const icon = isUnicodeSupported() ? '✓' : '+';
```

---

## Next Steps

1. **Run the POC:**
   ```bash
   npm run dashboard:demo
   ```

2. **Integrate with your orchestrator:**
   - Follow Step 1-6 above
   - Emit events from your agents
   - Test real-time updates

3. **Customize:**
   - Add your own components
   - Customize colors/themes
   - Add more widgets (tables, charts)

4. **Deploy:**
   ```bash
   npm run build
   npm run dashboard
   ```

---

## Resources

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Ink Components](https://github.com/vadimdemedes/ink#useful-components)
- [chalk Documentation](https://github.com/chalk/chalk)
- [ora Documentation](https://github.com/sindresorhus/ora)
- [Full Assessment](../docs/TERMINAL_UI_ASSESSMENT.md)

---

Happy building! 🚀
