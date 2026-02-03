export const scenarios = {
    patternLearning: {
        steps: [
            {
                interaction: {
                    agentId: 'test-agent',
                    taskType: 'code-review',
                    success: false,
                    feedback: 'Missing error handling in async functions',
                    context: { language: 'typescript', complexity: 'medium' },
                },
                expectedPattern: {
                    pattern: 'always add error handling to async functions',
                    confidence: 0.3,
                },
            },
            {
                interaction: {
                    agentId: 'test-agent',
                    taskType: 'code-review',
                    success: false,
                    feedback: 'Missing error handling for database operations',
                    context: { language: 'typescript', complexity: 'medium' },
                },
                expectedPattern: {
                    pattern: 'always add error handling to async functions',
                    confidence: 0.6,
                },
            },
            {
                interaction: {
                    agentId: 'test-agent',
                    taskType: 'code-review',
                    success: false,
                    feedback: 'Need better error handling in API calls',
                    context: { language: 'typescript', complexity: 'medium' },
                },
                expectedPattern: {
                    pattern: 'always add error handling to async functions',
                    confidence: 0.9,
                },
            },
        ],
    },
    promptOptimization: {
        steps: [
            {
                promptVersion: 1,
                performance: 0.6,
                feedback: 'Outputs are too verbose',
                expectedChange: 'concise',
            },
            {
                promptVersion: 2,
                performance: 0.75,
                feedback: 'Better but missing examples',
                expectedChange: 'examples',
            },
            {
                promptVersion: 3,
                performance: 0.85,
                feedback: 'Good quality outputs',
                expectedChange: 'No change needed - performance threshold met',
            },
        ],
    },
    performanceMonitoring: {
        events: [
            { metric: 'success_rate', value: 0.9, timestamp: Date.now() - 4000 },
            { metric: 'success_rate', value: 0.85, timestamp: Date.now() - 3000 },
            { metric: 'success_rate', value: 0.75, timestamp: Date.now() - 2000 },
            { metric: 'success_rate', value: 0.65, timestamp: Date.now() - 1000 },
            { metric: 'success_rate', value: 0.55, timestamp: Date.now() },
        ],
        expectedAlert: {
            type: 'performance_degradation',
            metric: 'success_rate',
            threshold: 0.7,
            actualValue: 0.65,
        },
    },
    endToEnd: {
        phases: ['learning', 'adaptation', 'monitoring'],
        expectedOutcome: 'continuous_improvement',
    },
};
export function createMockInteraction(overrides = {}) {
    return {
        agentId: 'test-agent',
        taskType: 'general',
        success: true,
        feedback: '',
        context: {},
        ...overrides,
    };
}
export function validatePatternProgression(patterns) {
    if (patterns.length < 2) {
        return true;
    }
    let previousConfidence = 0;
    for (const pattern of patterns) {
        if (pattern.confidence < previousConfidence * 0.9) {
            return false;
        }
        previousConfidence = pattern.confidence;
    }
    return true;
}
export function validatePromptProgression(steps) {
    if (steps.length < 2) {
        return true;
    }
    let previousPerformance = 0;
    for (const step of steps) {
        if (step.performance < previousPerformance * 0.95) {
            return false;
        }
        previousPerformance = step.performance;
    }
    return true;
}
export function detectDegradation(events, threshold) {
    for (const event of events) {
        if (event.value < threshold) {
            return event;
        }
    }
    return undefined;
}
//# sourceMappingURL=integration-test-scenarios.js.map