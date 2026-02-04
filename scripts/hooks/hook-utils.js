#!/usr/bin/env node

/**
 * Hook Utilities - Shared functions for Claude Code hooks
 *
 * This module provides common utilities used across all hooks:
 * - File I/O (JSON read/write)
 * - SQLite queries with SQL injection protection
 * - Path constants
 * - Time utilities
 *
 * All hooks should import from this module to avoid code duplication.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// ============================================================================
// Constants
// ============================================================================

/** Home directory with fallback */
export const HOME_DIR = process.env.HOME || os.homedir();

/** State directory for hook data */
export const STATE_DIR = path.join(HOME_DIR, '.claude', 'state');

/** MeMesh knowledge graph database path */
export const MEMESH_DB_PATH = path.join(HOME_DIR, '.claude-code-buddy', 'knowledge-graph.db');

/** A2A collaboration database path */
export const A2A_DB_PATH = path.join(HOME_DIR, '.claude-code-buddy', 'a2a-collaboration.db');

/** Hook error log file */
export const ERROR_LOG_PATH = path.join(STATE_DIR, 'hook-errors.log');

/** Memory saves log file */
export const MEMORY_LOG_PATH = path.join(STATE_DIR, 'memory-saves.log');

// Time constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
};

// Threshold constants
export const THRESHOLDS = {
  /** Token threshold for auto-saving key points */
  TOKEN_SAVE: 250_000,
  /** Days to retain session key points */
  RETENTION_DAYS: 30,
  /** Days to recall key points on session start */
  RECALL_DAYS: 30,
  /** Slow execution threshold (ms) */
  SLOW_EXECUTION: 5000,
  /** High token usage threshold */
  HIGH_TOKENS: 10_000,
  /** Quota warning percentage */
  QUOTA_WARNING: 0.8,
  /** Heartbeat validity duration (ms) */
  HEARTBEAT_VALIDITY: 5 * 60 * 1000,
  /** A2A session timeout (ms) */
  A2A_SESSION_TIMEOUT: 60 * 60 * 1000,
  /** Maximum number of archived sessions to keep */
  MAX_ARCHIVED_SESSIONS: 30,
};

// ============================================================================
// File I/O Utilities
// ============================================================================

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure exists
 */
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read JSON file with error handling
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Default value if file doesn't exist or is invalid
 * @returns {*} Parsed JSON or default value
 */
export function readJSONFile(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    logError(`Read error ${path.basename(filePath)}`, error);
  }
  return defaultValue;
}

/**
 * Write JSON file with error handling
 * @param {string} filePath - Path to JSON file
 * @param {*} data - Data to write
 * @returns {boolean} True if successful
 */
export function writeJSONFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    logError(`Write error ${path.basename(filePath)}`, error);
    return false;
  }
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Log error to error log file (silent - no console output)
 * @param {string} context - Error context description
 * @param {Error|string} error - Error object or message
 */
export function logError(context, error) {
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${context}: ${message}\n`;

  try {
    ensureDir(STATE_DIR);
    fs.appendFileSync(ERROR_LOG_PATH, logLine);
  } catch {
    // Silent fail - can't log the logging error
  }
}

/**
 * Log memory save event
 * @param {string} message - Log message
 */
export function logMemorySave(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;

  try {
    ensureDir(STATE_DIR);
    fs.appendFileSync(MEMORY_LOG_PATH, logLine);
  } catch {
    // Silent fail
  }
}

// ============================================================================
// SQLite Utilities (SQL Injection Safe)
// ============================================================================

/**
 * Escape a value for safe SQL string interpolation
 * @param {*} value - Value to escape
 * @returns {string} Escaped SQL string literal
 */
export function escapeSQL(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  // Escape single quotes by doubling them
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Execute SQLite query with parameterized values (SQL injection safe)
 *
 * Uses placeholder replacement for safe parameter binding.
 * Parameters are escaped by doubling single quotes.
 *
 * @param {string} dbPath - Path to SQLite database
 * @param {string} query - SQL query with ? placeholders
 * @param {Array} params - Parameter values to substitute
 * @param {Object} options - Query options
 * @param {number} options.timeout - Timeout in ms (default: 5000)
 * @param {boolean} options.json - Use JSON output mode (default: false)
 * @returns {string} Query result as string
 *
 * @example
 * // Basic query
 * sqliteQuery(dbPath, 'SELECT * FROM users WHERE id = ?', [userId]);
 *
 * // JSON output mode
 * sqliteQuery(dbPath, 'SELECT * FROM users', [], { json: true });
 */
export function sqliteQuery(dbPath, query, params = [], options = {}) {
  const { timeout = 5000, json = false } = options;

  try {
    let finalQuery = query;

    // Replace ? placeholders with escaped values
    if (params.length > 0) {
      let paramIndex = 0;
      finalQuery = query.replace(/\?/g, () => {
        if (paramIndex < params.length) {
          return escapeSQL(params[paramIndex++]);
        }
        return '?';
      });
    }

    const args = json ? ['-json', dbPath, finalQuery] : [dbPath, finalQuery];

    const result = execFileSync('sqlite3', args, {
      encoding: 'utf-8',
      timeout,
    });
    return result.trim();
  } catch (error) {
    logError('sqliteQuery', error);
    return '';
  }
}

/**
 * Execute SQLite query and parse JSON result
 *
 * @param {string} dbPath - Path to SQLite database
 * @param {string} query - SQL query with ? placeholders
 * @param {Array} params - Parameter values to substitute
 * @param {Object} options - Query options
 * @returns {Array} Parsed JSON array or empty array on error
 */
export function sqliteQueryJSON(dbPath, query, params = [], options = {}) {
  const result = sqliteQuery(dbPath, query, params, { ...options, json: true });

  if (!result) {
    return [];
  }

  try {
    return JSON.parse(result);
  } catch (error) {
    logError('sqliteQueryJSON parse', error);
    return [];
  }
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Get human-readable time ago string
 * @param {Date} date - Date to compare
 * @returns {string} Human-readable time difference
 */
export function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / TIME.MINUTE);
  const diffHours = Math.floor(diffMs / TIME.HOUR);
  const diffDays = Math.floor(diffMs / TIME.DAY);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Calculate duration string from start time
 * @param {string} startTime - ISO timestamp string
 * @returns {string} Duration string (e.g., "5m 30s")
 */
export function calculateDuration(startTime) {
  const start = new Date(startTime);
  const end = new Date();
  const durationMs = end - start;
  const minutes = Math.floor(durationMs / TIME.MINUTE);
  const seconds = Math.floor((durationMs % TIME.MINUTE) / TIME.SECOND);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Get ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object (default: now)
 * @returns {string} Date string
 */
export function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// Stdin Utilities
// ============================================================================

/**
 * Read stdin with timeout protection
 * Properly removes event listeners to prevent memory leaks
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} Stdin content
 */
export function readStdin(timeout = 3000) {
  return new Promise((resolve, reject) => {
    let data = '';

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.removeListener('end', onEnd);
      process.stdin.removeListener('error', onError);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Stdin read timeout'));
    }, timeout);

    const onData = (chunk) => {
      data += chunk;
    };

    const onEnd = () => {
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    const onError = (err) => {
      clearTimeout(timer);
      cleanup();
      reject(err);
    };

    process.stdin.on('data', onData);
    process.stdin.on('end', onEnd);
    process.stdin.on('error', onError);
  });
}

// Ensure state directory exists on module load
ensureDir(STATE_DIR);
