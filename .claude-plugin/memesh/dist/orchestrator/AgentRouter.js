import os from 'os';
import { PromptEnhancer } from '../core/PromptEnhancer.js';
import { toDollars } from '../utils/money.js';
import { logger } from '../utils/logger.js';
import { safeDivide, bytesToMB } from '../utils/index.js';
export class AgentRouter {
    promptEnhancer;
    constructor() {
        this.promptEnhancer = new PromptEnhancer();
    }
    async route(analysis) {
        const systemResources = await this.getSystemResources();
        if (!this.hasEnoughMemory(systemResources, analysis)) {
            return this.createFallbackDecision(analysis, 'Insufficient memory');
        }
        const selectedAgent = this.selectAgent(analysis);
        const fallbackAgent = this.getFallbackAgent(selectedAgent);
        const task = {
            id: analysis.taskId,
            description: `Task requiring ${analysis.requiredCapabilities.join(', ')} capabilities`,
            requiredCapabilities: analysis.requiredCapabilities.length > 0
                ? analysis.requiredCapabilities
                : this.getCapabilitiesForAgent(selectedAgent),
            metadata: {
                complexity: analysis.complexity,
                estimatedTokens: analysis.estimatedTokens,
            },
        };
        const enhancedPrompt = this.promptEnhancer.enhance(selectedAgent, task, analysis.complexity);
        return {
            taskId: analysis.taskId,
            selectedAgent,
            enhancedPrompt,
            estimatedCost: analysis.estimatedCost,
            fallbackAgent,
            reasoning: this.generateRoutingReasoning(analysis, selectedAgent, systemResources),
        };
    }
    async getSystemResources() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        return {
            totalMemoryMB: Math.floor(bytesToMB(totalMemory)),
            availableMemoryMB: Math.floor(bytesToMB(freeMemory)),
            memoryUsagePercent: Math.floor(safeDivide(usedMemory, totalMemory, 0) * 100),
            cpuUsagePercent: this.getCPUUsage(),
        };
    }
    hasEnoughMemory(resources, analysis) {
        const requiredMemoryMB = this.estimateRequiredMemory(analysis);
        const platform = process.platform;
        if (platform === 'darwin') {
            if (resources.totalMemoryMB >= 4096) {
                return true;
            }
        }
        if (resources.availableMemoryMB < requiredMemoryMB) {
            logger.warn(`⚠️  Insufficient memory: Available ${resources.availableMemoryMB}MB, ` +
                `Required ${requiredMemoryMB}MB`);
            return false;
        }
        return true;
    }
    estimateRequiredMemory(analysis) {
        const baseMemory = {
            simple: 50,
            medium: 100,
            complex: 200,
        };
        return baseMemory[analysis.complexity];
    }
    selectAgent(analysis) {
        const requiredCapabilities = analysis.requiredCapabilities;
        const capabilityToAgent = {
            'code-review': 'code-reviewer',
            'code-generation': 'general-agent',
            'testing': 'test-writer',
            'debugging': 'debugger',
            'refactoring': 'refactorer',
            'api-design': 'api-designer',
            'research': 'research-agent',
            'architecture': 'architecture-agent',
            'data-analysis': 'data-analyst',
            'knowledge-query': 'knowledge-agent',
            'documentation': 'technical-writer',
        };
        for (const required of requiredCapabilities) {
            const mappedAgent = capabilityToAgent[required];
            if (mappedAgent) {
                return mappedAgent;
            }
        }
        return 'general-agent';
    }
    getCapabilitiesForAgent(agent) {
        const agentCapabilities = {
            'code-reviewer': ['code-review'],
            'test-writer': ['testing'],
            'test-automator': ['testing'],
            'e2e-healing-agent': ['e2e-testing', 'auto-healing', 'testing'],
            'debugger': ['debugging'],
            'refactorer': ['refactoring'],
            'api-designer': ['api-design'],
            'research-agent': ['research'],
            'architecture-agent': ['architecture'],
            'data-analyst': ['data-analysis'],
            'knowledge-agent': ['knowledge-query'],
            'db-optimizer': ['general'],
            'frontend-specialist': ['general'],
            'frontend-developer': ['general'],
            'backend-specialist': ['general'],
            'backend-developer': ['general'],
            'database-administrator': ['general'],
            'development-butler': ['general'],
            'performance-profiler': ['general'],
            'performance-engineer': ['general'],
            'security-auditor': ['general'],
            'technical-writer': ['general'],
            'ui-designer': ['general'],
            'migration-assistant': ['general'],
            'api-integrator': ['general'],
            'general-agent': ['general'],
            'project-manager': ['general'],
            'product-manager': ['general'],
            'data-engineer': ['data-analysis'],
            'ml-engineer': ['data-analysis'],
            'marketing-strategist': ['general'],
        };
        return agentCapabilities[agent] || ['general'];
    }
    getFallbackAgent(primaryAgent) {
        const fallbackMap = {
            'code-reviewer': 'general-agent',
            'test-writer': 'general-agent',
            'test-automator': 'test-writer',
            'e2e-healing-agent': 'test-automator',
            'debugger': 'general-agent',
            'refactorer': 'general-agent',
            'api-designer': 'general-agent',
            'research-agent': 'general-agent',
            'architecture-agent': 'general-agent',
            'data-analyst': 'general-agent',
            'knowledge-agent': 'research-agent',
            'db-optimizer': 'general-agent',
            'development-butler': 'general-agent',
            'frontend-specialist': 'general-agent',
            'frontend-developer': 'frontend-specialist',
            'backend-specialist': 'general-agent',
            'backend-developer': 'backend-specialist',
            'database-administrator': 'db-optimizer',
            'performance-profiler': 'general-agent',
            'performance-engineer': 'performance-profiler',
            'security-auditor': 'general-agent',
            'technical-writer': 'general-agent',
            'ui-designer': 'general-agent',
            'migration-assistant': 'general-agent',
            'api-integrator': 'general-agent',
            'project-manager': 'general-agent',
            'product-manager': 'general-agent',
            'data-engineer': 'data-analyst',
            'ml-engineer': 'data-analyst',
            'marketing-strategist': 'general-agent',
            'general-agent': undefined,
        };
        return fallbackMap[primaryAgent];
    }
    generateRoutingReasoning(analysis, selectedAgent, resources) {
        const reasons = [];
        reasons.push(`Selected ${selectedAgent} based on task capabilities and ${analysis.complexity} complexity`);
        reasons.push(`Available memory: ${resources.availableMemoryMB}MB`);
        reasons.push(`Memory usage: ${resources.memoryUsagePercent}%`);
        reasons.push(`Estimated cost: $${toDollars(analysis.estimatedCost).toFixed(6)}`);
        const agentDescriptions = {
            'code-reviewer': 'Specialized in code quality analysis and security review',
            'test-writer': 'Expert in test automation and TDD',
            'test-automator': 'Automated test execution, CI/CD integration, test coverage analysis',
            'e2e-healing-agent': 'E2E test automation with self-healing capabilities, Playwright-powered browser testing, automatic failure analysis and code fixing',
            'debugger': 'Specialized in root cause analysis and debugging',
            'refactorer': 'Expert in code refactoring and design patterns',
            'api-designer': 'Specialized in API design and RESTful principles',
            'research-agent': 'Specialized in research and information gathering',
            'architecture-agent': 'Expert in system architecture and design',
            'data-analyst': 'Specialized in data analysis and visualization',
            'knowledge-agent': 'Expert in knowledge management and organization',
            'db-optimizer': 'Database optimization, query tuning, index design specialist',
            'development-butler': 'Event-driven workflow automation, automates everything except coding/planning/reviewing',
            'frontend-specialist': 'Frontend development, React, Vue, modern web frameworks expert',
            'frontend-developer': 'Full-stack frontend development, component libraries, state management',
            'backend-specialist': 'Backend development, API design, server architecture expert',
            'backend-developer': 'Full-stack backend development, microservices, databases, caching',
            'database-administrator': 'Database administration, schema design, performance tuning, backup and recovery',
            'performance-profiler': 'Performance profiling, optimization, bottleneck identification',
            'performance-engineer': 'End-to-end performance engineering, scalability, load testing',
            'security-auditor': 'Security auditing, vulnerability assessment, compliance expert',
            'technical-writer': 'Technical writing, documentation, user guides, API docs expert',
            'ui-designer': 'UI/UX design, user experience, interface design specialist',
            'migration-assistant': 'Migration assistance, upgrade planning, legacy modernization',
            'api-integrator': 'API integration, third-party services, SDK implementation',
            'general-agent': 'Versatile AI assistant for general tasks',
            'project-manager': 'Project planning, task management, resource allocation, risk management',
            'product-manager': 'Product strategy, roadmap planning, user requirements, feature prioritization',
            'data-engineer': 'Data pipeline engineering, ETL/ELT, data infrastructure, data quality',
            'ml-engineer': 'Machine learning engineering, model development, ML ops, deployment',
            'marketing-strategist': 'Marketing strategy, campaign planning, growth, customer acquisition',
        };
        if (agentDescriptions[selectedAgent]) {
            reasons.push(agentDescriptions[selectedAgent]);
        }
        return reasons.join('. ');
    }
    createFallbackDecision(analysis, reason) {
        const fallbackAgent = 'general-agent';
        const task = {
            id: analysis.taskId,
            description: `Fallback task due to: ${reason}`,
            requiredCapabilities: ['general'],
            metadata: {
                complexity: 'simple',
                isFallback: true,
            },
        };
        const enhancedPrompt = this.promptEnhancer.enhance(fallbackAgent, task, 'simple');
        return {
            taskId: analysis.taskId,
            selectedAgent: fallbackAgent,
            enhancedPrompt,
            estimatedCost: Math.round(analysis.estimatedCost * 0.2),
            reasoning: `Fallback to ${fallbackAgent} due to: ${reason}`,
        };
    }
    cpuUsageCache = { value: 50, timestamp: 0 };
    CPU_CACHE_TTL = 1000;
    getCPUUsage() {
        const now = Date.now();
        if (now - this.cpuUsageCache.timestamp < this.CPU_CACHE_TTL) {
            return this.cpuUsageCache.value;
        }
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }
        const idlePercentage = safeDivide(100 * totalIdle, totalTick, 50);
        const usage = Math.round(100 - idlePercentage);
        this.cpuUsageCache = { value: usage, timestamp: now };
        return usage;
    }
    async routeBatch(analyses) {
        const CONCURRENCY_LIMIT = 10;
        const results = [];
        for (let i = 0; i < analyses.length; i += CONCURRENCY_LIMIT) {
            const batch = analyses.slice(i, i + CONCURRENCY_LIMIT);
            const batchResults = await Promise.all(batch.map(analysis => this.route(analysis)));
            results.push(...batchResults);
        }
        return results;
    }
    async shouldUseParallel(decisions) {
        const allSimple = decisions.every(decision => decision.selectedAgent === 'general-agent');
        if (allSimple) {
            return true;
        }
        const totalCost = decisions.reduce((sum, d) => (sum + d.estimatedCost), 0);
        const systemResources = await this.getSystemResources();
        const hasEnoughMemory = systemResources.memoryUsagePercent < 80;
        const costReasonable = toDollars(totalCost) < 0.1;
        return hasEnoughMemory && costReasonable;
    }
}
//# sourceMappingURL=AgentRouter.js.map