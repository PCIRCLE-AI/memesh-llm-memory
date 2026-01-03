export declare class MinHeap<T> {
    private heap;
    private compareFn;
    constructor(compareFn: (a: T, b: T) => number);
    get size(): number;
    isEmpty(): boolean;
    peek(): T | undefined;
    push(value: T): void;
    pop(): T | undefined;
    clear(): void;
    toArray(): T[];
    private bubbleUp;
    private bubbleDown;
}
//# sourceMappingURL=MinHeap.d.ts.map