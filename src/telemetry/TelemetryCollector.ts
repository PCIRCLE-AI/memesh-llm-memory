/**
 * Telemetry Collector - Privacy-First Event Recording
 */
import { TelemetryStore } from './TelemetryStore';
import { sanitizeEvent } from './sanitization';
import type { TelemetryEvent } from './types';

// Import version from package.json
import packageJson from '../../package.json';

export class TelemetryCollector {
  private store: TelemetryStore;

  constructor(store: TelemetryStore) {
    this.store = store;
  }

  /**
   * Record a telemetry event (only if enabled)
   */
  async recordEvent(event: Partial<TelemetryEvent>): Promise<void> {
    if (!await this.isEnabled()) {
      return;
    }

    const config = await this.store.getConfig();

    // Sanitize event (remove PII, secrets, code)
    const sanitized = sanitizeEvent(event);

    // Add common fields
    const fullEvent: TelemetryEvent = {
      ...(sanitized as Partial<TelemetryEvent>),
      anonymous_id: config.anonymous_id,
      timestamp: new Date().toISOString(),
      sdk_version: packageJson.version,
      node_version: process.version,
      os_platform: process.platform
    } as TelemetryEvent;

    // Store locally
    await this.store.storeEventLocally(fullEvent);
  }

  /**
   * Check if telemetry is enabled
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.store.getConfig();
    return config.enabled;
  }

  /**
   * Enable telemetry (opt-in)
   */
  async enable(): Promise<void> {
    await this.store.updateConfig({ enabled: true });
  }

  /**
   * Disable telemetry (opt-out)
   */
  async disable(): Promise<void> {
    await this.store.updateConfig({ enabled: false });
  }

  /**
   * Get telemetry status
   */
  async getStatus(): Promise<{
    enabled: boolean;
    anonymous_id: string;
    local_events_count: number;
    last_sent: Date | null;
  }> {
    const config = await this.store.getConfig();
    const events = await this.store.getLocalEvents({ sent: false });
    const lastSent = await this.store.getLastSentTime();

    return {
      enabled: config.enabled,
      anonymous_id: config.anonymous_id,
      local_events_count: events.length,
      last_sent: lastSent
    };
  }

  /**
   * Clear all local telemetry data
   */
  async clearLocalData(): Promise<void> {
    await this.store.clearLocalData();
  }

  /**
   * Get local storage path
   */
  getLocalPath(): string {
    return (this.store as any).storagePath;
  }
}
