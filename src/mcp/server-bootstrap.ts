#!/usr/bin/env node
/**
 * MCP Server Bootstrap
 *
 * This file MUST be the entry point for the MCP server (not server.ts directly).
 *
 * Problem: ES6 imports are hoisted, so setting environment variables in server.ts
 * happens AFTER modules are loaded and logger is initialized.
 *
 * Solution: This bootstrap file:
 * 1. Sets MCP_SERVER_MODE environment variable FIRST
 * 2. Uses dynamic import() to load server.ts (NOT static import)
 * 3. Dynamic import executes AFTER this code, so env var is set in time
 *
 * CRITICAL: This file must have ZERO static imports except for types.
 */

// ============================================================================
// 🚨 STEP 1: Set MCP_SERVER_MODE before ANY imports
// ============================================================================
process.env.MCP_SERVER_MODE = 'true';

// ============================================================================
// 🚨 STEP 2: Use dynamic import (NOT static import!)
// ============================================================================
async function bootstrap() {
  try {
    // Dynamic import ensures environment variable is set BEFORE module loading
    const { ClaudeCodeBuddyMCPServer } = await import('./server.js');

    // Start server
    const server = new ClaudeCodeBuddyMCPServer();
    await server.start();

    // server.connect() keeps the process alive - no need for infinite promise
  } catch (error) {
    // Use console.error for stdio safety (writes to stderr, not stdout)
    console.error('Fatal error in MCP server bootstrap:', error);
    process.exit(1);
  }
}

// Start bootstrap
bootstrap();
