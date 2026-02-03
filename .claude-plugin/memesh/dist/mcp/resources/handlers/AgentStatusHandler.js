import { NotFoundError } from '../../../errors/index.js';
const VALID_AGENT_TYPES = [
    'code-reviewer',
    'test-writer',
    'development-butler',
    'e2e-healing',
    'knowledge-graph',
];
export class AgentStatusHandler {
    async handle(params) {
        const agentType = params.agentType;
        if (!agentType) {
            throw new Error('Missing required parameter: agentType');
        }
        if (!VALID_AGENT_TYPES.includes(agentType)) {
            throw new NotFoundError(`Unknown agent type: ${agentType}`, 'agent', agentType, { validTypes: VALID_AGENT_TYPES });
        }
        const status = {
            agentType,
            status: 'active',
            capabilities: this.getAgentCapabilities(agentType),
            lastActive: new Date().toISOString(),
        };
        return {
            uri: `ccb://agent/${agentType}/status`,
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
        };
    }
    getAgentCapabilities(agentType) {
        const capabilities = {
            'code-reviewer': ['review', 'analyze', 'suggest'],
            'test-writer': ['generate-tests', 'test-analysis'],
            'development-butler': ['project-setup', 'dependency-management'],
            'e2e-healing': ['test-healing', 'failure-analysis'],
            'knowledge-graph': ['memory', 'learning', 'recall'],
        };
        return capabilities[agentType] || [];
    }
}
//# sourceMappingURL=AgentStatusHandler.js.map