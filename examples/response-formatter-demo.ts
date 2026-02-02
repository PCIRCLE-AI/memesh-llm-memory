#!/usr/bin/env ts-node
/**
 * Response Formatter Demo
 *
 * Demonstrates the enhanced visual hierarchy and formatting improvements
 * Run: tsx examples/response-formatter-demo.ts
 */

import { ResponseFormatter } from '../src/ui/ResponseFormatter.js';

const formatter = new ResponseFormatter();

console.log('\n' + '='.repeat(80));
console.log('Response Formatter V2 Demo - Visual Hierarchy Enhancement');
console.log('='.repeat(80) + '\n');

// Example 1: Success Response (buddy-do)
console.log('\n📝 Example 1: Success Response (buddy-do)\n');
console.log(formatter.format({
  agentType: 'buddy-do',
  taskDescription: 'Setup user authentication with JWT',
  status: 'success',
  results: {
    routing: {
      approved: true,
      message: 'Task routed for capabilities: backend-dev, security',
      capabilityFocus: ['backend-dev', 'security'],
      complexity: 'medium',
      estimatedTokens: 2500,
      estimatedCost: 0.015,
    },
    stats: {
      durationMs: 2345,
      estimatedTokens: 2500,
    },
  },
  metadata: {
    duration: 2345,
    tokensUsed: 2500,
    model: 'claude-sonnet-4.5',
  },
}));

// Example 2: Error Response
console.log('\n\n📝 Example 2: Error Response\n');
const testError = new Error('Failed to connect to database');
testError.stack = `Error: Failed to connect to database
    at DatabaseManager.connect (/src/db/manager.ts:45:15)
    at ProjectMemoryManager.initialize (/src/memory/ProjectMemoryManager.ts:89:23)
    at ClaudeCodeBuddyMCPServer.start (/src/mcp/server.ts:156:12)`;

console.log(formatter.format({
  agentType: 'buddy-remember',
  taskDescription: 'Search project memory for "authentication patterns"',
  status: 'error',
  error: testError,
  metadata: {
    duration: 125,
    model: 'claude-sonnet-4.5',
  },
}));

// Example 3: Success with No Results (buddy-remember)
console.log('\n\n📝 Example 3: Success with No Results (buddy-remember)\n');
console.log(formatter.format({
  agentType: 'buddy-remember',
  taskDescription: 'Search project memory for "microservices architecture"',
  status: 'success',
  results: {
    query: 'microservices architecture',
    count: 0,
    suggestions: [
      'Try a broader search term',
      'Check if memories were stored for this topic',
      'Use different keywords',
    ],
  },
  metadata: {
    duration: 89,
    tokensUsed: 150,
    model: 'claude-sonnet-4.5',
  },
}));

// Example 4: Success with Results (buddy-remember)
console.log('\n\n📝 Example 4: Success with Results (buddy-remember)\n');
console.log(formatter.format({
  agentType: 'buddy-remember',
  taskDescription: 'Search project memory for "api design decisions"',
  status: 'success',
  results: {
    query: 'api design decisions',
    count: 3,
    memories: [
      {
        id: 1,
        type: 'decision',
        content: 'Decided to use REST API over GraphQL due to team familiarity',
        timestamp: '2026-01-15',
      },
      {
        id: 2,
        type: 'pattern',
        content: 'All API endpoints use consistent error response format',
        timestamp: '2026-01-20',
      },
      {
        id: 3,
        type: 'lesson',
        content: 'Versioning strategy: Use URL path versioning (e.g., /v1/users)',
        timestamp: '2026-01-28',
      },
    ],
  },
  metadata: {
    duration: 234,
    tokensUsed: 450,
    model: 'claude-sonnet-4.5',
  },
}));

// Example 5: Enhanced Prompt (Prompt Enhancement Mode)
console.log('\n\n📝 Example 5: Enhanced Prompt Response\n');
console.log(formatter.format({
  agentType: 'buddy-do',
  taskDescription: 'Refactor user service with dependency injection',
  status: 'success',
  enhancedPrompt: {
    systemPrompt: 'You are an expert backend developer specializing in clean architecture and SOLID principles. Focus on maintainability, testability, and scalability.',
    userPrompt: 'Refactor the user service to use dependency injection. The service currently has tight coupling to the database layer. Extract interfaces for all dependencies and use constructor injection.',
    suggestedModel: 'claude-opus-4.5',
    metadata: {
      guardrails: 'CRITICAL: Do not modify the public API contract. Ensure all existing tests pass after refactoring.',
    },
  },
  results: {
    routing: {
      approved: true,
      message: 'Task routed to architecture-specialist',
      complexity: 'high',
      estimatedTokens: 8000,
    },
  },
  metadata: {
    duration: 3456,
    tokensUsed: 8234,
    model: 'claude-opus-4.5',
  },
}));

// Example 6: Simple Response (should use simplified format)
console.log('\n\n📝 Example 6: Simple Response\n');
console.log(formatter.format({
  agentType: 'buddy-help',
  taskDescription: 'Show help for buddy-do command',
  status: 'success',
  results: 'Help text displayed successfully',
  metadata: {
    duration: 12,
  },
}));

// Example 7: Medium Complexity Response
console.log('\n\n📝 Example 7: Medium Complexity Response\n');
console.log(formatter.format({
  agentType: 'buddy-do',
  taskDescription: 'Add logging to API endpoints',
  status: 'success',
  results: {
    message: 'Logging added to 12 API endpoints',
    endpoints: ['POST /users', 'GET /users/:id', 'PUT /users/:id', 'DELETE /users/:id'],
    logLevel: 'info',
  },
  metadata: {
    duration: 567,
    tokensUsed: 890,
  },
}));

console.log('\n' + '='.repeat(80));
console.log('Demo Complete! Check the visual hierarchy and scannability above.');
console.log('='.repeat(80) + '\n');
