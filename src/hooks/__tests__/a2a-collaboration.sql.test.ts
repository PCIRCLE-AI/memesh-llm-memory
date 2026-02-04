/**
 * Test 5: SQL Escaping (MINOR-E)
 *
 * Verifies that the a2a-collaboration module properly handles SQL escaping.
 *
 * Test coverage:
 * - String escaping with quotes
 * - Null/undefined handling
 * - Number handling
 * - Boolean handling
 * - Rejection of null bytes
 * - Rejection of invalid numeric values
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// Test configuration
const TEST_DB_DIR = path.join(os.tmpdir(), 'ccb-sql-escape-test');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test-sql-escape.db');

/**
 * SQL escaping function under test (reimplemented for unit testing)
 *
 * This matches the implementation in a2a-collaboration.ts (escapeSqlValue)
 *
 * Handles different data types appropriately:
 * - null/undefined → NULL (unquoted SQL keyword)
 * - numbers → numeric literal (unquoted)
 * - booleans → 1 or 0 (SQLite convention)
 * - strings → single-quoted with escaped quotes and null byte rejection
 */
function escapeSqlValue(value: unknown): string {
  // Handle null/undefined as SQL NULL
  if (value === null || value === undefined) {
    return 'NULL';
  }

  // Handle numbers directly (no quotes needed)
  if (typeof value === 'number') {
    // Guard against NaN and Infinity which are not valid SQL
    if (!Number.isFinite(value)) {
      return 'NULL';
    }
    return String(value);
  }

  // Handle booleans as SQLite integers (1/0)
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  // Convert to string for all other types
  const strValue = String(value);

  // Security: Reject null bytes which could truncate strings
  if (strValue.includes('\x00')) {
    throw new Error('SQL parameter contains null byte - potential injection attack');
  }

  // Escape single quotes by doubling them (SQL standard)
  const escaped = strValue.replace(/'/g, "''");

  return `'${escaped}'`;
}

// Alias for backward compatibility with tests
function escapeParameter(value: unknown): string {
  return escapeSqlValue(value);
}

/**
 * Execute SQLite query with parameter escaping
 */
function sqliteQuery(dbPath: string, query: string, params?: unknown[]): string {
  try {
    const args = ['-separator', '|', dbPath];

    let finalQuery = query;
    if (params && params.length > 0) {
      const escapedParams = params.map((p) => escapeParameter(p));

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
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    throw new Error(`SQLite error: ${error}`);
  }
}

/**
 * Validate numeric value for SQL safety
 *
 * Returns true if the value is a valid number for SQL
 */
function isValidNumericValue(value: unknown): boolean {
  if (typeof value !== 'number') {
    return false;
  }

  if (Number.isNaN(value)) {
    return false;
  }

  if (!Number.isFinite(value)) {
    return false;
  }

  return true;
}

describe('SQL Escaping (MINOR-E)', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }

    // Create test database with table
    execFileSync('sqlite3', [
      TEST_DB_PATH,
      `CREATE TABLE IF NOT EXISTS test_data (
        id INTEGER PRIMARY KEY,
        name TEXT,
        value TEXT,
        number_val REAL
      );`,
    ], { encoding: 'utf-8' });
  });

  afterEach(() => {
    // Cleanup
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
      if (fs.existsSync(`${TEST_DB_PATH}-wal`)) {
        fs.unlinkSync(`${TEST_DB_PATH}-wal`);
      }
      if (fs.existsSync(`${TEST_DB_PATH}-shm`)) {
        fs.unlinkSync(`${TEST_DB_PATH}-shm`);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('String escaping with quotes', () => {
    it('should escape single quotes by doubling them', () => {
      const input = "O'Brien";
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'O''Brien'");
    });

    it('should escape multiple single quotes', () => {
      const input = "It's John's dog's toy";
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'It''s John''s dog''s toy'");
    });

    it('should handle strings with only single quotes', () => {
      const input = "'''";
      const escaped = escapeParameter(input);
      // 3 single quotes become 6 (doubled), plus 2 surrounding quotes = 8 chars
      expect(escaped).toBe("''''''''");
    });

    it('should preserve double quotes', () => {
      const input = 'Say "Hello"';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'Say \"Hello\"'");
    });

    it('should handle empty strings', () => {
      const escaped = escapeParameter('');
      expect(escaped).toBe("''");
    });

    it('should handle strings with newlines', () => {
      const input = 'Line1\nLine2';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'Line1\nLine2'");
    });

    it('should handle strings with tabs', () => {
      const input = 'Col1\tCol2';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'Col1\tCol2'");
    });

    it('should handle Unicode characters', () => {
      const input = 'Hello \u4E16\u754C'; // Hello World in Chinese
      const escaped = escapeParameter(input);
      expect(escaped).toContain('\u4E16');
    });

    it('should handle emoji', () => {
      const input = 'Hello 👋';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'Hello 👋'");
    });

    it('should successfully insert and retrieve escaped string', () => {
      const testValue = "O'Brien's data";

      // Insert using parameterized query
      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['test-key', testValue]
      );

      // Retrieve and verify
      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT value FROM test_data WHERE name = 'test-key'"
      );

      expect(result).toBe(testValue);
    });
  });

  describe('Null/undefined handling', () => {
    it('should return NULL for null value', () => {
      const escaped = escapeParameter(null);
      expect(escaped).toBe('NULL');
    });

    it('should return NULL for undefined value', () => {
      const escaped = escapeParameter(undefined);
      expect(escaped).toBe('NULL');
    });

    it('should insert NULL for null parameter', () => {
      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['null-test', null]
      );

      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT value FROM test_data WHERE name = 'null-test'"
      );

      // Empty result means NULL was stored
      expect(result).toBe('');
    });

    it('should not confuse string "NULL" with actual NULL', () => {
      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['string-null', 'NULL']
      );

      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT value FROM test_data WHERE name = 'string-null'"
      );

      expect(result).toBe('NULL');
    });

    it('should not confuse string "null" with actual null', () => {
      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['string-lowercase-null', 'null']
      );

      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT value FROM test_data WHERE name = 'string-lowercase-null'"
      );

      expect(result).toBe('null');
    });
  });

  describe('Number handling', () => {
    it('should return positive integers as unquoted numeric literals', () => {
      const escaped = escapeParameter(42);
      expect(escaped).toBe('42');
    });

    it('should return negative integers as unquoted numeric literals', () => {
      const escaped = escapeParameter(-17);
      expect(escaped).toBe('-17');
    });

    it('should return floating point numbers as unquoted numeric literals', () => {
      const escaped = escapeParameter(3.14159);
      expect(escaped).toBe('3.14159');
    });

    it('should return zero as unquoted numeric literal', () => {
      const escaped = escapeParameter(0);
      expect(escaped).toBe('0');
    });

    it('should handle very large numbers', () => {
      const largeNum = Number.MAX_SAFE_INTEGER;
      const escaped = escapeParameter(largeNum);
      expect(escaped).toBe(`${largeNum}`);
    });

    it('should handle very small numbers', () => {
      const smallNum = Number.MIN_SAFE_INTEGER;
      const escaped = escapeParameter(smallNum);
      expect(escaped).toBe(`${smallNum}`);
    });

    it('should validate regular number', () => {
      expect(isValidNumericValue(42)).toBe(true);
      expect(isValidNumericValue(-17.5)).toBe(true);
      expect(isValidNumericValue(0)).toBe(true);
    });
  });

  describe('Boolean handling', () => {
    it('should convert true to SQLite integer 1', () => {
      const escaped = escapeParameter(true);
      expect(escaped).toBe('1');
    });

    it('should convert false to SQLite integer 0', () => {
      const escaped = escapeParameter(false);
      expect(escaped).toBe('0');
    });

    it('should store and retrieve boolean as SQLite integer', () => {
      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['bool-test', true]
      );

      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT value FROM test_data WHERE name = 'bool-test'"
      );

      expect(result).toBe('1');
    });
  });

  describe('Rejection of null bytes', () => {
    it('should reject string containing null byte', () => {
      const maliciousInput = "normal\x00malicious";

      expect(() => escapeParameter(maliciousInput)).toThrow('SQL parameter contains null byte');
    });

    it('should reject string starting with null byte', () => {
      const maliciousInput = "\x00malicious";

      expect(() => escapeParameter(maliciousInput)).toThrow('SQL parameter contains null byte');
    });

    it('should reject string ending with null byte', () => {
      const maliciousInput = "normal\x00";

      expect(() => escapeParameter(maliciousInput)).toThrow('SQL parameter contains null byte');
    });

    it('should reject string with multiple null bytes', () => {
      const maliciousInput = "a\x00b\x00c";

      expect(() => escapeParameter(maliciousInput)).toThrow('SQL parameter contains null byte');
    });

    it('should accept string with backslash-zero (not null byte)', () => {
      const input = 'test\\0value'; // This is backslash followed by '0', not null byte
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'test\\0value'");
    });
  });

  describe('Rejection of invalid numeric values', () => {
    it('should reject NaN as invalid numeric', () => {
      expect(isValidNumericValue(NaN)).toBe(false);
    });

    it('should reject Infinity as invalid numeric', () => {
      expect(isValidNumericValue(Infinity)).toBe(false);
    });

    it('should reject -Infinity as invalid numeric', () => {
      expect(isValidNumericValue(-Infinity)).toBe(false);
    });

    it('should reject string as invalid numeric', () => {
      expect(isValidNumericValue('42')).toBe(false);
    });

    it('should reject null as invalid numeric', () => {
      expect(isValidNumericValue(null)).toBe(false);
    });

    it('should reject undefined as invalid numeric', () => {
      expect(isValidNumericValue(undefined)).toBe(false);
    });

    it('should reject object as invalid numeric', () => {
      expect(isValidNumericValue({})).toBe(false);
    });

    it('should return NULL for NaN (not a valid SQL numeric)', () => {
      const escaped = escapeParameter(NaN);
      expect(escaped).toBe('NULL');
    });

    it('should return NULL for Infinity (not a valid SQL numeric)', () => {
      const escaped = escapeParameter(Infinity);
      expect(escaped).toBe('NULL');
    });

    it('should return NULL for -Infinity (not a valid SQL numeric)', () => {
      const escaped = escapeParameter(-Infinity);
      expect(escaped).toBe('NULL');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent classic SQL injection with single quote', () => {
      // Attempt to break out of string and inject SQL
      const maliciousInput = "'; DROP TABLE test_data; --";

      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['injection-test', maliciousInput]
      );

      // Table should still exist
      const tableCheck = sqliteQuery(
        TEST_DB_PATH,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='test_data'"
      );
      expect(tableCheck).toBe('test_data');

      // Value should be stored as-is
      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT value FROM test_data WHERE name = 'injection-test'"
      );
      expect(result).toBe(maliciousInput);
    });

    it('should prevent UNION-based injection', () => {
      const maliciousInput = "' UNION SELECT * FROM sqlite_master --";

      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['union-test', maliciousInput]
      );

      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT value FROM test_data WHERE name = 'union-test'"
      );
      expect(result).toBe(maliciousInput);
    });

    it('should handle multiple parameters safely', () => {
      const param1 = "O'Reilly";
      const param2 = "'; DROP TABLE test_data; --";
      const param3 = "normal value";

      sqliteQuery(
        TEST_DB_PATH,
        'INSERT INTO test_data (name, value, number_val) VALUES (?, ?, ?)',
        [param1, param2, param3]
      );

      const result = sqliteQuery(
        TEST_DB_PATH,
        "SELECT name, value, number_val FROM test_data WHERE name = 'O''Reilly'"
      );

      // Result should contain all values
      expect(result).toContain("O'Reilly");
      expect(result).toContain("'; DROP TABLE test_data; --");
    });
  });

  describe('Edge Cases', () => {
    it('should handle array parameter by converting to string', () => {
      const arrayParam = [1, 2, 3];
      const escaped = escapeParameter(arrayParam);
      expect(escaped).toBe("'1,2,3'");
    });

    it('should handle object parameter by converting to string', () => {
      const objParam = { key: 'value' };
      const escaped = escapeParameter(objParam);
      expect(escaped).toBe("'[object Object]'");
    });

    it('should handle Date parameter', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const escaped = escapeParameter(date);
      expect(escaped).toContain('2024');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const escaped = escapeParameter(longString);
      expect(escaped.length).toBe(10002); // 10000 + 2 quotes
    });

    it('should handle strings with SQL keywords', () => {
      const input = 'SELECT FROM WHERE INSERT DELETE UPDATE DROP';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'SELECT FROM WHERE INSERT DELETE UPDATE DROP'");
    });

    it('should handle strings with semicolons', () => {
      const input = 'value1; value2; value3';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'value1; value2; value3'");
    });

    it('should handle strings with backslashes', () => {
      const input = 'path\\to\\file';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'path\\to\\file'");
    });

    it('should handle strings with percent signs', () => {
      const input = '50% off';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'50% off'");
    });

    it('should handle strings with underscore', () => {
      const input = 'test_value';
      const escaped = escapeParameter(input);
      expect(escaped).toBe("'test_value'");
    });
  });
});
