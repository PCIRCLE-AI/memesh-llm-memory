export const operationDisplayNames = {
    'memesh-remember': 'Memory Search',
    'memesh-do': 'Task Router',
    'memesh-help': 'Help Center',
    'create-entities': 'Knowledge Storage',
    'update-entities': 'Knowledge Update',
    'delete-entities': 'Knowledge Deletion',
    'search-nodes': 'Knowledge Search',
    'a2a-send-task': 'Agent Communication',
    'a2a-discover-agents': 'Agent Discovery',
    'a2a-query-status': 'Status Check',
    'a2a-list-tasks': 'Task List',
    'a2a-list-agents': 'Agent Registry',
    'buddy-remember': 'Memory Search',
    'buddy-do': 'Task Router',
    'buddy-help': 'Help Center',
    'buddy-record-mistake': 'Error Recording',
    'buddy-secret-store': 'Secret Storage',
    'buddy-secret-get': 'Secret Retrieval',
    'get-session-health': 'Health Check',
    'get-workflow-guidance': 'Workflow Guide',
};
export const operationIcons = {
    search: '🔍',
    memory: '🧠',
    task: '📋',
    agent: '🤖',
    help: '💡',
    knowledge: '✨',
    secret: '🔐',
    health: '💊',
    create: '✨',
    update: '🔄',
    delete: '🗑️',
    send: '📤',
    receive: '📥',
    success: '✓',
    error: '❌',
    warning: '⚠',
    info: 'ℹ',
    pending: '○',
};
export const semanticColors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    brand: '#667eea',
    brandAccent: '#5568d3',
    emphasis: '#f9fafb',
    body: '#d1d5db',
    subtle: '#9ca3af',
    link: '#3b82f6',
    linkHover: '#8b9dc3',
};
export function getOperationDisplayName(operationName) {
    if (operationDisplayNames[operationName]) {
        return operationDisplayNames[operationName];
    }
    return operationName
        .split('-')
        .filter(part => !['memesh', 'buddy', 'a2a'].includes(part))
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Unknown Operation';
}
export function getOperationIcon(operationName) {
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
    return '';
}
//# sourceMappingURL=design-tokens.js.map