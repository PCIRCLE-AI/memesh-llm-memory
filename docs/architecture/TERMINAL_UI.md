# Terminal UI Architecture

Visual guide to the recommended architecture for smart-agents dashboard.

---

## System Overview

```
┌───────────────────────────────────────────────────────────┐
│                    Smart Agents System                     │
└───────────────────────────────────────────────────────────┘
                           │
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────┐                  ┌──────────────────┐
│  Orchestrator    │                  │  Terminal UI     │
│  (Business Logic)│ ◄───────────────►│  (Presentation)  │
└──────────────────┘                  └──────────────────┘
        │                                     ▲
        │                                     │
        │                            EventEmitter
        │                                     │
        ▼                                     │
┌──────────────────┐                          │
│  Agents          │                          │
│  - Research      │──────────────────────────┘
│  - CodeReview    │
│  - Testing       │
│  - Deploy        │
└──────────────────┘
```

---

## Component Architecture

```
src/
├── orchestrator/
│   ├── index.ts                    # Main entry point
│   ├── AgentOrchestrator.ts       # Orchestration logic
│   └── agents/
│       ├── ResearchAgent.ts
│       ├── CodeReviewAgent.ts
│       └── ...
│
└── dashboard/
    ├── index.tsx                   # Dashboard entry
    ├── events.ts                   # Event definitions
    │
    ├── components/
    │   ├── Header.tsx
    │   ├── TaskCard.tsx
    │   ├── ProgressBar.tsx
    │   ├── LogViewer.tsx
    │   ├── WorkflowDiagram.tsx
    │   └── StatisticsPanel.tsx
    │
    └── __tests__/
        └── Dashboard.test.tsx
```

---

## Data Flow

```
1. User starts orchestrator
   │
   ├─> npm run orchestrator
   │
   └─> src/orchestrator/index.ts

2. Orchestrator initializes
   │
   ├─> Create EventEmitter
   ├─> Start Dashboard (Ink)
   └─> Initialize agents

3. Agent executes task
   │
   ├─> Agent.execute()
   ├─> emit('task:start', task)
   ├─> Do work...
   ├─> emit('task:progress', progress)
   └─> emit('task:complete', result)

4. Dashboard updates
   │
   ├─> Listen to events
   ├─> Update React state
   ├─> Re-render UI
   └─> User sees real-time updates
```

---

## Event System

### Event Types

```typescript
// events.ts
export interface TaskEvent {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  agent: string;
  timestamp: number;
}

export interface LogEvent {
  timestamp: number;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  agent?: string;
}

export interface WorkflowEvent {
  step: number;
  totalSteps: number;
  name: string;
}

export interface StatisticsEvent {
  totalTasks: number;
  completed: number;
  running: number;
  failed: number;
  avgDuration: number;
}
```

---

### Event Flow

```
Orchestrator                  EventBus                 Dashboard
    │                            │                         │
    │──── task:start ────────────>│────────────────────────>│
    │                            │                         │ setState([...tasks, newTask])
    │                            │                         │ render()
    │                            │                         │
    │──── task:progress ─────────>│────────────────────────>│
    │                            │                         │ updateTask(progress)
    │                            │                         │ render()
    │                            │                         │
    │──── task:complete ─────────>│────────────────────────>│
    │                            │                         │ markComplete()
    │                            │                         │ render()
    │                            │                         │
    │──── log ───────────────────>│────────────────────────>│
    │                            │                         │ addLog()
                                                           │ render()
```

---

## Component Hierarchy

```
<Dashboard>
  │
  ├─> <Header>
  │     └─> Smart Agents Dashboard
  │
  ├─> <StatisticsPanel>
  │     ├─> Total tasks
  │     ├─> Completed
  │     ├─> Running
  │     └─> Failed
  │
  ├─> <TaskList>
  │     ├─> <TaskCard task={task1} />
  │     ├─> <TaskCard task={task2} />
  │     └─> <TaskCard task={task3} />
  │
  ├─> <WorkflowDiagram>
  │     ├─> Step 1: Initialize
  │     ├─> Step 2: Execute
  │     └─> Step 3: Complete
  │
  └─> <LogViewer>
        ├─> [10:30:15] Task started
        ├─> [10:30:17] Progress: 50%
        └─> [10:30:20] Task completed
```

---

## State Management

```typescript
// Dashboard state
const Dashboard = ({ eventBus }) => {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowState>();
  const [stats, setStats] = useState<Statistics>();

  // Event handlers
  useEffect(() => {
    eventBus.on('task:update', handleTaskUpdate);
    eventBus.on('log', handleLog);
    eventBus.on('workflow:step', handleWorkflowStep);
    eventBus.on('statistics', handleStatistics);

    return cleanup;
  }, []);

  // Derived state
  const overallProgress = useMemo(() =>
    calculateOverallProgress(tasks),
    [tasks]
  );

  return <UI />;
};
```

---

## Lifecycle

```
Application Lifecycle:

1. START
   ├─> Initialize EventEmitter
   ├─> render(<Dashboard />)
   └─> Create orchestrator

2. RUNNING
   ├─> Agents emit events
   ├─> Dashboard listens
   ├─> UI updates in real-time
   └─> User monitors progress

3. SHUTDOWN
   ├─> Ctrl+C signal
   ├─> Cleanup event listeners
   ├─> Unmount Ink
   └─> Exit process
```

---

## Performance Optimization

### 1. Event Throttling

```typescript
// Throttle high-frequency events
const throttledUpdate = throttle((task) => {
  setTasks(prev => updateTask(prev, task));
}, 100); // Max 10 updates/sec

eventBus.on('task:progress', throttledUpdate);
```

---

### 2. Component Memoization

```typescript
// Memoize expensive components
const TaskCard = memo(({ task }) => {
  return <UI />;
}, (prev, next) => {
  // Only re-render if progress changed
  return prev.task.progress === next.task.progress;
});
```

---

### 3. State Updates

```typescript
// Batch state updates
const handleMultipleEvents = (events: Event[]) => {
  setTasks(prev => {
    let updated = prev;
    events.forEach(event => {
      updated = updateTask(updated, event);
    });
    return updated;
  });
};
```

---

## Error Handling

```
Error Handling Strategy:

1. Agent Level
   ├─> try/catch in agent execution
   ├─> emit('task:error', error)
   └─> Log error details

2. Dashboard Level
   ├─> Receive error events
   ├─> Display error indicator
   └─> Show error in logs

3. System Level
   ├─> Process error handlers
   ├─> Graceful shutdown
   └─> Cleanup resources

Example:
  try {
    await agent.execute();
  } catch (error) {
    eventBus.emit('task:error', {
      taskId,
      error: error.message,
      stack: error.stack
    });
  }
```

---

## Testing Strategy

```
Testing Layers:

1. Unit Tests (vitest)
   ├─> Test components in isolation
   ├─> Mock EventEmitter
   └─> Verify rendering

2. Integration Tests
   ├─> Test event flow
   ├─> Verify state updates
   └─> Check UI consistency

3. E2E Tests
   ├─> Run full orchestrator
   ├─> Verify dashboard updates
   └─> Test user interactions

Example:
  describe('Dashboard', () => {
    it('updates on task event', () => {
      const eventBus = new EventEmitter();
      const { lastFrame } = render(
        <Dashboard eventBus={eventBus} />
      );

      eventBus.emit('task:update', testTask);

      expect(lastFrame()).toContain('Test Task');
    });
  });
```

---

## Deployment

```
Deployment Steps:

1. Build
   ├─> npm run build
   └─> TypeScript → JavaScript

2. Package
   ├─> Bundle dependencies
   └─> Create executable

3. Run
   ├─> npm start
   └─> or: node dist/orchestrator/index.js

Production Checklist:
  ✅ Environment variables set
  ✅ Dependencies installed
  ✅ Terminal supports colors
  ✅ Logs configured
  ✅ Error handling tested
```

---

## Scaling Considerations

### Single Instance (Current)

```
Good for:
  ✅ Solo developer
  ✅ Small team
  ✅ Up to 50 concurrent tasks
  ✅ M2 MacBook Pro

Limitations:
  ⚠️ Single process
  ⚠️ Memory bound (~20MB per dashboard)
  ⚠️ CPU bound (M2: can handle ~100 tasks)
```

---

### Multi-Instance (Future)

```
If needed:
  - Separate dashboard process (IPC)
  - Multiple orchestrator instances
  - Distributed task queue
  - Centralized logging

Example:
  ┌─────────────┐
  │ Dashboard   │
  │ (Terminal)  │
  └──────┬──────┘
         │ IPC
         │
  ┌──────┴──────┐
  │ Orchestrator│
  │ (Main)      │
  └──────┬──────┘
         │
    ┌────┴────┐
    │ Workers │
    └─────────┘
```

---

## File Structure Example

```
smart-agents/
├── src/
│   ├── orchestrator/
│   │   ├── index.ts                 # Entry point + Dashboard init
│   │   ├── AgentOrchestrator.ts    # Core orchestration
│   │   └── agents/
│   │       ├── BaseAgent.ts        # Base class with events
│   │       ├── ResearchAgent.ts
│   │       └── ...
│   │
│   └── dashboard/
│       ├── index.tsx               # Main dashboard component
│       ├── events.ts               # Event types + EventBus
│       │
│       └── components/
│           ├── Header.tsx
│           ├── TaskCard.tsx
│           ├── ProgressBar.tsx
│           ├── LogViewer.tsx
│           ├── WorkflowDiagram.tsx
│           └── StatisticsPanel.tsx
│
├── examples/
│   ├── terminal-ui-poc.tsx         # Standalone demo
│   └── component-library.tsx       # Component showcase
│
└── package.json
    └── scripts:
        ├── "orchestrator": "tsx src/orchestrator/index.ts"
        └── "demo": "tsx examples/terminal-ui-poc.tsx"
```

---

## Integration Checklist

```
□ Install dependencies (ink, chalk, ora, boxen)
□ Create dashboard/ directory structure
□ Define event types in events.ts
□ Create EventBus singleton
□ Build Dashboard component with useEffect listeners
□ Update BaseAgent to emit events
□ Initialize dashboard in orchestrator entry point
□ Test with example tasks
□ Add error handling
□ Write unit tests
□ Document usage
□ Deploy
```

---

## Quick Reference

**Start Dashboard:**
```typescript
import { render } from 'ink';
import Dashboard from './dashboard';
import { eventBus } from './dashboard/events';

render(<Dashboard eventBus={eventBus} />);
```

**Emit Events:**
```typescript
eventBus.emit('task:update', {
  id: '123',
  name: 'Research',
  status: 'running',
  progress: 50
});
```

**Listen to Events:**
```typescript
useEffect(() => {
  const handler = (task) => setTasks(prev => [...prev, task]);
  eventBus.on('task:update', handler);
  return () => eventBus.off('task:update', handler);
}, []);
```

---

## Resources

- **Full Assessment:** `/docs/TERMINAL_UI_ASSESSMENT.md`
- **Setup Guide:** `/examples/SETUP_GUIDE.md`
- **Quick Reference:** `/examples/QUICK_REFERENCE.md`
- **POC Demo:** `/examples/terminal-ui-poc.tsx`
- **Component Library:** `/examples/component-library.tsx`

---

**This architecture provides:**
- ✅ Real-time updates
- ✅ Modular components
- ✅ Event-driven design
- ✅ Type safety (TypeScript)
- ✅ Testable code
- ✅ Scalable foundation
