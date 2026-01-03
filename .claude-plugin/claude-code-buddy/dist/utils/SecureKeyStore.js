import { ValidationError } from '../errors/index.js';
export class SecureKeyStore {
    static keys = new Map();
    static set(provider, key) {
        if (!provider || !key) {
            throw new ValidationError('Provider and key must be non-empty strings', {
                component: 'SecureKeyStore',
                method: 'set',
                providedProvider: provider,
                providedKey: key ? '[REDACTED]' : undefined,
                constraint: 'both provider and key must be non-empty strings',
            });
        }
        this.keys.set(provider.toLowerCase(), key);
    }
    static get(provider) {
        return this.keys.get(provider.toLowerCase());
    }
    static has(provider) {
        return this.keys.has(provider.toLowerCase());
    }
    static delete(provider) {
        this.keys.delete(provider.toLowerCase());
    }
    static clear() {
        this.keys.clear();
    }
    static listProviders() {
        return Array.from(this.keys.keys());
    }
}
//# sourceMappingURL=SecureKeyStore.js.map