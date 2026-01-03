import Anthropic from '@anthropic-ai/sdk';
import { appConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
export class ArchitectureAgent {
    id;
    name;
    type = 'architecture';
    status = 'idle';
    capabilities;
    anthropic;
    systemPrompt;
    constructor(config = {}) {
        this.id = uuidv4();
        this.name = config.name || 'Architecture Analyst';
        this.anthropic = new Anthropic({
            apiKey: appConfig.claude.apiKey,
        });
        this.systemPrompt = config.systemPrompt || `You are an expert software architect with deep knowledge of:
- System design patterns (microservices, monolithic, serverless, event-driven)
- Scalability and performance optimization
- Security best practices
- Database design and data modeling
- API design and integration patterns
- Cloud infrastructure (AWS, GCP, Azure)
- DevOps and CI/CD pipelines

Your role is to analyze system architectures, identify potential issues, and provide actionable recommendations.
Always structure your analysis clearly with sections like:
1. Current State Analysis
2. Identified Issues
3. Recommendations
4. Implementation Priority`;
        this.capabilities = [
            {
                name: 'analyze_architecture',
                description: 'Analyze system architecture and identify issues',
                inputSchema: {
                    type: 'object',
                    properties: {
                        description: { type: 'string' },
                        context: { type: 'object' },
                    },
                    required: ['description'],
                },
                outputSchema: {
                    type: 'object',
                    properties: {
                        analysis: { type: 'string' },
                        issues: { type: 'array' },
                        recommendations: { type: 'array' },
                    },
                },
                estimatedCost: 0.05,
                estimatedTimeMs: 5000,
            },
            {
                name: 'suggest_improvements',
                description: 'Suggest architectural improvements',
                inputSchema: {
                    type: 'object',
                    properties: {
                        current_architecture: { type: 'string' },
                        constraints: { type: 'object' },
                    },
                    required: ['current_architecture'],
                },
                outputSchema: {
                    type: 'object',
                    properties: {
                        improvements: { type: 'array' },
                        trade_offs: { type: 'array' },
                        implementation_steps: { type: 'array' },
                    },
                },
                estimatedCost: 0.06,
                estimatedTimeMs: 6000,
            },
            {
                name: 'evaluate_technology',
                description: 'Evaluate technology choices and provide recommendations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        options: { type: 'array' },
                        requirements: { type: 'object' },
                    },
                    required: ['options'],
                },
                outputSchema: {
                    type: 'object',
                    properties: {
                        evaluation: { type: 'object' },
                        recommendation: { type: 'string' },
                        reasoning: { type: 'string' },
                    },
                },
                estimatedCost: 0.04,
                estimatedTimeMs: 4000,
            },
        ];
    }
    async initialize() {
        logger.info(`ArchitectureAgent: ${this.name} initialized`);
        this.status = 'idle';
    }
    async shutdown() {
        logger.info(`ArchitectureAgent: ${this.name} shutting down`);
        this.status = 'idle';
    }
    async handleMessage(message) {
        logger.info(`ArchitectureAgent: ${this.name} received message from ${message.from}`);
        try {
            this.status = 'busy';
            const task = message.content.task || '';
            const data = message.content.data || {};
            const response = await this.anthropic.messages.create({
                model: appConfig.claude.models.sonnet,
                max_tokens: 4096,
                system: this.systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: `Task: ${task}\n\nContext: ${JSON.stringify(data, null, 2)}`,
                    },
                ],
            });
            const result = response.content[0].type === 'text' ? response.content[0].text : '';
            this.status = 'idle';
            return {
                id: uuidv4(),
                from: this.id,
                to: message.from,
                timestamp: new Date(),
                type: 'response',
                content: {
                    result,
                },
                metadata: {
                    correlationId: message.metadata?.correlationId,
                },
            };
        }
        catch (error) {
            this.status = 'error';
            logger.error(`ArchitectureAgent: Error handling message:`, error);
            return {
                id: uuidv4(),
                from: this.id,
                to: message.from,
                timestamp: new Date(),
                type: 'response',
                content: {
                    error: error.message,
                },
                metadata: {
                    correlationId: message.metadata?.correlationId,
                },
            };
        }
    }
    async execute(capability, input) {
        logger.info(`ArchitectureAgent: Executing capability: ${capability}`);
        const cap = this.capabilities.find(c => c.name === capability);
        if (!cap) {
            throw new Error(`Capability ${capability} not found`);
        }
        const message = {
            id: uuidv4(),
            from: 'system',
            to: this.id,
            timestamp: new Date(),
            type: 'request',
            content: {
                task: `Execute ${capability}`,
                data: input,
            },
        };
        const response = await this.handleMessage(message);
        return response.content.result;
    }
}
//# sourceMappingURL=ArchitectureAgent.js.map