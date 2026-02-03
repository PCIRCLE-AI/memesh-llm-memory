export class ServiceLocator {
    static services = new Map();
    static register(key, service) {
        if (this.services.has(key)) {
            console.warn(`ServiceLocator: Overwriting existing service '${key}'`);
        }
        this.services.set(key, service);
    }
    static get(key) {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service not found: ${key}`);
        }
        return service;
    }
    static has(key) {
        return this.services.has(key);
    }
    static clear() {
        this.services.clear();
    }
    static keys() {
        return Array.from(this.services.keys());
    }
    static unregister(key) {
        return this.services.delete(key);
    }
}
//# sourceMappingURL=ServiceLocator.js.map