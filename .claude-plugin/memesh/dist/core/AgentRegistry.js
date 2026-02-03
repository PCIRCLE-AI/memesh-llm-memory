import { AgentClassification } from '../types/AgentClassification.js';
import { ValidationError } from '../errors/index.js';
export class AgentRegistry {
    agents = new Map();
    constructor() {
        this.registerAllAgents();
    }
    registerAgent(agent) {
        this.agents.set(agent.name, agent);
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    getAgent(name) {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw new ValidationError('Agent name must be a non-empty string', {
                providedValue: name,
                expectedType: 'non-empty string',
            });
        }
        return this.agents.get(name);
    }
    getAgentsByCategory(category) {
        if (!category || typeof category !== 'string' || category.trim() === '') {
            throw new ValidationError('Category must be a non-empty string', {
                providedValue: category,
                expectedType: 'non-empty string',
            });
        }
        return this.getAllAgents().filter(agent => agent.category === category);
    }
    hasAgent(name) {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw new ValidationError('Agent name must be a non-empty string', {
                providedValue: name,
                expectedType: 'non-empty string',
            });
        }
        return this.agents.has(name);
    }
    getAgentCount() {
        return this.agents.size;
    }
    getAllAgentTypes() {
        return Array.from(this.agents.keys());
    }
    getRealImplementations() {
        return this.getAllAgents().filter(agent => agent.classification === AgentClassification.REAL_IMPLEMENTATION);
    }
    getEnhancedPrompts() {
        return this.getAllAgents().filter(agent => agent.classification === AgentClassification.ENHANCED_PROMPT);
    }
    getOptionalAgents() {
        return this.getAllAgents().filter(agent => agent.classification === AgentClassification.OPTIONAL_FEATURE);
    }
    registerAllAgents() {
        const allAgents = [
            {
                name: 'development-butler',
                description: 'Event-driven workflow automation, code maintenance, testing, dependency management, git workflow, build automation, development monitoring',
                category: 'development',
                classification: AgentClassification.REAL_IMPLEMENTATION,
                mcpTools: ['filesystem', 'memory', 'bash'],
            },
            {
                name: 'test-writer',
                description: 'Test automation specialist, TDD expert, coverage analysis',
                category: 'development',
                classification: AgentClassification.REAL_IMPLEMENTATION,
                mcpTools: ['filesystem', 'bash'],
                capabilities: ['testing', 'test-generation', 'coverage'],
            },
            {
                name: 'test-automator',
                description: 'Test automation specialist, automated testing expert',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['testing', 'test-generation', 'automation'],
            },
            {
                name: 'e2e-healing-agent',
                description: 'End-to-end test automation with self-healing capabilities, Playwright-powered browser testing, automatic failure analysis and code fixing, reduces test maintenance burden',
                category: 'development',
                classification: AgentClassification.REAL_IMPLEMENTATION,
                mcpTools: ['playwright', 'filesystem', 'bash', 'memory'],
                capabilities: ['e2e-testing', 'auto-healing', 'testing', 'code-generation', 'debugging'],
            },
            {
                name: 'project-manager',
                description: 'Project planning, task management, milestone tracking, team coordination',
                category: 'management',
                classification: AgentClassification.REAL_IMPLEMENTATION,
                mcpTools: ['memory', 'filesystem'],
            },
            {
                name: 'data-engineer',
                description: 'Data pipeline development, ETL processes, data quality management',
                category: 'engineering',
                classification: AgentClassification.REAL_IMPLEMENTATION,
                mcpTools: ['bash', 'filesystem'],
            },
            {
                name: 'frontend-developer',
                description: 'Frontend development expert, React/Vue/Angular specialist',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['frontend', 'ui', 'component'],
            },
            {
                name: 'backend-developer',
                description: 'Backend development expert, API and server-side specialist',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['backend', 'api', 'server'],
            },
            {
                name: 'database-administrator',
                description: 'Database expert, schema design, query optimization specialist',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['database', 'schema', 'query'],
            },
            {
                name: 'performance-engineer',
                description: 'Performance optimization expert, bottleneck analysis, caching specialist',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['performance', 'optimization', 'cache'],
            },
            {
                name: 'architecture-agent',
                description: 'System architecture expert, design patterns, scalability analysis',
                category: 'analysis',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['architecture', 'design-patterns', 'scalability'],
            },
            {
                name: 'code-reviewer',
                description: 'Expert code review, security analysis, and best practices validation',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['code-review', 'best-practices'],
            },
            {
                name: 'security-auditor',
                description: 'Security auditing, vulnerability assessment, compliance expert',
                category: 'operations',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['security-audit', 'vulnerability-assessment', 'compliance'],
            },
            {
                name: 'ui-designer',
                description: 'UI/UX design, user experience, interface design specialist',
                category: 'creative',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['ui-design', 'ux-design', 'frontend'],
            },
            {
                name: 'marketing-strategist',
                description: 'Marketing strategy, brand positioning, growth hacking expert',
                category: 'business',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['marketing', 'strategy', 'growth'],
            },
            {
                name: 'product-manager',
                description: 'Product strategy, user research, feature prioritization expert',
                category: 'management',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['product-management', 'user-research', 'prioritization'],
            },
            {
                name: 'ml-engineer',
                description: 'Machine learning engineering, model training, ML pipeline expert',
                category: 'engineering',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['machine-learning', 'model-training', 'ml-pipeline'],
            },
            {
                name: 'debugger',
                description: 'Advanced debugging, root cause analysis, systematic problem solving',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['debugging', 'root-cause-analysis', 'problem-solving'],
            },
            {
                name: 'refactorer',
                description: 'Code refactoring, technical debt reduction, code quality improvement',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['refactoring', 'code-quality', 'technical-debt'],
            },
            {
                name: 'api-designer',
                description: 'API design, REST/GraphQL architecture, API documentation expert',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['api-design', 'rest', 'graphql', 'backend'],
            },
            {
                name: 'research-agent',
                description: 'Technical research, feasibility analysis, technology evaluation',
                category: 'analysis',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['research', 'feasibility-analysis', 'evaluation'],
            },
            {
                name: 'data-analyst',
                description: 'Data analysis, statistical modeling, business intelligence expert',
                category: 'analysis',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['data-analysis', 'statistics', 'business-intelligence'],
            },
            {
                name: 'performance-profiler',
                description: 'Performance profiling, bottleneck identification, optimization analysis',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['performance', 'profiling', 'optimization'],
            },
            {
                name: 'db-optimizer',
                description: 'Database optimization, query tuning, index design specialist',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['database', 'optimization', 'query-tuning'],
            },
            {
                name: 'frontend-specialist',
                description: 'Frontend architecture, performance optimization, modern frameworks expert',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['frontend', 'architecture', 'optimization'],
            },
            {
                name: 'backend-specialist',
                description: 'Backend architecture, scalability, microservices expert',
                category: 'development',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['backend', 'architecture', 'scalability'],
            },
            {
                name: 'knowledge-agent',
                description: 'Knowledge management, information retrieval, documentation organization',
                category: 'knowledge',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['knowledge-management', 'information-retrieval', 'documentation'],
            },
            {
                name: 'technical-writer',
                description: 'Technical documentation, API documentation, user guides expert',
                category: 'creative',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['documentation', 'technical-writing', 'api-docs'],
            },
            {
                name: 'migration-assistant',
                description: 'Migration planning, version upgrades, legacy system modernization',
                category: 'utility',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['migration', 'upgrade', 'modernization'],
            },
            {
                name: 'api-integrator',
                description: 'API integration, third-party services, SDK implementation expert',
                category: 'utility',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['api-integration', 'third-party', 'sdk'],
            },
            {
                name: 'general-agent',
                description: 'General purpose agent for miscellaneous tasks and fallback scenarios',
                category: 'general',
                classification: AgentClassification.ENHANCED_PROMPT,
                capabilities: ['general'],
            },
        ];
        allAgents.forEach(agent => this.registerAgent(agent));
    }
}
//# sourceMappingURL=AgentRegistry.js.map