import { ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
export class PlanningEngine {
    agentRegistry;
    learningManager;
    constructor(agentRegistry, learningManager) {
        this.agentRegistry = agentRegistry;
        this.learningManager = learningManager;
    }
    async generatePlan(request) {
        if (!request.featureDescription?.trim()) {
            throw new ValidationError('featureDescription is required and cannot be empty', {
                providedValue: request.featureDescription,
                expectedType: 'non-empty string',
            });
        }
        if (request.featureDescription.length > 1000) {
            throw new ValidationError('featureDescription exceeds maximum length of 1000 characters', {
                providedLength: request.featureDescription.length,
                maxLength: 1000,
            });
        }
        if (request.requirements && !Array.isArray(request.requirements)) {
            throw new ValidationError('requirements must be an array', {
                providedType: typeof request.requirements,
                expectedType: 'array',
            });
        }
        const tasks = await this.generateTasks(request);
        const totalTime = this.estimateTotalTime(tasks);
        return {
            title: `Implementation Plan: ${request.featureDescription}`,
            goal: this.generateGoal(request),
            architecture: this.generateArchitectureOverview(request),
            techStack: this.identifyTechStack(request),
            tasks,
            totalEstimatedTime: totalTime,
        };
    }
    async generateTasks(request) {
        const tasks = [];
        let taskCounter = 1;
        const learnedPatterns = await this.getLearnedPatterns(request);
        let phases = this.identifyPhases(request);
        if (learnedPatterns.length > 0) {
            phases = this.applyLearnedOrdering(phases, learnedPatterns);
        }
        for (const phase of phases) {
            const task = {
                id: `task-${taskCounter++}`,
                description: this.enhanceDescriptionWithLearning(phase, learnedPatterns),
                steps: this.generateTDDStepsWithLearning(phase, learnedPatterns),
                suggestedAgent: this.assignAgent(phase),
                estimatedDuration: '2-5 minutes',
                priority: this.calculatePriorityWithLearning(phase, learnedPatterns),
                dependencies: phase.dependencies || [],
                files: phase.files || {},
            };
            tasks.push(task);
        }
        return tasks;
    }
    generateTDDSteps(phase) {
        return [
            `Write test for ${phase.description}`,
            `Run test to verify it fails`,
            `Implement minimal code to pass test`,
            `Verify test passes`,
            `Commit changes`,
        ];
    }
    assignAgent(phase) {
        const agents = this.agentRegistry.getAllAgents();
        const description = phase.description.toLowerCase();
        const capabilityKeywords = {
            'code-review': ['review', 'quality', 'best practices', 'validation'],
            'security-audit': ['security', 'authentication', 'authorization'],
            'performance': ['optimize', 'performance', 'bottleneck', 'cache'],
            'frontend': ['ui', 'component', 'frontend', 'react', 'interface'],
            'backend': ['api', 'backend', 'server', 'endpoint'],
            'database': ['database', 'migration', 'schema', 'query'],
            'test': ['test', 'coverage', 'e2e', 'unit'],
            'test-generation': ['test', 'coverage', 'e2e', 'unit'],
            'test-execution': ['test', 'coverage', 'e2e', 'unit'],
            'debugging': ['debug', 'fix', 'issue', 'bug'],
        };
        const scores = agents.map((agent) => {
            let score = 0;
            const capabilities = agent.capabilities || [];
            for (const capability of capabilities) {
                const keywords = capabilityKeywords[capability] || [];
                for (const keyword of keywords) {
                    if (description.includes(keyword)) {
                        if (capability === 'code-review' && keyword === 'review') {
                            score += 2;
                        }
                        else {
                            score += 1;
                        }
                    }
                }
            }
            return { agent, score };
        });
        scores.sort((a, b) => b.score - a.score);
        if (scores[0].score > 0) {
            return scores[0].agent.name;
        }
        return undefined;
    }
    identifyPhases(request) {
        const phases = [];
        if (request.requirements) {
            for (const req of request.requirements) {
                phases.push({
                    description: `Setup for ${req}`,
                    priority: 'high',
                    files: {},
                });
                phases.push({
                    description: req,
                    priority: 'high',
                    files: {},
                });
            }
        }
        else {
            phases.push({
                description: request.featureDescription,
                priority: 'high',
                files: {},
            });
        }
        return phases;
    }
    generateGoal(request) {
        return `Implement ${request.featureDescription}`;
    }
    generateArchitectureOverview(request) {
        return 'TDD-driven implementation with agent-specific task allocation';
    }
    identifyTechStack(request) {
        return ['TypeScript', 'Vitest', 'Claude Code Buddy Infrastructure'];
    }
    estimateTotalTime(tasks) {
        const avgMinutesPerTask = 3.5;
        const totalMinutes = tasks.length * avgMinutesPerTask;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
    async getLearnedPatterns(request) {
        if (!this.learningManager) {
            return [];
        }
        try {
            const agents = this.agentRegistry.getAllAgents();
            const allPatterns = [];
            for (const agent of agents) {
                const patterns = await this.learningManager.getLearnedPatterns(agent.name);
                allPatterns.push(...patterns);
            }
            return this.filterRelevantPatterns(allPatterns, request);
        }
        catch (error) {
            logger.error('[PlanningEngine] Failed to retrieve learned patterns:', error);
            return [];
        }
    }
    filterRelevantPatterns(patterns, request) {
        const domain = request.existingContext?.domain || '';
        const projectType = request.existingContext?.projectType || '';
        return patterns.filter((pattern) => {
            if (pattern.type !== 'success')
                return false;
            if (pattern.success_rate < 0.75)
                return false;
            if (pattern.observations < 5)
                return false;
            const context = pattern.context;
            if (projectType && context.project_type && context.project_type !== projectType)
                return false;
            if (domain && context.domain) {
                const domainMatches = domain.includes(context.domain) ||
                    context.domain.includes(domain);
                if (!domainMatches)
                    return false;
            }
            return true;
        });
    }
    applyLearnedOrdering(phases, patterns) {
        const orderingActions = [];
        for (const pattern of patterns) {
            const actions = pattern.context.actions || [];
            orderingActions.push(...actions);
        }
        const sortedPhases = [...phases].sort((a, b) => {
            const aDesc = a.description.toLowerCase();
            const bDesc = b.description.toLowerCase();
            for (const action of orderingActions) {
                if (action.includes('first')) {
                    const keyword = action.replace('-first', '');
                    if (aDesc.includes(keyword) && !bDesc.includes(keyword))
                        return -1;
                    if (!aDesc.includes(keyword) && bDesc.includes(keyword))
                        return 1;
                }
                if (action.includes('before')) {
                    const [before, after] = action.split('-before-');
                    if (aDesc.includes(before) && bDesc.includes(after))
                        return -1;
                    if (aDesc.includes(after) && bDesc.includes(before))
                        return 1;
                }
            }
            return 0;
        });
        return sortedPhases;
    }
    enhanceDescriptionWithLearning(phase, patterns) {
        let description = phase.description;
        const bestPractices = [];
        for (const pattern of patterns) {
            if (pattern.type === 'success' && pattern.context.actions) {
                bestPractices.push(...pattern.context.actions);
            }
        }
        const phaseDesc = phase.description.toLowerCase();
        if (phaseDesc.includes('api') ||
            phaseDesc.includes('authentication') ||
            phaseDesc.includes('authorization') ||
            phaseDesc.includes('endpoint')) {
            const relevantPractices = bestPractices.filter((practice) => ['error-handling', 'input-validation', 'logging'].includes(practice));
            if (relevantPractices.length > 0) {
                description += ` (Include: ${relevantPractices.join(', ')})`;
            }
        }
        return description;
    }
    generateTDDStepsWithLearning(phase, patterns) {
        const baseSteps = this.generateTDDSteps(phase);
        const learnedActions = [];
        for (const pattern of patterns) {
            if (pattern.context.actions) {
                learnedActions.push(...pattern.context.actions);
            }
        }
        if (learnedActions.length > 0) {
            const relevantActions = learnedActions.filter((action) => ['error-handling', 'input-validation', 'logging'].includes(action));
            if (relevantActions.length > 0) {
                baseSteps[2] = `${baseSteps[2]} with ${relevantActions.join(', ')}`;
            }
        }
        return baseSteps;
    }
    calculatePriorityWithLearning(phase, patterns) {
        const basePriority = phase.priority || 'medium';
        const criticalPatterns = patterns.filter((p) => p.type === 'success' &&
            p.success_rate > 0.85 &&
            p.context.actions?.some((action) => phase.description.toLowerCase().includes(action.split('-')[0])));
        if (criticalPatterns.length > 0) {
            return 'high';
        }
        return basePriority;
    }
}
//# sourceMappingURL=PlanningEngine.js.map