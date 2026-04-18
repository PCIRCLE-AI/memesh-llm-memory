# Design System — MeMesh

## Product Context
- **What this is:** Universal AI memory layer. SQLite-based knowledge graph with FTS5 + neural embeddings.
- **Who it's for:** Developers using AI coding assistants (Claude Code, etc.)
- **Space/industry:** AI development tools, knowledge management
- **Project type:** Developer dashboard (7-tab data tool) + marketing showcase

## Aesthetic Direction
- **Direction:** Precision Engineer
- **Decoration level:** Minimal — no grain, no glow, no blur. Clean borders and color do all the work.
- **Mood:** Professional, trustworthy, sharp. The tool that makes you feel like an expert. Every pixel has a purpose.
- **Reference sites:** Linear (gold standard for dev tools), Warp (terminal aesthetic), OpenMemory (competitor)

## Typography
- **Display/Hero:** Satoshi 700 — geometric but warm, sharper than Inter, better character at small sizes. letter-spacing: -0.03em
- **Body:** Satoshi 400/500 — same family throughout, weight differentiates hierarchy
- **UI/Labels:** Satoshi 600 — uppercase, letter-spacing: 0.04em for section labels; 0.08em for smallest labels
- **Data/Tables:** Geist Mono 400/500 — Vercel-made, tabular-nums native, pairs with Satoshi's geometry
- **Code:** Geist Mono 400
- **Loading:** Google Fonts CDN (`family=Satoshi:wght@400;500;600;700` + `family=Geist+Mono:wght@400;500;600`)
- **Scale:**
  - Hero: 32px / 700 / -0.03em
  - Title: 24px / 700 / -0.02em
  - Heading: 18px / 600 / -0.01em
  - Subheading: 15px / 600
  - Body: 14px / 400 / line-height 1.55
  - Small: 13px / 400
  - Caption: 12px / 500
  - Micro: 11px / 400
  - Label: 10px / 600 / uppercase / 0.08em

## Color

### Dark Mode (default)
- **Approach:** Restrained — one accent + neutrals. Color is rare and meaningful.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-0` | `#080A0C` | Page background |
| `--bg-1` | `#0D1014` | Header, nav, modals |
| `--bg-2` | `#14181D` | Cards, inputs, stat blocks |
| `--bg-card` | `rgba(20,24,29,0.9)` | Memory cards (slight transparency) |
| `--bg-hover` | `#1A1F26` | Hover states |
| `--bg-input` | `#0D1014` | Input fields |
| `--border` | `rgba(0,214,180,0.08)` | Default borders |
| `--border-hover` | `rgba(0,214,180,0.20)` | Active/hover borders |
| `--border-focus` | `#00D6B4` | Focus ring |
| `--border-subtle` | `rgba(0,214,180,0.04)` | Table row separators |
| `--text-0` | `#F0F2F4` | Primary text, headings |
| `--text-1` | `#B8BEC6` | Body text |
| `--text-2` | `#7A828E` | Secondary, metadata |
| `--text-3` | `#4A5260` | Muted, placeholders, labels |
| `--accent` | `#00D6B4` | Primary accent (cyan/teal) |
| `--accent-soft` | `rgba(0,214,180,0.08)` | Accent backgrounds |
| `--accent-hover` | `#00F0CA` | Accent hover state |
| `--accent-dim` | `#009E86` | Accent on light backgrounds |
| `--success` | `#00D6B4` | Same as accent |
| `--success-soft` | `rgba(0,214,180,0.08)` | Success backgrounds |
| `--danger` | `#FF6B6B` | Errors, destructive actions |
| `--danger-soft` | `rgba(255,107,107,0.08)` | Danger backgrounds |
| `--warning` | `#FFB84D` | Warnings, stale indicators |
| `--warning-soft` | `rgba(255,184,77,0.08)` | Warning backgrounds |
| `--info` | `#60A5FA` | Informational |
| `--info-soft` | `rgba(96,165,250,0.08)` | Info backgrounds |

### Light Mode
- **Strategy:** Reduce accent saturation, darken for contrast. Backgrounds flip to warm whites.

| Token | Value |
|-------|-------|
| `--bg-0` | `#F8F9FA` |
| `--bg-1` | `#FFFFFF` |
| `--bg-2` | `#F0F1F3` |
| `--bg-hover` | `#E8EAED` |
| `--text-0` | `#111317` |
| `--text-1` | `#3D4450` |
| `--text-2` | `#6B7280` |
| `--text-3` | `#9CA3AF` |
| `--accent` | `#009E86` |
| `--danger` | `#DC2626` |
| `--warning` | `#D97706` |
| `--info` | `#2563EB` |

## Spacing
- **Base unit:** 4px
- **Density:** Compact — developers don't like wasted space
- **Scale:**
  - `--sp-1`: 2px
  - `--sp-2`: 4px
  - `--sp-3`: 8px
  - `--sp-4`: 12px
  - `--sp-5`: 16px
  - `--sp-6`: 20px
  - `--sp-7`: 24px
  - `--sp-8`: 32px
  - `--sp-9`: 48px

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment
- **Max content width:** 1100px
- **Page padding:** 24px
- **Grid:** 4-column for stats, auto-fit for responsive
- **Border radius:**
  - `--radius-xs`: 4px (tags, small elements)
  - `--radius-sm`: 6px (inputs, buttons)
  - `--radius`: 8px (cards, panels)
  - `--radius-full`: 9999px (badges, pills)

## Motion
- **Approach:** Minimal-functional — only transitions, no animations except loading spinner
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out for all interactions)
- **Duration:** 150ms universal. Loading spinner: 600ms linear.
- **What transitions:** border-color, background, color, opacity, box-shadow
- **What does NOT animate:** layout, position, size (no entrance animations, no scroll effects)

## Component Patterns

### Buttons
- **Primary:** solid accent bg, dark text. Hover: lighten.
- **Secondary:** bg-2, border, text-1. Hover: border darkens, bg shifts.
- **Ghost:** transparent, text-2. Hover: bg-hover.
- **Danger:** transparent, danger text, danger border at 20%. Hover: danger-soft bg.
- **Sizes:** sm (5px 10px, 11px), default (9px 16px, 12px), lg (12px 24px, 14px)

### Inputs
- Focus: accent border, no box-shadow glow (clean, not flashy)
- Error: danger border
- Disabled: 40% opacity
- Select: custom chevron SVG, no native appearance

### Cards (Memory entities)
- bg-card with 1px border. Hover: border-hover.
- Head: entity name (600, text-0) + type badge (mono, accent on accent-soft)
- Body: observation text (13px, text-1)
- Footer: tags (mono, 10px) + score (mono, accent, right-aligned)

### Table
- Sticky header: bg-2, uppercase 10px labels
- Row hover: bg-hover
- Mono columns for numeric data (tabular-nums)
- Last row: no bottom border

### Badges
- Pill shape (radius-full), 11px font, 500 weight
- Color variants: accent, success, danger, warning, info, neutral

### Tags
- Small pills (radius-xs), 10px mono, bg-2 with subtle border
- For entity categorization, not status

## Font Blacklist
Never use as primary: Inter, Roboto, Arial, Helvetica, Open Sans, Lato, Montserrat, Poppins

## Anti-patterns
- No purple/violet gradients
- No backdrop-filter blur (except modals overlay if needed)
- No grain or noise textures
- No glow effects on hover
- No entrance animations
- No centered stat cards (left-align values)
- No decorative elements that don't serve function

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-18 | Initial design system: Precision Engineer | Competitive research showed all AI tools converge on zinc+blue+Inter. Cyan accent + Satoshi differentiates while staying professional. |
| 2026-04-18 | Chose Satoshi over Inter | Inter is the most overused font in developer tools. Satoshi has similar geometric bones but sharper, better weight distribution at small sizes. |
| 2026-04-18 | Chose Geist Mono over JetBrains Mono | Better tabular-nums support, pairs with Satoshi's geometry. Vercel ecosystem alignment. |
| 2026-04-18 | Cyan #00D6B4 over blue #3b82f6 | 90% of dark dashboards use blue-500. Cyan is more distinctive, evokes graph/data visualization, better contrast on dark backgrounds. |
| 2026-04-18 | 150ms universal transition | Fast enough to feel instant, slow enough to be perceived. No per-component timing variations. |
| 2026-04-18 | Compact 4px spacing | Target users are developers who prefer data density over whitespace. |
