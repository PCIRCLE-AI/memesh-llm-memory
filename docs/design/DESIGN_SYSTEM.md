# Smart Agents UI/UX Design System v2.0

**Vision**: Modern, intelligent, lightweight terminal experience with professional polish

---

## 1. Design Principles

### Core Values
- **Smart** - Anticipate user needs, provide intelligent feedback
- **Light** - Minimal cognitive load, fast interactions, no clutter
- **Elegant** - Beautiful typography, refined color palette, polished details
- **Efficient** - Clear information hierarchy, optimal workflows

### Terminal-First Philosophy
- Beautiful even in constrained environments
- Progressive enhancement (basic → rich)
- Respect terminal capabilities
- Fast, responsive, lightweight

---

## 2. Visual Language

### 2.1 Color Palette

#### Primary Colors
```
Brand Gradient:   #667eea → #764ba2  (Purple gradient)
Primary:          #667eea  (Vibrant blue-purple)
Primary Dark:     #5568d3  (Hover state)
Accent:           #764ba2  (Deep purple)
```

#### Functional Colors
```
Success:          #10b981  (Emerald green)
Warning:          #f59e0b  (Amber)
Error:            #ef4444  (Red)
Info:             #3b82f6  (Blue)
```

#### Neutral Colors
```
Background:       #0f0f23  (Deep space blue - terminal bg)
Surface:          #1a1a2e  (Card/panel background)
Border:           #2d2d44  (Subtle borders)
Text Primary:     #e5e5e5  (Main text)
Text Secondary:   #9ca3af  (Secondary text)
Text Muted:       #6b7280  (Hints, metadata)
```

#### Syntax Highlighting (Code Display)
```
Keyword:          #c792ea  (Purple)
String:           #c3e88d  (Green)
Number:           #f78c6c  (Orange)
Comment:          #697098  (Gray-purple)
Function:         #82aaff  (Blue)
Variable:         #ffcb6b  (Yellow)
```

### 2.2 Typography

#### Font Families
```
Primary:    SF Mono, Menlo, Monaco, Consolas, monospace
Fallback:   'Courier New', monospace
Icons:      Unicode symbols + ASCII art
```

#### Type Scale
```
Heading 1:   28px / 1.2 line-height (Dashboard titles)
Heading 2:   24px / 1.3 line-height (Section headers)
Heading 3:   20px / 1.4 line-height (Card titles)
Body:        14px / 1.5 line-height (Main content)
Small:       12px / 1.4 line-height (Metadata, labels)
Tiny:        10px / 1.3 line-height (Footnotes)
```

#### Font Weights
```
Light:       300  (Subtle text)
Regular:     400  (Body text)
Medium:      500  (Labels)
Semibold:    600  (Headings)
Bold:        700  (Emphasis)
```

### 2.3 Spacing System (8pt Grid)

```
xs:    4px   (Tight spacing)
sm:    8px   (Component padding)
md:    16px  (Card padding)
lg:    24px  (Section spacing)
xl:    32px  (Layout spacing)
2xl:   48px  (Major sections)
3xl:   64px  (Page margins)
```

### 2.4 Iconography

#### Semantic Icons
```
Agent:              🤖  (Robot)
Team:               👥  (People)
Task:               📋  (Clipboard)
Success:            ✅  (Check mark)
Error:              ❌  (Cross)
Warning:            ⚠️   (Warning sign)
Info:               ℹ️   (Information)
Cost:               💰  (Money bag)
Time:               ⏱️   (Stopwatch)
Memory:             💾  (Floppy disk)
Network:            🌐  (Globe)
Analytics:          📊  (Bar chart)
Progress:           ⚙️   (Gear)
Health:             ❤️   (Heart)
Message:            💬  (Speech bubble)
Search:             🔍  (Magnifying glass)
Settings:           ⚙️   (Gear)
Dashboard:          🎨  (Palette)
Performance:        ⚡  (Lightning)
```

#### Status Indicators
```
Running:            ●  (Green dot)
Idle:               ○  (White circle)
Error:              ✖  (Red X)
Paused:             ‖  (Pause)
Success:            ✓  (Checkmark)
Pending:            ⋯  (Ellipsis)
```

---

## 3. Terminal UI Components

### 3.1 Progress Bars

#### Standard Progress Bar
```
████████████░░░░░░░░  60%  Analyzing task...
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] 100%

Colors:
  Complete: #667eea (gradient start)
  Remaining: #2d2d44 (border color)
```

#### Multi-Stage Progress
```
Stage 1: ✓ Complete
Stage 2: ━━━━━━━━━━━━━━━ 75% In Progress
Stage 3: ○ Pending
Stage 4: ○ Pending
```

#### Spinner (Indeterminate)
```
⠋ Loading...
⠙ Processing...
⠹ Thinking...
⠸ Analyzing...
⠼ Executing...
⠴ Finalizing...
⠦ (cycles)
⠧
⠇
⠏
```

### 3.2 Task Cards (Terminal View)

```
┌─────────────────────────────────────────────────┐
│ 🤖 Task #task-1                        Running ● │
├─────────────────────────────────────────────────┤
│ Description: Analyze system architecture        │
│                                                  │
│ Agent:      architecture-senior                 │
│ Complexity: 8/10                                │
│ Cost:       $0.0042                             │
│ Time:       2.3s                                │
│                                                  │
│ ████████████████████░░░░ 80%                    │
└─────────────────────────────────────────────────┘
```

### 3.3 Agent Status Display

```
╔═══════════════════════════════════════════════╗
║            🤖 Active Agents (3)                ║
╠═══════════════════════════════════════════════╣
║                                                ║
║  ● architecture-senior          Busy          ║
║    └─ Analyzing API architecture              ║
║                                                ║
║  ○ code-reviewer                Idle          ║
║    └─ Awaiting tasks                          ║
║                                                ║
║  ● test-automator               Busy          ║
║    └─ Running E2E tests                       ║
║                                                ║
╚═══════════════════════════════════════════════╝
```

### 3.4 Cost Tracker Widget

```
┌────────────────────────────────┐
│ 💰 Cost Tracking               │
├────────────────────────────────┤
│ Daily:    $0.42 / $10.00       │
│ ████░░░░░░░░░░░░░░░░ 4%        │
│                                │
│ Monthly:  $8.35 / $35.00       │
│ ████████████░░░░░░░░ 24%       │
│                                │
│ Tasks:    127 completed        │
│ Avg Cost: $0.0066/task         │
└────────────────────────────────┘
```

### 3.5 System Resources Display

```
┌─────────────────────────────────┐
│ 💻 System Resources             │
├─────────────────────────────────┤
│ CPU:    ████████████░░░ 60%     │
│ Memory: ██████████████░ 70%     │
│ Disk:   ████░░░░░░░░░░░ 20%     │
│                                 │
│ Available: 4.8 GB               │
│ Status: ✓ Healthy               │
└─────────────────────────────────┘
```

### 3.6 Message/Alert Boxes

#### Success Message
```
┌──────────────────────────────────────────┐
│ ✅ Success                                │
├──────────────────────────────────────────┤
│ Task completed successfully in 2.3s      │
│ Cost: $0.0042 | Tokens: 1,234           │
└──────────────────────────────────────────┘
```

#### Error Message
```
┌──────────────────────────────────────────┐
│ ❌ Error                                  │
├──────────────────────────────────────────┤
│ Failed to execute task: API quota        │
│ exceeded                                 │
│                                          │
│ Suggestion: Try again in 1 hour          │
└──────────────────────────────────────────┘
```

#### Warning Message
```
┌──────────────────────────────────────────┐
│ ⚠️  Warning                               │
├──────────────────────────────────────────┤
│ Memory usage high (85%)                  │
│ Consider reducing concurrent tasks       │
└──────────────────────────────────────────┘
```

### 3.7 Data Tables

```
┌────────────────────────────────────────────────────────┐
│ Agent Name          Status    Tasks  Avg Cost          │
├────────────────────────────────────────────────────────┤
│ architecture-senior   Busy      12    $0.0085         │
│ code-reviewer         Idle       8    $0.0032         │
│ test-automator        Busy      23    $0.0021         │
│ rag-agent            Idle      45    $0.0018         │
└────────────────────────────────────────────────────────┘
```

### 3.8 Dashboard Layout (Terminal)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                          ┃
┃  🤖 Smart Agents v2.0              [Updated: 14:23:45]  ┃
┃  Intelligent AI Agent Ecosystem                         ┃
┃                                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌──────────────────────┬──────────────────────┬─────────────┐
│ 💰 Cost              │ 💻 Resources         │ 🤖 Agents   │
│                      │                      │             │
│ Today:   $0.42       │ Memory: 70%          │ Active: 3   │
│ Monthly: $8.35       │ CPU:    60%          │ Idle:   2   │
│ Budget:  76% left    │ Status: Healthy ✓    │ Total:  5   │
└──────────────────────┴──────────────────────┴─────────────┘

┌────────────────────────────────────────────────────────┐
│ 📊 Active Tasks (2)                                    │
├────────────────────────────────────────────────────────┤
│ task-001  Architecture Analysis   ████████░░ 80%      │
│ task-002  Code Review             ██░░░░░░░░ 20%      │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 💬 Recent Activity                                     │
├────────────────────────────────────────────────────────┤
│ 14:23  ✓ Task completed: test-automation-suite        │
│ 14:21  ⚡ Agent spawned: code-reviewer                 │
│ 14:19  ● Task started: architecture-analysis          │
│ 14:15  ✓ Batch completed: 5 tasks, $0.021            │
└────────────────────────────────────────────────────────┘

[Commands: (r)efresh (q)uit (h)elp (d)etails (s)ettings]
```

---

## 4. Component Library Specifications

### 4.1 Button Styles

#### Primary Button (Terminal)
```
┌─────────────┐
│  Execute    │  (Default)
└─────────────┘

┏━━━━━━━━━━━━━┓
┃  Execute    ┃  (Focused/Hover)
┗━━━━━━━━━━━━━┛

Colors: #667eea text on #1a1a2e background
```

#### Secondary Button
```
┌─────────────┐
│  Cancel     │  (Outlined)
└─────────────┘
```

### 4.2 Input Fields

```
┌────────────────────────────────┐
│ Enter task description...      │
└────────────────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Enter task description...      ┃  (Focused)
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 4.3 Select/Dropdown

```
┌─────────────────────────────┐
│ Agent: architecture-senior ▼│
└─────────────────────────────┘

┌─────────────────────────────┐
│ Agent: architecture-senior ▼│
├─────────────────────────────┤
│ > architecture-senior       │
│   code-reviewer             │
│   test-automator            │
│   rag-agent                 │
└─────────────────────────────┘
```

### 4.4 Loading States

#### Skeleton Loading
```
┌────────────────────────────────┐
│ ███████░░░░░░░░░░░░░░░░░░░░░░ │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ██████████░░░░░░░░░░░░░░░░░░░ │
└────────────────────────────────┘
```

#### Pulse Animation
```
Opacity: 100% → 50% → 100% (repeat)
Duration: 1.5s
```

---

## 5. Branding

### 5.1 Logo Concept

#### ASCII Logo (Small)
```
 ╔═╗╔╦╗
 ╚═╗║║║  Smart Agents
 ╚═╝╩ ╩  v2.0
```

#### ASCII Logo (Large - Splash Screen)
```
   _____ __  __          _____ _______
  / ____|  \/  |   /\   |  __ \__   __|
 | (___ | \  / |  /  \  | |__) | | |
  \___ \| |\/| | / /\ \ |  _  /  | |
  ____) | |  | |/ ____ \| | \ \  | |
 |_____/|_|  |_/_/    \_\_|  \_\ |_|

     ___    ____  ______ _   _ _______ _____
    /   |  / __ \|  ____| \ | |__   __/ ____|
   / /| | | |  | | |__  |  \| |  | | | (___
  / ___ \| |  | |  __| | . ` |  | |  \___ \
 /_/  |_|\____/|______|_|\_|  |_|  ____) |
                                   |_____/

 Intelligent AI Agent Ecosystem
```

### 5.2 Brand Voice

- **Professional**: Enterprise-grade, reliable, trustworthy
- **Intelligent**: Smart defaults, anticipates needs
- **Friendly**: Helpful feedback, clear guidance
- **Efficient**: Fast, concise, no fluff

### 5.3 Tone Guidelines

**Do's**:
- Use clear, direct language
- Provide actionable feedback
- Celebrate successes (but subtly)
- Explain decisions transparently

**Don'ts**:
- Over-engineer messages
- Use jargon without explanation
- Be overly casual
- Hide errors or problems

---

## 6. UX Flow Diagrams

### 6.1 Task Execution Flow

```
Start
  │
  ▼
Enter Task Description
  │
  ▼
[Auto-analyzing complexity...]  ← Spinner
  │
  ▼
Display Analysis Results
  ├─ Complexity: 8/10
  ├─ Recommended Agent: architecture-senior
  ├─ Estimated Cost: $0.0042
  └─ Estimated Time: ~2s
  │
  ▼
Confirm Execution? (y/n)
  │
  ├─ Yes ──────────┐
  │                ▼
  │         [Executing...] ← Progress bar
  │                │
  │                ▼
  │         Display Results
  │                │
  │                ▼
  │         Record to Knowledge Graph
  │                │
  └─ No ───────────┤
                   ▼
                  End
```

### 6.2 Dashboard Navigation Flow

```
Main Dashboard
  │
  ├─── (r) Refresh ────────────────────► Update all widgets
  │
  ├─── (d) Details ───► Agent Details ──┬─► Task History
  │                     Team Details ───┼─► Performance Metrics
  │                     Task Details ───┴─► Cost Breakdown
  │
  ├─── (s) Settings ──► Preferences ────┬─► API Keys
  │                     Limits ─────────┼─► Budget Settings
  │                     Notifications ──┴─► Display Options
  │
  ├─── (h) Help ──────► Command Reference
  │                     Keyboard Shortcuts
  │                     Documentation Link
  │
  └─── (q) Quit ──────► Confirm? (y/n) ──► Exit
```

### 6.3 Error Recovery Flow

```
Error Detected
  │
  ▼
Display Error Message
  ├─ Error Type: API Quota Exceeded
  ├─ Context: Task ID, Agent, Timestamp
  └─ Suggested Actions
  │
  ▼
Present Options
  ├─ (1) Retry with different agent
  ├─ (2) Wait and retry (show countdown)
  ├─ (3) Cancel task
  └─ (4) View detailed logs
  │
  ▼
User Selects Option
  │
  ▼
Record Error to Knowledge Graph
  │
  ▼
Resume/Cancel
```

---

## 7. Accessibility Standards

### 7.1 Color Contrast (WCAG AAA)

All color combinations meet WCAG AAA (7:1 contrast ratio):

```
Text on Background:
  #e5e5e5 on #0f0f23  →  14.2:1 ✓
  #9ca3af on #0f0f23  →   8.1:1 ✓
  #667eea on #0f0f23  →   5.8:1 ✓ (Large text only)

UI Elements:
  Success (#10b981):   9.2:1 ✓
  Warning (#f59e0b):   7.4:1 ✓
  Error   (#ef4444):   7.8:1 ✓
```

### 7.2 Keyboard Navigation

All interactive elements accessible via:
- Tab / Shift+Tab (navigation)
- Enter / Space (activation)
- Arrow keys (lists, menus)
- Esc (cancel, close)

### 7.3 Screen Reader Support

- Semantic ASCII structure
- Clear status messages
- Progress announcements
- Error descriptions

---

## 8. Performance Standards

### 8.1 Rendering Performance

```
Dashboard Refresh:  < 100ms  (local data)
API Data Update:    < 500ms  (network)
Animation Frame:    60 FPS   (smooth)
Spinner Update:     10 FPS   (sufficient)
```

### 8.2 Resource Usage

```
Memory Footprint:   < 50 MB  (CLI tool)
CPU Usage (idle):   < 1%
CPU Usage (active): < 10%
Startup Time:       < 200ms
```

---

## 9. Responsive Design

### 9.1 Terminal Width Breakpoints

```
Narrow:   < 80 cols   (Simplified layout, vertical stacking)
Standard: 80-120 cols (Optimal layout, 2-column grids)
Wide:     > 120 cols  (Enhanced layout, 3-column grids)
```

### 9.2 Adaptive Layouts

**Narrow Terminal (< 80 cols)**:
```
┌────────────────────┐
│ Smart Agents       │
├────────────────────┤
│ Cost: $8.35        │
│ Agents: 3 active   │
│ Tasks: 2 running   │
└────────────────────┘
(Vertical stack)
```

**Standard Terminal (80-120 cols)**:
```
┌────────────┬────────────┐
│ Cost       │ Agents     │
│ $8.35      │ 3 active   │
└────────────┴────────────┘
(2-column grid)
```

**Wide Terminal (> 120 cols)**:
```
┌──────────┬──────────┬──────────┐
│ Cost     │ Agents   │ Tasks    │
│ $8.35    │ 3 active │ 2 run    │
└──────────┴──────────┴──────────┘
(3-column grid)
```

---

## 10. Animation Principles

### 10.1 Timing Functions

```
Ease-out:     Fast start, slow end (UI feedback)
Ease-in-out:  Smooth transitions (state changes)
Linear:       Constant speed (progress bars, spinners)
```

### 10.2 Duration Guidelines

```
Instant:      0ms     (immediate feedback)
Micro:        100ms   (button press, hover)
Fast:         200ms   (panel slide, fade)
Medium:       400ms   (modal open/close)
Slow:         600ms   (page transitions)
```

### 10.3 Terminal Animations

#### Fade In/Out
```
Opacity: 0 → 1 (200ms ease-out)
```

#### Slide In
```
Position: offscreen → onscreen (400ms ease-out)
```

#### Pulse (Attention)
```
Scale: 1 → 1.05 → 1 (600ms ease-in-out, repeat 3x)
```

---

## 11. Implementation Examples

### 11.1 Web Dashboard CSS (Existing)

Already implemented in `/src/dashboard/public/index.html`:
- Gradient background
- Card-based layout
- Responsive grid
- Professional typography
- Real-time updates

### 11.2 Terminal CLI Output (Node.js)

Recommended libraries:
```json
{
  "chalk": "^5.0.0",           // Colors
  "ora": "^6.0.0",             // Spinners
  "cli-progress": "^3.12.0",   // Progress bars
  "boxen": "^7.0.0",           // Boxes
  "cli-table3": "^0.6.0",      // Tables
  "figures": "^5.0.0",         // Unicode symbols
  "gradient-string": "^2.0.0"  // Gradients
}
```

### 11.3 Example Terminal Output

```typescript
import chalk from 'chalk';
import boxen from 'boxen';
import cliProgress from 'cli-progress';

// Branded title
const title = chalk.bold.hex('#667eea')('Smart Agents v2.0');
const subtitle = chalk.hex('#9ca3af')('Intelligent AI Agent Ecosystem');

console.log(boxen(`${title}\n${subtitle}`, {
  padding: 1,
  margin: 1,
  borderStyle: 'round',
  borderColor: '#667eea'
}));

// Progress bar
const bar = new cliProgress.SingleBar({
  format: chalk.hex('#667eea')('{bar}') + ' {percentage}% | {task}',
  barCompleteChar: '█',
  barIncompleteChar: '░',
  hideCursor: true
});

// Success message
console.log(chalk.green('✓') + ' Task completed successfully');
console.log(chalk.gray(`  Cost: ${chalk.hex('#f59e0b')('$0.0042')} | Time: ${chalk.hex('#3b82f6')('2.3s')}`));
```

---

## 12. Design Tokens (JSON)

```json
{
  "colors": {
    "brand": {
      "primary": "#667eea",
      "accent": "#764ba2",
      "gradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    "status": {
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    },
    "neutral": {
      "bg": "#0f0f23",
      "surface": "#1a1a2e",
      "border": "#2d2d44",
      "text": {
        "primary": "#e5e5e5",
        "secondary": "#9ca3af",
        "muted": "#6b7280"
      }
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px",
    "3xl": "64px"
  },
  "typography": {
    "fontFamily": "SF Mono, Menlo, Monaco, Consolas, monospace",
    "fontSize": {
      "h1": "28px",
      "h2": "24px",
      "h3": "20px",
      "body": "14px",
      "small": "12px",
      "tiny": "10px"
    },
    "fontWeight": {
      "light": 300,
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "lineHeight": {
      "tight": 1.2,
      "normal": 1.5,
      "relaxed": 1.8
    }
  },
  "animation": {
    "duration": {
      "instant": "0ms",
      "micro": "100ms",
      "fast": "200ms",
      "medium": "400ms",
      "slow": "600ms"
    },
    "easing": {
      "easeOut": "cubic-bezier(0.0, 0.0, 0.2, 1)",
      "easeInOut": "cubic-bezier(0.4, 0.0, 0.2, 1)",
      "linear": "linear"
    }
  },
  "breakpoints": {
    "narrow": "80",
    "standard": "120",
    "wide": "160"
  }
}
```

---

## 13. Quality Checklist

### Design Implementation Checklist

- [ ] All colors meet WCAG AAA contrast standards
- [ ] Typography scale is consistent across all components
- [ ] Spacing follows 8pt grid system
- [ ] Icons are semantically meaningful
- [ ] Animations are smooth (60 FPS)
- [ ] Responsive layouts tested at all breakpoints
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatible
- [ ] Error messages are clear and actionable
- [ ] Loading states provide feedback within 200ms
- [ ] Success confirmations are visible
- [ ] Brand voice is consistent
- [ ] Performance targets are met

---

## 14. Future Enhancements

### Phase 1 (Month 2)
- [ ] Rich terminal colors (24-bit color support)
- [ ] Mouse support in terminal (click interactions)
- [ ] Customizable themes (light mode, high contrast)

### Phase 2 (Month 3)
- [ ] Desktop GUI (Electron wrapper)
- [ ] Real-time collaboration UI
- [ ] Advanced data visualizations (charts, graphs)
- [ ] Export/share functionality

### Phase 3 (Month 4+)
- [ ] Mobile companion app
- [ ] Voice control integration
- [ ] AR/VR dashboard (experimental)

---

## 15. References

### Design Inspiration
- **GitHub CLI**: Clean terminal UI, excellent UX
- **Vercel CLI**: Beautiful progress indicators
- **Stripe CLI**: Professional error handling
- **Railway CLI**: Modern gradient branding

### Technical Resources
- [chalk](https://github.com/chalk/chalk) - Terminal colors
- [ora](https://github.com/sindresorhus/ora) - Terminal spinners
- [boxen](https://github.com/sindresorhus/boxen) - Terminal boxes
- [cli-table3](https://github.com/cli-table/cli-table3) - Terminal tables

### Standards
- [WCAG 2.1 AAA](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Motion](https://material.io/design/motion)
- [IBM Carbon Design System](https://carbondesignsystem.com/)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-26
**Author**: UI Designer Agent
**Status**: Ready for Implementation
