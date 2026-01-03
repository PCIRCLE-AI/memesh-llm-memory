export class FeedbackCollector {
    learningManager;
    constructor(learningManager) {
        this.learningManager = learningManager;
    }
    recordRoutingApproval(input) {
        const { taskId, recommendedAgent, selectedAgent, wasOverridden, confidence, } = input;
        const confidencePercent = Math.round(confidence * 100);
        const feedbackType = wasOverridden
            ? 'negative'
            : 'positive';
        const rating = wasOverridden ? 2 : 5;
        const feedbackText = wasOverridden
            ? `User overrode ${recommendedAgent} recommendation (${confidencePercent}% confidence) and selected ${selectedAgent} instead`
            : `User approved ${recommendedAgent} recommendation (${confidencePercent}% confidence)`;
        const suggestions = wasOverridden
            ? [
                `Consider routing similar tasks to ${selectedAgent} instead of ${recommendedAgent}`,
                `Analyze what made ${selectedAgent} more suitable for this task`,
                `Lower confidence threshold for ${recommendedAgent} in similar contexts`,
            ]
            : undefined;
        const feedback = {
            id: `feedback-${taskId}-routing`,
            executionId: taskId,
            agentId: recommendedAgent,
            type: feedbackType,
            rating,
            feedback: feedbackText,
            suggestions,
            timestamp: new Date(),
        };
        this.learningManager.addFeedback(feedback);
        return feedback;
    }
    recordTaskCompletion(input) {
        const { taskId, agentId, success, qualityScore, durationMs, userRating, userComment, } = input;
        const feedbackType = success ? 'positive' : 'negative';
        let rating;
        if (userRating !== undefined) {
            rating = userRating;
        }
        else if (!success) {
            rating = 1;
        }
        else {
            if (qualityScore >= 0.9) {
                rating = 5;
            }
            else if (qualityScore >= 0.8) {
                rating = 4;
            }
            else if (qualityScore >= 0.7) {
                rating = 3;
            }
            else if (qualityScore >= 0.5) {
                rating = 2;
            }
            else {
                rating = 1;
            }
        }
        let feedbackText = success
            ? `Task completed successfully with quality score ${qualityScore.toFixed(2)}`
            : `Task failed with quality score ${qualityScore.toFixed(2)}`;
        if (userComment) {
            feedbackText += ` - ${userComment}`;
        }
        const issues = [];
        if (!success) {
            issues.push('Task failed');
        }
        if (qualityScore < 0.7) {
            issues.push(`Low quality score (${qualityScore.toFixed(2)})`);
        }
        if (durationMs > 30000) {
            issues.push(`Slow execution (${(durationMs / 1000).toFixed(1)}s)`);
        }
        const feedback = {
            id: `feedback-${taskId}-completion`,
            executionId: taskId,
            agentId,
            type: feedbackType,
            rating,
            feedback: feedbackText,
            issues: issues.length > 0 ? issues : undefined,
            timestamp: new Date(),
        };
        this.learningManager.addFeedback(feedback);
        return feedback;
    }
}
//# sourceMappingURL=FeedbackCollector.js.map