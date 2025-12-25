# Asynchronous Agent Execution System

## 🎯 Vision

**"用戶可以一邊跟 Claude Code chat，while agents are working in the background"**

Users can continue chatting with Claude Code while smart-agents work on tasks in the background - no more waiting for processes to finish.

## 🚀 Core Concept

```
User: "Help me refactor the authentication system"
  ↓
Claude Code: "Sure! I'm starting the analysis in the background.
              What else can I help you with?"
  ↓
[Background: architect-reviewer + refactoring-specialist working...]
  ↓
User: "Also, can you explain how OAuth works?"
  ↓
Claude Code: "Of course! [Explains OAuth...]

              ✅ Background task completed:
              - Analyzed auth system
              - Found 3 improvement areas
              - Created refactoring plan

              Would you like to see the results?"
```

## 🏗️ Architecture

### 1. Task Queue System

```typescript
/**
 * Background Task Queue
 * Manages asynchronous agent execution
 */
export class BackgroundTaskQueue {
  private queue: Map<string, BackgroundTask> = new Map();
  private running: Set<string> = new Set();
  private maxConcurrent: number = 3; // Based on system resources

  /**
   * Submit task for background execution
   */
  async submit(task: BackgroundTask): Promise<string> {
    const taskId = generateTaskId();
    this.queue.set(taskId, task);

    // Start execution if resources available
    this.tryStartNext();

    return taskId; // Return immediately
  }

  /**
   * Get task status (non-blocking)
   */
  getStatus(taskId: string): TaskStatus {
    // Returns: pending | running | completed | failed
  }

  /**
   * Get task result (non-blocking)
   */
  getResult(taskId: string): TaskResult | null {
    // Returns result if available, null if still running
  }

  /**
   * Stream task progress (real-time updates)
   */
  streamProgress(taskId: string): AsyncIterator<ProgressUpdate> {
    // Yields progress updates as they happen
  }
}
```

### 2. Task Management Types

```typescript
export interface BackgroundTask {
  id: string;
  type: 'agent_execution' | 'orchestration' | 'analysis';
  description: string;
  agentType: string;              // Which subagent to use
  input: any;                     // Task input
  priority: number;               // 1-10
  estimatedDuration?: number;     // Seconds
  dependencies?: string[];        // Other task IDs that must complete first
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskStatus {
  id: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;               // 0-100
  currentStep?: string;           // What the agent is doing now
  estimatedTimeRemaining?: number; // Seconds
  result?: TaskResult;
  error?: Error;
}

export interface TaskResult {
  success: boolean;
  output: any;
  metrics: {
    duration: number;
    tokensUsed: number;
    agentsInvolved: string[];
  };
  artifacts?: {                   // Files created/modified
    files: string[];
    changes: number;
  };
}

export interface ProgressUpdate {
  timestamp: Date;
  step: string;
  progress: number;               // 0-100
  message: string;
  metadata?: any;
}
```

### 3. Orchestrator Integration

```typescript
/**
 * Enhanced Orchestrator with async support
 */
export class AsyncOrchestrator extends Orchestrator {
  private taskQueue: BackgroundTaskQueue;

  /**
   * Execute task asynchronously (non-blocking)
   */
  async executeTaskAsync(task: Task): Promise<string> {
    const backgroundTask: BackgroundTask = {
      id: generateTaskId(),
      type: 'orchestration',
      description: task.description,
      agentType: this.selectAgent(task),
      input: task,
      priority: task.priority ?? 5,
      createdAt: new Date(),
    };

    const taskId = await this.taskQueue.submit(backgroundTask);

    // Return taskId immediately, don't wait for completion
    return taskId;
  }

  /**
   * Execute task synchronously (blocking, legacy)
   */
  async executeTask(task: Task): Promise<TaskExecutionResult> {
    // Original blocking behavior for backwards compatibility
  }

  /**
   * Check if background task is done
   */
  async checkTask(taskId: string): Promise<TaskStatus> {
    return this.taskQueue.getStatus(taskId);
  }

  /**
   * Get background task result (if ready)
   */
  async getTaskResult(taskId: string): Promise<TaskResult | null> {
    return this.taskQueue.getResult(taskId);
  }

  /**
   * Stream task progress in real-time
   */
  async* streamTaskProgress(taskId: string): AsyncIterator<ProgressUpdate> {
    yield* this.taskQueue.streamProgress(taskId);
  }
}
```

### 4. User-Facing API

```typescript
/**
 * Smart-Agents CLI with async support
 */

// Start a task in background
$ smart-agents execute "Analyze auth system" --async
→ Task started: task_abc123
→ You can continue chatting. I'll notify you when done.

// Check task status
$ smart-agents status task_abc123
→ Status: Running (65% complete)
→ Current step: Analyzing dependencies
→ Est. time remaining: 2m 15s

// Get task result (when ready)
$ smart-agents result task_abc123
→ Task completed ✅
→ [Shows full result]

// List all background tasks
$ smart-agents list
→ Running (2):
  - task_abc123: Analyzing auth system (65%)
  - task_def456: Refactoring API layer (23%)
→ Completed (5):
  - task_ghi789: Code review (✅ 3m ago)
  - ...
```

### 5. Integration with Claude Code

```typescript
/**
 * Claude Code can now:
 * 1. Start agents in background
 * 2. Continue conversation with user
 * 3. Show progress notifications
 * 4. Present results when ready
 */

// Example conversation flow:

User: "Help me refactor the auth system"

Claude Code:
  ✅ Started background analysis (task_abc123)
  ✅ I'll work on this while we chat

  What would you like to know about the refactoring?

User: "What are the main risks?"

Claude Code:
  The main risks in auth refactoring are:
  1. Breaking existing sessions
  2. Token invalidation issues
  3. ...

  🔔 Background task update: 45% complete

  Would you like me to create a migration plan?

User: "Yes please"

Claude Code:
  ✅ Started migration planning (task_def456)

  While that's running, here's what I recommend:
  ...

  🔔 Background task completed: task_abc123 ✅
     Analysis found 3 improvement areas

     Would you like to see the details?
```

## 📊 Resource Management

### Concurrent Task Limits

```typescript
export interface ResourceLimits {
  maxConcurrentTasks: number;        // Total tasks running
  maxConcurrentE2E: number;          // E2E tests (heavy)
  maxConcurrentBuilds: number;       // Build tasks
  maxConcurrentAgents: number;       // Subagents spawned

  cpuThreshold: number;              // Don't start new tasks if CPU > N%
  memoryThreshold: number;           // Don't start new tasks if memory > N%
}

const DEFAULT_LIMITS: ResourceLimits = {
  maxConcurrentTasks: 5,
  maxConcurrentE2E: 1,              // Only 1 E2E at a time (learned from freeze)
  maxConcurrentBuilds: 2,
  maxConcurrentAgents: 6,

  cpuThreshold: 70,
  memoryThreshold: 85,
};
```

### Smart Queue Management

```typescript
/**
 * Priority-based queue with resource awareness
 */
export class SmartTaskQueue {
  /**
   * Start next task only if resources available
   */
  private async tryStartNext(): Promise<void> {
    // Check system resources
    const resources = await getSystemResources();

    if (resources.cpuUsage > this.limits.cpuThreshold) {
      console.log('⏸️  Pausing queue: CPU usage too high');
      return;
    }

    if (resources.memoryUsage > this.limits.memoryThreshold) {
      console.log('⏸️  Pausing queue: Memory usage too high');
      return;
    }

    // Check concurrent limits
    if (this.running.size >= this.limits.maxConcurrentTasks) {
      return;
    }

    // Find highest priority pending task
    const nextTask = this.findNextTask();
    if (!nextTask) return;

    // Check task-specific limits (E2E, builds, etc.)
    if (!this.canStartTask(nextTask)) {
      return;
    }

    // Start the task
    await this.startTask(nextTask);
  }

  /**
   * Task-specific resource checks
   */
  private canStartTask(task: BackgroundTask): boolean {
    if (task.type === 'e2e_test') {
      const runningE2E = Array.from(this.running.values())
        .filter(t => t.type === 'e2e_test').length;

      return runningE2E < this.limits.maxConcurrentE2E;
    }

    if (task.type === 'build') {
      const runningBuilds = Array.from(this.running.values())
        .filter(t => t.type === 'build').length;

      return runningBuilds < this.limits.maxConcurrentBuilds;
    }

    return true;
  }
}
```

## 🔔 Progress Notifications

### Real-time Updates

```typescript
/**
 * Event-based progress system
 */
export class TaskProgressEmitter extends EventEmitter {
  /**
   * Emit progress update
   */
  updateProgress(taskId: string, update: ProgressUpdate): void {
    this.emit(`progress:${taskId}`, update);
    this.emit('progress', { taskId, ...update });
  }

  /**
   * Emit task completion
   */
  completeTask(taskId: string, result: TaskResult): void {
    this.emit(`complete:${taskId}`, result);
    this.emit('complete', { taskId, result });
  }

  /**
   * Subscribe to task progress
   */
  onProgress(taskId: string, callback: (update: ProgressUpdate) => void): void {
    this.on(`progress:${taskId}`, callback);
  }

  /**
   * Subscribe to task completion
   */
  onComplete(taskId: string, callback: (result: TaskResult) => void): void {
    this.on(`complete:${taskId}`, callback);
  }
}
```

### Notification Strategies

```typescript
export enum NotificationStrategy {
  SILENT = 'silent',           // No notifications, user must check
  MILESTONE = 'milestone',     // Only notify at 25%, 50%, 75%, 100%
  VERBOSE = 'verbose',         // Notify every progress update
  COMPLETION_ONLY = 'completion', // Only notify when done
}

export interface NotificationConfig {
  strategy: NotificationStrategy;
  minProgressDelta: number;    // Only notify if progress changed by N%
  throttleMs: number;          // Max 1 notification per N ms
}
```

## 🎨 User Experience

### Terminal UI

```
╔════════════════════════════════════════════════════════╗
║         SMART-AGENTS BACKGROUND TASKS                ║
╠════════════════════════════════════════════════════════╣
║ ⏳ task_abc123 | Analyzing auth system       [████░] 65%║
║    └─ Current: Analyzing dependencies                 ║
║    └─ Est: 2m 15s remaining                           ║
║                                                        ║
║ ⏳ task_def456 | Refactoring API layer       [█░░░░] 23%║
║    └─ Current: Running tests                          ║
║    └─ Est: 4m 30s remaining                           ║
║                                                        ║
║ ✅ task_ghi789 | Code review                 Completed ║
║    └─ Duration: 3m 42s                                ║
╚════════════════════════════════════════════════════════╝

💬 You can continue chatting. I'll notify you when tasks complete.
```

### Claude Code Integration

```
[User Message Panel]
───────────────────────────────────────────
User: Help me refactor the auth system

[Claude Response Panel]
───────────────────────────────────────────
Claude: I've started analyzing the auth system in the background.

[Background Tasks Panel - Collapsible]
───────────────────────────────────────────
🔄 task_abc123: Analyzing auth system (45%)
   ├─ Step 1: Parse auth code ✅
   ├─ Step 2: Analyze dependencies ⏳
   └─ Step 3: Generate recommendations ⏸️
───────────────────────────────────────────

What would you like to know about the refactoring?

[User continues chatting...]
```

## 🔧 Implementation Phases

### Phase 1: Core Queue System (Week 1)
- [ ] Implement BackgroundTaskQueue
- [ ] Task status tracking
- [ ] Resource limits
- [ ] Basic progress updates

### Phase 2: Orchestrator Integration (Week 2)
- [ ] AsyncOrchestrator with executeTaskAsync()
- [ ] Task result retrieval
- [ ] Progress streaming
- [ ] Error handling

### Phase 3: Progress Notifications (Week 3)
- [ ] Event emitter system
- [ ] Notification strategies
- [ ] Terminal UI updates
- [ ] Progress bars

### Phase 4: Claude Code Integration (Week 4)
- [ ] Claude Code plugin/hook
- [ ] Background task panel
- [ ] Real-time updates
- [ ] User notifications

### Phase 5: Advanced Features (Week 5+)
- [ ] Task dependencies
- [ ] Task cancellation
- [ ] Task retry on failure
- [ ] Persistent task queue (survive restarts)
- [ ] Task scheduling (run at specific time)

## 📈 Expected Benefits

### For Users
- ✅ **No more waiting** - Continue chatting while agents work
- ✅ **Better UX** - See progress in real-time
- ✅ **More productive** - Handle multiple tasks simultaneously
- ✅ **Less frustration** - No blocking on long-running tasks

### For Smart-Agents
- ✅ **Better resource usage** - Run tasks when resources available
- ✅ **Scalability** - Handle more concurrent work
- ✅ **Reliability** - Isolated failures don't block other work
- ✅ **Observability** - Track all running tasks

## 🚨 Critical Considerations

### 1. Resource Safety
- **Never exceed system limits** (learned from 2025-12-26 freeze)
- **E2E tests always serial** (maxConcurrentE2E = 1)
- **Monitor CPU/memory** before starting new tasks
- **Graceful degradation** if resources constrained

### 2. Error Handling
- **Isolated failures** - One task failure doesn't affect others
- **Retry logic** - Configurable retry with exponential backoff
- **User notification** - Clear error messages when tasks fail
- **Recovery** - Persist queue state to recover after crashes

### 3. User Communication
- **Clear progress** - Show what's happening
- **Realistic estimates** - Don't over-promise completion time
- **Cancellation** - Let users cancel long-running tasks
- **Result presentation** - Make results easy to understand

### 4. Backwards Compatibility
- **Keep executeTask()** - Legacy synchronous API still works
- **Opt-in async** - Users can choose blocking or non-blocking
- **Configuration** - Disable async if user prefers blocking

## 🎯 Success Metrics

- **User Satisfaction**: Users report better UX (survey)
- **Throughput**: 2-3x more tasks completed per session
- **Wait Time**: Average user wait time reduced by 70%
- **Resource Efficiency**: CPU/memory usage stays within limits
- **Reliability**: <1% task failure rate due to resource issues

## 📝 Example Workflows

### Workflow 1: Code Review + Refactoring

```
User: "Review my PR and suggest refactorings"

Claude:
  ✅ Started code review (task_1)
  ✅ Started refactoring analysis (task_2)

  While those are running, what would you like to know?

User: "What are the biggest issues?"

Claude:
  Based on quick scan, I see:
  - Too many nested conditionals
  - Missing error handling
  - ...

  🔔 Code review completed ✅
     Found: 5 critical, 12 major, 23 minor issues

  🔔 Refactoring analysis completed ✅
     Identified 8 refactoring opportunities

  Would you like detailed reports?
```

### Workflow 2: Multi-Feature Development

```
User: "Implement login, logout, and password reset"

Claude:
  I'll work on all three features in parallel:

  ✅ Feature 1: Login (task_1) - frontend-developer
  ✅ Feature 2: Logout (task_2) - frontend-developer
  ✅ Feature 3: Password reset (task_3) - fullstack-developer

  🔄 Running tasks:
     - task_1: Implementing login UI (30%)
     - task_2: Implementing logout flow (15%)
     - task_3: Building password reset API (50%)

  What authentication method should we use?

[User discusses auth method while agents work...]

Claude:
  🔔 task_3 completed ✅ - Password reset API ready
  🔔 task_1 completed ✅ - Login UI implemented
  🔔 task_2 completed ✅ - Logout flow done

  All features complete! Would you like to review before I create a PR?
```

### Workflow 3: Research + Implementation

```
User: "Research best practices for React state management and implement one"

Claude:
  ✅ Started research (task_research) - research-analyst

  While that's running, do you have preferences?
  (e.g., Redux, Zustand, Jotai, Context API)

User: "Whatever is best for our use case"

Claude:
  🔔 Research completed ✅

  Based on analysis:
  - Recommended: Zustand (lightweight, easy to use)
  - Alternatives: Redux Toolkit, Jotai

  ✅ Started implementation (task_impl) - frontend-developer

  Shall I proceed with Zustand?

User: "Yes"

Claude:
  🔔 Implementation completed ✅

  Implemented Zustand with:
  - Auth store
  - UI state store
  - Persistence middleware

  Would you like to see the code?
```

## 🔒 Security Considerations

### Task Isolation
- **Sandboxed execution** - Each task runs in isolated environment
- **Resource limits** - Prevent one task from consuming all resources
- **Timeout protection** - Kill tasks that run too long

### Data Privacy
- **Task data encryption** - Sensitive data encrypted in queue
- **Credential management** - Use CredentialVault for secrets
- **Audit logging** - Track who started which tasks

### Access Control
- **User permissions** - Only owner can view/cancel their tasks
- **Team isolation** - Team members see only their team's tasks
- **Admin controls** - System admins can manage all tasks

---

**Next Steps:**
1. Implement BackgroundTaskQueue (Phase 1)
2. Integrate with Orchestrator (Phase 2)
3. Add progress notifications (Phase 3)
4. Test with real workflows
5. Gather user feedback
6. Iterate and improve

**This will transform smart-agents into a truly asynchronous, non-blocking system that lets users work efficiently without waiting! 🚀**
