#!/usr/bin/env node

/**
 * A2A Collaboration Hook
 *
 * Complete multi-agent collaboration system for Claude Code sessions:
 * 1. Agent Check-in - Auto name + broadcast on session start
 * 2. Task Reception - Check for pending tasks assigned to this agent
 * 3. Task Execution - Handle assigned tasks
 * 4. Result Reporting - Report completion with commit hash
 *
 * Usage: Import in session-start.js or run standalone
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// ============================================
// Configuration
// ============================================

const CCB_DATA_DIR = path.join(process.env.HOME, '.claude-code-buddy');
const KG_DB_PATH = path.join(CCB_DATA_DIR, 'knowledge-graph.db');
const AGENT_REGISTRY_PATH = path.join(CCB_DATA_DIR, 'a2a-registry.db');
const STATE_DIR = path.join(process.env.HOME, '.claude', 'state');
const AGENT_IDENTITY_FILE = path.join(STATE_DIR, 'agent-identity.json');
const PENDING_TASKS_FILE = path.join(STATE_DIR, 'pending-tasks.json');

// Name pool (Greek letters)
const NAME_POOL = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
  'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
  'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron',
  'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon'
];

// ============================================
// Utility Functions
// ============================================

/**
 * Execute SQLite query safely
 */
function sqliteQuery(dbPath, query) {
  try {
    const result = execFileSync('sqlite3', [dbPath, query], {
      encoding: 'utf-8',
      timeout: 5000
    });
    return result.trim();
  } catch (error) {
    return '';
  }
}

/**
 * Read JSON file safely
 */
function readJSON(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    // Ignore errors
  }
  return defaultValue;
}

/**
 * Write JSON file safely
 */
function writeJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
// 1. Agent Check-in System
// ============================================

/**
 * Get names currently in use
 */
function getUsedNames() {
  if (!fs.existsSync(KG_DB_PATH)) return [];

  const query = "SELECT name FROM entities WHERE type='session_identity' AND name LIKE 'Online Agent:%'";
  const result = sqliteQuery(KG_DB_PATH, query);

  if (!result) return [];

  return result.split('\n')
    .map(line => line.replace('Online Agent: ', '').replace(/ \(.*\)$/, '').trim())
    .filter(Boolean);
}

/**
 * Get online agents from registry
 */
function getOnlineAgents() {
  if (!fs.existsSync(AGENT_REGISTRY_PATH)) return [];

  const query = "SELECT agent_id FROM agents WHERE status='active' ORDER BY last_heartbeat DESC LIMIT 10";
  const result = sqliteQuery(AGENT_REGISTRY_PATH, query);

  return result ? result.split('\n').filter(Boolean) : [];
}

/**
 * Pick an available name
 */
function pickAvailableName() {
  const usedNames = getUsedNames();

  for (const name of NAME_POOL) {
    if (!usedNames.includes(name)) {
      return name;
    }
  }

  return `Agent-${Date.now().toString().slice(-5)}`;
}

/**
 * Generate agent ID
 */
function generateAgentId() {
  const hostname = os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  return `${hostname}-${timestamp}`;
}

/**
 * Register to Knowledge Graph
 */
function registerToKnowledgeGraph(identity) {
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
          `Checked in: ${now}`
        ];

        for (const obs of observations) {
          const safeObs = obs.replace(/'/g, "''");
          sqliteQuery(KG_DB_PATH, `INSERT INTO observations (entity_id, content, created_at) VALUES (${entityId}, '${safeObs}', '${now}')`);
        }
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load existing identity
 */
function loadIdentity() {
  return readJSON(AGENT_IDENTITY_FILE);
}

/**
 * Save identity
 */
function saveIdentity(identity) {
  return writeJSON(AGENT_IDENTITY_FILE, identity);
}

/**
 * Check-in and broadcast
 */
export function agentCheckIn() {
  // Check if already checked in
  const existingIdentity = loadIdentity();
  if (existingIdentity && existingIdentity.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < 60 * 60 * 1000) {
      return existingIdentity;
    }
  }

  const name = pickAvailableName();
  const agentId = generateAgentId();

  const identity = {
    name,
    agentId,
    specialization: 'General (awaiting assignment)',
    sessionStart: new Date().toISOString(),
    status: 'ONLINE'
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
 */
export function checkPendingTasks(agentId) {
  if (!fs.existsSync(AGENT_REGISTRY_PATH)) return [];

  // Query tasks from A2A task queue
  const taskDbPath = path.join(CCB_DATA_DIR, 'a2a-tasks.db');
  if (!fs.existsSync(taskDbPath)) return [];

  const query = `SELECT id, description, state, created_at, sender_id FROM tasks WHERE state='SUBMITTED' ORDER BY created_at DESC LIMIT 10`;
  const result = sqliteQuery(taskDbPath, query);

  if (!result) return [];

  return result.split('\n').filter(Boolean).map(line => {
    const [id, description, state, createdAt, senderId] = line.split('|');
    return { id, description, state, createdAt, senderId };
  });
}

// ============================================
// 3. Result Reporting System
// ============================================

/**
 * Get latest commit hash
 */
export function getLatestCommitHash() {
  try {
    const result = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 5000
    });
    return result.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get latest commit message
 */
export function getLatestCommitMessage() {
  try {
    const result = execFileSync('git', ['log', '-1', '--pretty=%s'], {
      encoding: 'utf-8',
      timeout: 5000
    });
    return result.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Format task completion report
 */
export function formatTaskCompletionReport(taskId, commitHash, commitMessage) {
  return {
    taskId,
    status: 'COMPLETED',
    result: `✅ Task completed!\nCommit: ${commitHash}\nMessage: ${commitMessage}`,
    completedAt: new Date().toISOString()
  };
}

// ============================================
// 4. Display Functions
// ============================================

/**
 * Display check-in broadcast
 */
function displayCheckInBroadcast(identity, onlineAgents, pendingTasks) {
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
  const otherAgents = onlineAgents.filter(a => a !== identity.agentId);
  if (otherAgents.length > 0) {
    console.log('  📋 Other online agents:');
    otherAgents.slice(0, 5).forEach(agent => {
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
 */
function displayAlreadyCheckedIn(identity) {
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
 */
export function initA2ACollaboration() {
  // Check if already checked in
  const existingIdentity = loadIdentity();

  if (existingIdentity && existingIdentity.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < 60 * 60 * 1000) {
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
 */
export function updateSpecialization(newSpecialization) {
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
 * Get current identity
 */
export function getCurrentIdentity() {
  return loadIdentity();
}

// Run if executed directly
const isMainModule = process.argv[1] &&
  (process.argv[1].endsWith('a2a-collaboration-hook.js') ||
   process.argv[1].endsWith('a2a-collaboration-hook'));

if (isMainModule) {
  initA2ACollaboration();
}
