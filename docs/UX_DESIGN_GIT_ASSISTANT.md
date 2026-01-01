# Git Assistant UX Design (Draft - Pending Review)

> **Status**: 🔍 Awaiting user review and approval
> **Purpose**: Design a friendly Git assistant that automatically helps users manage version control
> **Principles**: Education first, ask permission, progressive automation

---

## 🎯 Design Goals

1. **Beginner-Friendly** - Explain Git in everyday language, not technical jargon
2. **Ask Permission** - Always ask before acting, respect user choices
3. **Progressive Automation** - From manual → semi-automatic → fully automatic
4. **Remember Preferences** - Learn user habits, reduce repetitive questions
5. **Reversible** - All operations can be undone

---

## 📊 Two Main Scenarios

### Scenario A: Project Without Git (new project or existing project)
### Scenario B: Project With Git (ongoing maintenance)

---

# 🎨 Scenario A: Project Without Git

## Trigger Conditions

```
Trigger When:
1. User creates new project
2. User opens existing project (but no .git folder)
3. User modifies and saves files (after 5+ modifications)

Detection Logic:
if (!exists('.git/')) {
  trigger('git-setup-assistant');
}
```

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Action: Open project or create project                │
└────────────────────┬────────────────────────────────────────┘
                     ↓
         ┌───────────────────────┐
         │ Smart-agents detect   │
         │ Found: No .git        │
         └───────────┬───────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 1] Friendly Notification                           │
│  ──────────────────────────────────────────────────────      │
│  💡 Hi! I noticed this project doesn't have version control  │
│     set up yet.                                              │
│                                                               │
│  Would you like to know what version control is?             │
│  [Tell me] [No thanks, just set it up] [Ask later]          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
  [Tell me]                  [Ask later]
        ↓                         ↓
┌──────────────────┐      ┌────────────────┐
│  [Dialog 2]      │      │ Remember pref  │
│  Educational     │      │ Remind in 7d   │
│  (see below)     │      └────────────────┘
└────────┬─────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 3] Ask Permission                                  │
│  ──────────────────────────────────────────────────────      │
│  Sounds good, right? Want me to set up version control?     │
│                                                               │
│  I will:                                                     │
│  ✅ Record history of every modification                     │
│  ✅ Let you go back to previous versions                     │
│  ✅ Protect your work from accidental loss                   │
│                                                               │
│  [Yes, set it up] [Not now]                                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              [Yes, set it up]
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 4] Basic Setup                                     │
│  ──────────────────────────────────────────────────────      │
│  Great! I need some basic information:                      │
│                                                               │
│  Your name:  [___________________]  (e.g., John Smith)      │
│  Email:      [___________________]  (optional, for collab)  │
│                                                               │
│  This information stays on your computer only 🔒             │
│                                                               │
│  [Continue] [Skip Email]                                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Progress Display]                                          │
│  ──────────────────────────────────────────────────────      │
│  Setting up version control...                              │
│                                                               │
│  ✅ Create version control repository                        │
│  ✅ Configure basic information                              │
│  ⏳ Creating first version...                                │
│                                                               │
│  [Progress bar: ████████░░  80%]                             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 5] First Version (Optional)                        │
│  ──────────────────────────────────────────────────────      │
│  Want to create the first version now?                      │
│                                                               │
│  This will record the current state of all files as a       │
│  starting point. You can always return to this state later. │
│                                                               │
│  Version description: [Initial project version_________]    │
│                                                               │
│  [Create version] [Maybe later]                             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 6] Complete + Tutorial                             │
│  ──────────────────────────────────────────────────────      │
│  ✅ Setup complete! Version control enabled                  │
│                                                               │
│  From now on, I will:                                        │
│  📝 Monitor your file modifications                          │
│  💡 Remind you to save versions at appropriate times         │
│  🔄 Help you manage version history                          │
│                                                               │
│  Want to see a quick tutorial?                               │
│  [Tutorial (2 min)] [I'll explore myself] [Close]           │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Dialog Design

### [Dialog 2] Educational Explanation (if user chooses "Tell me")

```
┌─────────────────────────────────────────────────────────────┐
│  What is version control?                                   │
│  ════════════════════════════════════════════════════════    │
│                                                               │
│  Imagine:                                                    │
│                                                               │
│  🎮 Like "save points" in a game                             │
│     You can return to previous progress anytime              │
│                                                               │
│  📸 Like taking photos to record                             │
│     Each important modification takes a "snapshot"           │
│                                                               │
│  ⏪ Like an "undo" button supercharged                       │
│     Not just undo last step, go back to any point in time   │
│                                                               │
│  ──────────────────────────────────────────────────────      │
│                                                               │
│  Real examples:                                              │
│                                                               │
│  ❌ Without version control:                                 │
│     "Oops! I deleted the wrong thing, can't get it back..." │
│     "When did this bug appear? Have to check line by line..." │
│     "File-final-really-final-modified2.docx"                │
│                                                               │
│  ✅ With version control:                                    │
│     "No problem, just go back to yesterday's version"       │
│     "Compare yesterday and today, find the problem quickly" │
│     "Clear version history: v1.0 → v1.1 → v2.0"             │
│                                                               │
│  ──────────────────────────────────────────────────────      │
│                                                               │
│  [Continue setup] [More info] [Ask later]                   │
└─────────────────────────────────────────────────────────────┘
```

### Notification Style (Non-intrusive)

```
Bottom-right notification (dismissible):

┌─────────────────────────────────┐
│  💡 Smart-agents reminder        │
├─────────────────────────────────┤
│  This project doesn't have      │
│  version control yet.            │
│  Want me to set it up?           │
│                                  │
│  [Set up] [Later] [Don't ask]   │
└─────────────────────────────────┘
```

---

# 🎨 Scenario B: Project With Git (Ongoing Maintenance)

## Trigger Conditions

```
Trigger When:
1. File modifications accumulate to a certain level (e.g., 10 files or 100 lines)
2. Time interval (e.g., every 30 minutes)
3. User completes a feature (inferred: add/modify/delete file pattern)
4. User saves important files
5. User is about to close the editor

Smart Detection:
- Small changes: No prompt
- Medium changes: Gentle reminder
- Large changes: Proactive suggestion
```

## Automation Level Design

### Level 0: Fully Manual (default for beginners)

```
User has full control, Smart-agents only reminds
```

### Level 1: Smart Reminders (Recommended)

```
Smart-agents reminds + suggests, user confirms
```

### Level 2: Semi-Automatic (Advanced)

```
Smart-agents auto-prepares, user quick approval
```

### Level 3: Fully Automatic (Expert, requires explicit enable)

```
Smart-agents auto-executes, notifies after
```

## User Flow (Level 1: Smart Reminders Mode)

```
┌─────────────────────────────────────────────────────────────┐
│  User Action: Continue editing project                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
         ┌───────────────────────┐
         │ Smart-agents monitor  │
         │ Detect: 10 files mod  │
         │ Judge: Good to save   │
         └───────────┬───────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Notification] Gentle Reminder                             │
│  ──────────────────────────────────────────────────────      │
│  💡 You've modified 10 files                                 │
│                                                               │
│  Suggest saving a version to record current progress?       │
│                                                               │
│  [View changes] [Save version] [Remind later] [×]           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              [View changes]
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 1] Change Summary                                  │
│  ──────────────────────────────────────────────────────      │
│  📊 Change summary:                                          │
│                                                               │
│  New files (2):                                              │
│    ✅ src/components/LoginForm.tsx                           │
│    ✅ src/api/auth.ts                                        │
│                                                               │
│  Modified files (7):                                         │
│    📝 src/App.tsx                     (+15 -3 lines)         │
│    📝 src/routes/index.ts             (+8 -0 lines)          │
│    📝 package.json                    (+2 -0 lines)          │
│    ... (4 more files)                                        │
│                                                               │
│  Deleted files (1):                                          │
│    ❌ src/old-login.tsx                                      │
│                                                               │
│  [View detailed diff] [Save version] [Cancel]               │
└────────────────────┬────────────────────────────────────────┘
                     ↓
              [Save version]
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 2] AI Suggested Version Description                │
│  ──────────────────────────────────────────────────────      │
│  🤖 I analyzed the changes, here's my suggested description: │
│                                                               │
│  Version description:                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Implement login functionality                       │    │
│  │                                                      │    │
│  │ - Add LoginForm component                           │    │
│  │ - Integrate authentication API                      │    │
│  │ - Update routing configuration                      │    │
│  │ - Remove old login page                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  You can edit this description ✏️                            │
│                                                               │
│  [Use this description] [I'll write my own] [Cancel]        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
          [Use this description] or [I'll write my own]
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Progress] Saving version                                  │
│  ──────────────────────────────────────────────────────      │
│  Saving version...                                           │
│                                                               │
│  ✅ Recorded 10 file modifications                           │
│  ✅ Saved version description                                │
│  ✅ Version saved                                             │
│                                                               │
│  Version #: 47                                               │
│  Time: 2025-12-31 15:30                                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  [Dialog 3] Advanced Options (Optional)                     │
│  ──────────────────────────────────────────────────────      │
│  ✅ Version saved!                                            │
│                                                               │
│  Want to take extra protection measures?                    │
│                                                               │
│  □ Create local backup (copy to backup folder)              │
│  □ Sync to cloud (if GitHub/GitLab configured)              │
│  □ Mark as milestone                                         │
│                                                               │
│  [Execute selected] [Skip] [Don't ask again]                │
└─────────────────────────────────────────────────────────────┘
```

## Automation Behavior Design (Level 2-3)

### Level 2: Semi-Automatic Mode

```
┌─────────────────────────────────────────────────────────────┐
│  [Simplified Notification] One-Click Approval               │
│  ──────────────────────────────────────────────────────      │
│  💡 Detected: Login feature development completed            │
│                                                               │
│  Ready to save version:                                      │
│  "Implement login - Add LoginForm and auth API"             │
│                                                               │
│  [Confirm save] [Edit description] [Cancel]                 │
│                                                               │
│  ⚙️ Settings: [Switch to manual mode]                        │
└─────────────────────────────────────────────────────────────┘
```

### Level 3: Fully Automatic Mode (requires explicit enable)

```
Enable confirmation:
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Enable fully automatic mode                              │
│  ──────────────────────────────────────────────────────      │
│  Fully automatic mode lets Smart-agents save versions       │
│  automatically without asking every time.                    │
│                                                               │
│  This is suitable for:                                       │
│  ✅ You're already familiar with version control             │
│  ✅ You trust AI's judgment                                  │
│  ✅ You want to focus on development without interruption    │
│                                                               │
│  You can always:                                             │
│  • View automatically saved versions                         │
│  • Return to previous versions                               │
│  • Turn off automatic mode                                   │
│                                                               │
│  [Confirm enable] [Keep current setting]                    │
└─────────────────────────────────────────────────────────────┘

Automatic operation (post-notification):
┌───────────────────────────────┐
│  ✅ Auto-saved version #48     │
│  "Implement login"             │
│                                │
│  [View details] [×]            │
└───────────────────────────────┘
```

## Smart Timing Detection

### When to Suggest Saving Version?

```typescript
interface SaveTrigger {
  // File count threshold
  filesChanged: number;     // e.g., 10 files

  // Line change threshold
  linesChanged: number;     // e.g., 100 lines

  // Time interval
  timeSinceLastSave: number; // e.g., 30 minutes

  // Work pattern detection
  workPattern: {
    created: string[];      // New files
    modified: string[];     // Modified files
    deleted: string[];      // Deleted files
  };

  // Smart judgment
  aiConfidence: number;     // AI confidence score for "good to save"
}

// Trigger condition example
const shouldSuggestSave =
  (filesChanged >= 10) ||
  (linesChanged >= 100) ||
  (timeSinceLastSave >= 30 * 60 * 1000) ||
  (aiConfidence > 0.8);  // AI highly confident it's good to save
```

### AI Work Pattern Detection

```typescript
// Example: Detect "feature completion"
Pattern: New feature development
  ✅ New component files (*.tsx, *.vue)
  ✅ New API files (api/*.ts)
  ✅ Updated routes (routes/*.ts)
  ✅ Updated dependencies (package.json)
  → Confidence score: 95% → Suggest save

Pattern: Bug fix
  ✅ Modified few files (1-3)
  ✅ Small modifications (<50 lines)
  ✅ Includes test files
  → Confidence score: 85% → Suggest save

Pattern: Exploration/Experiment
  ⚠️ Frequent modification of same file
  ⚠️ Multiple undos
  ⚠️ Unstable modification pattern
  → Confidence score: 30% → Don't suggest save (wait for stability)
```

---

# ⚙️ Settings & Preferences

## Settings Interface Design

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Git Assistant Settings                                   │
│  ══════════════════════════════════════════════════════════  │
│                                                               │
│  🤖 Automation Level:                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Level 0: Fully manual (I control everything)     │    │
│  │ ● Level 1: Smart reminders (Recommended)           │    │
│  │ ○ Level 2: Semi-automatic (Quick approval)         │    │
│  │ ○ Level 3: Fully automatic (Full trust in AI)      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  📊 Reminder Conditions:                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Modified files:  [▓▓▓▓▓▓▓░░░] 10 files            │    │
│  │ Modified lines:  [▓▓▓▓▓░░░░░] 100 lines           │    │
│  │ Time interval:   [▓▓▓▓▓▓░░░░] 30 minutes          │    │
│  │                                                      │    │
│  │ ☑ Enable AI smart detection                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  🔔 Notification Method:                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ Bottom-right notification                         │    │
│  │ ☑ Status bar hint                                   │    │
│  │ ☐ Sound alert                                       │    │
│  │ ☐ Desktop notification (requires system permission) │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  💾 Auto Backup:                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ Local backup (every version save)                │    │
│  │ ☐ Cloud sync (requires GitHub setup)               │    │
│  │                                                      │    │
│  │ Backup location: [~/.claude-code-buddy-backups/___] [Choose] │    │
│  │ Keep count:      [___10___] recent backups         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  📝 Version Description:                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ● AI auto-generate (editable)                      │    │
│  │ ○ I'll write myself                                │    │
│  │ ○ Use template                                      │    │
│  │                                                      │    │
│  │ Language: [●] Traditional Chinese  [○] English     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Save settings] [Restore defaults] [Cancel]                │
└─────────────────────────────────────────────────────────────┘
```

## Preference Learning

```
Smart-agents will remember:

1. User selection patterns
   - Usually choose Level 1 → Remember, default Level 1 next time
   - Often skip notifications → Reduce notification frequency

2. Version description style
   - User's preferred description format
   - Commonly used keywords

3. Work habits
   - When user usually wants to save versions
   - Preferred reminder timing

4. Feedback learning
   - User accepts AI suggestion → Increase confidence score for similar situations
   - User rejects AI suggestion → Decrease confidence score for similar situations
```

---

# 📚 Quick Tutorial Design

## Interactive Tutorial (2 minutes)

```
┌─────────────────────────────────────────────────────────────┐
│  🎓 Git Assistant Quick Tutorial (Step 1/4)                 │
│  ══════════════════════════════════════════════════════════  │
│                                                               │
│  What is "saving a version"?                                 │
│                                                               │
│  [Interactive Demo]                                          │
│                                                               │
│  Now: You're writing code 📝                                 │
│  ├─ index.ts (editing)                                       │
│  ├─ app.ts (editing)                                         │
│  └─ style.css (editing)                                      │
│                                                               │
│  What happens when you click "Save version"?                 │
│  → [Simulate save version]                                   │
│                                                               │
│  ✅ Result:                                                   │
│  Version #1 created!                                         │
│  Recorded the current state of these 3 files                 │
│                                                               │
│  [Next: Why need versions?]                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🎓 Git Assistant Quick Tutorial (Step 2/4)                 │
│  ══════════════════════════════════════════════════════════  │
│                                                               │
│  Why need versions?                                          │
│                                                               │
│  [Interactive Demo]                                          │
│                                                               │
│  Situation: You continue developing, modify many things...   │
│  Suddenly discover: Oops! New code has bugs!                 │
│                                                               │
│  Without version control:                                    │
│  ❌ Can only manually undo, might not recover                │
│  ❌ Don't know where things broke                            │
│                                                               │
│  With version control:                                       │
│  ✅ One-click return to version #1 (the working version)     │
│  ✅ Compare differences, find the problem                    │
│                                                               │
│  → [Try it: Return to version #1]                            │
│                                                               │
│  [Next: How to use?]                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🎓 Git Assistant Quick Tutorial (Step 3/4)                 │
│  ══════════════════════════════════════════════════════════  │
│                                                               │
│  How to use Git Assistant?                                   │
│                                                               │
│  You have three choices:                                     │
│                                                               │
│  1️⃣ Manual mode (Full control)                               │
│     You command when you want to save                        │
│     → Suitable for: People who want to learn Git commands    │
│                                                               │
│  2️⃣ Smart reminders (Recommended) ✨                         │
│     Smart-agents reminds you, you confirm                    │
│     → Suitable for: Most people                              │
│                                                               │
│  3️⃣ Fully automatic (Expert)                                 │
│     Smart-agents handles everything automatically            │
│     → Suitable for: People who fully trust AI                │
│                                                               │
│  Which do you prefer? (Can change anytime)                   │
│  [Manual] [Smart reminders] [Fully automatic]               │
│                                                               │
│  [Next: Try it out]                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🎓 Git Assistant Quick Tutorial (Step 4/4)                 │
│  ══════════════════════════════════════════════════════════  │
│                                                               │
│  Try it out!                                                 │
│                                                               │
│  [Interactive Exercise]                                      │
│                                                               │
│  Now modify any file, then save...                           │
│  (We'll simulate detecting the modification)                 │
│                                                               │
│  ⏳ Waiting for your modification...                         │
│                                                               │
│  [Or skip and start using]                                   │
│                                                               │
│  ───────────────────────────────────────────────────         │
│                                                               │
│  💡 Tips:                                                     │
│  • Type 'git-help' anytime for help                          │
│  • Settings page can adjust behavior                         │
│  • When in doubt, choose "Smart reminders"                   │
│                                                               │
│  [Complete tutorial, start using]                            │
└─────────────────────────────────────────────────────────────┘
```

---

# 🔧 Technical Implementation Hooks

## Hook Trigger Point Design

```typescript
// 1. Project initialization/open
Hook: 'project:init'
Hook: 'project:open'
→ Check if .git exists
→ If not, trigger "Scenario A: Git Setup Assistant"

// 2. File change monitoring
Hook: 'file:changed'
Hook: 'file:saved'
→ Accumulate change statistics
→ When threshold reached, trigger "Scenario B: Save version reminder"

// 3. Workflow events
Hook: 'workflow:feature-complete'  // AI judges feature complete
Hook: 'workflow:bug-fixed'         // AI judges bug fixed
→ Smart suggest save version

// 4. User actions
Hook: 'user:closing-editor'        // User about to close
Hook: 'user:switching-branch'      // User switching branch
→ Remind about unsaved changes

// 5. Periodic check
Hook: 'timer:interval'             // Check every N minutes
→ Evaluate if reminder needed
```

---

# 📋 Review Checklist

## Please Review These Design Points:

### ✅ User Experience

- [ ] Are **dialog texts** friendly and easy to understand?
- [ ] Is the **flow design** smooth and not annoying?
- [ ] Is the **notification timing** appropriate?
- [ ] Is the **automation level** design reasonable?

### ✅ Educational Value

- [ ] Is the **Git concept explanation** clear?
- [ ] Are the **analogies** easy to understand?
- [ ] Is the **tutorial flow** effective?

### ✅ User Respect

- [ ] Does it **ask permission** before executing?
- [ ] Does it provide **close/exit** options?
- [ ] Does it **remember preferences** to reduce repetitive questions?

### ✅ Feature Completeness

- [ ] Does Scenario A (no Git) cover all situations?
- [ ] Is Scenario B (has Git) smart and useful?
- [ ] Are **settings options** flexible enough?

### ✅ Technical Feasibility

- [ ] Is the Hook trigger point design reasonable?
- [ ] Is the AI judgment logic implementable?
- [ ] Is the performance impact acceptable?

---

# 🎨 Design Options To Decide

## Please Help Me Decide:

### 1. Default Automation Level

**Option A**: Level 0 (Fully manual) - Safest, but not smart
**Option B**: Level 1 (Smart reminders) - Balanced, recommended
**Option C**: Dynamically adjust based on user familiarity

**My Suggestion**: Option B, default Level 1

### 2. Notification Style

**Option A**: Bottom-right notification (non-intrusive)
**Option B**: Modal dialog (prominent but interrupts work)
**Option C**: Status bar hint (least intrusive)

**My Suggestion**: Option A, combined with Option C

### 3. Version Description Generation

**Option A**: Fully AI generated
**Option B**: AI generated + user editable (recommended)
**Option C**: Provide template choices

**My Suggestion**: Option B

### 4. Initial Setup Flow

**Option A**: Full guide (6 dialogs as designed above)
**Option B**: Quick setup (only ask necessary questions)
**Option C**: Skip setup, use defaults

**My Suggestion**: Offer both quick/full mode choices

---

# 📝 Review Feedback

Please provide your feedback:

1. Does the **overall design** meet your expectations?
2. What **parts** need modification?
3. Are there any **missing** use scenarios?
4. Which **design options** do you choose?
5. Approve to start implementation?

---

**Status**: 🔍 Awaiting review
**Next Step**: Modify based on review feedback → Start implementation after approval
