# A2A Collaboration Hook

This directory contains the Agent-to-Agent (A2A) collaboration hook for Claude Code sessions.

## Overview

The A2A collaboration hook enables multiple Claude Code agents to work together by:
- Auto-assigning unique agent names (Alpha, Beta, Gamma, etc.)
- Broadcasting agent status when sessions start
- Checking for pending tasks assigned to this agent
- Reporting task completion with commit hashes

## Installation

### Quick Install

```bash
cd /Users/ktseng/Developer/Projects/claude-code-buddy
./scripts/install-a2a-hook.sh
```

The installation script will:
1. Copy `a2a-collaboration-hook.js` to `~/.claude/hooks/`
2. Update or create `~/.claude/hooks/session-start.js` to integrate the hook
3. Make all hooks executable
4. Verify the installation

### Manual Installation

If you prefer to install manually:

```bash
# 1. Copy the hook
cp scripts/hooks/a2a-collaboration-hook.js ~/.claude/hooks/

# 2. Make it executable
chmod +x ~/.claude/hooks/a2a-collaboration-hook.js

# 3. Update session-start.js
# Add this import at the top:
import { initA2ACollaboration } from './a2a-collaboration-hook.js';

# Add this call in your sessionStart() function:
const agentIdentity = initA2ACollaboration();
```

## Features

### 1. Agent Check-in System

When a Claude Code session starts, the hook automatically:
- Picks an available agent name from the Greek alphabet pool
- Generates a unique agent ID
- Registers to the knowledge graph
- Broadcasts online status

Example output:
```
═══════════════════════════════════════════════════════
  👋 A2A Collaboration System
═══════════════════════════════════════════════════════

  📢 BROADCAST: Alpha is now online!

     🆔 Name: Alpha
     🔖 Agent ID: macbook-pro-lmn8x9
     🎯 Specialization: General (awaiting assignment)
     ⏰ Checked in: 2026-02-04 12:00:00
```

### 2. Task Reception

Automatically checks for pending tasks assigned to this agent and displays them on session start.

### 3. Specialization Assignment

Assign a specialization to your agent:

```
"Alpha，你負責前端開發"
"Beta，你負責後端 API"
```

### 4. Available A2A Actions

#### Send Task to Another Agent
```bash
a2a-send-task targetAgentId="beta-xyz" taskDescription="Implement user login API"
```

#### List Your Tasks
```bash
a2a-list-tasks
```

#### Report Task Completion
```bash
a2a-report-result taskId="task-123" result="Done! Commit: abc1234" success=true
```

## File Structure

```
scripts/hooks/
├── a2a-collaboration-hook.js    # Main hook implementation
└── README.md                    # This file

~/.claude/hooks/                 # Installed location
├── a2a-collaboration-hook.js    # Copied from scripts/hooks/
└── session-start.js             # Updated to call the hook
```

## How It Works

### On Session Start

1. **Check Existing Identity**: Loads existing agent identity if session is less than 1 hour old
2. **Pick Available Name**: Scans knowledge graph for used names and picks an available one
3. **Register**: Creates entity in knowledge graph with observations
4. **Check Tasks**: Queries A2A task database for pending tasks
5. **Display**: Shows welcome message with agent info and available actions

### Agent Identity

Stored in `~/.claude/state/agent-identity.json`:

```json
{
  "name": "Alpha",
  "agentId": "macbook-pro-lmn8x9",
  "specialization": "Frontend Development",
  "sessionStart": "2026-02-04T12:00:00.000Z",
  "status": "ONLINE"
}
```

### Knowledge Graph Registration

The hook creates an entity in CCB's knowledge graph:

```
Entity: "Online Agent: Alpha"
Type: session_identity
Observations:
  - Agent ID: macbook-pro-lmn8x9
  - Name: Alpha
  - Status: ONLINE
  - Specialization: Frontend Development
  - Checked in: 2026-02-04T12:00:00.000Z
```

## Idempotency

The installation script is safe to run multiple times:
- Won't duplicate imports in session-start.js
- Updates hook to latest version if changed
- Preserves existing session-start.js functionality
- Creates backup before modifications

## Troubleshooting

### Hook Not Running

1. Check if session-start.js exists and is executable:
```bash
ls -la ~/.claude/hooks/session-start.js
```

2. Verify the integration:
```bash
grep "initA2ACollaboration" ~/.claude/hooks/session-start.js
```

3. Re-run the installer:
```bash
./scripts/install-a2a-hook.sh
```

### Agent Name Always the Same

Session identities are cached for 1 hour. To force a new name:
```bash
rm ~/.claude/state/agent-identity.json
```

### No Pending Tasks Shown

Make sure the A2A task database exists:
```bash
ls -la ~/.claude-code-buddy/a2a-tasks.db
```

## Development

### Testing the Hook Standalone

```bash
cd ~/.claude/hooks
node a2a-collaboration-hook.js
```

### Updating the Hook

After modifying `scripts/hooks/a2a-collaboration-hook.js`:
```bash
./scripts/install-a2a-hook.sh
```

## Dependencies

- SQLite3 (for querying knowledge graph and task database)
- Node.js 18+ (for ES modules support)
- CCB installed and initialized

## Related Scripts

- `scripts/generate-a2a-token.sh` - Generate authentication tokens for A2A communication
- `scripts/test-a2a-setup.sh` - Test A2A system setup
- `scripts/test-a2a-communication.sh` - Test agent-to-agent communication

## Architecture

The A2A collaboration system consists of:

1. **Agent Registry** (`~/.claude-code-buddy/a2a-registry.db`)
   - Tracks active agents
   - Stores heartbeat timestamps
   - Manages agent status

2. **Task Queue** (`~/.claude-code-buddy/a2a-tasks.db`)
   - Stores task assignments
   - Tracks task state (SUBMITTED, IN_PROGRESS, COMPLETED)
   - Records task results

3. **Knowledge Graph** (`~/.claude-code-buddy/knowledge-graph.db`)
   - Stores agent identities as entities
   - Tracks specializations as observations
   - Enables agent discovery

4. **Session State** (`~/.claude/state/agent-identity.json`)
   - Persists agent identity across hook runs
   - Caches agent info for 1 hour
   - Stores current specialization

## License

Part of Claude Code Buddy (CCB) project.
