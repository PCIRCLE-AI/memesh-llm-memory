import type { TaskState, TaskPriority } from '../types/index.js';
export declare function validateArraySize<T>(array: T[], fieldName: string, maxSize?: number): void;
export declare function validateTaskStates(states: string[]): asserts states is TaskState[];
export declare function validateTaskPriorities(priorities: string[]): asserts priorities is TaskPriority[];
export declare function validatePositiveInteger(value: number, fieldName: string, max?: number): void;
export declare function validateISOTimestamp(value: string, fieldName: string): void;
//# sourceMappingURL=inputValidation.d.ts.map