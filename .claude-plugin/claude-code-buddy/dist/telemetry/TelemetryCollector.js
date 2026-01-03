import { sanitizeEvent } from './sanitization.js';
import packageJson from '../../package.json';
export class TelemetryCollector {
    store;
    constructor(store) {
        this.store = store;
    }
    async recordEvent(event) {
        if (!await this.isEnabled()) {
            return;
        }
        const config = await this.store.getConfig();
        const sanitized = sanitizeEvent(event);
        const fullEvent = {
            ...sanitized,
            anonymous_id: config.anonymous_id,
            timestamp: new Date().toISOString(),
            sdk_version: packageJson.version,
            node_version: process.version,
            os_platform: process.platform
        };
        await this.store.storeEventLocally(fullEvent);
    }
    async isEnabled() {
        const config = await this.store.getConfig();
        return config.enabled;
    }
    async enable() {
        await this.store.updateConfig({ enabled: true });
    }
    async disable() {
        await this.store.updateConfig({ enabled: false });
    }
    async getStatus() {
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
    async clearLocalData() {
        await this.store.clearLocalData();
    }
    getLocalPath() {
        return this.store.storagePath;
    }
}
//# sourceMappingURL=TelemetryCollector.js.map