# Claude Code Buddy Examples

Example scripts demonstrating claude-code-buddy features.

## Terminal UI Dashboard Demo (Phase 3)

**NEW:** Live terminal dashboard with real-time progress tracking and productivity metrics.

```bash
npm run demo:dashboard
```

**Features:**
- Real-time progress updates with animated spinners
- Attribution tracking (success/error)
- Productivity metrics (time saved, tokens used)
- GitHub issue auto-generation for errors
- Daily report generation

See: [dashboard-demo.ts](./dashboard-demo.ts)

---

## Legacy Terminal UI Examples & Documentation

Complete technical assessment and implementation guide for building elegant terminal UIs in the claude-code-buddy project.

## Quick Links

| Document | Purpose | Location |
|----------|---------|----------|
| **Dashboard Demo** | Live Phase 3 dashboard | [dashboard-demo.ts](./dashboard-demo.ts) |
| **Technical Assessment** | Comprehensive library evaluation | [TERMINAL_UI_ASSESSMENT.md](../docs/TERMINAL_UI_ASSESSMENT.md) |
| **Setup Guide** | Step-by-step integration | [SETUP_GUIDE.md](./SETUP_GUIDE.md) |
| **Comparison** | Library feature comparison | [terminal-ui-comparison.md](./terminal-ui-comparison.md) |
| **POC Demo** | Live dashboard demo | [terminal-ui-poc.tsx](./terminal-ui-poc.tsx) |
| **Component Library** | UI pattern reference | [component-library.tsx](./component-library.tsx) |

---

## Quick Start (2 minutes)

### 1. Install Dependencies

```bash
cd /path/to/claude-code-buddy

# Core framework + utilities
npm install ink ink-spinner chalk ora boxen

# Dev dependencies
npm install -D @types/react
```

### 2. Run Examples

```bash
# Full dashboard demo with real-time updates
npx tsx examples/terminal-ui-poc.tsx

# Component library showcase
npx tsx examples/component-library.tsx
```

---

## What's Included

### 1. Technical Assessment (docs/TERMINAL_UI_ASSESSMENT.md)

**Comprehensive evaluation of:**
- 7+ terminal UI libraries
- Performance benchmarks
- Architecture proposals
- Cross-platform compatibility
- Memory/CPU usage analysis

**Key Finding:** Ink + chalk + ora is the optimal stack

---

### 2. Proof of Concept (terminal-ui-poc.tsx)

**Interactive demo featuring:**
- Real-time task dashboard
- Progress tracking
- Workflow diagrams
- Log viewer
- Event-driven updates

**Technologies:**
- Ink (React for CLI)
- EventEmitter for real-time updates
- TypeScript for type safety

**Run:**
```bash
npx tsx examples/terminal-ui-poc.tsx
```

**What you'll see:**
```
╭──────────────────────────────────╮
│ 🤖 Claude Code Buddy Dashboard        │
╰──────────────────────────────────╯

Overall Progress:
████████████████░░░░░░░░░░░░░░ 67%

Active Tasks:
⠋ Research Agent (50%)
○ Code Review Agent (0%)
✅ Test Automation (100%) [2.1s]

Workflow:
✓ Initialize agents
▶ Execute tasks
○ Validate results
○ Generate reports
○ Complete

Recent Logs:
[10:30:15] Starting Research Agent...
[10:30:17] ✓ Research completed
[10:30:18] Starting Code Review...
```

---

### 3. Component Library (component-library.tsx)

**Visual reference for all UI patterns:**
- Status indicators (✓ ✗ ⚠ ○)
- Progress bars
- Task cards
- Boxes & panels (4 border styles)
- Tables
- Log viewers
- Workflow diagrams
- Notifications
- Statistics panels
- Spinner types

**Run:**
```bash
npx tsx examples/component-library.tsx
```

**Use case:** Copy-paste components into your dashboard

---

### 4. Library Comparison (terminal-ui-comparison.md)

**Side-by-side comparison:**

| Library | Bundle | Memory | Best For |
|---------|--------|--------|----------|
| Ink | ~500KB | ~20MB | Dashboards ✅ |
| blessed | ~300KB | ~15MB | Charts/gauges |
| Minimal | ~80KB | ~5MB | Simple CLIs |

**Decision tree** for choosing the right stack

---

### 5. Setup Guide (SETUP_GUIDE.md)

**Complete integration guide:**
- Installation steps
- Dashboard module structure
- Event system design
- Orchestrator integration
- Testing strategies
- Troubleshooting

**Perfect for:** Implementing the dashboard in your project

---

## Recommendations

### For Claude Code Buddy Dashboard: Use Ink

**Why?**
- ✅ Modern React-based architecture
- ✅ Built-in real-time updates
- ✅ Excellent TypeScript support
- ✅ Rich component ecosystem
- ✅ ~570KB total (acceptable for Node.js)
- ✅ Cross-platform compatible
- ✅ Active maintenance (Sindre Sorhus)

**Tech Stack:**
```json
{
  "dependencies": {
    "ink": "^4.4.1",
    "ink-spinner": "^5.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "boxen": "^7.1.1"
  }
}
```

---

## Architecture

### Event-Driven Design

```
┌─────────────────────────────────┐
│  Orchestrator                   │
│  - Runs agents                  │
│  - Emits events                 │
└────────────┬────────────────────┘
             │
             │ EventEmitter
             ▼
┌─────────────────────────────────┐
│  Ink Dashboard                  │
│  - Listens to events            │
│  - Updates React state          │
│  - Re-renders UI                │
└─────────────────────────────────┘
```

**Benefits:**
- Non-blocking (Ink handles rendering)
- No IPC overhead (same process)
- Simple event API
- Easy to test

---

## Performance

**Benchmarks:**
- Startup time: ~150ms
- Memory usage: ~20MB (idle)
- CPU usage: <1% (idle), ~3% (active updates)
- Bundle size: ~570KB

**Verdict:** Lightweight enough for CLI tools ✅

---

## Integration Example

```typescript
// src/orchestrator/index.ts
import { render } from 'ink';
import Dashboard from './dashboard';
import { EventEmitter } from 'events';

const eventBus = new EventEmitter();

// Start dashboard
render(<Dashboard eventBus={eventBus} />);

// Emit events from agents
async function runAgent(task: Task) {
  eventBus.emit('task:start', task);

  for (let i = 0; i <= 100; i += 10) {
    await doWork();
    eventBus.emit('task:progress', task.id, i);
  }

  eventBus.emit('task:complete', task);
}
```

---

## Cross-Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| macOS | ✅ Full | Tested on M2 |
| Linux | ✅ Full | All terminals |
| Windows | ✅ Good | Windows Terminal recommended |
| Windows (CMD) | ⚠️ Limited | No unicode/emoji |

**Auto-detection:**
```typescript
import { supportsColor } from 'chalk';
import isUnicodeSupported from 'is-unicode-supported';

if (supportsColor) {
  // Use colors
}

if (isUnicodeSupported()) {
  // Use emoji
} else {
  // Use ASCII fallback
}
```

---

## Next Steps

### Phase 1: Install & Test (5 min)
```bash
npm install ink ink-spinner chalk ora boxen
npm install -D @types/react
npx tsx examples/terminal-ui-poc.tsx
```

### Phase 2: Create Dashboard Module (30 min)
```bash
mkdir -p src/dashboard/components
cp examples/terminal-ui-poc.tsx src/dashboard/index.tsx
# Edit to match your needs
```

### Phase 3: Integrate with Orchestrator (1 hour)
- Create event system
- Emit events from agents
- Test real-time updates

### Phase 4: Customize & Polish (2 hours)
- Add custom components
- Implement your design
- Add tests

---

## Resources

### Documentation
- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [chalk GitHub](https://github.com/chalk/chalk)
- [ora GitHub](https://github.com/sindresorhus/ora)

### Examples
- [Gatsby CLI](https://github.com/gatsbyjs/gatsby) - Uses Ink
- [Next.js](https://github.com/vercel/next.js) - Uses Ink
- [Jest](https://github.com/jestjs/jest) - Test runner UI

### Community
- [Awesome Ink](https://github.com/vadimdemedes/awesome-ink)
- [Ink Components](https://github.com/vadimdemedes/ink#useful-components)

---

## Support

### Troubleshooting

**Issue:** UI not updating
- **Fix:** Ensure EventEmitter instance is shared

**Issue:** Flickering
- **Fix:** Throttle updates (max 100ms)

**Issue:** Unicode broken
- **Fix:** Use `isUnicodeSupported()` for fallbacks

**More:** See [SETUP_GUIDE.md](./SETUP_GUIDE.md#troubleshooting)

---

## Summary

**You have everything you need to build a beautiful terminal UI:**

✅ **Technical Assessment** - Know why Ink is the best choice
✅ **Working POC** - See it in action
✅ **Component Library** - Copy-paste UI patterns
✅ **Setup Guide** - Step-by-step integration
✅ **Comparison** - Understand trade-offs

**Total time to production:** ~4 hours

**Start here:** `npx tsx examples/terminal-ui-poc.tsx`

Happy building! 🚀
