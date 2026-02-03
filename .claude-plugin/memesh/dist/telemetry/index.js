export { TelemetryStore } from './TelemetryStore.js';
export { TelemetryCollector } from './TelemetryCollector.js';
export { sanitizeEvent, hashStackTrace } from './sanitization.js';
import { TelemetryStore } from './TelemetryStore.js';
import { TelemetryCollector } from './TelemetryCollector.js';
let globalTelemetryCollector = null;
let initializationPromise = null;
export async function getTelemetryCollector() {
    if (globalTelemetryCollector) {
        return globalTelemetryCollector;
    }
    if (initializationPromise) {
        return initializationPromise;
    }
    initializationPromise = (async () => {
        const store = new TelemetryStore();
        await store.initialize();
        const collector = new TelemetryCollector(store);
        globalTelemetryCollector = collector;
        return collector;
    })();
    try {
        return await initializationPromise;
    }
    finally {
        initializationPromise = null;
    }
}
export function setTelemetryCollector(collector) {
    globalTelemetryCollector = collector;
    initializationPromise = null;
}
//# sourceMappingURL=index.js.map