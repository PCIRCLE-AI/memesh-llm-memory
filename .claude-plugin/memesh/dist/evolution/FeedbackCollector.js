import { v4 as uuidv4 } from 'uuid';
export class FeedbackCollector {
    mistakes = [];
    constructor() {
    }
    recordAIMistake(input) {
        const mistake = {
            id: uuidv4(),
            timestamp: new Date(),
            action: input.action,
            errorType: input.errorType,
            userCorrection: input.userCorrection,
            correctMethod: input.correctMethod,
            impact: input.impact,
            preventionMethod: input.preventionMethod,
            relatedRule: input.relatedRule,
            context: input.context,
        };
        this.mistakes.push(mistake);
        return mistake;
    }
    getMistakes() {
        return [...this.mistakes];
    }
    getMistakesByType(errorType) {
        return this.mistakes.filter((m) => m.errorType === errorType);
    }
    getRecentMistakes(count = 10) {
        if (!Number.isFinite(count)) {
            throw new Error('count must be finite');
        }
        if (!Number.isSafeInteger(count) || count <= 0) {
            throw new Error('count must be a positive integer');
        }
        return this.mistakes
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, count);
    }
}
//# sourceMappingURL=FeedbackCollector.js.map