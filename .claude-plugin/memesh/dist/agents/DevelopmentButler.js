import { WorkflowGuidanceEngine } from '../core/WorkflowGuidanceEngine.js';
import { WorkflowEnforcementEngine } from '../core/WorkflowEnforcementEngine.js';
import { FeedbackCollector } from '../evolution/FeedbackCollector.js';
import { SessionTokenTracker } from '../core/SessionTokenTracker.js';
import { SessionContextMonitor } from '../core/SessionContextMonitor.js';
import { ClaudeMdReloader } from '../mcp/ClaudeMdReloader.js';
import { StateError, NotFoundError, OperationError } from '../errors/index.js';
export class DevelopmentButler {
    checkpointDetector;
    toolInterface;
    initialized = false;
    workflowState = {
        phase: 'idle',
    };
    guidanceEngine;
    enforcementEngine;
    feedbackCollector;
    activeRequests = new Map();
    tokenTracker;
    contextMonitor;
    claudeMdReloader;
    constructor(checkpointDetector, toolInterface, learningManager, memoryStore) {
        this.checkpointDetector = checkpointDetector;
        this.toolInterface = toolInterface;
        if (learningManager) {
            this.guidanceEngine = new WorkflowGuidanceEngine(learningManager, memoryStore);
            this.feedbackCollector = new FeedbackCollector();
        }
        this.enforcementEngine = new WorkflowEnforcementEngine();
        this.tokenTracker = new SessionTokenTracker({ tokenLimit: 200000 });
        this.contextMonitor = new SessionContextMonitor(this.tokenTracker);
        this.claudeMdReloader = new ClaudeMdReloader();
        this.initialize();
    }
    initialize() {
        this.checkpointDetector.registerCheckpoint('code-written', async (data) => {
            await this.analyzeCodeChanges(data);
            return { success: true };
        }, {
            description: 'Triggered when code is written',
            category: 'development',
            priority: 'high',
        });
        this.checkpointDetector.registerCheckpoint('test-complete', async (data) => {
            await this.analyzeTestResults(data);
            return { success: true };
        }, {
            description: 'Triggered when tests complete',
            category: 'testing',
            priority: 'high',
        });
        this.checkpointDetector.registerCheckpoint('commit-ready', async () => {
            await this.checkCommitReadiness();
            return { success: true };
        }, {
            description: 'Triggered when preparing to commit',
            category: 'version-control',
            priority: 'high',
        });
        this.checkpointDetector.registerCheckpoint('committed', async () => {
            await this.commitCompleted();
            return { success: true };
        }, {
            description: 'Triggered when commit completes',
            category: 'version-control',
            priority: 'medium',
        });
        this.initialized = true;
    }
    isInitialized() {
        return this.initialized;
    }
    getToolInterface() {
        return this.toolInterface;
    }
    getTokenTracker() {
        return this.tokenTracker;
    }
    getContextMonitor() {
        return this.contextMonitor;
    }
    getEnforcementEngine() {
        return this.enforcementEngine;
    }
    async analyzeCodeChanges(data) {
        try {
            this.workflowState.phase = 'code-analysis';
            this.workflowState.lastCheckpoint = 'code-written';
            const hasTests = data.hasTests;
            const type = data.type;
            const recommendations = [];
            const warnings = [];
            const suggestedAgents = [];
            const suggestedActions = [];
            if (type === 'new-file') {
                recommendations.push('Add tests for new endpoint');
                recommendations.push('Update API documentation');
            }
            if (hasTests === false) {
                warnings.push('No tests found for modified code');
                suggestedAgents.push('test-writer');
                suggestedActions.push('Generate tests');
            }
            if (type === 'test-deletion') {
                suggestedAgents.push('test-writer');
            }
            return {
                analyzed: true,
                recommendations,
                warnings,
                suggestedAgents,
                suggestedActions,
            };
        }
        catch (error) {
            throw new OperationError(`Code analysis failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'DevelopmentButler',
                method: 'analyzeCodeChanges',
                data,
                cause: error,
            });
        }
    }
    async analyzeTestResults(data) {
        try {
            this.workflowState.phase = 'test-analysis';
            this.workflowState.lastCheckpoint = 'test-complete';
            const total = data.total || 0;
            const passed = data.passed || 0;
            const failed = data.failed || 0;
            this.workflowState.lastTestResults = { total, passed, failed };
            let status;
            let readyToCommit;
            const recommendations = [];
            const failurePercentage = total > 0 ? (failed / total) * 100 : 0;
            if (failed === 0) {
                status = 'success';
                readyToCommit = true;
            }
            else if (failurePercentage < 10) {
                status = 'needs-attention';
                readyToCommit = false;
            }
            else {
                status = 'failed';
                readyToCommit = false;
                recommendations.push('Fix failing tests before committing');
            }
            return {
                analyzed: true,
                status,
                readyToCommit,
                recommendations: recommendations.length > 0 ? recommendations : undefined,
            };
        }
        catch (error) {
            throw new OperationError(`Test analysis failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'DevelopmentButler',
                method: 'analyzeTestResults',
                data,
                cause: error,
            });
        }
    }
    async checkCommitReadiness() {
        try {
            const blockers = [];
            const preCommitActions = [
                'Run tests',
                'Check code quality',
            ];
            if (this.workflowState.lastTestResults &&
                this.workflowState.lastTestResults.failed > 0) {
                blockers.push('Tests failing');
            }
            const ready = blockers.length === 0;
            return {
                ready,
                blockers,
                preCommitActions,
            };
        }
        catch (error) {
            throw new OperationError(`Commit readiness check failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'DevelopmentButler',
                method: 'checkCommitReadiness',
                cause: error,
            });
        }
    }
    async analyzeCommit(data) {
        const production = data.production;
        const suggestedAgents = [];
        const suggestedActions = [];
        if (production) {
            suggestedAgents.push('security-auditor');
            suggestedActions.push('Prepare deployment checklist');
        }
        return {
            suggestedAgents,
            suggestedActions,
        };
    }
    async commitCompleted() {
        try {
            this.workflowState = {
                phase: 'idle',
            };
        }
        catch (error) {
            throw new OperationError(`Commit completion failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'DevelopmentButler',
                method: 'commitCompleted',
                cause: error,
            });
        }
    }
    getWorkflowState() {
        return { ...this.workflowState };
    }
    async processCheckpoint(checkpointName, data) {
        try {
            if (!this.guidanceEngine) {
                throw new StateError('Workflow guidance not initialized. Provide LearningManager to constructor.', {
                    component: 'DevelopmentButler',
                    method: 'processCheckpoint',
                    requiredDependency: 'LearningManager',
                });
            }
            const context = {
                phase: checkpointName,
                filesChanged: data.filesChanged,
                testsPassing: data.testsPassing,
                reviewed: data.reviewed,
            };
            const enforcementResult = await this.enforcementEngine.canProceedFromCheckpoint(checkpointName, {
                phase: checkpointName,
                filesChanged: data.filesChanged,
                testsPassing: data.testsPassing,
                reviewed: data.reviewed,
                recentTools: data.recentTools,
                filesRead: data.filesRead,
            });
            if (!enforcementResult.proceed) {
                const enforcementMessage = this.enforcementEngine.formatEnforcementMessage(enforcementResult);
                const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const sessionHealth = this.contextMonitor.checkSessionHealth();
                return {
                    guidance: {
                        recommendations: [],
                        confidence: 1.0,
                        reasoning: enforcementResult.violations,
                        learnedFromPatterns: false,
                        mistakePatterns: [],
                    },
                    formattedRequest: enforcementMessage,
                    requestId,
                    sessionHealth,
                    enforcement: {
                        blocked: true,
                        reason: enforcementResult.reason,
                        requiredActions: enforcementResult.requiredActions,
                    },
                };
            }
            const guidance = await this.guidanceEngine.analyzeWorkflow(context);
            if (!guidance.recommendations || guidance.recommendations.length === 0) {
                const noRecommendationsMessage = `
═══════════════════════════════════════════════════
🤖 MeMesh Workflow Guidance
═══════════════════════════════════════════════════

ℹ️ No specific recommendations at this time.
Current phase: ${context.phase}

Continue with your current workflow.
═══════════════════════════════════════════════════
      `.trim();
                const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                this.activeRequests.set(requestId, guidance);
                const sessionHealth = this.contextMonitor.checkSessionHealth();
                return {
                    guidance,
                    formattedRequest: noRecommendationsMessage,
                    requestId,
                    sessionHealth,
                };
            }
            const topRecommendation = guidance.recommendations[0];
            const alternatives = guidance.recommendations.slice(1, 4);
            const formattedRequest = this.formatWorkflowGuidanceRequest(topRecommendation, alternatives, guidance.confidence, guidance.reasoning);
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.activeRequests.set(requestId, guidance);
            const sessionHealth = this.contextMonitor.checkSessionHealth();
            if (sessionHealth.status === 'critical') {
                const criticalWarnings = sessionHealth.warnings
                    .filter((w) => w.level === 'critical')
                    .map((w) => `⚠️ ${w.message}`)
                    .join('\n');
                const criticalRecs = sessionHealth.recommendations
                    .filter((r) => r.priority === 'critical')
                    .map((r) => `• ${r.description}: ${r.reasoning}`)
                    .join('\n');
                const enhancedRequest = `
🚨 CRITICAL SESSION ALERTS:
${criticalWarnings}

Recommended Actions:
${criticalRecs}

---
${formattedRequest}
      `.trim();
                return {
                    guidance,
                    formattedRequest: enhancedRequest,
                    requestId,
                    sessionHealth,
                    enforcement: enforcementResult.warnings.length > 0 ? {
                        blocked: false,
                        requiredActions: enforcementResult.requiredActions,
                    } : undefined,
                };
            }
            return {
                guidance,
                formattedRequest,
                requestId,
                sessionHealth,
                enforcement: enforcementResult.warnings.length > 0 ? {
                    blocked: false,
                    requiredActions: enforcementResult.requiredActions,
                } : undefined,
            };
        }
        catch (error) {
            if (error instanceof StateError || error instanceof OperationError) {
                throw error;
            }
            throw new OperationError(`Checkpoint processing failed: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'DevelopmentButler',
                method: 'processCheckpoint',
                checkpointName,
                cause: error,
            });
        }
    }
    formatWorkflowGuidanceRequest(topRecommendation, alternatives, confidence, reasoning) {
        const lines = [];
        lines.push('═══════════════════════════════════════════════════');
        lines.push('🤖 MeMesh Workflow Guidance');
        lines.push('═══════════════════════════════════════════════════');
        lines.push('');
        const mistakeWarnings = reasoning.filter((r) => r.includes('⚠️') || r.includes('recurring mistake'));
        if (mistakeWarnings.length > 0) {
            lines.push('🔴 RECURRING MISTAKES IN THIS PHASE:');
            lines.push('');
            mistakeWarnings.forEach((warning) => {
                lines.push(`   ${warning}`);
            });
            lines.push('');
            lines.push('───────────────────────────────────────────────────');
            lines.push('');
        }
        const confidencePercent = Math.round(confidence * 100);
        lines.push(`✨ Recommended Action: ${topRecommendation.action} (${confidencePercent}% confidence)`);
        lines.push(`   Priority: ${topRecommendation.priority}`);
        lines.push('');
        lines.push(`📝 ${topRecommendation.description}`);
        lines.push('');
        const otherReasoning = reasoning.filter((r) => !mistakeWarnings.includes(r));
        if (otherReasoning.length > 0 || topRecommendation.reasoning) {
            lines.push('💡 Reasoning:');
            otherReasoning.forEach((reason) => {
                if (reason && reason.trim()) {
                    lines.push(`   • ${reason}`);
                }
            });
            if (topRecommendation.reasoning) {
                lines.push(`   • ${topRecommendation.reasoning}`);
            }
            lines.push('');
        }
        if (topRecommendation.estimatedTime) {
            lines.push(`⏱️  Estimated time: ${topRecommendation.estimatedTime}`);
            lines.push('');
        }
        if (alternatives.length > 0) {
            lines.push('🔄 Alternative Actions:');
            alternatives.forEach((alt, index) => {
                lines.push(`   ${index + 1}. ${alt.action} (${alt.priority} priority) - ${alt.description}`);
            });
            lines.push('');
        }
        lines.push('═══════════════════════════════════════════════════');
        return lines.join('\n');
    }
    async recordUserResponse(requestId, _response) {
        try {
            const guidance = this.activeRequests.get(requestId);
            if (!guidance) {
                throw new NotFoundError(`Request ${requestId} not found in active requests`, 'request', requestId, { activeRequestsCount: this.activeRequests.size });
            }
            if (!this.feedbackCollector) {
                throw new StateError('Feedback collector not initialized', {
                    component: 'DevelopmentButler',
                    method: 'recordUserResponse',
                    requiredDependency: 'FeedbackCollector (via LearningManager)',
                });
            }
            this.activeRequests.delete(requestId);
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof StateError) {
                throw error;
            }
            throw new OperationError(`Failed to record user response: ${error instanceof Error ? error.message : String(error)}`, {
                component: 'DevelopmentButler',
                method: 'recordUserResponse',
                requestId,
                cause: error,
            });
        }
    }
    async executeContextReload(requestId) {
        if (!this.claudeMdReloader.canReload()) {
            return {
                success: false,
                error: 'Reload cooldown active (5 minutes)',
            };
        }
        try {
            const resourceUpdate = this.claudeMdReloader.generateReloadRequest();
            this.claudeMdReloader.recordReload({
                reason: 'token-threshold',
                triggeredBy: 'user',
                metadata: { requestId },
            });
            return { success: true, resourceUpdate };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
//# sourceMappingURL=DevelopmentButler.js.map