/**
 * A2A Collaboration Hook
 *
 * Complete multi-agent collaboration system for Claude Code sessions:
 * 1. Agent Check-in - Auto name + broadcast on session start
 * 2. Task Reception - Check for pending tasks assigned to this agent
 * 3. Task Execution - Handle assigned tasks
 * 4. Result Reporting - Report completion with commit hash
 *
 * Usage: Import in TypeScript modules for multi-agent coordination
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { expandHome } from '../utils/paths.js';

// ============================================
// Configuration
// ============================================

const CCB_DATA_DIR = expandHome('~/.claude-code-buddy');
const KG_DB_PATH = path.join(CCB_DATA_DIR, 'knowledge-graph.db');
const AGENT_REGISTRY_PATH = path.join(CCB_DATA_DIR, 'a2a-registry.db');
const STATE_DIR = expandHome('~/.claude/state');
const AGENT_IDENTITY_FILE = path.join(STATE_DIR, 'agent-identity.json');

// Name pool (Greek letters)
const NAME_POOL = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
  'Iota',
  'Kappa',
  'Lambda',
  'Mu',
  'Nu',
  'Xi',
  'Omicron',
  'Pi',
  'Rho',
  'Sigma',
  'Tau',
  'Upsilon',
] as const;

// ============================================
// Type Definitions
// ============================================

/**
 * Agent identity information
 */
export interface AgentIdentity {
  /** Agent's Greek letter name */
  name: string;
  /** Unique agent identifier */
  agentId: string;
  /** Agent's specialization/role */
  specialization: string;
  /** Session start timestamp (ISO 8601) */
  sessionStart: string;
  /** Current status */
  status: 'ONLINE' | 'OFFLINE';
  /** Last update timestamp (ISO 8601) */
  updatedAt?: string;
}

/**
 * Task information from A2A task queue
 */
export interface A2ATask {
  /** Task ID */
  id: string;
  /** Task description */
  description: string;
  /** Task state */
  state: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  /** Creation timestamp */
  createdAt: string;
  /** Sender agent ID */
  senderId: string;
}

/**
 * Task completion report
 */
export interface TaskCompletionReport {
  /** Task ID being reported */
  taskId: string;
  /** Completion status */
  status: 'COMPLETED' | 'FAILED';
  /** Result description */
  result: string;
  /** Completion timestamp (ISO 8601) */
  completedAt: string;
}

/**
 * Display options for check-in broadcast
 */
export interface DisplayOptions {
  /** Show other online agents */
  showOnlineAgents?: boolean;
  /** Show pending tasks */
  showPendingTasks?: boolean;
  /** Show available actions */
  showActions?: boolean;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Execute SQLite query safely
 *
 * @param dbPath - Path to SQLite database
 * @param query - SQL query to execute
 * @returns Query result as string, empty string on error
 */
function sqliteQuery(dbPath: string, query: string): string {
  try {
    const result = execFileSync('sqlite3', [dbPath, query], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim();
  } catch {
    return '';
  }
}

/**
 * Read JSON file safely
 *
 * @param filePath - Path to JSON file
 * @param defaultValue - Default value if file doesn't exist or is invalid
 * @returns Parsed JSON object or default value
 */
function readJSON<T>(filePath: string, defaultValue: T | null = null): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch {
    // Ignore errors
  }
  return defaultValue;
}

/**
 * Write JSON file safely
 *
 * @param filePath - Path to JSON file
 * @param data - Data to write
 * @returns true on success, false on error
 */
function writeJSON(filePath: string, data: unknown): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

// ============================================
// 1. Agent Check-in System
// ============================================

/**
 * Get names currently in use from knowledge graph
 *
 * @returns Array of agent names currently online
 */
function getUsedNames(): string[] {
  if (!fs.existsSync(KG_DB_PATH)) return [];

  const query = "SELECT name FROM entities WHERE type='session_identity' AND name LIKE 'Online Agent:%'";
  const result = sqliteQuery(KG_DB_PATH, query);

  if (!result) return [];

  return result
    .split('\n')
    .map((line) => line.replace('Online Agent: ', '').replace(/ \(.*\)$/, '').trim())
    .filter(Boolean);
}

/**
 * Get online agents from registry
 *
 * @returns Array of online agent IDs
 */
function getOnlineAgents(): string[] {
  if (!fs.existsSync(AGENT_REGISTRY_PATH)) return [];

  const query = "SELECT agent_id FROM agents WHERE status='active' ORDER BY last_heartbeat DESC LIMIT 10";
  const result = sqliteQuery(AGENT_REGISTRY_PATH, query);

  return result ? result.split('\n').filter(Boolean) : [];
}

/**
 * Pick an available name from the pool
 *
 * @returns Available Greek letter name or generated fallback
 */
function pickAvailableName(): string {
  const usedNames = getUsedNames();

  for (const name of NAME_POOL) {
    if (!usedNames.includes(name)) {
      return name;
    }
  }

  // Fallback if all names are taken
  return `Agent-${Date.now().toString().slice(-5)}`;
}

/**
 * Generate unique agent ID based on hostname and timestamp
 *
 * @returns Unique agent identifier
 */
function generateAgentId(): string {
  const hostname = os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  return `${hostname}-${timestamp}`;
}

/**
 * Register agent to Knowledge Graph
 *
 * @param identity - Agent identity to register
 * @returns true on success, false on error
 */
function registerToKnowledgeGraph(identity: AgentIdentity): boolean {
  if (!fs.existsSync(KG_DB_PATH)) return false;

  const entityName = `Online Agent: ${identity.name}`;
  const safeEntityName = entityName.replace(/'/g, "''");
  const now = new Date().toISOString();

  try {
    const existingQuery = `SELECT id FROM entities WHERE name='${safeEntityName}'`;
    const existing = sqliteQuery(KG_DB_PATH, existingQuery);

    if (!existing) {
      const insertQuery = `INSERT INTO entities (name, type, created_at) VALUES ('${safeEntityName}', 'session_identity', '${now}')`;
      sqliteQuery(KG_DB_PATH, insertQuery);

      const newIdQuery = `SELECT id FROM entities WHERE name='${safeEntityName}'`;
      const entityId = sqliteQuery(KG_DB_PATH, newIdQuery);

      if (entityId) {
        const observations = [
          `Agent ID: ${identity.agentId}`,
          `Name: ${identity.name}`,
          `Status: ONLINE`,
          `Specialization: ${identity.specialization}`,
          `Checked in: ${now}`,
        ];

        for (const obs of observations) {
          const safeObs = obs.replace(/'/g, "''");
          sqliteQuery(
            KG_DB_PATH,
            `INSERT INTO observations (entity_id, content, created_at) VALUES (${entityId}, '${safeObs}', '${now}')`
          );
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Load existing identity from state file
 *
 * @returns Agent identity or null if not found
 */
function loadIdentity(): AgentIdentity | null {
  return readJSON<AgentIdentity>(AGENT_IDENTITY_FILE);
}

/**
 * Save identity to state file
 *
 * @param identity - Agent identity to save
 * @returns true on success, false on error
 */
function saveIdentity(identity: AgentIdentity): boolean {
  return writeJSON(AGENT_IDENTITY_FILE, identity);
}

/**
 * Check-in and get/create agent identity
 *
 * Reuses existing identity if session is less than 1 hour old,
 * otherwise creates a new identity with a unique Greek letter name.
 *
 * @returns Agent identity
 */
export function agentCheckIn(): AgentIdentity {
  // Check if already checked in
  const existingIdentity = loadIdentity();
  if (existingIdentity?.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < 60 * 60 * 1000) {
      // Session less than 1 hour old
      return existingIdentity;
    }
  }

  const name = pickAvailableName();
  const agentId = generateAgentId();

  const identity: AgentIdentity = {
    name,
    agentId,
    specialization: 'General (awaiting assignment)',
    sessionStart: new Date().toISOString(),
    status: 'ONLINE',
  };

  saveIdentity(identity);
  registerToKnowledgeGraph(identity);

  return identity;
}

// ============================================
// 2. Task Reception System
// ============================================

/**
 * Check for pending tasks assigned to this agent
 *
 * Queries the A2A task queue for tasks in SUBMITTED state.
 *
 * @param agentId - Current agent ID (not currently used for filtering)
 * @returns Array of pending tasks
 */
export function checkPendingTasks(agentId: string): A2ATask[] {
  if (!fs.existsSync(AGENT_REGISTRY_PATH)) return [];

  // Query tasks from A2A task queue
  const taskDbPath = path.join(CCB_DATA_DIR, 'a2a-tasks.db');
  if (!fs.existsSync(taskDbPath)) return [];

  const query = `SELECT id, description, state, created_at, sender_id FROM tasks WHERE state='SUBMITTED' ORDER BY created_at DESC LIMIT 10`;
  const result = sqliteQuery(taskDbPath, query);

  if (!result) return [];

  return result
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, description, state, createdAt, senderId] = line.split('|');
      return {
        id,
        description,
        state: state as A2ATask['state'],
        createdAt,
        senderId,
      };
    });
}

// ============================================
// 3. Result Reporting System
// ============================================

/**
 * Get latest git commit hash
 *
 * @returns Short commit hash or null on error
 */
export function getLatestCommitHash(): string | null {
  try {
    const result = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Get latest git commit message
 *
 * @returns Commit message or null on error
 */
export function getLatestCommitMessage(): string | null {
  try {
    const result = execFileSync('git', ['log', '-1', '--pretty=%s'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Format task completion report
 *
 * @param taskId - Task ID being completed
 * @param commitHash - Git commit hash
 * @param commitMessage - Git commit message
 * @returns Formatted completion report
 */
export function formatTaskCompletionReport(
  taskId: string,
  commitHash: string,
  commitMessage: string
): TaskCompletionReport {
  return {
    taskId,
    status: 'COMPLETED',
    result: `✅ Task completed!\nCommit: ${commitHash}\nMessage: ${commitMessage}`,
    completedAt: new Date().toISOString(),
  };
}

// ============================================
// 4. Display Functions
// ============================================

/**
 * Display check-in broadcast to console
 *
 * @param identity - Agent identity
 * @param onlineAgents - List of online agent IDs
 * @param pendingTasks - List of pending tasks
 */
function displayCheckInBroadcast(
  identity: AgentIdentity,
  onlineAgents: string[],
  pendingTasks: A2ATask[]
): void {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  👋 A2A Collaboration System');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`  📢 BROADCAST: ${identity.name} is now online!`);
  console.log('');
  console.log(`     🆔 Name: ${identity.name}`);
  console.log(`     🔖 Agent ID: ${identity.agentId}`);
  console.log(`     🎯 Specialization: ${identity.specialization}`);
  console.log(`     ⏰ Checked in: ${new Date().toLocaleString()}`);
  console.log('');

  // Show other online agents
  const otherAgents = onlineAgents.filter((a) => a !== identity.agentId);
  if (otherAgents.length > 0) {
    console.log('  📋 Other online agents:');
    otherAgents.slice(0, 5).forEach((agent) => {
      console.log(`     • ${agent}`);
    });
    console.log('');
  }

  // Show pending tasks
  if (pendingTasks.length > 0) {
    console.log('  📬 Pending tasks for you:');
    pendingTasks.slice(0, 3).forEach((task, i) => {
      console.log(`     ${i + 1}. [${task.state}] ${task.description?.slice(0, 50)}...`);
      console.log(`        From: ${task.senderId} | ID: ${task.id}`);
    });
    console.log('');
    console.log('  💡 Use a2a-list-tasks to see all tasks');
    console.log('');
  }

  // Show available actions
  console.log('  🛠️  Available A2A Actions:');
  console.log('');
  console.log('     📝 Assign specialization:');
  console.log(`        "${identity.name}，你負責前端" or "${identity.name}，你負責後端 API"`);
  console.log('');
  console.log('     📤 Send task to another agent:');
  console.log('        a2a-send-task targetAgentId="<agent>" taskDescription="..."');
  console.log('');
  console.log('     📥 Check your tasks:');
  console.log('        a2a-list-tasks');
  console.log('');
  console.log('     ✅ Report task completion:');
  console.log('        a2a-report-result taskId="<id>" result="Done! Commit: xxx" success=true');
  console.log('');
  console.log('═'.repeat(60));
  console.log('');
}

/**
 * Display already checked in message
 *
 * @param identity - Current agent identity
 */
function displayAlreadyCheckedIn(identity: AgentIdentity): void {
  console.log('');
  console.log(`  ℹ️  Already checked in as ${identity.name}`);
  console.log(`     🎯 Specialization: ${identity.specialization}`);
  console.log('');
}

// ============================================
// Main Entry Point
// ============================================

/**
 * Main A2A collaboration initialization
 *
 * Checks if already checked in (within 1 hour), otherwise performs
 * new check-in and displays broadcast with online agents and pending tasks.
 *
 * @returns Agent identity
 */
export function initA2ACollaboration(): AgentIdentity {
  // Check if already checked in
  const existingIdentity = loadIdentity();

  if (existingIdentity?.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < 60 * 60 * 1000) {
      // Session less than 1 hour old
      displayAlreadyCheckedIn(existingIdentity);
      return existingIdentity;
    }
  }

  // New check-in
  const identity = agentCheckIn();
  const onlineAgents = getOnlineAgents();
  const pendingTasks = checkPendingTasks(identity.agentId);

  displayCheckInBroadcast(identity, onlineAgents, pendingTasks);

  return identity;
}

/**
 * Update agent specialization
 *
 * Updates the current agent's specialization and saves to state.
 *
 * @param newSpecialization - New specialization description
 * @returns Updated agent identity or null if no identity exists
 */
export function updateSpecialization(newSpecialization: string): AgentIdentity | null {
  const identity = loadIdentity();
  if (!identity) {
    console.log('  ❌ No identity found. Please check in first.');
    return null;
  }

  identity.specialization = newSpecialization;
  identity.updatedAt = new Date().toISOString();
  saveIdentity(identity);

  console.log('');
  console.log(`  ✅ Specialization updated!`);
  console.log(`     🆔 Name: ${identity.name}`);
  console.log(`     🎯 New Specialization: ${newSpecialization}`);
  console.log('');

  return identity;
}

/**
 * Get current agent identity
 *
 * @returns Current agent identity or null if not checked in
 */
export function getCurrentIdentity(): AgentIdentity | null {
  return loadIdentity();
}
