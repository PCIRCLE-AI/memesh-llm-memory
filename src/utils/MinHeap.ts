/**
 * Generic Min-Heap Implementation
 *
 * A binary min-heap data structure that maintains elements in sorted order
 * with O(log N) insertion and extraction. Used for efficient priority queue operations.
 *
 * Time Complexity:
 * - Insert: O(log N)
 * - Extract Min: O(log N)
 * - Peek Min: O(1)
 * - Size: O(1)
 *
 * @template T - Type of elements stored in the heap
 */
export class MinHeap<T> {
  private heap: T[] = [];
  private compareFn: (a: T, b: T) => number;

  /**
   * Create a new MinHeap
   *
   * @param compareFn - Comparison function that returns:
   *   - negative if a < b (a has higher priority)
   *   - 0 if a === b
   *   - positive if a > b (b has higher priority)
   */
  constructor(compareFn: (a: T, b: T) => number) {
    this.compareFn = compareFn;
  }

  /**
   * Get the number of elements in the heap
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Check if the heap is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Get the minimum element without removing it
   *
   * @returns The minimum element or undefined if heap is empty
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * Insert an element into the heap
   *
   * Time Complexity: O(log N)
   *
   * @param value - Element to insert
   */
  push(value: T): void {
    this.heap.push(value);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the minimum element
   *
   * Time Complexity: O(log N)
   *
   * @returns The minimum element or undefined if heap is empty
   */
  pop(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return min;
  }

  /**
   * Remove all elements from the heap
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * Get all elements in the heap (not in sorted order)
   *
   * @returns Array of all elements
   */
  toArray(): T[] {
    return [...this.heap];
  }

  /**
   * Bubble up element at index to maintain heap property
   *
   * @param index - Index of element to bubble up
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.compareFn(this.heap[index], this.heap[parentIndex]) >= 0) {
        // Heap property satisfied
        break;
      }

      // Swap with parent
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  /**
   * Bubble down element at index to maintain heap property
   *
   * @param index - Index of element to bubble down
   */
  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (
        leftChild < this.heap.length &&
        this.compareFn(this.heap[leftChild], this.heap[smallest]) < 0
      ) {
        smallest = leftChild;
      }

      if (
        rightChild < this.heap.length &&
        this.compareFn(this.heap[rightChild], this.heap[smallest]) < 0
      ) {
        smallest = rightChild;
      }

      if (smallest === index) {
        // Heap property satisfied
        break;
      }

      // Swap with smallest child
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}
