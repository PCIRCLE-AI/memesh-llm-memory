/**
 * Design Tokens for MeMesh UI System
 *
 * Provides semantic naming and icons for operations, consistent with
 * the MeMesh rebranding and minimal UI design principles.
 */

/**
 * Operation Display Names
 * Maps internal operation names to user-friendly display names
 */
export const operationDisplayNames: Record<string, string> = {
  // MeMesh core operations
  'memesh-remember': 'Memory Search',
  'memesh-do': 'Task Router',
  'memesh-help': 'Help Center',

  // Knowledge operations
  'create-entities': 'Knowledge Storage',
  'update-entities': 'Knowledge Update',
  'delete-entities': 'Knowledge Deletion',
  'search-nodes': 'Knowledge Search',

  // Agent-to-Agent operations
  'a2a-send-task': 'Agent Communication',
  'a2a-discover-agents': 'Agent Discovery',
  'a2a-query-status': 'Status Check',
  'a2a-list-tasks': 'Task List',
  'a2a-list-agents': 'Agent Registry',

  // Legacy buddy-* aliases (deprecated)
  'buddy-remember': 'Memory Search',
  'buddy-do': 'Task Router',
  'buddy-help': 'Help Center',
  'buddy-record-mistake': 'Error Recording',
  'buddy-secret-store': 'Secret Storage',
  'buddy-secret-get': 'Secret Retrieval',

  // System operations
  'get-session-health': 'Health Check',
  'get-workflow-guidance': 'Workflow Guide',
};

/**
 * Operation Icons
 * Consistent icon language for different operation types
 */
export const operationIcons = {
  // Operations
  search: '🔍',
  memory: '🧠',
  task: '📋',
  agent: '🤖',
  help: '💡',
  knowledge: '✨',
  secret: '🔐',
  health: '💊',

  // Actions
  create: '✨',
  update: '🔄',
  delete: '🗑️',
  send: '📤',
  receive: '📥',

  // Status
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  pending: '○',
} as const;

/**
 * Semantic Colors
 * Purpose-based color system for consistent visual communication
 */
export const semanticColors = {
  // Status colors
  success: '#10b981',    // green
  error: '#ef4444',      // red
  warning: '#f59e0b',    // amber
  info: '#3b82f6',       // blue

  // Brand colors
  brand: '#667eea',      // MeMesh purple
  brandAccent: '#5568d3', // darker purple

  // Content colors
  emphasis: '#f9fafb',   // very light gray (primary text)
  body: '#d1d5db',       // light gray (secondary text)
  subtle: '#9ca3af',     // medium gray (muted text)

  // Interactive colors
  link: '#3b82f6',       // blue
  linkHover: '#8b9dc3',  // muted blue
} as const;

/**
 * Helper function to get display name for an operation
 * Falls back to formatted version of the operation name if no display name is defined
 */
export function getOperationDisplayName(operationName: string): string {
  if (operationDisplayNames[operationName]) {
    return operationDisplayNames[operationName];
  }

  // Format unknown operations: "memesh-test-thing" → "Test Thing"
  return operationName
    .split('-')
    .filter(part => !['memesh', 'buddy', 'a2a'].includes(part))
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Unknown Operation';
}

/**
 * Helper function to get icon for an operation type
 * Maps operation names to their appropriate icon
 */
export function getOperationIcon(operationName: string): string {
  // Map operation names to icon types
  if (operationName.includes('remember') || operationName.includes('memory')) {
    return operationIcons.memory;
  }
  if (operationName.includes('do') || operationName.includes('task')) {
    return operationIcons.task;
  }
  if (operationName.includes('help')) {
    return operationIcons.help;
  }
  if (operationName.includes('agent') || operationName.includes('a2a')) {
    return operationIcons.agent;
  }
  if (operationName.includes('search')) {
    return operationIcons.search;
  }
  if (operationName.includes('create')) {
    return operationIcons.create;
  }
  if (operationName.includes('update')) {
    return operationIcons.update;
  }
  if (operationName.includes('delete')) {
    return operationIcons.delete;
  }
  if (operationName.includes('send')) {
    return operationIcons.send;
  }
  if (operationName.includes('secret')) {
    return operationIcons.secret;
  }
  if (operationName.includes('health')) {
    return operationIcons.health;
  }
  if (operationName.includes('knowledge') || operationName.includes('entities')) {
    return operationIcons.knowledge;
  }

  // Return empty string for unknown operations
  return '';
}
