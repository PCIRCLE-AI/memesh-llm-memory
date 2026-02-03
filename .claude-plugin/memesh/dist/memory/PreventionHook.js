import { logger } from '../utils/logger.js';
export class PreventionHook {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    async beforeToolCall(operation) {
        logger.debug('[PreventionHook] Tool call (prevention delegated to LLM)', {
            tool: operation.tool,
        });
        return {
            proceed: true,
            warnings: [],
            suggestions: [],
        };
    }
    async getStatistics() {
        return this.engine.getStatistics();
    }
}
//# sourceMappingURL=PreventionHook.js.map