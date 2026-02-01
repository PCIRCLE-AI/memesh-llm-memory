/**
 * Telemetry Module - Privacy-First Analytics
 */

export { TelemetryStore } from './TelemetryStore';
export { TelemetryCollector } from './TelemetryCollector';
export { sanitizeEvent, hashStackTrace } from './sanitization';
export type * from './types';

import { TelemetryStore } from './TelemetryStore';
import { TelemetryCollector } from './TelemetryCollector';

let globalTelemetryCollector: TelemetryCollector | null = null;
let initializationPromise: Promise<TelemetryCollector> | null = null;

/**
 * Get or create global telemetry collector (async, thread-safe)
 *
 * IMPORTANT: This function is now async to ensure proper initialization.
 * Always await this call before using the collector.
 */
export async function getTelemetryCollector(): Promise<TelemetryCollector> {
  // If already initialized, return immediately
  if (globalTelemetryCollector) {
    return globalTelemetryCollector;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization (only once, even if called concurrently)
  initializationPromise = (async () => {
    const store = new TelemetryStore();
    await store.initialize(); // FIXED: Now properly awaited
    const collector = new TelemetryCollector(store);
    globalTelemetryCollector = collector;
    return collector;
  })();

  try {
    return await initializationPromise;
  } finally {
    // Clear the promise after initialization completes (success or failure)
    // This allows retry on failure
    initializationPromise = null;
  }
}

/**
 * Set global telemetry collector
 */
export function setTelemetryCollector(collector: TelemetryCollector | null): void {
  globalTelemetryCollector = collector;
  initializationPromise = null; // Reset initialization state
}
