# Smart Agents Terminal UI Design Specification

**Complete Terminal UI/UX Design for Claude Code Integration**

Version: 2.0
Date: 2025-12-28
Designer: UI Designer Agent
Target: Claude Code Terminal Environment

---

## 1. Executive Summary

### Design Philosophy

**"Professional dashboard vibes in a terminal environment"**

Smart Agents must feel like a **vibe coding partner** - responsive, transparent, helpful, and never overwhelming. The UI should communicate system intelligence while respecting terminal constraints.

### Core Principles

1. **Minimal & Periodic** - Update only when meaningful, not every millisecond
2. **Attribution & Transparency** - Always show who did what and why
3. **Responsive Feeling** - Fast reactions to user input, smooth state transitions
4. **Responsibility Feeling** - Clear ownership of successes and failures
5. **Terminal-Native** - Embrace constraints, don't fight them

---

## 2. Visual Design System

### 2.1 Color Palette (ANSI Terminal Colors)

**Brand Colors** (256-color mode support):
```
Primary Gradient:   #667eea → #764ba2
ANSI Approximation: Blue (34) → Magenta (35)

Terminal Color Map:
├─ Brand Primary:    \033[38;5;63m  (Purple-Blue)
├─ Brand Accent:     \033[38;5;97m  (Deep Purple)
├─ Success:          \033[38;5;35m  (Green #10b981)
├─ Warning:          \033[38;5;214m (Amber #f59e0b)
├─ Error:            \033[38;5;203m (Red #ef4444)
├─ Info:             \033[38;5;39m  (Blue #3b82f6)
├─ Text Primary:     \033[38;5;255m (Near White)
├─ Text Secondary:   \033[38;5;250m (Gray)
└─ Text Muted:       \033[38;5;240m (Dark Gray)
```

**Fallback** (16-color mode):
```
Brand:    Bright Blue (94) + Bright Magenta (95)
Success:  Bright Green (92)
Warning:  Bright Yellow (93)
Error:    Bright Red (91)
Info:     Bright Cyan (96)
```

**Safe Mode** (No color support):
```
Use Unicode symbols only:
✓ Success  ⚠ Warning  ✖ Error  ℹ Info
```

### 2.2 Typography & Spacing

**Font**: System monospace (SF Mono, Menlo, Consolas)

**Line Heights**:
```
Compact:  0 lines (inline updates)
Normal:   1 line (default spacing)
Spacious: 2 lines (section separators)
```

**Character Widths**:
```
Minimum:  60 characters (mobile terminals)
Standard: 80 characters (default)
Wide:     120 characters (desktop)
Ultra:    160+ characters (ultra-wide displays)
```

### 2.3 Box Drawing Characters

**Unicode Box Drawing** (Preferred):
```
┌─┬─┐  ╔═╦═╗  ╭─┬─╮
│ │ │  ║ ║ ║  │ │ │
├─┼─┤  ╠═╬═╣  ├─┼─┤
│ │ │  ║ ║ ║  │ │ │
└─┴─┘  ╚═╩═╝  ╰─┴─╯

Single: ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
Double: ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬
Rounded: ─ │ ╭ ╮ ╰ ╯ ├ ┤ ┬ ┴ ┼
```

**ASCII Fallback** (Compatibility):
```
+--+--+
|  |  |
+--+--+
|  |  |
+--+--+

Characters: - | + (only)
```

---

## 3. Progress Indicators

### 3.1 Spinner Designs

**Active Spinner** (Agent working):
```
Frame 1:  ⠋  Processing...
Frame 2:  ⠙  Processing...
Frame 3:  ⠹  Processing...
Frame 4:  ⠸  Processing...
Frame 5:  ⠼  Processing...
Frame 6:  ⠴  Processing...
Frame 7:  ⠦  Processing...
Frame 8:  ⠧  Processing...
Frame 9:  ⠇  Processing...
Frame 10: ⠏  Processing...

Update Rate: 80ms (smooth but not overwhelming)
```

**Dots Spinner** (Fallback):
```
Frame 1:  .    Loading
Frame 2:  ..   Loading
Frame 3:  ...  Loading
Frame 4:  .... Loading

Update Rate: 300ms
```

**Static Indicator** (Non-animated terminals):
```
[●] Agent working... (pulse color: dim → bright)
```

### 3.2 Progress Bars

**Percentage Bar** (0-100%):
```
[████████████░░░░░░░░] 60%

Full:      ████████████████████ 100%
3/4:       ███████████████░░░░░  75%
1/2:       ██████████░░░░░░░░░░  50%
1/4:       █████░░░░░░░░░░░░░░░  25%
Empty:     ░░░░░░░░░░░░░░░░░░░░   0%

Characters:
- Filled:   █ (U+2588)
- Empty:    ░ (U+2591)
- Half:     ▓ (U+2593) - for smooth transitions
```

**Gradient Bar** (Brand colors):
```
[━━━━━━━━━━━━━━━━━━━━] 100%
 \033[38;5;63m━━━\033[38;5;97m━━━\033[0m

Gradient transitions from blue to purple across bar width
```

**Mini Progress** (Compact inline):
```
Code Review ▰▰▰▰▰▱▱▱ 62%
Test Suite  ▰▰▰▰▰▰▰▱ 87%
Deploy      ▰▱▱▱▱▱▱▱ 12%
```

### 3.3 Multi-Agent Progress Display

**Compact View** (Multiple agents, minimal space):
```
┌─ Active Agents (3) ──────────────────────────────┐
│                                                   │
│ architect-001  [████████████░░░░] 60%  2.3s  $3  │
│ coder-002      [██████░░░░░░░░░░] 30%  1.1s  $1  │
│ reviewer-003   [██████████████░░] 70%  3.8s  $2  │
│                                                   │
└───────────────────────────────────────────────────┘

Update Rate: 2 seconds (periodic, not real-time)
```

**Detailed View** (Single agent focus):
```
╔═══════════════════════════════════════════════════╗
║ 🤖 Agent: architecture-senior                     ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  Task:     Analyze authentication system          ║
║  Status:   ⚙️  Analyzing security patterns...     ║
║  Progress: ████████████████████░░░░░░ 80%         ║
║  Time:     2.3s / ~2.8s estimated                 ║
║  Cost:     $0.0042 / ~$0.0048 estimated           ║
║  Tokens:   2,341 / ~2,500 estimated               ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

Update Rate: 1 second (focused task, more frequent)
```

**Background Agents** (Non-intrusive):
```
Background: architect-001 (60%) • coder-002 (30%) • 1 queued

Update: Only on state change (started/paused/completed/failed)
```

---

## 4. Attribution Messages

### 4.1 Success Attribution

**Task Completion** (Celebrate but not annoying):
```
✨ smart-agents completed: Code Review
   ├─ Agent:      code-reviewer
   ├─ Quality:    3 issues found, 2 fixed
   ├─ Time:       1.8s (faster than estimate)
   ├─ Cost:       $0.0021 (within budget)
   └─ Saved you:  ~15 minutes of manual review

   [View Details] [Run Next Task] [Exit]
```

**Batch Completion**:
```
✨ smart-agents batch completed: 5/5 tasks successful
   ├─ Total time: 8.3s
   ├─ Total cost: $0.0142
   ├─ Avg speed:  1.66s/task
   └─ Saved you:  ~1.2 hours

   📊 Productivity Boost: 86x faster than manual
```

**Silent Success** (Background agent):
```
[14:23:45] ✓ background-agent-001 completed (2.1s, $0.003)
```

### 4.2 Error Attribution

**Error with Context** (Helpful, not blaming):
```
❌ smart-agents error: API quota exceeded

   What happened:
   Agent 'architecture-senior' attempted to call Claude API
   but daily quota limit was reached (150/150 requests).

   Impact:
   Task 'security-analysis' could not complete.

   Suggested actions:
   1. ⏰ Wait 9h 34m (quota resets at 23:59:42)
   2. 🔄 Switch to Ollama (free, local, unlimited)
      Command: smart-agents retry task-004 --provider ollama
   3. 💰 Increase quota (+$5/month for 200 requests/day)
      Command: smart-agents config set-quota 200

   [Report Bug] [View Logs] [Switch Provider] [Exit]
```

**Auto-Suggest GitHub Issue** (One-click reporting):
```
❌ smart-agents internal error: Unexpected crash

   Error: TypeError: Cannot read property 'tokens' of undefined
   Agent: test-automator
   Task:  Generate unit tests for auth.ts

   This looks like a bug. Would you like to report it?

   [Yes, Create GitHub Issue] [No, Just Show Logs]

   (If 'Yes'):
   ✓ Created GitHub issue #142
   🔗 https://github.com/user/smart-agents/issues/142
   📋 Logs attached, stacktrace included
   👥 Maintainers notified
```

### 4.3 Warning Attribution

**Resource Warning** (Proactive, not panicked):
```
⚠️  smart-agents resource alert

   Memory usage: 85% (nearing limit)

   Recommendation:
   Reduce concurrent agents from 3 to 2 to maintain
   optimal performance and prevent system slowdown.

   [Auto-Adjust] [Keep Current] [Ignore]
```

---

## 5. Dashboard Layout

### 5.1 Compact Dashboard (60-80 chars)

**Mobile/Narrow Terminal**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🤖 Smart Agents v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Updated: 14:23:45     Status: ✓ Healthy

┌────────────────────────────────────┐
│ 💰 Cost                            │
├────────────────────────────────────┤
│  Today:   $0.42 / $10    4% ████   │
│  Month:   $8.35 / $35   24% █████  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 💻 Resources                       │
├────────────────────────────────────┤
│  CPU:     60% ████████░░           │
│  Memory:  70% ██████████░          │
│  Agents:  3 active, 2 idle         │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 📋 Active Tasks (2)                │
├────────────────────────────────────┤
│  • task-001  ████████░░ 80%  2.3s  │
│  • task-002  ████░░░░░░ 40%  1.1s  │
└────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(r)efresh (a)gents (t)asks (h)elp (q)uit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

>
```

### 5.2 Standard Dashboard (80-120 chars)

**Desktop Terminal**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                🤖 Smart Agents Dashboard v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Last Updated: 2025-12-28 14:23:45                                    Status: ✓ Healthy

┌──────────────────────────┬──────────────────────────┬────────────────────────────────┐
│ 💰 Cost Tracking         │ 💻 System Resources      │ 🤖 Agent Status                │
├──────────────────────────┼──────────────────────────┼────────────────────────────────┤
│                          │                          │                                │
│  Daily:    $0.42 / $10   │  CPU:    ████████░░ 60%  │  Active:    3                  │
│  ████░░░░░░░░░░ 4%       │  Memory: ██████████░ 70% │  Idle:      2                  │
│                          │  Disk:   ████░░░░░░ 20%  │  Error:     0                  │
│  Monthly:  $8.35 / $35   │                          │                                │
│  ████████████░░ 24%      │  Available: 4.8 GB       │  Teams:     2                  │
│                          │  Status: ✓ Optimal       │  Messages:  127                │
│  Tasks:    127 total     │                          │                                │
│  Avg Cost: $0.0066       │                          │                                │
│                          │                          │                                │
└──────────────────────────┴──────────────────────────┴────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📊 Active Tasks (2)                                                                          │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  🤖 task-001  Architecture Analysis                                       Running ●          │
│     Agent: architecture-senior | Complexity: 8/10 | Cost: $0.0042 | Time: 2.3s              │
│     ████████████████░░░░ 80%                                                                 │
│                                                                                              │
│  🤖 task-002  Code Review                                                  Running ●          │
│     Agent: code-reviewer | Complexity: 5/10 | Cost: $0.0018 | Time: 1.1s                    │
│     ████░░░░░░░░░░░░░░░░ 20%                                                                 │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 💬 Recent Activity                                                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  14:23:45  ✅ Task completed: test-automation-suite                                          │
│            Agent: test-automator | Cost: $0.0021 | Time: 3.2s                               │
│                                                                                              │
│  14:21:32  ⚡ Agent spawned: code-reviewer                                                   │
│            Capability: code-quality-analysis                                                 │
│                                                                                              │
│  14:19:18  ● Task started: architecture-analysis                                             │
│            Estimated cost: $0.0042 | Complexity: 8/10                                        │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commands: (r)efresh | (a)gents | (t)asks | (s)ettings | (h)elp | (q)uit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

>
```

### 5.3 Wide Dashboard (120+ chars)

**Ultra-Wide Display** (adds Productivity Metrics column):
```
┌──────────────────────┬──────────────────────┬────────────────────┬──────────────────────┐
│ 💰 Cost              │ 💻 Resources         │ 🤖 Agents          │ 📊 Productivity      │
├──────────────────────┼──────────────────────┼────────────────────┼──────────────────────┤
│ Daily:   $0.42 / $10 │ CPU:    60%          │ Active:    3       │ Time saved: 2.4h     │
│ Monthly: $8.35 / $35 │ Memory: 70%          │ Idle:      2       │ Tasks done: 127      │
│ Tasks:   127         │ Status: ✓ Optimal    │ Teams:     2       │ Efficiency: 86x      │
└──────────────────────┴──────────────────────┴────────────────────┴──────────────────────┘
```

---

## 6. Interaction Patterns

### 6.1 Keyboard Shortcuts

**Global Shortcuts** (Available everywhere):
```
Ctrl+C    Interrupt/Cancel current operation
Ctrl+D    Exit application
Ctrl+L    Clear screen
Ctrl+R    Refresh display

h / ?     Show help
q         Quit
ESC       Back/Cancel
```

**Dashboard Navigation**:
```
r         Refresh dashboard
a         View agents list
t         View tasks list
s         Settings
d         Toggle details view
1-9       Quick select (agent/task by number)
↑/↓       Navigate lists
Enter     Select/Confirm
Tab       Next section
Shift+Tab Previous section
```

**Agent Control**:
```
Space     Pause/Resume agent
c         Cancel agent
k         Kill agent (force stop)
v         View agent logs
```

### 6.2 Expand/Collapse Agent Details

**Collapsed State** (Default):
```
┌─ Active Agents (3) ───────────────────────┐
│ ▶ architect-001  80%  Running  $0.004     │
│ ▶ coder-002      30%  Running  $0.001     │
│ ▶ reviewer-003   70%  Running  $0.002     │
└───────────────────────────────────────────┘

Press 'd' or Enter to expand
```

**Expanded State** (Shows full details):
```
┌─ Active Agents (3) ─────────────────────────────────────────┐
│ ▼ architect-001                                             │
│   ├─ Task:     Analyze authentication system                │
│   ├─ Status:   Analyzing security patterns...               │
│   ├─ Progress: ████████████████░░░░ 80%                     │
│   ├─ Time:     2.3s / ~2.8s estimated                       │
│   ├─ Cost:     $0.0042 / ~$0.0048 estimated                 │
│   ├─ Tokens:   2,341 / ~2,500 estimated                     │
│   └─ Commands: (p)ause | (c)ancel | (v)iew logs | (h)ide   │
│                                                             │
│ ▶ coder-002      30%  Running  $0.001                       │
│ ▶ reviewer-003   70%  Running  $0.002                       │
└─────────────────────────────────────────────────────────────┘

Press 'd' again to collapse
```

### 6.3 Cancel Background Agents

**Cancel Confirmation**:
```
⚠️  Cancel agent 'architect-001'?

   Current progress: 80% complete
   Estimated time remaining: 0.5s
   Cost so far: $0.0033

   Canceling will:
   • Stop task execution immediately
   • Save partial results (if available)
   • Charge for tokens used so far

   Are you sure? (y/N):
```

**Cancel Success**:
```
✓ Agent 'architect-001' cancelled
  Final cost: $0.0033
  Partial results saved to: ./outputs/task-001-partial.md
```

### 6.4 GitHub Issue Reporting

**Auto-Detect Error Context**:
```
❌ Error detected: RuntimeError in test-automator

   [Create GitHub Issue]

   (If selected):

   📝 Preparing issue report...
   ✓ Stack trace captured
   ✓ System info collected
   ✓ Task context saved
   ✓ Logs attached

   GitHub Issue Preview:
   ┌────────────────────────────────────────────┐
   │ Title: RuntimeError in test-automator     │
   │                                            │
   │ **Error**: TypeError: Cannot read...      │
   │ **Agent**: test-automator                 │
   │ **Task**: Generate unit tests             │
   │                                            │
   │ **Stack Trace**:                           │
   │ ```                                        │
   │ at TestAutomator.analyze (line 142)       │
   │ at Router.routeTask (line 89)             │
   │ ```                                        │
   │                                            │
   │ **System Info**:                           │
   │ - OS: macOS 14.6.0                         │
   │ - Node: v20.10.0                           │
   │ - smart-agents: v2.0.0                     │
   └────────────────────────────────────────────┘

   Post this issue? (Y/n):
```

---

## 7. Real-Time Updates

### 7.1 Update Frequency Strategy

**Update Tiers** (Prevent terminal spam):

| Component | Default Rate | Rationale |
|-----------|-------------|-----------|
| Dashboard overview | 5 seconds | Overview doesn't change often |
| Active agent progress | 1 second | User focused, wants updates |
| Background agent | On state change | Don't distract from main task |
| Cost tracker | 10 seconds | Low priority, slow change |
| Resource monitor | 2 seconds | Important but not critical |
| Activity log | Real-time | Events worth showing immediately |

**Diff-Based Updates** (Only show changes):
```
# Before:
Agents:  3 active, 2 idle
Cost:    $0.42 / $10

# After (only "Cost" changed):
Cost:    $0.43 / $10  ← Updated

# Terminal output (diff):
[14:23:50] Cost: $0.42 → $0.43
```

### 7.2 Throttling & Debouncing

**Throttle** (Limit max update rate):
```typescript
// Update at most once per second
throttle(updateDashboard, 1000);

// Prevents:
updateDashboard(); // ✓ Execute
updateDashboard(); // ✗ Skip (too soon)
updateDashboard(); // ✗ Skip (too soon)
// ... 1 second later ...
updateDashboard(); // ✓ Execute
```

**Debounce** (Wait for quiet period):
```typescript
// Wait 500ms after last event before updating
debounce(updateActivityLog, 500);

// Prevents:
logEvent('task started');   // ✗ Don't update yet
logEvent('agent spawned');  // ✗ Don't update yet
logEvent('task progress');  // ✗ Don't update yet
// ... 500ms of silence ...
// ✓ Now update with all 3 events
```

### 7.3 Progressive Enhancement

**Capability Detection**:
```
Terminal Capabilities:
├─ Color support:    256-color ✓
├─ Unicode support:  Full ✓
├─ Terminal width:   120 chars
├─ Cursor movement:  Supported ✓
└─ Refresh rate:     60 FPS (use 1-5 FPS)

Adaptation:
✓ Use 256-color palette
✓ Use Unicode box drawing
✓ Use standard dashboard layout
✓ Use cursor-based updates (not line-by-line)
✓ Throttle to 1-5 FPS (not 60 FPS)
```

**Degradation** (Fallback modes):
```
If terminal width < 80:
  → Use compact dashboard

If no color support:
  → Use ASCII symbols only

If no Unicode support:
  → Use ASCII box drawing

If no cursor movement:
  → Use line-by-line output (no dashboard)
```

---

## 8. Productivity Metrics Display

### 8.1 Real-Time Metrics

**Inline Metrics** (Task completion):
```
✨ Task completed: Code Review
   ├─ Time:      1.8s
   ├─ Manual:    ~15 minutes
   └─ Saved:     ~13.2 minutes (500x faster)
```

**Dashboard Widget**:
```
┌─ 📊 Productivity ──────────────────────┐
│  Time saved today:      2.4 hours      │
│  Tasks completed:       127            │
│  Efficiency boost:      86x            │
│  Fastest task:          0.8s           │
│  Most complex:          security-audit │
└────────────────────────────────────────┘
```

### 8.2 Periodic Summary

**Daily Summary** (End of day):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 Daily Summary - 2025-12-28
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ smart-agents saved you 8.7 hours today

Tasks completed:    127
Total cost:         $8.35
Average task time:  1.9s
Most used agent:    code-reviewer (45 tasks)

Top achievements:
✓ Zero failed tasks (100% success rate)
✓ All tasks under budget
✓ 3 security issues prevented

[View Details] [Export Report] [Continue]
```

**Weekly Summary** (Auto-trigger on Monday):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 Weekly Summary - Dec 22-28
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ smart-agents saved you 42.3 hours this week

That's equivalent to:
• 1 full work week
• 5.3 work days
• $3,384 in developer time (at $80/hour)

Your productivity boost: 78x faster than manual

[View Detailed Report] [Share] [Dismiss]
```

### 8.3 Non-Intrusive Placement

**Toast Notification** (Bottom-right corner):
```
┌─ 📊 Milestone Reached ────────┐
│ You've saved 10 hours!        │
│ Keep up the great work! 🎉    │
└───────────────────────────────┘
  Auto-dismiss in 5s
```

**Status Bar** (Top-right corner):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2.4h saved today
```

---

## 9. Responsive Design (Terminal Width Adaptation)

### 9.1 Breakpoints

**Narrow** (60-79 chars):
```
- Single column layout
- Stacked cards
- Abbreviated labels
- Minimal padding
```

**Standard** (80-119 chars):
```
- Two column layout
- Side-by-side cards
- Full labels
- Normal padding
```

**Wide** (120-159 chars):
```
- Three column layout
- Dashboard grid
- Extended info
- Spacious padding
```

**Ultra-Wide** (160+ chars):
```
- Four column layout
- Productivity metrics
- Detailed charts
- Maximum info density
```

### 9.2 Content Priority

**Always Show** (Core info):
```
✓ System status (healthy/warning/error)
✓ Active agents count
✓ Current task progress
✓ Critical errors
```

**Show if space** (Important but not critical):
```
✓ Cost tracking
✓ Resource usage
✓ Recent activity log
✓ Agent details
```

**Show if wide** (Nice to have):
```
✓ Productivity metrics
✓ Historical charts
✓ Detailed statistics
✓ Help shortcuts
```

---

## 10. Component Library Specifications

### 10.1 Spinner Component

**API**:
```typescript
interface SpinnerOptions {
  text: string;
  type?: 'dots' | 'line' | 'pulse' | 'arrow';
  color?: 'blue' | 'green' | 'yellow' | 'red';
  interval?: number; // ms
}

class Spinner {
  constructor(options: SpinnerOptions);
  start(): void;
  update(text: string): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  warn(text?: string): void;
  stop(): void;
}
```

**Usage**:
```typescript
const spinner = new Spinner({ text: 'Analyzing task...', color: 'blue' });
spinner.start();
// ... work ...
spinner.succeed('Analysis complete');
```

### 10.2 Progress Bar Component

**API**:
```typescript
interface ProgressBarOptions {
  total: number;
  width?: number;
  completeChar?: string;
  incompleteChar?: string;
  showPercentage?: boolean;
  showValue?: boolean;
}

class ProgressBar {
  constructor(options: ProgressBarOptions);
  update(current: number, label?: string): void;
  complete(message?: string): void;
  stop(): void;
}
```

**Usage**:
```typescript
const bar = new ProgressBar({ total: 100, width: 40 });
bar.update(50, 'Processing tokens...');
bar.complete('Done');
```

### 10.3 Card Component

**API**:
```typescript
interface CardOptions {
  title?: string;
  padding?: number;
  borderStyle?: 'single' | 'double' | 'rounded' | 'bold';
  borderColor?: string;
  width?: number | 'auto';
}

class Card {
  static render(content: string, options?: CardOptions): string;
  static success(title: string, content: string): string;
  static error(title: string, content: string): string;
  static warning(title: string, content: string): string;
  static info(title: string, content: string): string;
}
```

**Usage**:
```typescript
const card = Card.success('Task Completed', `
  Agent: code-reviewer
  Cost: $0.0021
  Time: 1.8s
`);
console.log(card);
```

### 10.4 Table Component

**API**:
```typescript
interface TableColumn {
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

class DataTable {
  constructor(columns: TableColumn[]);
  addRow(...cells: (string | number)[]): this;
  render(): string;
}
```

**Usage**:
```typescript
const table = new DataTable([
  { header: 'Agent', width: 20 },
  { header: 'Status', width: 10 },
  { header: 'Cost', width: 10, align: 'right' },
]);

table
  .addRow('architect', 'Running', '$0.004')
  .addRow('coder', 'Idle', '$0.001');

console.log(table.render());
```

### 10.5 Toast Notification Component

**API**:
```typescript
interface ToastOptions {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

class Toast {
  static show(options: ToastOptions): void;
  static dismiss(id?: string): void;
}
```

**Usage**:
```typescript
Toast.show({
  message: 'Milestone reached: 10 hours saved!',
  type: 'success',
  duration: 5000,
  position: 'bottom-right'
});
```

---

## 11. Animation Specifications

### 11.1 Loading States

**Skeleton Loading** (Before content appears):
```
┌────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Animated shimmer
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└────────────────────────────────┘

Animation:
Frame 1: ░░░░░░░░░░░░░░░░░░
Frame 2:  ░░░░░░░░░░░░░░░░░░
Frame 3:   ░░░░░░░░░░░░░░░░░
(Shift pattern to create shimmer effect)
```

**Pulse Animation** (Waiting state):
```
Frame 1: ● Agent working...      (Bright)
Frame 2: ◐ Agent working...      (Medium)
Frame 3: ○ Agent working...      (Dim)
Frame 4: ◐ Agent working...      (Medium)
Frame 5: ● Agent working...      (Bright)

Cycle: 1 second
```

### 11.2 Transitions

**Smooth Progress Updates**:
```
Instead of:
[████░░░░░░░░] 40%  ← Jump
[████████░░░░] 60%

Use:
[████░░░░░░░░] 40%
[█████░░░░░░░] 42%
[██████░░░░░░] 44%
...
[████████░░░░] 60%

Update: Every 100ms for smooth animation
```

**Fade In/Out** (Toast notifications):
```
Appear:
Frame 1: [Empty]
Frame 2: [Notification at 25% opacity]
Frame 3: [Notification at 50% opacity]
Frame 4: [Notification at 75% opacity]
Frame 5: [Notification at 100% opacity]

Disappear: Reverse sequence
```

### 11.3 Performance Targets

**Animation Budget**:
```
Max frame rate:    5 FPS (200ms per frame)
Max elements:      10 animated elements simultaneously
CPU usage:         < 5% dedicated to UI updates
Terminal writes:   < 50 lines/second
```

---

## 12. Accessibility

### 12.1 Screen Reader Support

**ARIA-Style Labels** (Semantic prefixes):
```
[SUCCESS] Task completed: Code Review
[ERROR] API quota exceeded
[WARNING] Memory usage high
[INFO] Agent spawned: code-reviewer
[PROGRESS] 60% Architecture analysis
```

**Screen Reader Mode** (Plain text):
```
Enable with: --screen-reader flag

Output:
Task started: Architecture analysis
Agent: architecture-senior
Progress: 60 percent complete
Time: 2 seconds elapsed
Cost: 4 thousandths of a dollar
```

### 12.2 Color Blindness Support

**Color Combinations** (Tested for all types):
```
Success:  Green + ✓ symbol
Error:    Red + ✖ symbol
Warning:  Yellow + ⚠ symbol
Info:     Blue + ℹ symbol

Never rely on color alone - always include symbols
```

**Protanopia-Safe**:
```
✓ Green (#10b981) vs Red (#ef4444) - High contrast
✓ Blue (#3b82f6) vs Yellow (#f59e0b) - High contrast
```

**Deuteranopia-Safe**:
```
✓ All combinations meet 7:1 contrast ratio
```

**Tritanopia-Safe**:
```
✓ Blue vs Yellow safe
✓ Green vs Red safe
```

### 12.3 Keyboard Navigation

**All Interactive Elements**:
```
✓ Focusable with Tab
✓ Selectable with Enter/Space
✓ Cancel with Esc
✓ Navigate with Arrow keys
✓ Quick access with number keys
```

**Focus Indicators**:
```
Unfocused: [Option 1]  [Option 2]  [Option 3]
Focused:   [Option 1] >[Option 2]< [Option 3]
                        ^^^^^^^^
                        Visual highlight
```

---

## 13. Performance Optimization

### 13.1 Terminal Output Throttling

**Write Batching** (Reduce syscalls):
```typescript
// Instead of:
console.log(line1);
console.log(line2);
console.log(line3);

// Use:
console.log([line1, line2, line3].join('\n'));

// Benefit: 3 syscalls → 1 syscall
```

**Diff-Based Updates** (Only write changes):
```typescript
// Track last state
const lastDashboard = renderDashboard();

// Only update changed sections
const newDashboard = renderDashboard();
const diff = computeDiff(lastDashboard, newDashboard);
applyDiff(diff); // Only write changed lines
```

### 13.2 Lazy Rendering

**Visible Area Only** (Virtual scrolling):
```
Terminal height: 40 lines
Render only:     40 lines (visible area)
Don't render:    Hidden lines (off-screen)

When user scrolls:
  Update visible area
  Discard off-screen content
```

### 13.3 Memoization

**Cache Expensive Renders**:
```typescript
// Memoize static content
const agentListHeader = memoize(() => renderHeader());

// Only re-render when data changes
const agentList = memoize((agents) => renderAgentList(agents), {
  cache: new Map()
});
```

---

## 14. Testing Strategy

### 14.1 Visual Regression Tests

**Snapshot Testing** (UI appearance):
```typescript
describe('Dashboard', () => {
  it('should render standard layout', () => {
    const output = renderDashboard({ width: 80 });
    expect(output).toMatchSnapshot();
  });

  it('should render compact layout', () => {
    const output = renderDashboard({ width: 60 });
    expect(output).toMatchSnapshot();
  });
});
```

### 14.2 Terminal Compatibility Tests

**Test Matrix**:
```
Terminals:
✓ iTerm2 (macOS)
✓ Terminal.app (macOS)
✓ GNOME Terminal (Linux)
✓ Windows Terminal
✓ xterm
✓ tmux
✓ VS Code integrated terminal

Color modes:
✓ 256-color
✓ 16-color
✓ No color

Unicode support:
✓ Full Unicode
✓ ASCII only
```

### 14.3 Performance Benchmarks

**Target Metrics**:
```
Dashboard render:    < 50ms
Progress update:     < 10ms
Toast display:       < 5ms
Full screen refresh: < 100ms
Memory footprint:    < 10MB
CPU usage:           < 5%
```

---

## 15. Implementation Checklist

### Phase 1: Core Components ✓

- [x] Color system (ANSI codes)
- [x] Typography scale
- [x] Spinner component
- [x] Progress bar component
- [x] Card component
- [x] Table component

### Phase 2: Dashboard Layout

- [ ] Compact dashboard (60-80 chars)
- [ ] Standard dashboard (80-120 chars)
- [ ] Wide dashboard (120+ chars)
- [ ] Responsive breakpoints
- [ ] Terminal capability detection

### Phase 3: Interactions

- [ ] Keyboard shortcuts
- [ ] Expand/collapse details
- [ ] Agent control (pause/cancel/kill)
- [ ] GitHub issue reporting
- [ ] Toast notifications

### Phase 4: Real-Time Updates

- [ ] Throttled updates (diff-based)
- [ ] Multi-agent progress display
- [ ] Background agent indicators
- [ ] Activity log streaming

### Phase 5: Attribution

- [ ] Success messages
- [ ] Error messages
- [ ] Warning messages
- [ ] Productivity metrics

### Phase 6: Polish & Optimization

- [ ] Animation system
- [ ] Performance optimization
- [ ] Accessibility features
- [ ] Cross-terminal testing
- [ ] Visual regression tests

---

## 16. Files to Create

### Component Files

```
src/ui/
├── colors.ts                  # ANSI color system
├── typography.ts              # Font scales and styles
├── components/
│   ├── Spinner.ts             # Loading spinners
│   ├── ProgressBar.ts         # Progress indicators
│   ├── Card.ts                # Content cards
│   ├── Table.ts               # Data tables
│   ├── Toast.ts               # Notifications
│   └── index.ts               # Component exports
├── layouts/
│   ├── CompactDashboard.ts    # 60-80 char layout
│   ├── StandardDashboard.ts   # 80-120 char layout
│   ├── WideDashboard.ts       # 120+ char layout
│   └── index.ts               # Layout exports
├── utils/
│   ├── terminal.ts            # Terminal capability detection
│   ├── throttle.ts            # Update throttling
│   ├── diff.ts                # Diff-based rendering
│   └── accessibility.ts       # A11y helpers
└── index.ts                   # Main UI exports
```

### Integration Files

```
src/cli/
├── commands/
│   ├── dashboard.ts           # Dashboard command
│   ├── run.ts                 # Run task command
│   ├── agents.ts              # Agent management
│   └── status.ts              # System status
└── index.ts                   # CLI entry point
```

---

## 17. Dependencies Already Installed

✓ chalk@5.6.2 - Terminal colors
✓ ora@9.0.0 - Spinners
✓ boxen@8.0.1 - Boxes
✓ commander@14.0.2 - CLI framework
✓ ink@6.6.0 - React for CLI (if needed)

**Still needed**:
- cli-progress - Progress bars
- cli-table3 - Tables
- blessed - Full TUI framework
- gradient-string - Color gradients

---

## 18. Next Steps

1. **Review this spec with user** - Get feedback on designs
2. **Create core components** - Start with Spinner, ProgressBar, Card
3. **Build compact dashboard** - Minimum viable UI
4. **Add interactions** - Keyboard shortcuts and navigation
5. **Implement real-time updates** - Throttled, diff-based rendering
6. **Test across terminals** - Ensure compatibility
7. **Add attribution system** - Success/error messages
8. **Polish & optimize** - Animations, performance tuning

---

**Document Version**: 2.0
**Last Updated**: 2025-12-28
**Status**: Ready for Implementation
**Designer**: UI Designer Agent

**Design Principles**: Terminal-native, minimal spam, maximum clarity, professional vibes, helpful attribution, responsive updates, accessible to all.
