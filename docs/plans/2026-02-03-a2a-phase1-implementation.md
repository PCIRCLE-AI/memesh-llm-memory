# A2A Protocol Phase 1.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade A2A Protocol from Phase 0.5 (echo-only) to Phase 1.0 (real MCP Client Delegation with token auth, polling, and comprehensive testing)

**Architecture:** MCP Client Delegation pattern - TaskExecutor delegates to MCPTaskDelegator (in-memory queue), MCP Client polls every 5s, executes via buddy-do, reports results back. Localhost-only with Bearer token authentication.

**Tech Stack:** TypeScript, Express.js, SQLite (TaskQueue), Vitest (TDD), In-memory Map (pending queue), Bearer token auth

**Design Document:** `docs/plans/2026-02-03-a2a-phase1-design.md`

---

## Implementation Strategy

**4 Phases, TDD-First, Target 80-85% Coverage:**

1. **Phase 1: Foundation** (4-6 hours) - Core components with unit tests
2. **Phase 2: MCP Tool Integration** (3-4 hours) - a2a-report-result + polling integration
3. **Phase 3: Error Handling & Timeouts** (3-4 hours) - Timeout detection + comprehensive error handling
4. **Phase 4: E2E Testing & Documentation** (2-3 hours) - Full flow tests + docs

**Parallelization:**
- Phase 1 tasks can run in parallel (MCPTaskDelegator, AuthMiddleware, A2AClient are independent)
- Phase 2 requires Phase 1 completion
- Phase 3 can partially overlap with Phase 2
- Phase 4 requires all previous phases

---

## Phase 1: Foundation (Core Components)

### Task 1.1: MCPTaskDelegator - Setup & Types

**Files:**
- Create: `src/a2a/delegator/MCPTaskDelegator.ts`
- Create: `src/a2a/delegator/types.ts`
- Create: `src/a2a/delegator/index.ts`
- Create: `tests/unit/a2a/MCPTaskDelegator.test.ts`

**Step 1: Write failing test for addTask**

Create `tests/unit/a2a/MCPTaskDelegator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPTaskDelegator } from '../../../src/a2a/delegator/MCPTaskDelegator.js';
import type { TaskQueue } from '../../../src/a2a/storage/TaskQueue.js';
import type { Logger } from '../../../src/utils/logger.js';

describe('MCPTaskDelegator', () => {
  let delegator: MCPTaskDelegator;
  let mockQueue: TaskQueue;
  let mockLogger: Logger;

  beforeEach(() => {
    mockQueue = {} as TaskQueue;
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;
    delegator = new MCPTaskDelegator(mockQueue, mockLogger);
  });

  describe('addTask', () => {
    it('should add task to pending queue', async () => {
      await delegator.addTask('task-1', 'test task', 'high', 'agent-1');

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        taskId: 'task-1',
        task: 'test task',
        priority: 'high',
        agentId: 'agent-1',
        status: 'PENDING'
      });
      expect(pending[0].createdAt).toBeGreaterThan(0);
    });

    it('should throw error when agent already has a task (Phase 1.0)', async () => {
      await delegator.addTask('task-1', 'task 1', 'high', 'agent-1');

      await expect(
        delegator.addTask('task-2', 'task 2', 'high', 'agent-1')
      ).rejects.toThrow('Agent already processing a task (Phase 1.0 limitation)');
    });

    it('should log task addition', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task added to delegation queue: task-1')
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/a2a/MCPTaskDelegator.test.ts`
Expected: FAIL - "Cannot find module MCPTaskDelegator"

**Step 3: Create types file**

Create `src/a2a/delegator/types.ts`:

```typescript
export interface TaskInfo {
  taskId: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  agentId: string;
  createdAt: number;
  status: 'PENDING' | 'IN_PROGRESS';
}
```

**Step 4: Write minimal MCPTaskDelegator implementation**

Create `src/a2a/delegator/MCPTaskDelegator.ts`:

```typescript
import type { TaskQueue } from '../storage/TaskQueue.js';
import type { Logger } from '../../utils/logger.js';
import type { TaskInfo } from './types.js';

export class MCPTaskDelegator {
  private pendingTasks: Map<string, TaskInfo>;
  private taskQueue: TaskQueue;
  private logger: Logger;

  constructor(taskQueue: TaskQueue, logger: Logger) {
    this.pendingTasks = new Map();
    this.taskQueue = taskQueue;
    this.logger = logger;
  }

  async addTask(
    taskId: string,
    task: string,
    priority: 'high' | 'medium' | 'low',
    agentId: string
  ): Promise<void> {
    // Phase 1.0: Only one task per agent
    if (this.pendingTasks.size >= 1) {
      throw new Error('Agent already processing a task (Phase 1.0 limitation)');
    }

    const taskInfo: TaskInfo = {
      taskId,
      task,
      priority,
      agentId,
      createdAt: Date.now(),
      status: 'PENDING'
    };

    this.pendingTasks.set(taskId, taskInfo);
    this.logger.info(`Task added to delegation queue: ${taskId}`);
  }

  async getPendingTasks(agentId: string): Promise<TaskInfo[]> {
    const tasks: TaskInfo[] = [];
    for (const taskInfo of this.pendingTasks.values()) {
      if (taskInfo.agentId === agentId && taskInfo.status === 'PENDING') {
        tasks.push(taskInfo);
      }
    }
    return tasks;
  }
}
```

Create `src/a2a/delegator/index.ts`:

```typescript
export { MCPTaskDelegator } from './MCPTaskDelegator.js';
export type { TaskInfo } from './types.js';
```

**Step 5: Run test to verify it passes**

Run: `npm test tests/unit/a2a/MCPTaskDelegator.test.ts`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add src/a2a/delegator/ tests/unit/a2a/MCPTaskDelegator.test.ts
git commit -m "feat(a2a): add MCPTaskDelegator with addTask and getPendingTasks

- Implements in-memory pending task queue
- Phase 1.0 limitation: single task per agent
- TDD: 3 passing tests for addTask and getPendingTasks

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: MCPTaskDelegator - Remove & Timeout

**Files:**
- Modify: `src/a2a/delegator/MCPTaskDelegator.ts`
- Modify: `tests/unit/a2a/MCPTaskDelegator.test.ts`

**Step 1: Write failing tests for removeTask and checkTimeouts**

Add to `tests/unit/a2a/MCPTaskDelegator.test.ts`:

```typescript
  describe('removeTask', () => {
    it('should remove task from pending queue', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');
      await delegator.removeTask('task-1');

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(0);
    });

    it('should not throw if task not found', async () => {
      await expect(
        delegator.removeTask('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('markTaskInProgress', () => {
    it('should update task status to IN_PROGRESS', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');
      await delegator.markTaskInProgress('task-1');

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(0); // IN_PROGRESS tasks not returned

      // Verify task exists but with different status
      const allTasks = Array.from(delegator['pendingTasks'].values());
      expect(allTasks[0].status).toBe('IN_PROGRESS');
    });
  });

  describe('checkTimeouts', () => {
    beforeEach(() => {
      // Mock TaskQueue.updateTask
      mockQueue.updateTask = vi.fn().mockResolvedValue(undefined);
    });

    it('should timeout tasks older than configured timeout', async () => {
      // Set timeout to 1ms for testing
      process.env.MEMESH_A2A_TASK_TIMEOUT = '1';

      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      // Wait 10ms
      await new Promise(resolve => setTimeout(resolve, 10));

      await delegator.checkTimeouts();

      expect(mockQueue.updateTask).toHaveBeenCalledWith('task-1', {
        status: 'TIMEOUT',
        error: expect.stringContaining('Task execution timeout'),
        completedAt: expect.any(Number)
      });

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(0);

      // Cleanup
      delete process.env.MEMESH_A2A_TASK_TIMEOUT;
    });

    it('should not timeout recent tasks', async () => {
      await delegator.addTask('task-1', 'test', 'high', 'agent-1');

      await delegator.checkTimeouts();

      expect(mockQueue.updateTask).not.toHaveBeenCalled();

      const pending = await delegator.getPendingTasks('agent-1');
      expect(pending).toHaveLength(1);
    });
  });
```

**Step 2: Run tests to verify they fail**

Run: `npm test tests/unit/a2a/MCPTaskDelegator.test.ts`
Expected: FAIL - "removeTask is not a function"

**Step 3: Implement removeTask, markTaskInProgress, checkTimeouts**

Add to `src/a2a/delegator/MCPTaskDelegator.ts`:

```typescript
  async markTaskInProgress(taskId: string): Promise<void> {
    const taskInfo = this.pendingTasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'IN_PROGRESS';
      this.logger.info(`Task marked as in-progress: ${taskId}`);
    }
  }

  async removeTask(taskId: string): Promise<void> {
    const removed = this.pendingTasks.delete(taskId);
    if (removed) {
      this.logger.info(`Task removed from delegation queue: ${taskId}`);
    }
  }

  async checkTimeouts(): Promise<void> {
    const now = Date.now();
    const timeout = parseInt(process.env.MEMESH_A2A_TASK_TIMEOUT || '300000'); // 5 min default

    for (const [taskId, taskInfo] of this.pendingTasks) {
      if (now - taskInfo.createdAt > timeout) {
        this.logger.warn(`Task timeout detected: ${taskId}`);

        // Update TaskQueue status
        await this.taskQueue.updateTask(taskId, {
          status: 'TIMEOUT' as any, // TaskStatus enum
          error: `Task execution timeout (${timeout / 1000}s)`,
          completedAt: now
        });

        // Remove from pending queue
        this.pendingTasks.delete(taskId);
      }
    }
  }
```

**Step 4: Run tests to verify they pass**

Run: `npm test tests/unit/a2a/MCPTaskDelegator.test.ts`
Expected: PASS (8 tests total)

**Step 5: Commit**

```bash
git add src/a2a/delegator/MCPTaskDelegator.ts tests/unit/a2a/MCPTaskDelegator.test.ts
git commit -m "feat(a2a): add removeTask, markTaskInProgress, checkTimeouts to MCPTaskDelegator

- Implements task removal and status updates
- Timeout detection with configurable duration (default 5 min)
- TDD: 8 passing tests total (5 new)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.3: Authentication Middleware

**Files:**
- Create: `src/a2a/server/middleware/auth.ts`
- Modify: `src/a2a/server/middleware.ts` (if exists, otherwise create)
- Create: `tests/unit/a2a/AuthMiddleware.test.ts`

**Step 1: Write failing tests for authenticateToken**

Create `tests/unit/a2a/AuthMiddleware.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticateToken } from '../../../src/a2a/server/middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

describe('authenticateToken middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {}
    };
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = vi.fn();

    // Set valid token for tests
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
  });

  it('should call next() with valid token', () => {
    mockReq.headers = {
      authorization: 'Bearer test-token-123'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should return 401 when token is missing', () => {
    mockReq.headers = {};

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Authentication token required',
      code: 'AUTH_MISSING'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    mockReq.headers = {
      authorization: 'Bearer wrong-token'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Invalid authentication token',
      code: 'AUTH_INVALID'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 500 when MEMESH_A2A_TOKEN not configured', () => {
    delete process.env.MEMESH_A2A_TOKEN;

    mockReq.headers = {
      authorization: 'Bearer some-token'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Server configuration error',
      code: 'TOKEN_NOT_CONFIGURED'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle malformed Authorization header', () => {
    mockReq.headers = {
      authorization: 'InvalidFormat'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Authentication token required',
      code: 'AUTH_MISSING'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/a2a/AuthMiddleware.test.ts`
Expected: FAIL - "Cannot find module auth.js"

**Step 3: Implement authenticateToken middleware**

Create `src/a2a/server/middleware/auth.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  const validToken = process.env.MEMESH_A2A_TOKEN;

  if (!validToken) {
    logger.error('MEMESH_A2A_TOKEN not configured');
    res.status(500).json({
      error: 'Server configuration error',
      code: 'TOKEN_NOT_CONFIGURED'
    });
    return;
  }

  if (!token) {
    res.status(401).json({
      error: 'Authentication token required',
      code: 'AUTH_MISSING'
    });
    return;
  }

  if (token !== validToken) {
    res.status(401).json({
      error: 'Invalid authentication token',
      code: 'AUTH_INVALID'
    });
    return;
  }

  next();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/unit/a2a/AuthMiddleware.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/a2a/server/middleware/auth.ts tests/unit/a2a/AuthMiddleware.test.ts
git commit -m "feat(a2a): add Bearer token authentication middleware

- Validates Authorization header with Bearer token
- Returns 401 for missing/invalid tokens
- Returns 500 if MEMESH_A2A_TOKEN not configured
- TDD: 5 passing tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.4: Update A2AClient with Token Support

**Files:**
- Modify: `src/a2a/client/A2AClient.ts`
- Create: `tests/unit/a2a/A2AClient.test.ts`

**Step 1: Write failing tests for token injection**

Create `tests/unit/a2a/A2AClient.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AClient } from '../../../src/a2a/client/A2AClient.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('A2AClient', () => {
  let client: A2AClient;

  beforeEach(() => {
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';
    client = new A2AClient('http://localhost:3000');
    mockFetch.mockClear();
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
  });

  describe('sendMessage', () => {
    it('should include Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ taskId: 'task-123', status: 'PENDING' })
      });

      await client.sendMessage('agent-b', 'test task', 'high');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/a2a/send-message',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });

    it('should throw error if token not configured', async () => {
      delete process.env.MEMESH_A2A_TOKEN;

      await expect(
        client.sendMessage('agent-b', 'task', 'high')
      ).rejects.toThrow('MEMESH_A2A_TOKEN not configured');
    });

    it('should throw error on 401 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid token' })
      });

      await expect(
        client.sendMessage('agent-b', 'task', 'high')
      ).rejects.toThrow('Authentication failed - invalid A2A token');
    });
  });

  describe('getTask', () => {
    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ taskId: 'task-123', status: 'COMPLETED' })
      });

      await client.getTask('task-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/a2a/tasks/task-123',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });
  });

  describe('listTasks', () => {
    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ([])
      });

      await client.listTasks('agent-b');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/a2a/tasks?agentId=agent-b'),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token-123'
          }
        })
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/a2a/A2AClient.test.ts`
Expected: FAIL - Tests fail because token not included

**Step 3: Read current A2AClient implementation**

Run: Read `src/a2a/client/A2AClient.ts` to understand current structure

**Step 4: Modify A2AClient to include token**

Update `src/a2a/client/A2AClient.ts`:

```typescript
// Add helper method for auth headers
private getAuthHeaders(): HeadersInit {
  const token = process.env.MEMESH_A2A_TOKEN;
  if (!token) {
    throw new Error('MEMESH_A2A_TOKEN not configured');
  }
  return {
    'Authorization': `Bearer ${token}`
  };
}

// Update sendMessage
async sendMessage(
  agentId: string,
  task: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<{ taskId: string; status: string }> {
  const response = await fetch(`${this.baseUrl}/a2a/send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders()
    },
    body: JSON.stringify({ agentId, task, priority })
  });

  if (response.status === 401) {
    throw new Error('Authentication failed - invalid A2A token');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// Update getTask
async getTask(taskId: string): Promise<any> {
  const response = await fetch(`${this.baseUrl}/a2a/tasks/${taskId}`, {
    method: 'GET',
    headers: this.getAuthHeaders()
  });

  if (response.status === 401) {
    throw new Error('Authentication failed - invalid A2A token');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// Update listTasks
async listTasks(agentId?: string): Promise<any[]> {
  const url = agentId
    ? `${this.baseUrl}/a2a/tasks?agentId=${agentId}`
    : `${this.baseUrl}/a2a/tasks`;

  const response = await fetch(url, {
    method: 'GET',
    headers: this.getAuthHeaders()
  });

  if (response.status === 401) {
    throw new Error('Authentication failed - invalid A2A token');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// Update cancelTask (if exists)
async cancelTask(taskId: string): Promise<void> {
  const response = await fetch(`${this.baseUrl}/a2a/tasks/${taskId}/cancel`, {
    method: 'POST',
    headers: this.getAuthHeaders()
  });

  if (response.status === 401) {
    throw new Error('Authentication failed - invalid A2A token');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test tests/unit/a2a/A2AClient.test.ts`
Expected: PASS (6 tests)

**Step 6: Commit**

```bash
git add src/a2a/client/A2AClient.ts tests/unit/a2a/A2AClient.test.ts
git commit -m "feat(a2a): add Bearer token authentication to A2AClient

- Injects Authorization header in all HTTP requests
- Throws error if MEMESH_A2A_TOKEN not configured
- Handles 401 responses with clear error messages
- TDD: 6 passing tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.5: Modify TaskExecutor for MCP Delegation

**Files:**
- Modify: `src/a2a/executor/TaskExecutor.ts`
- Create: `tests/unit/a2a/TaskExecutor.test.ts`

**Step 1: Write failing tests for delegated execution**

Create `tests/unit/a2a/TaskExecutor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskExecutor } from '../../../src/a2a/executor/TaskExecutor.js';
import type { MCPTaskDelegator } from '../../../src/a2a/delegator/MCPTaskDelegator.js';
import type { TaskQueue } from '../../../src/a2a/storage/TaskQueue.js';
import type { Logger } from '../../../src/utils/logger.js';

describe('TaskExecutor (Phase 1.0)', () => {
  let executor: TaskExecutor;
  let mockDelegator: MCPTaskDelegator;
  let mockQueue: TaskQueue;
  let mockLogger: Logger;

  beforeEach(() => {
    mockDelegator = {
      addTask: vi.fn().mockResolvedValue(undefined)
    } as any;

    mockQueue = {} as TaskQueue;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    executor = new TaskExecutor(mockQueue, mockLogger, mockDelegator);
  });

  describe('executeTask', () => {
    it('should delegate task to MCPTaskDelegator', async () => {
      await executor.executeTask('task-1', 'test task', 'agent-1');

      expect(mockDelegator.addTask).toHaveBeenCalledWith(
        'task-1',
        'test task',
        'medium', // default priority
        'agent-1'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task delegated to MCP Client: task-1')
      );
    });

    it('should not call generateEchoResponse (Phase 0.5 removed)', () => {
      // Verify old method doesn't exist
      expect((executor as any).generateEchoResponse).toBeUndefined();
    });

    it('should throw error if delegation fails', async () => {
      mockDelegator.addTask = vi.fn().mockRejectedValue(
        new Error('Agent busy')
      );

      await expect(
        executor.executeTask('task-1', 'test', 'agent-1')
      ).rejects.toThrow('Agent busy');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/a2a/TaskExecutor.test.ts`
Expected: FAIL - "TaskExecutor constructor expects 3 args, got 2"

**Step 3: Read current TaskExecutor**

Run: Read `src/a2a/executor/TaskExecutor.ts`

**Step 4: Modify TaskExecutor to use MCPTaskDelegator**

Update `src/a2a/executor/TaskExecutor.ts`:

```typescript
import type { TaskQueue } from '../storage/TaskQueue.js';
import type { Logger } from '../../utils/logger.js';
import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';

export class TaskExecutor {
  private taskQueue: TaskQueue;
  private logger: Logger;
  private delegator: MCPTaskDelegator;

  constructor(
    taskQueue: TaskQueue,
    logger: Logger,
    delegator: MCPTaskDelegator
  ) {
    this.taskQueue = taskQueue;
    this.logger = logger;
    this.delegator = delegator;
  }

  async executeTask(
    taskId: string,
    task: string,
    agentId: string
  ): Promise<void> {
    // Phase 1.0: Delegate to MCPTaskDelegator
    // MCP Client will poll, execute via buddy-do, and report result
    await this.delegator.addTask(taskId, task, 'medium', agentId);

    this.logger.info(`Task delegated to MCP Client: ${taskId}`);

    // Status remains PENDING until MCP Client picks up and executes
  }

  // Phase 0.5 method removed:
  // private generateEchoResponse(userMessage: string): string { ... }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test tests/unit/a2a/TaskExecutor.test.ts`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add src/a2a/executor/TaskExecutor.ts tests/unit/a2a/TaskExecutor.test.ts
git commit -m "refactor(a2a): migrate TaskExecutor from echo to MCP delegation

- Removed Phase 0.5 echo-only logic (generateEchoResponse)
- Added MCPTaskDelegator dependency injection
- executeTask now delegates to MCP Client via MCPTaskDelegator
- TDD: 3 passing tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: MCP Tool Integration

### Task 2.1: Create a2a-report-result MCP Tool

**Files:**
- Create: `src/mcp/tools/a2a-report-result.ts`
- Create: `tests/unit/mcp/tools/a2a-report-result.test.ts`

**Step 1: Write failing test for a2a-report-result**

Create `tests/unit/mcp/tools/a2a-report-result.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { a2aReportResult } from '../../../../src/mcp/tools/a2a-report-result.js';
import type { TaskQueue } from '../../../../src/a2a/storage/TaskQueue.js';
import type { MCPTaskDelegator } from '../../../../src/a2a/delegator/MCPTaskDelegator.js';

describe('a2a-report-result MCP tool', () => {
  let mockTaskQueue: TaskQueue;
  let mockDelegator: MCPTaskDelegator;

  beforeEach(() => {
    mockTaskQueue = {
      updateTask: vi.fn().mockResolvedValue(undefined)
    } as any;

    mockDelegator = {
      removeTask: vi.fn().mockResolvedValue(undefined)
    } as any;
  });

  it('should update task status to COMPLETED on success', async () => {
    const result = await a2aReportResult(
      {
        taskId: 'task-123',
        result: 'Task completed successfully',
        success: true
      },
      mockTaskQueue,
      mockDelegator
    );

    expect(mockTaskQueue.updateTask).toHaveBeenCalledWith('task-123', {
      status: 'COMPLETED',
      result: 'Task completed successfully',
      error: null,
      completedAt: expect.any(Number)
    });

    expect(mockDelegator.removeTask).toHaveBeenCalledWith('task-123');

    expect(result.content[0].text).toContain('"taskId":"task-123"');
    expect(result.content[0].text).toContain('"status":"COMPLETED"');
  });

  it('should update task status to FAILED on failure', async () => {
    const result = await a2aReportResult(
      {
        taskId: 'task-456',
        result: '',
        success: false,
        error: 'Command not found'
      },
      mockTaskQueue,
      mockDelegator
    );

    expect(mockTaskQueue.updateTask).toHaveBeenCalledWith('task-456', {
      status: 'FAILED',
      result: null,
      error: 'Command not found',
      completedAt: expect.any(Number)
    });

    expect(mockDelegator.removeTask).toHaveBeenCalledWith('task-456');

    expect(result.content[0].text).toContain('"status":"FAILED"');
  });

  it('should use default error message if not provided', async () => {
    await a2aReportResult(
      {
        taskId: 'task-789',
        result: '',
        success: false
      },
      mockTaskQueue,
      mockDelegator
    );

    expect(mockTaskQueue.updateTask).toHaveBeenCalledWith('task-789', {
      status: 'FAILED',
      result: null,
      error: 'Task execution failed',
      completedAt: expect.any(Number)
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/mcp/tools/a2a-report-result.test.ts`
Expected: FAIL - "Cannot find module a2a-report-result"

**Step 3: Implement a2a-report-result tool**

Create `src/mcp/tools/a2a-report-result.ts`:

```typescript
import type { ToolResult } from '../types.js';
import type { TaskQueue } from '../../a2a/storage/TaskQueue.js';
import type { MCPTaskDelegator } from '../../a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../utils/logger.js';

export const a2aReportResultSchema = {
  type: 'object',
  properties: {
    taskId: {
      type: 'string',
      description: 'Task ID to report result for'
    },
    result: {
      type: 'string',
      description: 'Execution output or result'
    },
    success: {
      type: 'boolean',
      description: 'Whether execution succeeded (true) or failed (false)'
    },
    error: {
      type: 'string',
      description: 'Error message if success=false (optional)'
    }
  },
  required: ['taskId', 'result', 'success']
} as const;

export async function a2aReportResult(
  input: {
    taskId: string;
    result: string;
    success: boolean;
    error?: string;
  },
  taskQueue: TaskQueue,
  delegator: MCPTaskDelegator
): Promise<ToolResult> {
  const { taskId, result, success, error } = input;

  // Determine status
  const status = success ? 'COMPLETED' : 'FAILED';

  // Update TaskQueue
  await taskQueue.updateTask(taskId, {
    status: status as any,
    result: success ? result : null,
    error: success ? null : (error || 'Task execution failed'),
    completedAt: Date.now()
  });

  // Remove from MCPTaskDelegator pending queue
  await delegator.removeTask(taskId);

  logger.info(`Task result reported: ${taskId} (${status})`);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        taskId,
        status
      }, null, 2)
    }]
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/unit/mcp/tools/a2a-report-result.test.ts`
Expected: PASS (3 tests)

**Step 5: Register tool in MCP server**

Modify `src/mcp/server.ts` to add a2a-report-result tool (follow pattern of existing tools)

**Step 6: Commit**

```bash
git add src/mcp/tools/a2a-report-result.ts tests/unit/mcp/tools/a2a-report-result.test.ts src/mcp/server.ts
git commit -m "feat(mcp): add a2a-report-result MCP tool

- Allows MCP Client to report task execution results
- Updates TaskQueue status (COMPLETED/FAILED)
- Removes task from MCPTaskDelegator queue
- TDD: 3 passing tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Update a2a-list-tasks to use MCPTaskDelegator

**Files:**
- Modify: `src/mcp/tools/a2a-list-tasks.ts` (or create if doesn't exist)
- Create: `tests/unit/mcp/tools/a2a-list-tasks.test.ts`

**Step 1: Write failing test**

Create `tests/unit/mcp/tools/a2a-list-tasks.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { a2aListTasks } from '../../../../src/mcp/tools/a2a-list-tasks.js';
import type { MCPTaskDelegator } from '../../../../src/a2a/delegator/MCPTaskDelegator.js';

describe('a2a-list-tasks MCP tool', () => {
  let mockDelegator: MCPTaskDelegator;

  beforeEach(() => {
    mockDelegator = {
      getPendingTasks: vi.fn().mockResolvedValue([
        {
          taskId: 'task-1',
          task: 'test task 1',
          priority: 'high',
          agentId: 'agent-1',
          createdAt: Date.now(),
          status: 'PENDING'
        },
        {
          taskId: 'task-2',
          task: 'test task 2',
          priority: 'medium',
          agentId: 'agent-1',
          createdAt: Date.now(),
          status: 'PENDING'
        }
      ])
    } as any;
  });

  it('should return pending tasks for agent', async () => {
    const result = await a2aListTasks(
      { agentId: 'agent-1' },
      mockDelegator
    );

    expect(mockDelegator.getPendingTasks).toHaveBeenCalledWith('agent-1');

    const tasks = JSON.parse(result.content[0].text);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].taskId).toBe('task-1');
    expect(tasks[1].taskId).toBe('task-2');
  });

  it('should return empty array if no pending tasks', async () => {
    mockDelegator.getPendingTasks = vi.fn().mockResolvedValue([]);

    const result = await a2aListTasks(
      { agentId: 'agent-1' },
      mockDelegator
    );

    const tasks = JSON.parse(result.content[0].text);
    expect(tasks).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/mcp/tools/a2a-list-tasks.test.ts`
Expected: FAIL

**Step 3: Implement a2a-list-tasks**

Create or modify `src/mcp/tools/a2a-list-tasks.ts`:

```typescript
import type { ToolResult } from '../types.js';
import type { MCPTaskDelegator } from '../../a2a/delegator/MCPTaskDelegator.js';

export const a2aListTasksSchema = {
  type: 'object',
  properties: {
    agentId: {
      type: 'string',
      description: 'Agent ID to list pending tasks for'
    }
  },
  required: ['agentId']
} as const;

export async function a2aListTasks(
  input: { agentId: string },
  delegator: MCPTaskDelegator
): Promise<ToolResult> {
  const { agentId } = input;

  // Get pending tasks from MCPTaskDelegator
  const tasks = await delegator.getPendingTasks(agentId);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(tasks, null, 2)
    }]
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/unit/mcp/tools/a2a-list-tasks.test.ts`
Expected: PASS (2 tests)

**Step 5: Register in MCP server**

Update `src/mcp/server.ts`

**Step 6: Commit**

```bash
git add src/mcp/tools/a2a-list-tasks.ts tests/unit/mcp/tools/a2a-list-tasks.test.ts src/mcp/server.ts
git commit -m "feat(mcp): integrate a2a-list-tasks with MCPTaskDelegator

- Returns pending tasks from in-memory queue
- Used by MCP Client for polling (every 5s)
- TDD: 2 passing tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Integration Test - Send Task Flow

**Files:**
- Create: `tests/integration/a2a-send-task.test.ts`

**Step 1: Write integration test for full send-task flow**

Create `tests/integration/a2a-send-task.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { TaskQueue } from '../../src/a2a/storage/TaskQueue.js';
import { MCPTaskDelegator } from '../../src/a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../src/utils/logger.js';
import path from 'path';
import fs from 'fs';

describe('A2A Send Task Integration', () => {
  let server: A2AServer;
  let taskQueue: TaskQueue;
  let delegator: MCPTaskDelegator;
  let dbPath: string;
  const testToken = 'integration-test-token-123';

  beforeEach(async () => {
    // Setup test database
    dbPath = path.join(process.cwd(), 'data', `test-a2a-${Date.now()}.db`);
    taskQueue = new TaskQueue(dbPath);
    await taskQueue.initialize();

    // Create delegator
    delegator = new MCPTaskDelegator(taskQueue, logger);

    // Create server
    server = new A2AServer(taskQueue, delegator);

    // Set test token
    process.env.MEMESH_A2A_TOKEN = testToken;
  });

  afterEach(async () => {
    delete process.env.MEMESH_A2A_TOKEN;
    // Cleanup test database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should create task and add to delegator queue', async () => {
    const response = await request(server.app)
      .post('/a2a/send-message')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        agentId: 'agent-b',
        task: 'integration test task',
        priority: 'high'
      });

    expect(response.status).toBe(200);
    expect(response.body.taskId).toBeDefined();
    expect(response.body.status).toBe('PENDING');

    // Verify in TaskQueue
    const task = await taskQueue.getTask(response.body.taskId);
    expect(task.status).toBe('PENDING');
    expect(task.task).toBe('integration test task');

    // Verify in MCPTaskDelegator
    const pending = await delegator.getPendingTasks('agent-b');
    expect(pending).toHaveLength(1);
    expect(pending[0].taskId).toBe(response.body.taskId);
  });

  it('should reject request without token', async () => {
    const response = await request(server.app)
      .post('/a2a/send-message')
      .send({
        agentId: 'agent-b',
        task: 'test',
        priority: 'high'
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_MISSING');
  });

  it('should reject request with invalid token', async () => {
    const response = await request(server.app)
      .post('/a2a/send-message')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        agentId: 'agent-b',
        task: 'test',
        priority: 'high'
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_INVALID');
  });
});
```

**Step 2: Run test to verify current state**

Run: `npm test tests/integration/a2a-send-task.test.ts`
Expected: May pass if server already applies auth middleware, or fail if not

**Step 3: Apply auth middleware to A2AServer routes**

Modify `src/a2a/server/A2AServer.ts` or `src/a2a/server/routes.ts`:

```typescript
import { authenticateToken } from './middleware/auth.js';

// Apply to routes
router.post('/a2a/send-message', authenticateToken, async (req, res) => {
  // existing logic
});

router.get('/a2a/tasks/:taskId', authenticateToken, async (req, res) => {
  // existing logic
});

router.get('/a2a/tasks', authenticateToken, async (req, res) => {
  // existing logic
});
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/integration/a2a-send-task.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add tests/integration/a2a-send-task.test.ts src/a2a/server/
git commit -m "test(a2a): add integration test for send-task flow

- Tests full flow: HTTP POST → TaskQueue → MCPTaskDelegator
- Verifies authentication (valid/invalid/missing token)
- Uses in-memory SQLite for isolation
- 3 passing integration tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Error Handling & Timeouts

### Task 3.1: Background Job for Timeout Detection

**Files:**
- Create: `src/a2a/jobs/TimeoutChecker.ts`
- Create: `tests/unit/a2a/TimeoutChecker.test.ts`

**Step 1: Write failing test**

Create `tests/unit/a2a/TimeoutChecker.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeoutChecker } from '../../../src/a2a/jobs/TimeoutChecker.js';
import type { MCPTaskDelegator } from '../../../src/a2a/delegator/MCPTaskDelegator.js';

describe('TimeoutChecker background job', () => {
  let checker: TimeoutChecker;
  let mockDelegator: MCPTaskDelegator;

  beforeEach(() => {
    mockDelegator = {
      checkTimeouts: vi.fn().mockResolvedValue(undefined)
    } as any;

    checker = new TimeoutChecker(mockDelegator);
  });

  afterEach(() => {
    checker.stop();
  });

  it('should call checkTimeouts periodically', async () => {
    checker.start(100); // 100ms interval for testing

    // Wait 250ms (should trigger 2-3 times)
    await new Promise(resolve => setTimeout(resolve, 250));

    expect(mockDelegator.checkTimeouts).toHaveBeenCalledTimes(2);

    checker.stop();
  });

  it('should not call checkTimeouts when stopped', async () => {
    checker.start(100);
    checker.stop();

    await new Promise(resolve => setTimeout(resolve, 250));

    expect(mockDelegator.checkTimeouts).toHaveBeenCalledTimes(0);
  });

  it('should use default interval of 60 seconds', () => {
    checker.start();

    expect(checker.isRunning()).toBe(true);
    expect(checker.getInterval()).toBe(60000);

    checker.stop();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/a2a/TimeoutChecker.test.ts`
Expected: FAIL

**Step 3: Implement TimeoutChecker**

Create `src/a2a/jobs/TimeoutChecker.ts`:

```typescript
import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
import { logger } from '../../utils/logger.js';

export class TimeoutChecker {
  private delegator: MCPTaskDelegator;
  private intervalId: NodeJS.Timeout | null = null;
  private interval: number;

  constructor(delegator: MCPTaskDelegator) {
    this.delegator = delegator;
    this.interval = 60000; // 1 minute default
  }

  start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      logger.warn('TimeoutChecker already running');
      return;
    }

    this.interval = intervalMs;

    this.intervalId = setInterval(async () => {
      try {
        await this.delegator.checkTimeouts();
      } catch (error) {
        logger.error('TimeoutChecker error', error);
      }
    }, intervalMs);

    logger.info(`TimeoutChecker started (interval: ${intervalMs}ms)`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('TimeoutChecker stopped');
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  getInterval(): number {
    return this.interval;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/unit/a2a/TimeoutChecker.test.ts`
Expected: PASS (3 tests)

**Step 5: Integrate TimeoutChecker into A2AServer**

Modify `src/a2a/server/A2AServer.ts`:

```typescript
import { TimeoutChecker } from '../jobs/TimeoutChecker.js';

export class A2AServer {
  // ... existing fields
  private timeoutChecker: TimeoutChecker;

  constructor(taskQueue: TaskQueue, delegator: MCPTaskDelegator) {
    // ... existing setup
    this.timeoutChecker = new TimeoutChecker(delegator);
  }

  async start(port: number = 3000): Promise<void> {
    // ... existing start logic

    // Start timeout checker (every 60 seconds)
    this.timeoutChecker.start();
  }

  async stop(): Promise<void> {
    // Stop timeout checker
    this.timeoutChecker.stop();

    // ... existing stop logic
  }
}
```

**Step 6: Commit**

```bash
git add src/a2a/jobs/TimeoutChecker.ts tests/unit/a2a/TimeoutChecker.test.ts src/a2a/server/A2AServer.ts
git commit -m "feat(a2a): add background TimeoutChecker job

- Runs every 60 seconds to detect timed-out tasks
- Calls MCPTaskDelegator.checkTimeouts()
- Integrated into A2AServer lifecycle
- TDD: 3 passing tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Integration Test - Timeout Handling

**Files:**
- Create: `tests/integration/a2a-timeout-handling.test.ts`

**Step 1: Write integration test for timeout**

Create `tests/integration/a2a-timeout-handling.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskQueue } from '../../src/a2a/storage/TaskQueue.js';
import { MCPTaskDelegator } from '../../src/a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../src/utils/logger.js';
import path from 'path';
import fs from 'fs';

describe('A2A Timeout Handling Integration', () => {
  let taskQueue: TaskQueue;
  let delegator: MCPTaskDelegator;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = path.join(process.cwd(), 'data', `test-timeout-${Date.now()}.db`);
    taskQueue = new TaskQueue(dbPath);
    await taskQueue.initialize();

    delegator = new MCPTaskDelegator(taskQueue, logger);

    // Set very short timeout for testing
    process.env.MEMESH_A2A_TASK_TIMEOUT = '100'; // 100ms
  });

  afterEach(async () => {
    delete process.env.MEMESH_A2A_TASK_TIMEOUT;
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should timeout task after configured duration', async () => {
    // Create task
    const taskId = 'timeout-test-1';
    await taskQueue.createTask({
      taskId,
      agentId: 'agent-1',
      task: 'test task',
      priority: 'high',
      status: 'PENDING'
    });

    await delegator.addTask(taskId, 'test task', 'high', 'agent-1');

    // Wait for timeout (200ms > 100ms timeout)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Run timeout check
    await delegator.checkTimeouts();

    // Verify task marked as TIMEOUT
    const task = await taskQueue.getTask(taskId);
    expect(task.status).toBe('TIMEOUT');
    expect(task.error).toContain('Task execution timeout');

    // Verify removed from pending queue
    const pending = await delegator.getPendingTasks('agent-1');
    expect(pending).toHaveLength(0);
  });

  it('should not timeout recent tasks', async () => {
    const taskId = 'recent-test-1';
    await taskQueue.createTask({
      taskId,
      agentId: 'agent-1',
      task: 'test task',
      priority: 'high',
      status: 'PENDING'
    });

    await delegator.addTask(taskId, 'test task', 'high', 'agent-1');

    // Run timeout check immediately (task is fresh)
    await delegator.checkTimeouts();

    // Verify task still PENDING
    const task = await taskQueue.getTask(taskId);
    expect(task.status).toBe('PENDING');

    // Verify still in pending queue
    const pending = await delegator.getPendingTasks('agent-1');
    expect(pending).toHaveLength(1);
  });
});
```

**Step 2: Run test**

Run: `npm test tests/integration/a2a-timeout-handling.test.ts`
Expected: PASS (2 tests) - if MCPTaskDelegator.checkTimeouts is implemented correctly

**Step 3: Commit**

```bash
git add tests/integration/a2a-timeout-handling.test.ts
git commit -m "test(a2a): add integration test for timeout handling

- Tests timeout detection with real TaskQueue + MCPTaskDelegator
- Verifies task marked as TIMEOUT in SQLite
- Verifies task removed from pending queue
- 2 passing integration tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: E2E Testing & Documentation

### Task 4.1: E2E Test - Happy Path

**Files:**
- Create: `tests/e2e/a2a-happy-path.test.ts`

**Step 1: Write E2E test for complete flow**

Create `tests/e2e/a2a-happy-path.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { A2AClient } from '../../src/a2a/client/A2AClient.js';
import { TaskQueue } from '../../src/a2a/storage/TaskQueue.js';
import { MCPTaskDelegator } from '../../src/a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../src/utils/logger.js';
import path from 'path';
import fs from 'fs';

describe('A2A Happy Path E2E', () => {
  let server: A2AServer;
  let clientA: A2AClient;
  let clientB: A2AClient;
  let taskQueue: TaskQueue;
  let delegator: MCPTaskDelegator;
  let dbPath: string;
  const testToken = 'e2e-test-token-abc123';
  const port = 3001;

  beforeAll(async () => {
    // Setup
    dbPath = path.join(process.cwd(), 'data', `test-e2e-${Date.now()}.db`);
    taskQueue = new TaskQueue(dbPath);
    await taskQueue.initialize();

    delegator = new MCPTaskDelegator(taskQueue, logger);
    server = new A2AServer(taskQueue, delegator);

    process.env.MEMESH_A2A_TOKEN = testToken;

    await server.start(port);

    clientA = new A2AClient(`http://localhost:${port}`);
    clientB = new A2AClient(`http://localhost:${port}`);
  });

  afterAll(async () => {
    await server.stop();
    delete process.env.MEMESH_A2A_TOKEN;
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should complete full A2A workflow: send → poll → report → retrieve', async () => {
    // Step 1: Agent A sends task to Agent B
    const sendResponse = await clientA.sendMessage('agent-b', 'analyze logs', 'high');
    expect(sendResponse.taskId).toBeDefined();
    expect(sendResponse.status).toBe('PENDING');

    const taskId = sendResponse.taskId;

    // Step 2: Agent B polls for tasks
    const pendingTasks = await clientB.listTasks('agent-b');
    expect(pendingTasks).toHaveLength(1);
    expect(pendingTasks[0].taskId).toBe(taskId);
    expect(pendingTasks[0].task).toBe('analyze logs');

    // Step 3: Agent B executes task (mock buddy-do execution)
    const mockResult = 'Found 3 errors in logs: ERROR_1, ERROR_2, ERROR_3';

    // Step 4: Agent B reports result (simulate a2a-report-result MCP tool)
    await delegator.removeTask(taskId);
    await taskQueue.updateTask(taskId, {
      status: 'COMPLETED' as any,
      result: mockResult,
      completedAt: Date.now()
    });

    // Step 5: Agent A retrieves result
    const task = await clientA.getTask(taskId);
    expect(task.status).toBe('COMPLETED');
    expect(task.result).toBe(mockResult);
    expect(task.completedAt).toBeGreaterThan(0);

    // Step 6: Verify task removed from pending queue
    const pendingAfter = await clientB.listTasks('agent-b');
    expect(pendingAfter).toHaveLength(0);
  });
});
```

**Step 2: Run test**

Run: `npm test tests/e2e/a2a-happy-path.test.ts`
Expected: PASS (1 test)

**Step 3: Commit**

```bash
git add tests/e2e/a2a-happy-path.test.ts
git commit -m "test(a2a): add E2E test for happy path workflow

- Tests complete flow: send → poll → execute → report → retrieve
- Uses real A2AServer, A2AClient, TaskQueue, MCPTaskDelegator
- Simulates MCP Client behavior (poll + report)
- 1 passing E2E test

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: E2E Test - Failure Scenarios

**Files:**
- Create: `tests/e2e/a2a-failure-scenarios.test.ts`

**Step 1: Write E2E test for failures**

Create `tests/e2e/a2a-failure-scenarios.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { A2AClient } from '../../src/a2a/client/A2AClient.js';
import { TaskQueue } from '../../src/a2a/storage/TaskQueue.js';
import { MCPTaskDelegator } from '../../src/a2a/delegator/MCPTaskDelegator.js';
import { logger } from '../../src/utils/logger.js';
import path from 'path';
import fs from 'fs';

describe('A2A Failure Scenarios E2E', () => {
  let server: A2AServer;
  let client: A2AClient;
  let taskQueue: TaskQueue;
  let delegator: MCPTaskDelegator;
  let dbPath: string;
  const testToken = 'e2e-failure-token-xyz789';
  const port = 3002;

  beforeAll(async () => {
    dbPath = path.join(process.cwd(), 'data', `test-e2e-failure-${Date.now()}.db`);
    taskQueue = new TaskQueue(dbPath);
    await taskQueue.initialize();

    delegator = new MCPTaskDelegator(taskQueue, logger);
    server = new A2AServer(taskQueue, delegator);

    process.env.MEMESH_A2A_TOKEN = testToken;

    await server.start(port);

    client = new A2AClient(`http://localhost:${port}`);
  });

  afterAll(async () => {
    await server.stop();
    delete process.env.MEMESH_A2A_TOKEN;
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should handle task execution failure', async () => {
    // Send task
    const { taskId } = await client.sendMessage('agent-b', 'invalid command', 'high');

    // Simulate execution failure (buddy-do failed)
    await taskQueue.updateTask(taskId, {
      status: 'FAILED' as any,
      error: 'Command not found: invalid',
      completedAt: Date.now()
    });

    await delegator.removeTask(taskId);

    // Retrieve and verify FAILED status
    const task = await client.getTask(taskId);
    expect(task.status).toBe('FAILED');
    expect(task.error).toContain('Command not found');
    expect(task.result).toBeNull();
  });

  it('should handle authentication error', async () => {
    // Create client without token
    const unauthClient = new A2AClient(`http://localhost:${port}`);
    delete process.env.MEMESH_A2A_TOKEN;

    await expect(
      unauthClient.sendMessage('agent-b', 'test', 'high')
    ).rejects.toThrow('MEMESH_A2A_TOKEN not configured');

    // Restore token
    process.env.MEMESH_A2A_TOKEN = testToken;
  });

  it('should handle task timeout', async () => {
    // Set short timeout
    process.env.MEMESH_A2A_TASK_TIMEOUT = '100';

    const { taskId } = await client.sendMessage('agent-b', 'slow task', 'high');

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 200));

    // Trigger timeout check
    await delegator.checkTimeouts();

    // Verify TIMEOUT status
    const task = await client.getTask(taskId);
    expect(task.status).toBe('TIMEOUT');
    expect(task.error).toContain('Task execution timeout');

    // Cleanup
    delete process.env.MEMESH_A2A_TASK_TIMEOUT;
  });
});
```

**Step 2: Run test**

Run: `npm test tests/e2e/a2a-failure-scenarios.test.ts`
Expected: PASS (3 tests)

**Step 3: Commit**

```bash
git add tests/e2e/a2a-failure-scenarios.test.ts
git commit -m "test(a2a): add E2E tests for failure scenarios

- Tests task execution failure (FAILED status)
- Tests authentication error
- Tests task timeout (TIMEOUT status)
- 3 passing E2E tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4.3: Run Full Test Suite & Verify Coverage

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (unit + integration + e2e)

**Step 2: Check coverage**

Run: `npm run test:coverage`
Expected: Coverage ≥ 80% (lines, functions, statements), ≥ 75% (branches)

If coverage < 80%, identify gaps and add missing tests.

**Step 3: Generate coverage report**

Run: `npm run test:coverage`
Review: `coverage/index.html` in browser

**Step 4: Commit coverage configuration (if not exists)**

```bash
# If vitest.config.ts doesn't have coverage config, add it
git add vitest.config.ts
git commit -m "chore(test): configure vitest coverage thresholds

- Set 80% threshold for lines, functions, statements
- Set 75% threshold for branches
- Exclude tests and type files from coverage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4.4: Update Documentation

**Files:**
- Modify: `docs/USER_GUIDE.md`
- Modify: `docs/COMMANDS.md`
- Create: `docs/A2A_SETUP_GUIDE.md`

**Step 1: Add token generation script**

Create `scripts/generate-a2a-token.ts`:

```typescript
import crypto from 'crypto';

const token = crypto.randomBytes(32).toString('hex');

console.log('Generated A2A Token:');
console.log('===================');
console.log('');
console.log(`MEMESH_A2A_TOKEN=${token}`);
console.log('');
console.log('Add this to your .env file');
```

**Step 2: Create setup guide**

Create `docs/A2A_SETUP_GUIDE.md`:

```markdown
# A2A Protocol Phase 1.0 Setup Guide

## Prerequisites

- MeMesh v2.6.6+
- Node.js 20+
- Claude Code MCP integration configured

## Step 1: Generate Authentication Token

```bash
npm run generate-a2a-token
```

Copy the output and add to `.env`:

```bash
MEMESH_A2A_TOKEN=<your-64-char-hex-token>
```

## Step 2: Configure Optional Settings

Optional environment variables (with defaults):

```bash
MEMESH_A2A_POLL_INTERVAL=5000        # Polling interval in ms (default: 5s)
MEMESH_A2A_TASK_TIMEOUT=300000       # Task timeout in ms (default: 5 min)
MEMESH_A2A_HOST=127.0.0.1            # Localhost only (Phase 1.0)
MEMESH_A2A_PORT=3000                 # Server port
```

## Step 3: Start MeMesh Server

```bash
npm run mcp
```

Server starts with:
- A2A endpoints available at `http://localhost:3000/a2a`
- TimeoutChecker background job running (60s interval)
- MCPTaskDelegator in-memory queue active

## Step 4: Test with MCP Client

### Agent A (Sender)

```bash
# In Claude Code
Use a2a-send-task tool:

{
  "agentId": "agent-b",
  "task": "analyze logs",
  "priority": "high"
}

Returns: { taskId: "task-123", status: "PENDING" }
```

### Agent B (Executor)

```bash
# In Claude Code (separate session)
Use a2a-list-tasks tool:

{
  "agentId": "agent-b"
}

Returns: [{ taskId: "task-123", task: "analyze logs", ... }]

# Execute task
Use buddy-do tool: "analyze logs"

# Report result
Use a2a-report-result tool:

{
  "taskId": "task-123",
  "result": "Found 3 errors...",
  "success": true
}
```

### Agent A (Retrieve Result)

```bash
Use a2a-get-task tool:

{
  "taskId": "task-123"
}

Returns: { status: "COMPLETED", result: "Found 3 errors..." }
```

## Troubleshooting

### Authentication Errors

**Error**: `AUTH_MISSING` or `AUTH_INVALID`

**Solution**: Verify `MEMESH_A2A_TOKEN` is set correctly in `.env` and server restarted.

### Task Timeout

**Error**: Task status shows `TIMEOUT`

**Solution**: Increase `MEMESH_A2A_TASK_TIMEOUT` or ensure Agent B is polling regularly.

### Agent Busy Error

**Error**: `Agent already processing a task (Phase 1.0 limitation)`

**Solution**: Wait for current task to complete. Phase 1.0 only supports single task execution.

## Phase 1.0 Limitations

- **Localhost only**: Cannot communicate across network
- **Single task**: Agent can only execute one task at a time
- **No retry**: Failed tasks are not automatically retried
- **Polling-based**: 5-second polling interval (not real-time)

**Phase 2.0** will address these limitations with WebSocket, concurrent execution, and retry mechanisms.
```

**Step 3: Update USER_GUIDE.md**

Add section to `docs/USER_GUIDE.md`:

```markdown
### A2A Protocol (Agent-to-Agent)

Phase 1.0 enables multi-agent collaboration via MCP Client Delegation.

**Key Features**:
- Task delegation between agents
- Polling-based task notification (5s interval)
- Bearer token authentication
- Localhost-only security (Phase 1.0)

**Available Tools**:
- `a2a-send-task` - Send task to another agent
- `a2a-list-tasks` - Poll for pending tasks
- `a2a-get-task` - Retrieve task status and result
- `a2a-report-result` - Report execution result (NEW in Phase 1.0)

**Setup**: See [A2A Setup Guide](./A2A_SETUP_GUIDE.md)

**Examples**:
```bash
# Agent A sends task
a2a-send-task --agentId agent-b --task "analyze logs" --priority high

# Agent B polls (every 5s)
a2a-list-tasks --agentId agent-b

# Agent B reports result
a2a-report-result --taskId task-123 --result "Found 3 errors" --success true

# Agent A retrieves result
a2a-get-task --taskId task-123
```
```

**Step 4: Update COMMANDS.md**

Add tool documentation to `docs/COMMANDS.md`:

```markdown
### `a2a-report-result`

Report task execution result back to MeMesh Server.

**Input Schema**:
```json
{
  "taskId": "string (required) - Task ID",
  "result": "string (required) - Execution output",
  "success": "boolean (required) - Whether execution succeeded",
  "error": "string (optional) - Error message if failed"
}
```

**Example**:
```json
{
  "taskId": "task-123",
  "result": "Found 3 errors in logs",
  "success": true
}
```

**Returns**:
```json
{
  "success": true,
  "taskId": "task-123",
  "status": "COMPLETED"
}
```

**Usage**: Called by MCP Client after executing task via buddy-do.

**Phase**: 1.0
```

**Step 5: Commit documentation**

```bash
git add scripts/generate-a2a-token.ts docs/A2A_SETUP_GUIDE.md docs/USER_GUIDE.md docs/COMMANDS.md package.json
git commit -m "docs(a2a): add Phase 1.0 setup guide and tool documentation

- Created A2A_SETUP_GUIDE.md with complete setup instructions
- Added a2a-report-result tool documentation
- Added token generation script
- Updated USER_GUIDE.md with A2A section

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Final Task: Code Review & Cleanup

### Step 1: Run full test suite

```bash
npm test
npm run test:coverage
```

Verify: All tests pass, coverage ≥ 80%

### Step 2: Lint and format

```bash
npm run lint
npm run format
```

Fix any linting errors.

### Step 3: Build

```bash
npm run build
```

Verify: No TypeScript errors

### Step 4: Manual verification

Start MeMesh server and test A2A flow manually with Claude Code.

### Step 5: Final commit

```bash
git add .
git commit -m "feat(a2a): complete Phase 1.0 implementation

Phase 1.0 Summary:
- MCP Client Delegation architecture
- Bearer token authentication (localhost-only)
- Polling-based notification (5s interval)
- MCPTaskDelegator in-memory queue
- Timeout detection (5 min default)
- Comprehensive error handling
- 80-85% test coverage achieved

Components Implemented:
- MCPTaskDelegator (new)
- TaskExecutor (modified for delegation)
- Authentication middleware
- a2a-report-result MCP tool (new)
- a2a-list-tasks integration
- TimeoutChecker background job

Testing:
- 15+ unit tests
- 5+ integration tests
- 4+ E2E tests
- Total: 80-85% coverage

Documentation:
- A2A_SETUP_GUIDE.md
- Updated USER_GUIDE.md
- Updated COMMANDS.md
- Token generation script

Design Document: docs/plans/2026-02-03-a2a-phase1-design.md

Phase 2.0 Roadmap: WebSocket, remote network, concurrent execution, retry mechanism

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria Verification

Before considering Phase 1.0 complete, verify ALL success criteria:

- ✅ All tests pass with ≥ 80% coverage
- ✅ Agent A can send tasks to Agent B successfully
- ✅ Agent B polls and executes tasks via buddy-do
- ✅ Results are reported back and retrievable
- ✅ Timeouts are detected and handled correctly
- ✅ Authentication works with token validation
- ✅ All error scenarios are handled gracefully
- ✅ Documentation is complete and accurate
- ✅ Code review passed

**Performance Targets**:
- Task submission: < 100ms ✅
- Polling response: < 50ms ✅
- Result reporting: < 100ms ✅
- Timeout detection: < 60s ✅

---

## Implementation Notes

**TDD Discipline**:
- Every component starts with failing tests
- Minimal implementation to make tests pass
- Refactor with confidence (tests protect you)

**Commit Frequency**:
- Commit after each task (not step)
- Each commit should be atomic and deployable
- Follow conventional commit format

**Parallel Execution**:
- Phase 1 tasks (1.1-1.5) can run in parallel (independent components)
- Use `@superpowers:dispatching-parallel-agents` if executing with subagents

**Test Strategy**:
- Unit tests: Fast, isolated, mock dependencies
- Integration tests: Real components, in-memory database
- E2E tests: Full system, real HTTP server

**Code Quality**:
- Follow existing project conventions
- Use TypeScript strict mode
- No `any` types (use proper types)
- Comprehensive error handling
- Informative logging

---

**Plan Status**: ✅ Complete and ready for execution

**Recommended Execution**: Use `@superpowers:subagent-driven-development` for parallel task execution with code review between phases.
