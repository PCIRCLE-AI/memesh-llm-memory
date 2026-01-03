import { ValidationError } from '../errors/index.js';
export class HumanInLoopUI {
    formatConfirmationRequest(request) {
        if (!request.taskDescription || !request.taskDescription.trim()) {
            throw new ValidationError('Invalid confirmation request: taskDescription is required', {
                component: 'HumanInLoopUI',
                method: 'formatConfirmationRequest',
                providedValue: request.taskDescription,
                requiredField: 'taskDescription',
            });
        }
        if (!request.recommendedAgent) {
            throw new ValidationError('Invalid confirmation request: recommendedAgent is required', {
                component: 'HumanInLoopUI',
                method: 'formatConfirmationRequest',
                providedValue: request.recommendedAgent,
                requiredField: 'recommendedAgent',
            });
        }
        const reasoning = request.reasoning || [];
        const alternatives = request.alternatives || [];
        const lines = [];
        lines.push('═══════════════════════════════════════════════════');
        lines.push('🤖 Smart Agent Router - Recommendation');
        lines.push('═══════════════════════════════════════════════════');
        lines.push('');
        lines.push(`📋 Task: ${request.taskDescription}`);
        lines.push('');
        const confidencePercent = Math.round(request.confidence * 100);
        lines.push(`✨ Recommended Agent: ${request.recommendedAgent} (${confidencePercent}% confidence)`);
        lines.push('');
        lines.push('💡 Reasoning:');
        reasoning.forEach(reason => {
            if (reason && reason.trim()) {
                lines.push(`   • ${reason}`);
            }
        });
        lines.push('');
        if (alternatives.length > 0) {
            lines.push('🔄 Alternative Agents:');
            alternatives.forEach((alt, index) => {
                const altConfidence = Math.round(alt.confidence * 100);
                lines.push(`   ${index + 1}. ${alt.agent} (${altConfidence}%) - ${alt.reason}`);
            });
            lines.push('');
        }
        if (alternatives.length > 0) {
            const maxIndex = alternatives.length;
            lines.push(`❓ Proceed with ${request.recommendedAgent}? [y/n/1-${maxIndex}]`);
            lines.push(`   y = Accept recommendation`);
            lines.push(`   n = Reject`);
            lines.push(`   1-${maxIndex} = Choose alternative agent`);
        }
        else {
            lines.push(`❓ Proceed with ${request.recommendedAgent}? [y/n]`);
            lines.push(`   y = Accept recommendation`);
            lines.push(`   n = Reject`);
        }
        lines.push('═══════════════════════════════════════════════════');
        return lines.join('\n');
    }
    parseUserResponse(input, request) {
        const trimmed = input.trim().toLowerCase();
        if (trimmed === 'y' || trimmed === 'yes') {
            return {
                accepted: true,
                selectedAgent: request.recommendedAgent,
                wasOverridden: false,
            };
        }
        if (trimmed === 'n' || trimmed === 'no') {
            return {
                accepted: false,
                wasOverridden: false,
            };
        }
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= request.alternatives.length) {
            const selectedAlt = request.alternatives[num - 1];
            return {
                accepted: true,
                selectedAgent: selectedAlt.agent,
                wasOverridden: true,
            };
        }
        return {
            accepted: false,
            wasOverridden: false,
        };
    }
}
//# sourceMappingURL=HumanInLoopUI.js.map