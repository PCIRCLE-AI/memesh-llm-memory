import type { Span, Pattern, Adaptation, Reward } from './types';
import { ValidationError } from '../../errors/index.js';
export { ValidationError };
export declare class NotFoundError extends Error {
    constructor(resource: string, id: string);
}
export declare function validateSpan(span: Span): void;
export declare function validatePattern(pattern: Pattern): void;
export declare function validateAdaptation(adaptation: Adaptation): void;
export declare function validateReward(reward: Reward): void;
//# sourceMappingURL=validation.d.ts.map