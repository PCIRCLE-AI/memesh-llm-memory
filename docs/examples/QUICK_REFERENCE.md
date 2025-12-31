# Terminal UI Quick Reference Card

One-page cheat sheet for building terminal UIs with Ink.

---

## Installation

```bash
npm install ink ink-spinner chalk ora boxen
npm install -D @types/react
```

---

## Basic Structure

```typescript
import React from 'react';
import { render, Box, Text } from 'ink';

const App = () => (
  <Box flexDirection="column">
    <Text color="green">Hello World!</Text>
  </Box>
);

render(<App />);
```

---

## Layout Components

### Box (Container)

```typescript
// Column layout
<Box flexDirection="column">
  <Text>Row 1</Text>
  <Text>Row 2</Text>
</Box>

// Row layout (default)
<Box flexDirection="row">
  <Text>Col 1</Text>
  <Text>Col 2</Text>
</Box>

// With borders
<Box borderStyle="round" borderColor="cyan">
  <Text>Content</Text>
</Box>

// With spacing
<Box padding={1} margin={2}>
  <Text>Spaced content</Text>
</Box>
```

**Border Styles:**
- `"single"` - ┌─┐
- `"double"` - ╔═╗
- `"round"` - ╭─╮
- `"classic"` - +-+

---

### Text (Content)

```typescript
// Colors
<Text color="red">Error</Text>
<Text color="green">Success</Text>
<Text color="yellow">Warning</Text>
<Text color="cyan">Info</Text>

// Styles
<Text bold>Bold text</Text>
<Text dimColor>Dimmed text</Text>
<Text underline>Underlined</Text>
<Text italic>Italic</Text>

// Background
<Text backgroundColor="blue">Highlighted</Text>
```

**Available Colors:**
`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`

---

## Common Patterns

### Status Indicator

```typescript
const StatusIcon = ({ status }: { status: string }) => {
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    pending: '○',
    running: <Spinner type="dots" />
  };

  const colors = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    pending: 'gray',
    running: 'cyan'
  };

  return (
    <Text color={colors[status]}>
      {icons[status]}
    </Text>
  );
};
```

---

### Progress Bar

```typescript
const ProgressBar = ({ progress, width = 20 }: Props) => {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="cyan">{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {progress}%</Text>
    </Box>
  );
};
```

---

### Task Card

```typescript
const TaskCard = ({ task }: { task: Task }) => (
  <Box borderStyle="round" borderColor="cyan" paddingX={1}>
    <Box flexDirection="column">
      <Box>
        <StatusIcon status={task.status} />
        <Text bold> {task.name}</Text>
      </Box>
      <ProgressBar progress={task.progress} />
    </Box>
  </Box>
);
```

---

### Log Entry

```typescript
const LogEntry = ({ log }: { log: LogEvent }) => {
  const colors = {
    info: 'blue',
    success: 'green',
    error: 'red',
    warning: 'yellow'
  };

  return (
    <Box>
      <Text dimColor>[{log.timestamp}]</Text>
      <Text color={colors[log.level]}> {log.message}</Text>
    </Box>
  );
};
```

---

## Spinners

```typescript
import Spinner from 'ink-spinner';

// Basic spinner
<Text color="cyan">
  <Spinner type="dots" />
</Text>

// With label
<Box>
  <Text color="cyan"><Spinner /></Text>
  <Text> Loading...</Text>
</Box>
```

**Spinner Types:**
`dots`, `line`, `pipe`, `dots2`, `dots3`, `dots4`, `dots5`, etc.

---

## Hooks

### useState

```typescript
const [count, setCount] = useState(0);

<Text>Count: {count}</Text>
```

---

### useEffect

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);

  return () => clearInterval(timer);
}, []);
```

---

### useInput (Keyboard)

```typescript
import { useInput } from 'ink';

useInput((input, key) => {
  if (input === 'q' || key.escape) {
    process.exit(0);
  }

  if (key.upArrow) {
    // Handle up
  }
});
```

---

## Event-Driven Updates

### Setup EventEmitter

```typescript
import { EventEmitter } from 'events';

const eventBus = new EventEmitter();

const Dashboard = ({ eventBus }: Props) => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const handler = (task: Task) => {
      setTasks(prev => [...prev, task]);
    };

    eventBus.on('task:update', handler);

    return () => {
      eventBus.off('task:update', handler);
    };
  }, [eventBus]);

  return (
    <Box flexDirection="column">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </Box>
  );
};
```

---

### Emit Events

```typescript
// From orchestrator
eventBus.emit('task:update', {
  id: '123',
  name: 'Research',
  progress: 50
});

eventBus.emit('log', {
  timestamp: Date.now(),
  level: 'info',
  message: 'Task started'
});
```

---

## Utilities

### chalk (Colors)

```typescript
import chalk from 'chalk';

console.log(chalk.red('Error!'));
console.log(chalk.green.bold('Success!'));
console.log(chalk.blue.underline('Link'));

// Chain styles
console.log(
  chalk.bgBlue.yellow.bold('Highlighted')
);
```

---

### ora (Standalone Spinners)

```typescript
import ora from 'ora';

const spinner = ora('Loading...').start();

setTimeout(() => {
  spinner.succeed('Done!');
  // or: spinner.fail('Failed!')
}, 2000);
```

---

### boxen (Boxes)

```typescript
import boxen from 'boxen';

console.log(boxen('Success!', {
  padding: 1,
  borderColor: 'green',
  borderStyle: 'round'
}));

// Output:
// ╭──────────╮
// │          │
// │ Success! │
// │          │
// ╰──────────╯
```

---

## Testing

```typescript
import { render } from 'ink-testing-library';

describe('Dashboard', () => {
  it('displays tasks', () => {
    const { lastFrame } = render(
      <Dashboard tasks={[{ name: 'Test' }]} />
    );

    expect(lastFrame()).toContain('Test');
  });
});
```

---

## Symbols & Icons

### Status
- ✓ Success
- ✗ Error
- ⚠ Warning
- ℹ Info
- ○ Pending
- ● Active

### Progress
- █ Filled
- ░ Empty
- ▶ Playing
- ⏸ Paused
- ⏹ Stopped

### Navigation
- ↑ ↓ ← → Arrows
- ▲ ▼ ◀ ▶ Triangles

### Workflow
- ➜ Next
- ✔ Done
- ⋯ In progress

---

## Performance Tips

### 1. Throttle Updates

```typescript
import { throttle } from 'lodash';

const update = throttle((data) => {
  setTasks(data);
}, 100); // Max 10 updates/sec
```

---

### 2. Memoize Components

```typescript
import { memo } from 'react';

const TaskCard = memo(({ task }) => {
  // ...
}, (prev, next) =>
  prev.task.progress === next.task.progress
);
```

---

### 3. Limit History

```typescript
const addLog = (log: LogEvent) => {
  setLogs(prev => [...prev, log].slice(-50));
};
```

---

## Common Issues

### UI Not Updating
**Problem:** Events emitted but UI doesn't update
**Fix:** Ensure EventEmitter instance is shared

```typescript
// ❌ Wrong
const eventBus = new EventEmitter(); // Creates new instance

// ✅ Correct
import { eventBus } from './events'; // Shared instance
```

---

### Flickering
**Problem:** UI updates too fast
**Fix:** Throttle updates

```typescript
const update = throttle(() => {
  // Update logic
}, 100);
```

---

### Unicode Broken
**Problem:** Symbols don't display
**Fix:** Check support and use fallbacks

```typescript
import isUnicodeSupported from 'is-unicode-supported';

const icon = isUnicodeSupported() ? '✓' : '+';
```

---

## Example: Full Dashboard

```typescript
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface Task {
  id: string;
  name: string;
  progress: number;
  status: 'running' | 'complete';
}

const Dashboard = ({ eventBus }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    eventBus.on('task:update', (task: Task) => {
      setTasks(prev => {
        const exists = prev.find(t => t.id === task.id);
        return exists
          ? prev.map(t => t.id === task.id ? task : t)
          : [...prev, task];
      });
    });

    return () => eventBus.removeAllListeners();
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan">
        <Text bold> Dashboard </Text>
      </Box>

      {tasks.map(task => (
        <Box key={task.id}>
          <Text color={task.status === 'complete' ? 'green' : 'cyan'}>
            {task.status === 'running' ? <Spinner /> : '✓'}
          </Text>
          <Text> {task.name} ({task.progress}%)</Text>
        </Box>
      ))}
    </Box>
  );
};

const eventBus = new EventEmitter();
render(<Dashboard eventBus={eventBus} />);
```

---

## Resources

- **Docs:** https://github.com/vadimdemedes/ink
- **Components:** https://github.com/vadimdemedes/ink#useful-components
- **Examples:** `/Users/ktseng/Developer/Projects/claude-code-buddy/examples/`

---

**Quick Start:**
```bash
npx tsx examples/terminal-ui-poc.tsx
```
