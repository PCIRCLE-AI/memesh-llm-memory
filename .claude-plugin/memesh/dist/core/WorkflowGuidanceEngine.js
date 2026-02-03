import { MistakePatternManager } from './MistakePatternManager.js';
import { SkillsKnowledgeIntegrator } from './SkillsKnowledgeIntegrator.js';
import { StateError, ValidationError } from '../errors/index.js';
export class WorkflowGuidanceEngine {
    learningManager;
    static MIN_PATTERN_CONFIDENCE = 0.7;
    static MIN_OBSERVATION_COUNT = 5;
    static MAX_MISTAKE_PATTERNS = 3;
    static MISTAKE_WARNING_THRESHOLD = 0.7;
    mistakePatternManager;
    skillsIntegrator;
    constructor(learningManager, memoryStore) {
        this.learningManager = learningManager;
        if (memoryStore) {
            this.mistakePatternManager = new MistakePatternManager(memoryStore);
        }
        this.skillsIntegrator = new SkillsKnowledgeIntegrator();
        this.skillsIntegrator.scanSkills();
    }
    async analyzeWorkflow(context) {
        if (!context) {
            throw new StateError('WorkflowContext is required', {
                component: 'WorkflowGuidanceEngine',
                method: 'analyzeWorkflow',
            });
        }
        const validPhases = [
            'idle',
            'code-written',
            'test-complete',
            'commit-ready',
            'committed',
        ];
        if (!validPhases.includes(context.phase)) {
            throw new ValidationError(`Invalid workflow phase: ${context.phase}`, {
                providedPhase: context.phase,
                validPhases,
            });
        }
        const recommendations = [];
        const reasoning = [];
        let learnedFromPatterns = false;
        let mistakePatterns = [];
        if (this.mistakePatternManager) {
            mistakePatterns = await this.mistakePatternManager.getTopPatterns(context.phase, WorkflowGuidanceEngine.MAX_MISTAKE_PATTERNS);
            const highWeightPatterns = mistakePatterns.filter((p) => p.weight >= WorkflowGuidanceEngine.MISTAKE_WARNING_THRESHOLD);
            if (highWeightPatterns.length > 0) {
                reasoning.push(`⚠️  Found ${highWeightPatterns.length} recurring mistake pattern(s) in this phase`);
                highWeightPatterns.forEach((pattern) => {
                    reasoning.push(`  - ${pattern.description}: ${pattern.prevention}`);
                });
            }
        }
        const patterns = this.learningManager.getPatterns('workflow-guidance');
        if (patterns.length > 0) {
            const relevantPatterns = patterns.filter((p) => p.confidence > WorkflowGuidanceEngine.MIN_PATTERN_CONFIDENCE &&
                p.observationCount >= WorkflowGuidanceEngine.MIN_OBSERVATION_COUNT);
            if (relevantPatterns.length > 0) {
                learnedFromPatterns = true;
                reasoning.push(`Applied ${relevantPatterns.length} learned pattern(s) from past successes`);
            }
        }
        if (context.phase === 'code-written') {
            if (context.testsPassing === undefined ||
                context.testsPassing === false) {
                recommendations.push({
                    action: 'run-tests',
                    priority: 'high',
                    description: 'Run tests to verify code changes',
                    reasoning: context.testsPassing === undefined
                        ? 'Code has been written but tests have not been run'
                        : 'Tests were run but are failing',
                    estimatedTime: '1-2 minutes',
                });
                reasoning.push('Tests should be run after code changes');
            }
            const skillsEnhancements = this.skillsIntegrator.getRecommendationEnhancements(context.phase);
            if (skillsEnhancements.length > 0) {
                reasoning.push('📚 Skills Knowledge:');
                skillsEnhancements.forEach((enhancement) => {
                    reasoning.push(`  - ${enhancement}`);
                });
            }
        }
        if (context.phase === 'test-complete') {
            if (context.testsPassing && !context.reviewed) {
                recommendations.push({
                    action: 'code-review',
                    priority: 'medium',
                    description: 'Request code review',
                    reasoning: 'Tests are passing, ready for code review',
                    estimatedTime: '5-10 minutes',
                    suggestedAgent: 'code-reviewer',
                });
                reasoning.push('Code review recommended after tests pass');
            }
            if (context.testsPassing === false) {
                recommendations.push({
                    action: 'fix-tests',
                    priority: 'high',
                    description: 'Fix failing tests before proceeding',
                    reasoning: 'Tests must pass before code can be committed',
                    estimatedTime: '5-15 minutes',
                });
                reasoning.push('Failing tests must be addressed');
            }
            const skillsEnhancements = this.skillsIntegrator.getRecommendationEnhancements(context.phase);
            if (skillsEnhancements.length > 0) {
                reasoning.push('📚 Skills Knowledge:');
                skillsEnhancements.forEach((enhancement) => {
                    reasoning.push(`  - ${enhancement}`);
                });
            }
        }
        const confidence = this.calculateConfidence(context, recommendations, learnedFromPatterns);
        return {
            recommendations,
            confidence,
            reasoning,
            learnedFromPatterns,
            mistakePatterns,
        };
    }
    calculateConfidence(context, recommendations, learnedFromPatterns) {
        let confidence = 0.5;
        if (learnedFromPatterns) {
            confidence += 0.3;
        }
        if (context.phase !== 'idle' && recommendations.length > 0) {
            confidence += 0.2;
        }
        if (context.filesChanged && context.filesChanged.length > 0) {
            confidence += 0.1;
        }
        if (context.testsPassing !== undefined) {
            confidence += 0.1;
        }
        return Math.min(confidence, 1.0);
    }
}
//# sourceMappingURL=WorkflowGuidanceEngine.js.map