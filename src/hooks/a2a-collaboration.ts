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

// ============================================
// Utility Functions
// ============================================

/**
 * Execute SQLite query safely with parameterized values
 *
 * @param dbPath - Path to SQLite database
 * @param query - SQL query (use ? for parameters)
 * @param params - Optional parameter values to bind
 * @returns Query result as string, empty string on error
 */
function sqliteQuery(dbPath: string, query: string, params?: string[]): string {
  try {
    const args = ['-separator', '|', dbPath];

    let finalQuery = query;
    if (params && params.length > 0) {
      // Properly escape parameters: escape single quotes and wrap in quotes
      const escapedParams = params.map((p) =>
        p === null || p === undefined ? 'NULL' : `'${String(p).replace(/'/g, "''")}'`
      );

      // Replace ? placeholders with escaped values
      let paramIndex = 0;
      finalQuery = query.replace(/\?/g, () => {
        if (paramIndex < escapedParams.length) {
          return escapedParams[paramIndex++];
        }
        return '?';
      });
    }

    const result = execFileSync('sqlite3', [...args, finalQuery], {
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
 */
function getUsedNames(): string[] {
  if (!fs.existsSync(KG_DB_PATH)) return [];

  const query =
    "SELECT name FROM entities WHERE type='session_identity' AND name LIKE 'Online Agent:%'";
  const result = sqliteQuery(KG_DB_PATH, query);

  if (!result) return [];

  return result
    .split('\n')
    .map((line) => line.replace('Online Agent: ', '').replace(/ \(.*\)$/, '').trim())
    .filter(Boolean);
}

/**
 * Get online agents from registry
 */
function getOnlineAgents(): string[] {
  if (!fs.existsSync(AGENT_REGISTRY_PATH)) return [];

  const query =
    "SELECT agent_id FROM agents WHERE status='active' ORDER BY last_heartbeat DESC LIMIT 10";
  const result = sqliteQuery(AGENT_REGISTRY_PATH, query);

  return result ? result.split('\n').filter(Boolean) : [];
}

/**
 * Pick an available name from the pool using atomic reservation
 *
 * Uses INSERT OR IGNORE to atomically claim a name, preventing race conditions
 * where two agents starting simultaneously could get the same name.
 */
function pickAvailableName(): string {
  const usedNames = getUsedNames();
  const now = new Date().toISOString();

  for (const name of NAME_POOL) {
    if (!usedNames.includes(name)) {
      if (fs.existsSync(KG_DB_PATH)) {
        const entityName = `Online Agent: ${name}`;
        // INSERT OR IGNORE is atomic
        sqliteQuery(
          KG_DB_PATH,
          'INSERT OR IGNORE INTO entities (name, type, created_at) VALUES (?, ?, ?)',
          [entityName, 'session_identity', now]
        );

        const verifyResult = sqliteQuery(
          KG_DB_PATH,
          'SELECT id FROM entities WHERE name = ?',
          [entityName]
        );

        if (verifyResult) {
          return name;
        }
        continue;
      }
      return name;
    }
  }

  return `Agent-${Date.now().toString(36)}`;
}

/**
 * Generate unique agent ID based on hostname and timestamp
 */
function generateAgentId(): string {
  const hostname = os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  return `${hostname}-${timestamp}`;
}

/**
 * Register agent to Knowledge Graph using atomic operations
 */
function registerToKnowledgeGraph(identity: AgentIdentity): boolean {
  if (!fs.existsSync(KG_DB_PATH)) return false;

  const entityName = `Online Agent: ${identity.name}`;
  const now = new Date().toISOString();

  try {
    sqliteQuery(
      KG_DB_PATH,
      'INSERT OR IGNORE INTO entities (name, type, created_at) VALUES (?, ?, ?)',
      [entityName, 'session_identity', now]
    );

    const entityId = sqliteQuery(KG_DB_PATH, 'SELECT id FROM entities WHERE name = ?', [
      entityName,
    ]);

    if (entityId && /^\d+$/.test(entityId)) {
      const observations = [
        `Agent ID: ${identity.agentId}`,
        `Name: ${identity.name}`,
        `Status: ONLINE`,
        `Specialization: ${identity.specialization}`,
        `Checked in: ${now}`,
      ];

      for (const obs of observations) {
        sqliteQuery(
          KG_DB_PATH,
          'INSERT INTO observations (entity_id, content, created_at) VALUES (?, ?, ?)',
          [entityId, obs, now]
        );
      }
    }

    return true;
  } catch {
    return false;
  }
}

function loadIdentity(): AgentIdentity | null {
  return readJSON<AgentIdentity>(AGENT_IDENTITY_FILE);
}

function saveIdentity(identity: AgentIdentity): boolean {
  return writeJSON(AGENT_IDENTITY_FILE, identity);
}

/**
 * Check-in and get/create agent identity
 */
export function agentCheckIn(): AgentIdentity {
  const existingIdentity = loadIdentity();
  if (existingIdentity?.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < 60 * 60 * 1000) {
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
 * Check for pending tasks - uses JSON output for robust parsing
 */
export function checkPendingTasks(_agentId: string): A2ATask[] {
  const taskDbPath = path.join(CCB_DATA_DIR, 'a2a-tasks.db');
  if (!fs.existsSync(taskDbPath)) return [];

  try {
    const result = execFileSync(
      'sqlite3',
      [
        '-json',
        taskDbPath,
        "SELECT id, description, state, created_at as createdAt, sender_id as senderId FROM tasks WHERE state='SUBMITTED' ORDER BY created_at DESC LIMIT 10",
      ],
      { encoding: 'utf-8', timeout: 5000 }
    );

    if (!result.trim()) return [];

    const parsed = JSON.parse(result) as Array<{
      id: string;
      description: string;
      state: string;
      createdAt: string;
      senderId: string;
    }>;

    return parsed.map((row) => ({
      id: String(row.id),
      description: row.description || '',
      state: row.state as A2ATask['state'],
      createdAt: row.createdAt || '',
      senderId: row.senderId || '',
    }));
  } catch {
    // Fallback for older SQLite
    const query =
      "SELECT id, description, state, created_at, sender_id FROM tasks WHERE state='SUBMITTED' ORDER BY created_at DESC LIMIT 10";
    const result = sqliteQuery(taskDbPath, query);

    if (!result) return [];

    return result
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|');
        const id = parts[0] || '';
        const senderId = parts[parts.length - 1] || '';
        const createdAt = parts[parts.length - 2] || '';
        const state = parts[parts.length - 3] || '';
        const description = parts.slice(1, -3).join('|');

        return {
          id,
          description,
          state: state as A2ATask['state'],
          createdAt,
          senderId,
        };
      });
  }
}

// ============================================
// 3. Result Reporting System
// ============================================

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

export function formatTaskCompletionReport(
  taskId: string,
  commitHash: string,
  commitMessage: string
): TaskCompletionReport {
  return {
    taskId,
    status: 'COMPLETED',
    result: `Task completed!\nCommit: ${commitHash}\nMessage: ${commitMessage}`,
    completedAt: new Date().toISOString(),
  };
}

// ============================================
// 4. Display Functions
// ============================================

function displayCheckInBroadcast(
  identity: AgentIdentity,
  onlineAgents: string[],
  pendingTasks: A2ATask[]
): void {
  console.log('');
  console.log('='.repeat(60));
  console.log('  A2A Collaboration System');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  BROADCAST: ${identity.name} is now online!`);
  console.log('');
  console.log(`     Name: ${identity.name}`);
  console.log(`     Agent ID: ${identity.agentId}`);
  console.log(`     Specialization: ${identity.specialization}`);
  console.log(`     Checked in: ${new Date().toLocaleString()}`);
  console.log('');

  const otherAgents = onlineAgents.filter((a) => a !== identity.agentId);
  if (otherAgents.length > 0) {
    console.log('  Other online agents:');
    otherAgents.slice(0, 5).forEach((agent) => {
      console.log(`     - ${agent}`);
    });
    console.log('');
  }

  if (pendingTasks.length > 0) {
    console.log('  Pending tasks for you:');
    pendingTasks.slice(0, 3).forEach((task, i) => {
      console.log(`     ${i + 1}. [${task.state}] ${task.description?.slice(0, 50)}...`);
      console.log(`        From: ${task.senderId} | ID: ${task.id}`);
    });
    console.log('');
    console.log('  Use a2a-list-tasks to see all tasks');
    console.log('');
  }

  console.log('  Available A2A Actions:');
  console.log('');
  console.log('     Assign specialization:');
  console.log(
    `        "${identity.name}, you handle frontend" or "${identity.name}, you handle backend API"`
  );
  console.log('');
  console.log('     Send task to another agent:');
  console.log('        a2a-send-task targetAgentId="<agent>" taskDescription="..."');
  console.log('');
  console.log('     Check your tasks:');
  console.log('        a2a-list-tasks');
  console.log('');
  console.log('     Report task completion:');
  console.log(
    '        a2a-report-result taskId="<id>" result="Done! Commit: xxx" success=true'
  );
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

function displayAlreadyCheckedIn(identity: AgentIdentity): void {
  console.log('');
  console.log(`  Already checked in as ${identity.name}`);
  console.log(`     Specialization: ${identity.specialization}`);
  console.log('');
}

// ============================================
// Main Entry Point
// ============================================

export function initA2ACollaboration(): AgentIdentity {
  const existingIdentity = loadIdentity();

  if (existingIdentity?.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < 60 * 60 * 1000) {
      displayAlreadyCheckedIn(existingIdentity);
      return existingIdentity;
    }
  }

  const identity = agentCheckIn();
  const onlineAgents = getOnlineAgents();
  const pendingTasks = checkPendingTasks(identity.agentId);

  displayCheckInBroadcast(identity, onlineAgents, pendingTasks);

  return identity;
}

export function updateSpecialization(newSpecialization: string): AgentIdentity | null {
  const identity = loadIdentity();
  if (!identity) {
    console.log('  No identity found. Please check in first.');
    return null;
  }

  identity.specialization = newSpecialization;
  identity.updatedAt = new Date().toISOString();
  saveIdentity(identity);

  console.log('');
  console.log(`  Specialization updated!`);
  console.log(`     Name: ${identity.name}`);
  console.log(`     New Specialization: ${newSpecialization}`);
  console.log('');

  return identity;
}

export function getCurrentIdentity(): AgentIdentity | null {
  return loadIdentity();
}
