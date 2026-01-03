import { WorkflowGuidanceEngine } from '../core/WorkflowGuidanceEngine.js';
import { FeedbackCollector } from '../evolution/FeedbackCollector.js';
import { SessionTokenTracker } from '../core/SessionTokenTracker.js';
import { SessionContextMonitor } from '../core/SessionContextMonitor.js';
import { ClaudeMdReloader } from '../mcp/ClaudeMdReloader.js';
import { StateError, NotFoundError } from '../errors/index.js';
export class DevelopmentButler {
    checkpointDetector;
    toolInterface;
    initialized = false;
    workflowState = {
        phase: 'idle',
    };
    guidanceEngine;
    feedbackCollector;
    activeRequests = new Map();
    tokenTracker;
    contextMonitor;
    claudeMdReloader;
    constructor(checkpointDetector, toolInterface, learningManager) {
        this.checkpointDetector = checkpointDetector;
        this.toolInterface = toolInterface;
        if (learningManager) {
            this.guidanceEngine = new WorkflowGuidanceEngine(learningManager);
            this.feedbackCollector = new FeedbackCollector(learningManager);
        }
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
        this.initialized = true;
    }
    isInitialized() {
        return this.initialized;
    }
    getTokenTracker() {
        return this.tokenTracker;
    }
    getContextMonitor() {
        return this.contextMonitor;
    }
    async analyzeCodeChanges(data) {
        this.workflowState.phase = 'code-analysis';
        this.workflowState.lastCheckpoint = 'code-written';
        const files = data.files || [];
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
    async analyzeTestResults(data) {
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
    async checkCommitReadiness() {
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
    async analyzeCommit(data) {
        const production = data.production;
        const suggestedAgents = [];
        const suggestedActions = [];
        if (production) {
            suggestedAgents.push('devops-engineer');
            suggestedActions.push('Prepare deployment');
        }
        return {
            suggestedAgents,
            suggestedActions,
        };
    }
    async commitCompleted() {
        this.workflowState = {
            phase: 'idle',
        };
    }
    getWorkflowState() {
        return { ...this.workflowState };
    }
    async processCheckpoint(checkpointName, data) {
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
        const guidance = this.guidanceEngine.analyzeWorkflow(context);
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
            return { guidance, formattedRequest: enhancedRequest, requestId, sessionHealth };
        }
        return {
            guidance,
            formattedRequest,
            requestId,
            sessionHealth,
        };
    }
    formatWorkflowGuidanceRequest(topRecommendation, alternatives, confidence, reasoning) {
        const lines = [];
        lines.push('═══════════════════════════════════════════════════');
        lines.push('🔄 Workflow Guidance');
        lines.push('═══════════════════════════════════════════════════');
        lines.push('');
        const confidencePercent = Math.round(confidence * 100);
        lines.push(`✨ Recommended Action: ${topRecommendation.action} (${confidencePercent}% confidence)`);
        lines.push(`   Priority: ${topRecommendation.priority}`);
        lines.push('');
        lines.push(`📝 ${topRecommendation.description}`);
        lines.push('');
        lines.push('💡 Reasoning:');
        reasoning.forEach((reason) => {
            if (reason && reason.trim()) {
                lines.push(`   • ${reason}`);
            }
        });
        lines.push(`   • ${topRecommendation.reasoning}`);
        lines.push('');
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
    async recordUserResponse(requestId, response) {
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
        await this.feedbackCollector.recordRoutingApproval({
            taskId: requestId,
            recommendedAgent: guidance.recommendations[0].action,
            selectedAgent: (response.selectedAction || guidance.recommendations[0].action),
            wasOverridden: response.wasOverridden,
            confidence: guidance.confidence,
        });
        this.activeRequests.delete(requestId);
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