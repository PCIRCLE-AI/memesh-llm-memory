export class PatternExplainer {
    CONFIDENCE_VERY_HIGH = 0.9;
    CONFIDENCE_HIGH = 0.75;
    CONFIDENCE_MODERATE = 0.6;
    explain(pattern) {
        return {
            summary: this.generateSummary(pattern),
            reasoning: this.generateReasoning(pattern),
            recommendation: this.generateRecommendation(pattern),
            confidence_explanation: this.explainConfidence(pattern),
            context_description: this.describeContext(pattern.context),
        };
    }
    formatContextString(context) {
        if (context.agent_type && context.task_type) {
            return `${context.agent_type} doing ${context.task_type}`;
        }
        else if (context.agent_type) {
            return context.agent_type;
        }
        else if (context.task_type) {
            return `${context.task_type} tasks`;
        }
        else {
            return 'general contexts';
        }
    }
    generateSummary(pattern) {
        const contextStr = this.formatContextString(pattern.context);
        switch (pattern.type) {
            case 'success':
                return `Successful pattern for ${contextStr}: ${pattern.description}`;
            case 'optimization':
                return `Optimization for ${contextStr}: ${pattern.description}`;
            case 'anti-pattern':
                return `Pattern to avoid for ${contextStr}: ${pattern.description}`;
            case 'failure':
                return `Failure pattern for ${contextStr}: ${pattern.description}`;
            default:
                return `Pattern for ${contextStr}: ${pattern.description}`;
        }
    }
    generateReasoning(pattern) {
        const reasoning = [];
        reasoning.push(`This pattern was observed ${pattern.observations} times in similar contexts`);
        const confidencePercent = Math.round(pattern.confidence * 100);
        reasoning.push(`Pattern has ${confidencePercent}% confidence based on consistency across observations`);
        if (pattern.success_rate !== undefined && pattern.success_rate > 0) {
            const successPercent = Math.round(pattern.success_rate * 100);
            reasoning.push(`Historical success rate: ${successPercent}% when this pattern was applied`);
        }
        if (pattern.avg_execution_time !== undefined && pattern.avg_execution_time > 0) {
            reasoning.push(`Average execution time: ${pattern.avg_execution_time}ms`);
        }
        if (pattern.context.complexity) {
            reasoning.push(`Most effective for ${pattern.context.complexity} complexity tasks`);
        }
        return reasoning;
    }
    generateRecommendation(pattern) {
        const context = this.describeContext(pattern.context);
        switch (pattern.type) {
            case 'success':
                return `Consider applying this pattern when ${context}. Expected benefits: improved success rate and efficiency.`;
            case 'optimization':
                return `Apply this optimization when ${context} to improve performance metrics.`;
            case 'anti-pattern':
                return `Avoid this approach when ${context}. Consider alternative strategies to prevent failures.`;
            case 'failure':
                return `Be aware of this failure mode when ${context}. Implement safeguards or fallback mechanisms.`;
            default:
                return `Monitor this pattern when ${context} and evaluate its effectiveness.`;
        }
    }
    explainConfidence(pattern) {
        const percent = Math.round(pattern.confidence * 100);
        const observations = pattern.observations;
        let interpretation;
        if (pattern.confidence >= this.CONFIDENCE_VERY_HIGH) {
            interpretation = 'Very high confidence';
        }
        else if (pattern.confidence >= this.CONFIDENCE_HIGH) {
            interpretation = 'High confidence';
        }
        else if (pattern.confidence >= this.CONFIDENCE_MODERATE) {
            interpretation = 'Moderate confidence';
        }
        else {
            interpretation = 'Low confidence';
        }
        return `${interpretation} (${percent}%) based on ${observations} consistent observations`;
    }
    describeContext(context) {
        const parts = [];
        if (context.agent_type) {
            parts.push(`agent is ${context.agent_type}`);
        }
        if (context.task_type) {
            parts.push(`task is ${context.task_type}`);
        }
        if (context.complexity) {
            parts.push(`complexity is ${context.complexity}`);
        }
        if (context.config_keys && context.config_keys.length > 0) {
            parts.push(`using configuration: ${context.config_keys.join(', ')}`);
        }
        if (parts.length === 0) {
            return 'in general contexts';
        }
        return parts.join(' and ');
    }
}
//# sourceMappingURL=PatternExplainer.js.map