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

/**
 * Get or create global telemetry collector
 */
export function getTelemetryCollector(): TelemetryCollector {
  if (!globalTelemetryCollector) {
    const store = new TelemetryStore();
    store.initialize().catch(console.error);
    globalTelemetryCollector = new TelemetryCollector(store);
  }
  return globalTelemetryCollector;
}

/**
 * Set global telemetry collector
 */
export function setTelemetryCollector(collector: TelemetryCollector): void {
  globalTelemetryCollector = collector;
}
