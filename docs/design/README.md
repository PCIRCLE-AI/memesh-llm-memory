# Design Documentation

**Complete UI/UX design system for Smart Agents terminal and web interfaces.**

---

## 📁 Documents in This Section

### [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
Complete technical specification of the visual design system:
- Design principles
- Visual language (colors, typography, spacing, icons)
- Terminal UI components (progress bars, spinners, cards, tables)
- Component library specifications
- Accessibility standards (WCAG AAA)
- Performance standards
- Design tokens (JSON)

**When to read**: Implementing new UI components or making design decisions

**File size**: 600+ lines

---

### [TERMINAL_UI.md](./TERMINAL_UI.md)
Complete terminal interface designs with ASCII art mockups:
- 10 detailed mockups (startup, dashboard, agent details, etc.)
- Unicode box-drawing patterns
- Responsive layouts (80/120/160 column breakpoints)
- Interactive elements and keyboard shortcuts
- Real-time update patterns

**When to read**: Designing new interface screens or understanding user workflows

**File size**: 800+ lines

---

### [BRANDING.md](./BRANDING.md)
Complete branding and visual identity guidelines:
- Brand overview and positioning
- Logo system (ASCII art variants)
- Color system (complete palette)
- Typography (font families, scale, weights)
- Iconography (Unicode icons, status indicators)
- Voice & tone (writing guidelines)
- Brand dos & don'ts

**When to read**: Creating marketing materials or writing user-facing content

**File size**: 900+ lines

---

### [QUICK_START.md](./QUICK_START.md)
30-minute quick start guide for developers:
- Prerequisites and dependencies
- Directory structure setup
- Core component implementation
- Testing complete system
- Troubleshooting

**When to read**: Starting UI implementation immediately

**File size**: 400+ lines

---

## 🎨 Quick Reference

### Brand Colors

```
Primary:   #667eea  (Vibrant blue-purple)
Accent:    #764ba2  (Deep purple)
Success:   #10b981  (Emerald green)
Warning:   #f59e0b  (Amber)
Error:     #ef4444  (Red)
Info:      #3b82f6  (Blue)
BG:        #0f0f23  (Deep space blue)
Text:      #e5e5e5  (Near white)
```

### Brand Gradient

```css
linear-gradient(135deg, #667eea 0%, #764ba2 100%)
```

### Spacing System (8pt Grid)

```
xs: 4px   sm: 8px   md: 16px
lg: 24px  xl: 32px  2xl: 48px  3xl: 64px
```

### Typography

```
Font:  SF Mono, Menlo, Monaco, Consolas, monospace
Sizes: 10/12/14/20/24/28px
Weights: 300/400/500/600/700
```

### Icon System (Unicode)

```
🤖 Agent    💰 Cost     ✓ Success   ❌ Error
👥 Team     💻 System   ⚠ Warning   ℹ Info
📋 Task     ⏱️ Time     ● Running   ○ Idle
```

---

## 📐 Component Examples

### Progress Bar
```
Processing... ████████████████░░░░░░░░ 65%
```

### Status Card
```
┌─────────────────────────────────────┐
│ 🤖 Agent Status                     │
├─────────────────────────────────────┤
│ Name: Code Reviewer                 │
│ Status: ● Active                    │
│ Tasks: 3 completed                  │
│ Cost: $0.12                         │
└─────────────────────────────────────┘
```

### Table
```
┌──────────┬──────────┬─────────┬────────┐
│ Provider │ Model    │ Cost    │ Status │
├──────────┼──────────┼─────────┼────────┤
│ Ollama   │ qwen2.5  │ $0.00   │ ✓      │
│ Claude   │ Sonnet   │ $0.15   │ ✓      │
│ Grok     │ Beta     │ $0.03   │ ⚠      │
└──────────┴──────────┴─────────┴────────┘
```

---

## 🎯 Design Navigation by Task

### Starting Implementation?
1. Read [QUICK_START.md](./QUICK_START.md) (30 mins)
2. Review [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (technical specs)

### Designing New Interface?
1. Review [TERMINAL_UI.md](./TERMINAL_UI.md) (examples)
2. Reference [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (specifications)

### Writing User-Facing Content?
1. Follow [BRANDING.md](./BRANDING.md) (voice & tone)
2. Use consistent icon system from [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)

### Presenting to Stakeholders?
1. Use executive summary from [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
2. Show mockups from [TERMINAL_UI.md](./TERMINAL_UI.md)

---

## 📏 Design Standards

### Accessibility
- **WCAG Level**: AAA compliance
- **Contrast Ratio**: Minimum 7:1 for all text
- **Keyboard Navigation**: 100% support
- **Screen Reader**: Full compatibility

### Performance
- **Render Time**: < 100ms per component
- **Memory Usage**: < 50 MB total
- **CPU Usage**: < 10% during updates
- **Terminal Compatibility**: 95%+ across platforms

### Responsive Design
- **80 columns**: Compact view (mobile terminals)
- **120 columns**: Standard view (laptop)
- **160+ columns**: Wide view (desktop monitors)

---

## 🔗 Related Documentation

- **[UI Implementation Guide](../../UI_IMPLEMENTATION_GUIDE.md)** - Deprecated (will be consolidated)
- **[Terminal UI Assessment](../TERMINAL_UI_ASSESSMENT.md)** - Historical analysis
- **[Examples](../../examples/)** - Code examples using design system

---

## 📝 Design File Statistics

```
Total Documents:     4
Total Lines:         2,700+
Total Sections:      50+
Code Examples:       15+
Interface Mockups:   10
Color Definitions:   15+
Component Specs:     10+
```

---

**Design System Version**: 1.0.0
**Last Updated**: 2025-12-26
**Status**: Production Ready
