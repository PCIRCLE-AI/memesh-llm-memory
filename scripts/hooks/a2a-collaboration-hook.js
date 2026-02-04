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
import {
  HOME_DIR,
  STATE_DIR,
  MEMESH_DB_PATH,
  readJSONFile,
  writeJSONFile,
  sqliteQuery,
  sqliteQueryJSON,
  logError,
  ensureDir,
  THRESHOLDS,
} from './hook-utils.js';

// ============================================================================
// Configuration
// ============================================================================

const CCB_DATA_DIR = path.join(HOME_DIR, '.claude-code-buddy');
const AGENT_REGISTRY_PATH = path.join(CCB_DATA_DIR, 'a2a-registry.db');
const AGENT_IDENTITY_FILE = path.join(STATE_DIR, 'agent-identity.json');
const TASK_DB_PATH = path.join(CCB_DATA_DIR, 'a2a-tasks.db');

// Name pool (Greek letters)
const NAME_POOL = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
  'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
  'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron',
  'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon'
];

// ============================================================================
// 1. Agent Check-in System
// ============================================================================

/**
 * Get names currently in use from knowledge graph
 * @returns {string[]} Array of names currently in use
 */
function getUsedNames() {
  if (!fs.existsSync(MEMESH_DB_PATH)) return [];

  const query = "SELECT name FROM entities WHERE type = ? AND name LIKE ?";
  const result = sqliteQuery(MEMESH_DB_PATH, query, ['session_identity', 'Online Agent:%']);

  if (!result) return [];

  return result.split('\n')
    .map(line => line.replace('Online Agent: ', '').replace(/ \(.*\)$/, '').trim())
    .filter(Boolean);
}

/**
 * Get online agents from registry
 * @returns {string[]} Array of active agent IDs
 */
function getOnlineAgents() {
  if (!fs.existsSync(AGENT_REGISTRY_PATH)) return [];

  const query = "SELECT agent_id FROM agents WHERE status = ? ORDER BY last_heartbeat DESC LIMIT 10";
  const result = sqliteQuery(AGENT_REGISTRY_PATH, query, ['active']);

  return result ? result.split('\n').filter(Boolean) : [];
}

/**
 * Pick an available name from the pool using atomic reservation
 *
 * Uses INSERT OR IGNORE to atomically claim a name, preventing race conditions
 * where two agents starting simultaneously could get the same name.
 *
 * @returns {string} Available agent name
 */
function pickAvailableName() {
  const usedNames = getUsedNames();
  const now = new Date().toISOString();

  for (const name of NAME_POOL) {
    if (!usedNames.includes(name)) {
      if (fs.existsSync(MEMESH_DB_PATH)) {
        const entityName = `Online Agent: ${name}`;
        // INSERT OR IGNORE is atomic - prevents race conditions
        sqliteQuery(
          MEMESH_DB_PATH,
          'INSERT OR IGNORE INTO entities (name, type, created_at) VALUES (?, ?, ?)',
          [entityName, 'session_identity', now]
        );

        // Verify we got the name
        const verifyResult = sqliteQuery(
          MEMESH_DB_PATH,
          'SELECT id FROM entities WHERE name = ?',
          [entityName]
        );

        if (verifyResult) {
          return name;
        }
        // Another agent took this name, try next
        continue;
      }
      return name;
    }
  }

  // Fallback: generate unique name if all Greek letters are taken
  return `Agent-${Date.now().toString(36)}`;
}

/**
 * Generate unique agent ID based on hostname and timestamp
 * @returns {string} Unique agent ID
 */
function generateAgentId() {
  const hostname = os.hostname().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  return `${hostname}-${timestamp}`;
}

/**
 * Register agent to Knowledge Graph using atomic operations
 * @param {object} identity - Agent identity object
 * @returns {boolean} True if registration successful
 */
function registerToKnowledgeGraph(identity) {
  if (!fs.existsSync(MEMESH_DB_PATH)) return false;

  const entityName = `Online Agent: ${identity.name}`;
  const now = new Date().toISOString();

  try {
    // Create entity with atomic operation
    sqliteQuery(
      MEMESH_DB_PATH,
      'INSERT OR IGNORE INTO entities (name, type, created_at) VALUES (?, ?, ?)',
      [entityName, 'session_identity', now]
    );

    // Get entity ID for observations
    const entityId = sqliteQuery(
      MEMESH_DB_PATH,
      'SELECT id FROM entities WHERE name = ?',
      [entityName]
    );

    if (entityId && /^\d+$/.test(entityId)) {
      const observations = [
        `Agent ID: ${identity.agentId}`,
        `Name: ${identity.name}`,
        `Status: ONLINE`,
        `Specialization: ${identity.specialization}`,
        `Checked in: ${now}`
      ];

      for (const obs of observations) {
        sqliteQuery(
          MEMESH_DB_PATH,
          'INSERT INTO observations (entity_id, content, created_at) VALUES (?, ?, ?)',
          [entityId, obs, now]
        );
      }
    }

    return true;
  } catch (error) {
    logError('registerToKnowledgeGraph', error);
    return false;
  }
}

/**
 * Load existing agent identity from file
 * @returns {object|null} Agent identity or null
 */
function loadIdentity() {
  return readJSONFile(AGENT_IDENTITY_FILE, null);
}

/**
 * Save agent identity to file
 * @param {object} identity - Agent identity to save
 * @returns {boolean} True if save successful
 */
function saveIdentity(identity) {
  ensureDir(STATE_DIR);
  return writeJSONFile(AGENT_IDENTITY_FILE, identity);
}

/**
 * Check-in and broadcast agent presence
 * @returns {object} Agent identity
 */
export function agentCheckIn() {
  // Check if already checked in within session timeout
  const existingIdentity = loadIdentity();
  if (existingIdentity && existingIdentity.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < THRESHOLDS.A2A_SESSION_TIMEOUT) {
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

// ============================================================================
// 2. Task Reception System
// ============================================================================

/**
 * Check for pending tasks - uses JSON output for robust parsing
 *
 * JSON output mode avoids issues with pipe characters in task descriptions
 * that would corrupt the standard pipe-delimited output format.
 *
 * Note: Currently fetches all SUBMITTED tasks. Agent-specific filtering
 * can be added when task assignment schema includes assignee_id field.
 *
 * @returns {Array<{id: string, description: string, state: string, createdAt: string, senderId: string}>}
 */
export function checkPendingTasks() {
  if (!fs.existsSync(TASK_DB_PATH)) return [];

  try {
    // Use JSON output mode for robust parsing (handles pipe characters in descriptions)
    const tasks = sqliteQueryJSON(
      TASK_DB_PATH,
      "SELECT id, description, state, created_at as createdAt, sender_id as senderId FROM tasks WHERE state = ? ORDER BY created_at DESC LIMIT 10",
      ['SUBMITTED']
    );

    if (!Array.isArray(tasks)) return [];

    return tasks.map((row) => ({
      id: String(row.id || ''),
      description: row.description || '',
      state: row.state || '',
      createdAt: row.createdAt || '',
      senderId: row.senderId || ''
    }));
  } catch (error) {
    logError('checkPendingTasks', error);
    return [];
  }
}

// ============================================================================
// 3. Result Reporting System
// ============================================================================

/**
 * Get latest git commit hash
 * @returns {string|null} Short commit hash or null if not in git repo
 */
export function getLatestCommitHash() {
  try {
    const result = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 5000
    });
    return result.trim();
  } catch (error) {
    logError('getLatestCommitHash', error);
    return null;
  }
}

/**
 * Get latest git commit message
 * @returns {string|null} Commit message or null if not in git repo
 */
export function getLatestCommitMessage() {
  try {
    const result = execFileSync('git', ['log', '-1', '--pretty=%s'], {
      encoding: 'utf-8',
      timeout: 5000
    });
    return result.trim();
  } catch (error) {
    logError('getLatestCommitMessage', error);
    return null;
  }
}

/**
 * Format task completion report
 * @param {string} taskId - Completed task ID
 * @param {string} commitHash - Git commit hash
 * @param {string} commitMessage - Git commit message
 * @returns {object} Formatted completion report
 */
export function formatTaskCompletionReport(taskId, commitHash, commitMessage) {
  return {
    taskId,
    status: 'COMPLETED',
    result: `Task completed!\nCommit: ${commitHash}\nMessage: ${commitMessage}`,
    completedAt: new Date().toISOString()
  };
}

// ============================================================================
// 4. Display Functions
// ============================================================================

/**
 * Display check-in broadcast to console
 * @param {object} identity - Agent identity
 * @param {string[]} onlineAgents - List of online agent IDs
 * @param {Array} pendingTasks - List of pending tasks
 */
function displayCheckInBroadcast(identity, onlineAgents, pendingTasks) {
  console.log('');
  console.log('='.repeat(60));
  console.log('  🤖 MeMesh A2A Collaboration System');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  BROADCAST: ${identity.name} is now online!`);
  console.log('');
  console.log(`     Name: ${identity.name}`);
  console.log(`     Agent ID: ${identity.agentId}`);
  console.log(`     Specialization: ${identity.specialization}`);
  console.log(`     Checked in: ${new Date().toLocaleString()}`);
  console.log('');

  // Show other online agents
  const otherAgents = onlineAgents.filter(a => a !== identity.agentId);
  if (otherAgents.length > 0) {
    console.log('  Other online agents:');
    otherAgents.slice(0, 5).forEach(agent => {
      console.log(`     - ${agent}`);
    });
    console.log('');
  }

  // Show pending tasks
  if (pendingTasks.length > 0) {
    console.log('  📋 Pending tasks for you:');
    pendingTasks.slice(0, 3).forEach((task, i) => {
      console.log(`     ${i + 1}. [${task.state}] ${task.description?.slice(0, 50)}...`);
      console.log(`        From: ${task.senderId} | ID: ${task.id}`);
    });
    console.log('');
    console.log('  Use a2a-list-tasks to see all tasks');
    console.log('');
  }

  // Show available actions
  console.log('  Available A2A Actions:');
  console.log('');
  console.log('     Assign specialization:');
  console.log(`        "${identity.name}, you handle frontend" or "${identity.name}, you handle backend API"`);
  console.log('');
  console.log('     Send task to another agent:');
  console.log('        a2a-send-task targetAgentId="<agent>" taskDescription="..."');
  console.log('');
  console.log('     Check your tasks:');
  console.log('        a2a-list-tasks');
  console.log('');
  console.log('     Report task completion:');
  console.log('        a2a-report-result taskId="<id>" result="Done! Commit: xxx" success=true');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

/**
 * Display already checked in message
 * @param {object} identity - Agent identity
 */
function displayAlreadyCheckedIn(identity) {
  console.log('');
  console.log(`  Already checked in as ${identity.name}`);
  console.log(`     Specialization: ${identity.specialization}`);
  console.log('');
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main A2A collaboration initialization
 * Called on session start to register agent and check for tasks
 * @returns {object} Agent identity
 */
export function initA2ACollaboration() {
  // Check if already checked in within session timeout
  const existingIdentity = loadIdentity();

  if (existingIdentity && existingIdentity.sessionStart) {
    const sessionAge = Date.now() - new Date(existingIdentity.sessionStart).getTime();
    if (sessionAge < THRESHOLDS.A2A_SESSION_TIMEOUT) {
      displayAlreadyCheckedIn(existingIdentity);
      return existingIdentity;
    }
  }

  // New check-in
  const identity = agentCheckIn();
  const onlineAgents = getOnlineAgents();
  const pendingTasks = checkPendingTasks();

  displayCheckInBroadcast(identity, onlineAgents, pendingTasks);

  return identity;
}

/**
 * Update agent specialization
 * @param {string} newSpecialization - New specialization description
 * @returns {object|null} Updated identity or null if no identity found
 */
export function updateSpecialization(newSpecialization) {
  const identity = loadIdentity();
  if (!identity) {
    console.log('  No identity found. Please check in first.');
    return null;
  }

  identity.specialization = newSpecialization;
  identity.updatedAt = new Date().toISOString();
  saveIdentity(identity);

  console.log('');
  console.log(`  🧠 MeMesh: Specialization updated!`);
  console.log(`     Name: ${identity.name}`);
  console.log(`     New Specialization: ${newSpecialization}`);
  console.log('');

  return identity;
}

/**
 * Get current agent identity
 * @returns {object|null} Current identity or null
 */
export function getCurrentIdentity() {
  return loadIdentity();
}

// ============================================================================
// Standalone Execution
// ============================================================================

// Check if this file is being run directly (not imported)
const isMainModule = (() => {
  if (!process.argv[1]) return false;
  const scriptPath = path.resolve(process.argv[1]);
  const thisFile = path.resolve(new URL(import.meta.url).pathname);
  return scriptPath === thisFile;
})();

if (isMainModule) {
  initA2ACollaboration();
}
