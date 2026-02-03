export interface MockInteraction {
    agentId: string;
    taskType: string;
    success: boolean;
    feedback: string;
    context: Record<string, unknown>;
}
interface PatternStep {
    interaction: MockInteraction;
    expectedPattern: {
        pattern: string;
        confidence: number;
    };
}
interface PromptStep {
    promptVersion: number;
    performance: number;
    feedback: string;
    expectedChange: string;
}
interface MonitoringEvent {
    metric: string;
    value: number;
    timestamp: number;
}
interface ExpectedAlert {
    type: string;
    metric: string;
    threshold: number;
    actualValue: number;
}
export declare const scenarios: {
    patternLearning: {
        steps: PatternStep[];
    };
    promptOptimization: {
        steps: PromptStep[];
    };
    performanceMonitoring: {
        events: MonitoringEvent[];
        expectedAlert: ExpectedAlert;
    };
    endToEnd: {
        phases: string[];
        expectedOutcome: string;
    };
};
export declare function createMockInteraction(overrides?: Partial<MockInteraction>): MockInteraction;
export declare function validatePatternProgression(patterns: Array<{
    pattern: string;
    confidence: number;
}>): boolean;
export declare function validatePromptProgression(steps: PromptStep[]): boolean;
export declare function detectDegradation(events: MonitoringEvent[], threshold: number): MonitoringEvent | undefined;
export {};
//# sourceMappingURL=integration-test-scenarios.d.ts.map