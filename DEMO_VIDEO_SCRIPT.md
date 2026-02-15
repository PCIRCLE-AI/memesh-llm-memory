# MeMesh Demo Video Script

**Duration**: 3-5 minutes
**Target Audience**: Claude Code users frustrated with context loss
**Goal**: Show how MeMesh solves the "context loss" problem

---

## Pre-Production Checklist

### Equipment
- [ ] Screen recording software (QuickTime/OBS/ScreenFlow)
- [ ] Microphone (clear audio essential)
- [ ] Terminal theme (readable, high contrast)
- [ ] Font size: 16-18pt (readable in video)

### Environment Setup
- [ ] Clean Claude Code session (no previous context)
- [ ] Sample project prepared
- [ ] MeMesh installed and tested
- [ ] Scripts ready to type/paste

### Terminal Setup
```bash
# Use readable theme
# Font: Monaco/Menlo 16-18pt
# Theme: Dark with high contrast
# Window: Full screen or 1920x1080
```

---

## Script Structure

### [0:00-0:30] Hook & Problem (30 seconds)

**Visual**: Split screen - Left: Code, Right: Face (optional)

**Voiceover**:
> "Ever felt this frustration? You spend 30 minutes explaining your architecture
> to Claude Code... close the session... and the next day? Gone. You're starting
> from zero again.
>
> Every. Single. Time."

**On-screen text**:
- "Claude Code forgets everything"
- "30 min explanation → Gone next session"

**Demo**:
```bash
# Show Claude Code session
# User: "Remember we're using JWT for auth?"
# Claude: "I don't have context from previous sessions..."
```

---

### [0:30-1:00] Solution Introduction (30 seconds)

**Visual**: Terminal with MeMesh logo (ASCII art)

**Voiceover**:
> "Meet MeMesh. It gives Claude Code a persistent memory that survives across
> sessions. Architecture decisions, coding patterns, project context—all
> remembered automatically."

**On-screen text**:
- "MeMesh = Persistent Memory for Claude Code"
- "Install: npm install -g @pcircle/memesh"

**Demo**:
```bash
# Show installation
$ npm install -g @pcircle/memesh

# Restart Claude Code
# Verify installation
$ buddy-help
# (Show MeMesh commands list)
```

---

### [1:00-2:00] Feature Demo 1: buddy-do (60 seconds)

**Voiceover**:
> "Here's how it works. Use buddy-do to execute a task, and MeMesh automatically
> saves what was learned."

**Demo**:
```bash
# In Claude Code session
buddy-do "explain our authentication system"

# Claude responds with explanation
# MeMesh shows: ✓ Memory saved: JWT authentication implementation

# Show terminal output highlighting:
# - Response from Claude
# - Auto-saved memory indicator
```

**On-screen annotations**:
- Arrow pointing to "Memory saved" message
- "Automatically stored - no manual work"

---

### [2:00-3:00] Feature Demo 2: buddy-remember (60 seconds)

**Voiceover**:
> "The next day, in a completely new session, use buddy-remember to instantly
> recall what was discussed."

**Demo**:
```bash
# NEW Claude Code session (fresh start)
# Show date/time stamp to emphasize it's a new session

buddy-remember "authentication"

# MeMesh returns:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📌 Recent Project Memories
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# 1. JWT authentication implementation
#    - Access tokens: 15 min
#    - Refresh tokens: 7 days
#    - Files: src/auth/jwt.ts
#
# 2. Authentication middleware
#    - Express middleware for route protection
#    - Token validation on every request
#    ...
```

**On-screen annotations**:
- "Same context - different session"
- "No need to re-explain"

---

### [3:00-3:45] Feature Demo 3: Project Isolation (45 seconds)

**Voiceover**:
> "Working on multiple projects? MeMesh keeps memories isolated—no context
> mixing between projects."

**Demo**:
```bash
# Switch to different project directory
$ cd ~/projects/project-B

# Search for auth in Project B
buddy-remember "authentication"

# Shows only Project B memories
# Different auth approach (e.g., OAuth instead of JWT)

# On-screen split: Project A memories | Project B memories
```

**On-screen annotations**:
- "Project A: JWT" → "Project B: OAuth"
- "Automatic isolation"

---

### [3:45-4:30] Technical Highlights (45 seconds)

**Visual**: Fast-paced montage

**Voiceover**:
> "MeMesh isn't just a note-taking tool. It uses semantic search with vector
> embeddings to understand what you're looking for. Plus, it's local-first—
> all your data stays on your machine. No cloud sync, no privacy concerns."

**Screen captures** (rapid succession):
- Code snippet: `Xenova/bge-small-en-v1.5` (384-dim vectors)
- Terminal: `~/.memesh/` directory structure
- Badge showcase:
  - ✅ 1700+ tests
  - ✅ CodeQL passed
  - ✅ Local-first
  - ✅ Open source (AGPL-3.0)

---

### [4:30-5:00] Call to Action (30 seconds)

**Visual**: Terminal + On-screen text overlay

**Voiceover**:
> "Ready to give Claude Code a memory? Install MeMesh now. It's open source,
> actively maintained, and works across terminal and VS Code.
>
> Links in the description. Try it today!"

**On-screen text**:
```
npm install -g @pcircle/memesh

GitHub: github.com/PCIRCLE-AI/claude-code-buddy
npm: npmjs.com/package/@pcircle/memesh
Docs: [link]

⭐ Star us on GitHub!
```

**End screen**:
- MeMesh logo
- "Never lose context again"
- Social links

---

## Editing Notes

### Cuts & Transitions
- Use jump cuts to remove dead air
- Smooth transitions between demos (fade 0.5s)
- Zoom into terminal for important outputs
- Add subtle sound effects for "Memory saved" notifications

### Text Overlays
- Font: Sans-serif, bold, high contrast
- Position: Bottom third or top third
- Duration: Long enough to read 2x (5-7 seconds)

### Background Music
- Light, upbeat instrumental
- Volume: -20dB to -25dB (don't overpower voice)
- Fade out during important explanations

### Captions
- Auto-generate with YouTube
- Review and correct technical terms
- Add keyword timestamps in description

---

## YouTube Description Template

```markdown
MeMesh gives Claude Code a persistent memory that survives across sessions.

⏱️ Timestamps:
0:00 - The Problem: Context Loss
0:30 - Solution: MeMesh Introduction
1:00 - Demo: buddy-do (Save Memories)
2:00 - Demo: buddy-remember (Recall Memories)
3:00 - Demo: Project Isolation
3:45 - Technical Highlights
4:30 - Get Started

🚀 Installation:
npm install -g @pcircle/memesh

📚 Resources:
- GitHub: https://github.com/PCIRCLE-AI/claude-code-buddy
- npm: https://www.npmjs.com/package/@pcircle/memesh
- Documentation: [link]
- User Guide: [link]

✨ Features:
✅ Persistent memory (90 days decisions, 30 days context)
✅ Semantic search with vector embeddings
✅ Project isolation
✅ Local-first (privacy-focused)
✅ 1700+ tests, actively maintained
✅ Open source (AGPL-3.0)

#ClaudeCode #AITools #Productivity #OpenSource
```

---

## Pre-Recording Preparation

### Day Before Recording
- [ ] Write out full voiceover script
- [ ] Practice reading aloud (check timing)
- [ ] Prepare all terminal commands
- [ ] Test screen recording quality
- [ ] Set up backup recording method

### Morning of Recording
- [ ] Clear throat (warm beverage)
- [ ] Test microphone levels
- [ ] Close notifications
- [ ] Clean desktop
- [ ] Test all demo scenarios

### Terminal Commands to Prepare

Create a `demo-commands.txt` with all commands ready to paste:
```bash
# Installation
npm install -g @pcircle/memesh

# Verify
buddy-help

# Demo 1: buddy-do
buddy-do "explain our authentication system"

# Demo 2: buddy-remember (new session)
buddy-remember "authentication"

# Demo 3: Project isolation
cd ~/projects/project-B
buddy-remember "authentication"
```

---

## Post-Production Checklist

### Video
- [ ] Export at 1080p 60fps (or 30fps minimum)
- [ ] Check audio levels (-3dB peak)
- [ ] Add intro screen (3 seconds)
- [ ] Add end screen (5 seconds) with Subscribe button
- [ ] Add captions/subtitles

### Upload
- [ ] Compelling thumbnail (text: "Never Lose Context")
- [ ] SEO-optimized title
- [ ] Full description with timestamps
- [ ] Relevant tags
- [ ] Add to playlist: "MeMesh Tutorials"
- [ ] Custom thumbnail with branding

### Promotion
- [ ] Share on Twitter
- [ ] Post in Claude Code Discord
- [ ] Share in r/ClaudeAI subreddit
- [ ] Update README with video link
- [ ] Add to landing page

---

## Thumbnail Design

**Text overlay**:
- Main: "Claude Code + Persistent Memory"
- Subtext: "Never Lose Context Again"

**Visual elements**:
- Split screen: Before (confused Claude) / After (smart MeMesh)
- Bright colors: Blue/Purple gradient
- MeMesh logo prominent
- Arrow showing transformation

**Dimensions**: 1280x720 pixels
**File format**: JPG (< 2MB)

---

## Alternative: Quick 60-Second Version

If 3-5 minutes is too long, create a short version:

**[0-15s]** Problem: "Claude forgets everything"
**[15-30s]** Solution: "MeMesh remembers"
**[30-45s]** Quick demo: buddy-do + buddy-remember
**[45-60s]** Install + CTA

---

**Created**: 2026-02-15
**Status**: Ready for recording
**Next**: Schedule recording session
