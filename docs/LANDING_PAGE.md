# 🧠 MeMesh Landing Page

**Status**: Design Document
**Purpose**: Landing page for MeMesh marketplace submission and marketing campaign
**Target**: Claude Code users, AI developers, productivity enthusiasts

---

## 🎯 Page Structure

### Hero Section

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              🧠 MeMesh                                      │
│         Give Claude a Memory                                │
│                                                             │
│   Claude forgets everything between sessions.               │
│              MeMesh fixes that.                             │
│                                                             │
│   [Install Now]  [Watch Demo ▶]  [GitHub →]                │
│                                                             │
│   ⭐ 63 Stars  •  📥 13.5K+ Clones  •  📦 1.7K+ Downloads  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Copy**:
- **Headline**: "Give Claude a Memory"
- **Subheadline**: "Claude forgets everything between sessions. MeMesh fixes that."
- **Value Prop**: "Your architecture decisions, coding patterns, and project context — remembered automatically."

---

## 🚀 Problem → Solution Section

### The Problem (Relatable Pain Point)

```markdown
## Every New Session Starts from Zero

You: "Remember our auth setup from yesterday?"
Claude: "I don't have context from previous sessions..."

Sound familiar?

You waste 10-15 minutes every session re-explaining:
- Architecture decisions you made last week
- API constraints you discovered debugging
- Why you chose PostgreSQL over MongoDB
- That specific Node version requirement

**5 sessions = 1 hour wasted on context switching.**
```

### The Solution (MeMesh in Action)

```markdown
## How MeMesh Helps

With MeMesh, Claude remembers:

**Monday**: You debug an API rate limit issue
→ MeMesh stores: "GitHub API: 5000 requests/hour, reset at :00"

**Friday**: You ask Claude to add GitHub integration
→ Claude recalls: "I see we're rate-limited to 5000/hour..."

No re-explaining. No wasted time. Just continuity.
```

---

## ✨ Feature Highlights

### Three-Column Layout

```
┌─────────────────┬─────────────────┬─────────────────┐
│  🧠 Automatic   │  🔍 Semantic    │  🔒 Private &   │
│    Memory       │    Search       │    Local        │
├─────────────────┼─────────────────┼─────────────────┤
│ Claude auto-    │ Ask "what did   │ All memories    │
│ saves decisions,│ we decide about │ stored locally  │
│ architecture,   │ auth?" and get  │ on your machine │
│ and debugging   │ instant context │ Never uploaded  │
│ insights after  │ with semantic   │ to cloud        │
│ every session   │ search          │                 │
└─────────────────┴─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┬─────────────────┐
│  📦 Project     │  ⏱️ Time-Based  │  🔧 Zero Config │
│   Isolation     │    Retention    │                 │
├─────────────────┼─────────────────┼─────────────────┤
│ Memories scoped │ Decisions: 90d  │ Install → Done  │
│ to project path │ Sessions: 30d   │ No API keys     │
│ No cross-       │ Auto-cleanup    │ No cloud setup  │
│ contamination   │ configurable    │ Works offline   │
└─────────────────┴─────────────────┴─────────────────┘
```

---

## 🎬 Demo Section

### Video Embed + GIF Previews

```markdown
## See MeMesh in Action

[Embedded Demo Video - 3 minutes]

### Quick Demos:

**1. Save Memory**: `buddy-do "explain our database schema"`
![buddy-do demo](assets/buddy-do.gif)

**2. Recall Anytime**: `buddy-remember "database"`
![buddy-remember demo](assets/buddy-remember.gif)

**3. Project Isolation**: Different projects = Different memories
![isolation demo](assets/isolation.gif)
```

---

## 💼 Use Cases

### Potential Use Scenarios

```markdown
## Who Can Benefit from MeMesh?

### 🏗️ Solo Developers
Managing multiple projects? MeMesh can help track project-specific decisions, API versions, and environment configurations across different codebases.

### 👥 Small Teams
Reduce onboarding time by maintaining a searchable knowledge base of architecture decisions and technical choices.

### 🔬 Research & Prototyping
Track experimental results, model parameters, and research decisions across multiple iterations.
```

---

## 🚀 Installation CTA

### Frictionless Install Flow

```markdown
## Get Started in 30 Seconds

```bash
npm install -g @pcircle/memesh
```

That's it. Restart Claude Code, and MeMesh is running.

**Verify installation:**
```bash
buddy-help
```

**First command:**
```bash
buddy-do "explain this codebase"
```

[Install Now →]  [Read Docs →]  [Watch Tutorial →]

---

**Requirements:**
- Claude Code CLI (latest)
- Node.js >= 20
- 100MB disk space

**Supported:**
✅ macOS  ✅ Linux  ✅ Windows (WSL2)
```

---

## 📊 Technical Details (For Engineers)

### Expandable Technical Specs

```markdown
## How It Works

<details>
<summary><strong>Architecture Overview</strong> (click to expand)</summary>

**7-Layer Architecture:**
1. **MCP Server** - Model Context Protocol integration
2. **Memory System** - Automatic capture & categorization
3. **Knowledge Graph** - Semantic relationships (Neo4j-inspired)
4. **Embeddings** - Vector search (Xenova/bge-small-en-v1.5, 384d)
5. **Database** - SQLite with FTS5 + sqlite-vec
6. **Integration** - Claude Code plugin hooks
7. **UI** - CLI commands (buddy-do, buddy-remember, buddy-help)

**Memory Types:**
- **Decisions**: Architecture choices, library selections (TTL: 90 days)
- **Sessions**: Task context, debugging insights (TTL: 30 days)
- **Patterns**: Code conventions, team practices (TTL: 180 days)

**Privacy:**
- All data stored in `~/.claude/memory/`
- No cloud sync by default
- Optional encryption with `MEMESH_ENCRYPT=true`
- GDPR-compliant data retention policies

</details>

<details>
<summary><strong>Performance & Scalability</strong></summary>

**Benchmarks:**
- Memory retrieval: < 50ms (semantic search)
- Storage: ~1MB per 100 memories
- Max memories: 10,000+ (tested)
- Indexing: Real-time with background optimization

**Resource Usage:**
- RAM: ~50MB baseline, +100MB during indexing
- Disk: ~100MB for embeddings, +data size
- CPU: Minimal (background tasks only)

</details>
```

---

## 🔒 Trust & Safety

### Security & Privacy Badges

```markdown
## Your Data, Your Machine

✅ **100% Local Storage** - No cloud uploads
✅ **Open Source** - AGPL-3.0, audited on GitHub
✅ **No Telemetry** - Zero tracking, zero analytics
✅ **Encryption Ready** - Optional AES-256 encryption
✅ **GDPR Compliant** - Auto-cleanup, data portability

[View Security Policy →](SECURITY.md)
[Report Vulnerability →](https://github.com/PCIRCLE-AI/claude-code-buddy/security/advisories/new)
```

---

## 🌟 Community Stats

### Real Statistics (as of 2026-02-15)

```markdown
## Trusted by the Community

- ⭐ **63 stars** on GitHub
- 📥 **13,571 clones** (736 unique users)
- 📦 **1,696 downloads** in last 30 days
- 🔀 **14 forks** - Active contributors
- 🔧 **Active maintenance** - Latest: v2.8.10

[View on GitHub →]  [Report Issues →]
```

---

## ❓ FAQ Section

### Common Questions

```markdown
## Frequently Asked Questions

**Q: Is my data sent to any server?**
A: No. All memories are stored locally in `~/.claude/memory/` on your machine. No cloud sync unless you opt-in.

**Q: Does it work with other AI assistants?**
A: Currently optimized for Claude Code. Cursor support via MCP coming soon. ChatGPT integration planned.

**Q: How much disk space does it use?**
A: ~100MB for embeddings + ~1MB per 100 memories. Average user: 150-300MB total.

**Q: Can I export my memories?**
A: Yes. `memesh export --format json` exports all memories with timestamps and metadata.

**Q: What if I want to delete everything?**
A: `memesh reset --confirm` deletes all memories. Or manually delete `~/.claude/memory/`.

**Q: Does it slow down Claude?**
A: No. Memory operations run in background with < 50ms query latency.

[More Questions →](docs/FAQ.md)
```

---

## 🎁 Final CTA Section

### Strong Call-to-Action

```markdown
## Stop Re-Explaining Your Codebase

Every session you start without MeMesh = 10 minutes wasted on context.

**50 sessions = 8+ hours saved** with automatic memory.

```bash
npm install -g @pcircle/memesh
```

[Get Started Free →]

---

**Still not sure?**
- [Watch 5-min Tutorial Video →](https://youtube.com/watch?v=...)
- [Read Getting Started Guide →](docs/GETTING_STARTED.md)
- [Try Interactive Demo →](https://memesh.ai/demo)

**Questions?**
- [Join Discord Community →](https://discord.gg/memesh)
- [Email Support →](mailto:support@memesh.ai)
```

---

## 🎨 Design Guidelines

### Visual Style

**Color Palette:**
- Primary: `#8B5CF6` (Purple - memory/brain association)
- Secondary: `#10B981` (Green - success/growth)
- Accent: `#F59E0B` (Amber - highlights)
- Background: `#0F172A` (Dark slate)
- Text: `#F8FAFC` (Light)

**Typography:**
- Headers: Inter Bold, 48px/36px/24px
- Body: Inter Regular, 16px
- Code: JetBrains Mono, 14px

**Components:**
- Rounded corners: 12px
- Button padding: 16px 32px
- Section spacing: 80px vertical
- Container max-width: 1200px

**Animations:**
- Fade-in on scroll
- Hover scale: 1.05
- Transition duration: 200ms ease

---

## 📈 SEO Optimization

### Meta Tags

```html
<title>MeMesh - Persistent Memory for Claude Code | AI Memory Plugin</title>
<meta name="description" content="Give Claude a memory that persists across sessions. MeMesh saves architecture decisions, coding patterns, and project context automatically. 100% local, open-source, zero config.">
<meta name="keywords" content="claude code, ai memory, persistent memory, mcp server, code assistant, developer tools, productivity, claude plugin">

<!-- Open Graph -->
<meta property="og:title" content="MeMesh - Give Claude a Memory">
<meta property="og:description" content="Stop re-explaining your codebase. MeMesh remembers architecture decisions, API constraints, and debugging insights across sessions.">
<meta property="og:image" content="https://memesh.ai/og-image.png">
<meta property="og:url" content="https://memesh.ai">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="MeMesh - Persistent Memory for Claude Code">
<meta name="twitter:description" content="Your architecture decisions, coding patterns, and project context — remembered automatically.">
<meta name="twitter:image" content="https://memesh.ai/twitter-card.png">
```

### Target Keywords

**Primary:**
- "claude code memory"
- "persistent memory ai"
- "mcp server memory"
- "claude code plugin"

**Secondary:**
- "ai assistant memory"
- "code context memory"
- "developer productivity tools"
- "claude code addon"

**Long-tail:**
- "how to make claude remember previous sessions"
- "best claude code plugins 2026"
- "persistent context for ai coding assistants"

---

## 🚀 Deployment Checklist

### Before Launch

- [ ] All copy proofread (Grammarly + human review)
- [ ] Demo video embedded and tested
- [ ] All GIFs optimized (< 5MB each)
- [ ] Screenshots in high-res PNG
- [ ] CTA buttons link to correct targets
- [ ] Mobile responsive (test on iOS/Android)
- [ ] Page load time < 3 seconds (GTmetrix)
- [ ] Meta tags verified (Facebook Debugger, Twitter Card Validator)
- [ ] Analytics installed (GA4 + Plausible)
- [ ] Contact form tested (support@memesh.ai)
- [ ] FAQ links point to correct docs
- [ ] Social media share buttons work
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)

---

## 📊 Success Metrics

### Track These KPIs

**Traffic:**
- Unique visitors: Target 1,000/week
- Bounce rate: < 40%
- Avg session duration: > 2 minutes
- Pages per session: > 2

**Conversion:**
- Install button clicks: > 15%
- Video play rate: > 30%
- Demo GIF engagement: > 50%
- Scroll depth (to CTA): > 60%

**User Actions:**
- GitHub repo visits: > 20%
- Documentation clicks: > 25%
- Discord/Community joins: > 10%
- Support email opens: Track for feedback

---

## 🔗 Implementation Notes

### Technical Stack Recommendations

**Option 1: Static Site (Recommended)**
- **Framework**: Astro or Next.js (SSG)
- **Hosting**: Vercel or Cloudflare Pages
- **Domain**: memesh.ai (already reserved?)
- **Cost**: $0/month (free tier)

**Option 2: Simple HTML**
- **Framework**: None (pure HTML/CSS/JS)
- **Hosting**: GitHub Pages
- **Domain**: CNAME to custom domain
- **Cost**: $0/month

**Assets CDN:**
- Use GitHub Releases for demo videos
- Optimize images with TinyPNG
- Serve GIFs from GitHub repo (raw.githubusercontent.com)

---

**Created**: 2026-02-15
**Status**: Ready for implementation
**Next**: Build landing page with this spec

