# Terminal UI Dashboard

Smart-agents provides a real-time terminal UI dashboard for monitoring agent progress, tracking productivity, and managing background tasks.

## Features

- **Real-Time Progress:** See active agents with progress bars and ETAs
- **Attribution Transparency:** Know when smart-agents helped (success) or failed (error)
- **Productivity Tracking:** Track time saved, tasks completed, success rate
- **GitHub Issue Auto-Suggestion:** One-click error reporting with sanitized data
- **Resource Monitoring:** Live CPU, memory, and agent count

## Quick Start

```typescript
import { Dashboard } from './src/ui/Dashboard.js';
import { ResourceMonitor } from './src/core/ResourceMonitor.js';

// Create and start dashboard
const resourceMonitor = new ResourceMonitor();
const dashboard = new Dashboard(resourceMonitor);

dashboard.start();

// Dashboard runs in the background, updating every 200ms
// Stop when done
dashboard.stop();
```

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────┐
│              Dashboard                      │
│  (Orchestrates all UI components)          │
└──────────────┬──────────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐    ┌─────▼──────┐
│ UIEventBus│    │ Progress   │
│ (Events)  │    │ Renderer   │
└─────┬─────┘    └─────┬──────┘
      │                 │
      │          ┌──────▼─────────┐
      │          │ AttributionMgr │
      │          └──────┬─────────┘
      │                 │
      └────────┬────────┘
               │
        ┌──────▼────────┐
        │ MetricsStore  │
        └───────────────┘
```

### UIEventBus (Event System)

Singleton EventEmitter for decoupled UI updates:

- `emitProgress(progress)` - Agent progress updates
- `emitAttribution(attribution)` - Success/error tracking
- `onProgress(handler)` - Subscribe to progress events
- `onAttribution(handler)` - Subscribe to attribution events

### ProgressRenderer (Terminal Rendering)

In-place terminal rendering using `log-update`:

- Progress bars with percentage
- Animated spinners
- Color-coded status icons
- ETA calculations
- Responsive layouts (60-80, 80-120, 120+ char widths)

### AttributionManager (Success/Error Tracking)

Tracks when smart-agents helps or fails:

- Success attributions: Time saved, tokens used
- Error attributions: Error details, stack traces
- GitHub issue auto-generation with privacy sanitization
- Removes user paths, API keys, passwords

### MetricsStore (Productivity Tracking)

Persistent productivity metrics:

- Tasks completed/failed
- Total time saved
- Token usage
- Agent usage breakdown
- Daily/weekly reports (Markdown/CSV export)

## Dashboard Configuration

```typescript
import type { UIConfig } from './src/ui/types.js';

const customConfig: UIConfig = {
  updateInterval: 200,        // 5 FPS (200ms)
  maxRecentAttributions: 5,   // Show last 5 attributions
  colorEnabled: true,         // ANSI colors
  animationsEnabled: true,    // Spinners
  terminalWidth: 80,          // Force width (auto-detect if undefined)
};

const dashboard = new Dashboard(resourceMonitor, customConfig);
```

## Integration with BackgroundExecutor

```typescript
import { BackgroundExecutor } from './src/core/BackgroundExecutor.js';
import { UIEventBus } from './src/ui/UIEventBus.js';

const eventBus = UIEventBus.getInstance();
const executor = new BackgroundExecutor(resourceMonitor, eventBus);

// BackgroundExecutor automatically emits:
// - Progress events (queued, running, completed, failed)
// - Attribution messages (success/error)
```

## Productivity Reports

### Daily Summary

```typescript
const metricsStore = dashboard.getMetricsStore();
const report = await metricsStore.generateDailyReport();
console.log(report);
```

Output:

```markdown
# Daily Productivity Report
**Date:** 12/28/2025

## Summary
- **Tasks Completed:** 8
- **Tasks Failed:** 1
- **Time Saved:** 45 minutes
- **Tokens Used:** 25,000

## Agent Usage
- **code-reviewer:** 3 tasks
- **test-automator:** 2 tasks
- **performance-engineer:** 2 tasks
- **debugger:** 1 task

## Performance
- **Success Rate:** 88.9%
- **Avg Time Saved per Task:** 5.6 minutes
```

### CSV Export

```typescript
const csv = await metricsStore.exportAsCSV();
// Agent,Task Count,Time Saved (min),Tokens Used
// code-reviewer,3,15,8000
// test-automator,2,10,5000
```

## GitHub Issue Auto-Suggestion

When an error occurs, the dashboard can auto-generate a sanitized GitHub issue:

```typescript
const attributionManager = dashboard.getAttributionManager();
const error = new Error('API timeout in BackgroundExecutor');

// Suggest GitHub issue (privacy-first)
const suggestion = attributionManager.generateIssueSuggestion(attribution, error);

console.log(suggestion.title);
// [smart-agents] Error: API timeout in BackgroundExecutor

console.log(suggestion.body);
// Sanitized error report with:
// - User paths replaced with [USER]
// - API keys/tokens redacted
// - Stack trace included
// - Environment info (Node.js version, platform)
```

## Performance

The terminal UI is designed for minimal overhead:

- **Render Time:** <50ms per frame (5 FPS target)
- **Memory Usage:** <10MB
- **CPU Overhead:** <2%
- **Dependencies:** <100KB total (chalk, log-update, cli-spinners, cli-table3)

## Examples

See `examples/dashboard-demo.ts` for a complete working demo.

```bash
npm run demo:dashboard
```

## API Reference

### Dashboard

```typescript
class Dashboard {
  constructor(resourceMonitor: ResourceMonitor, customConfig?: Partial<UIConfig>)

  start(): void
  stop(): void
  isRunning(): boolean
  getState(): DashboardStateForRendering
  getAttributionManager(): AttributionManager
  getMetricsStore(): MetricsStore
  destroy(): void
}
```

### UIEventBus

```typescript
class UIEventBus extends EventEmitter {
  static getInstance(): UIEventBus

  emitProgress(progress: ProgressIndicator): void
  emitAttribution(attribution: AttributionMessage): void

  onProgress(handler: (progress: ProgressIndicator) => void): () => void
  onAttribution(handler: (attribution: AttributionMessage) => void): () => void
}
```

### AttributionManager

```typescript
class AttributionManager {
  constructor(eventBus: UIEventBus)

  recordSuccess(
    agentIds: string[],
    taskDescription: string,
    metadata?: { timeSaved?: number; tokensUsed?: number }
  ): void

  recordError(
    agentIds: string[],
    taskDescription: string,
    error: Error,
    suggestGitHubIssue?: boolean
  ): void

  generateIssueSuggestion(
    attribution: AttributionMessage,
    error: Error
  ): GitHubIssueSuggestion

  getRecentAttributions(limit?: number): AttributionMessage[]
}
```

### MetricsStore

```typescript
class MetricsStore {
  constructor(storePath?: string)

  recordAttribution(attribution: AttributionMessage): void
  getCurrentSessionMetrics(): SessionMetrics

  async persist(): Promise<void>
  async load(): Promise<void>
  async generateDailyReport(date?: Date): Promise<string>
  async exportAsCSV(): Promise<string>
}
```

## Type Definitions

```typescript
interface UIConfig {
  updateInterval: number;
  maxRecentAttributions: number;
  colorEnabled: boolean;
  animationsEnabled: boolean;
  terminalWidth?: number;
}

interface ProgressIndicator {
  agentId: string;
  agentType: string;
  taskDescription: string;
  progress: number; // 0.0 to 1.0
  currentStage?: string;
  startTime: Date;
  endTime?: Date;
}

interface AttributionMessage {
  id: string;
  type: 'success' | 'error' | 'warning';
  timestamp: Date;
  agentIds: string[];
  taskDescription: string;
  metadata?: {
    timeSaved?: number;
    tokensUsed?: number;
    error?: ErrorDetails;
    suggestGitHubIssue?: boolean;
  };
}

interface SessionMetrics {
  sessionId: string;
  startedAt: Date;
  tasksCompleted: number;
  tasksFailed: number;
  totalTimeSaved: number; // minutes
  totalTokensUsed: number;
  agentUsageBreakdown: Record<string, number>;
}
```

## Best Practices

1. **Memory Management:** Always call `dashboard.destroy()` before discarding the instance to prevent memory leaks.

2. **Event Listeners:** The Dashboard automatically manages event listeners. If you manually subscribe to UIEventBus, remember to unsubscribe.

3. **Resource Monitoring:** The ResourceMonitor should be shared across the application - create only one instance.

4. **Error Handling:** Always enable GitHub issue suggestion for production errors to help users report issues easily.

5. **Privacy:** Attribution Manager automatically sanitizes sensitive data (API keys, passwords, user paths) before generating GitHub issues.

## Troubleshooting

### Dashboard Not Updating

**Issue:** Progress not showing in terminal
**Fix:** Ensure UIEventBus is passed to BackgroundExecutor constructor

### Flickering Display

**Issue:** Terminal output flickers
**Fix:** Dashboard has built-in 100ms throttling. If still flickering, increase `updateInterval` in config

### Metrics Not Persisting

**Issue:** Metrics lost after restart
**Fix:** Call `metricsStore.persist()` before stopping dashboard, or use auto-persist on interval

### High CPU Usage

**Issue:** CPU spikes during dashboard rendering
**Fix:** Reduce `updateInterval` (increase value = slower updates = less CPU)

## License

MIT
