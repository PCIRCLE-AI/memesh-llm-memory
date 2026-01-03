import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
export var EventType;
(function (EventType) {
    EventType["CREDENTIAL_CREATED"] = "credential.created";
    EventType["CREDENTIAL_UPDATED"] = "credential.updated";
    EventType["CREDENTIAL_DELETED"] = "credential.deleted";
    EventType["CREDENTIAL_ACCESSED"] = "credential.accessed";
    EventType["CREDENTIAL_ROTATED"] = "credential.rotated";
    EventType["CREDENTIAL_EXPIRING"] = "credential.expiring";
    EventType["CREDENTIAL_EXPIRED"] = "credential.expired";
    EventType["SHARE_CREATED"] = "share.created";
    EventType["SHARE_REVOKED"] = "share.revoked";
    EventType["QUOTA_WARNING"] = "quota.warning";
    EventType["QUOTA_EXCEEDED"] = "quota.exceeded";
    EventType["SECURITY_ALERT"] = "security.alert";
    EventType["TENANT_CREATED"] = "tenant.created";
    EventType["TENANT_UPDATED"] = "tenant.updated";
    EventType["TENANT_SUSPENDED"] = "tenant.suspended";
})(EventType || (EventType = {}));
export class RealtimeNotifier extends EventEmitter {
    subscriptions = new Map();
    eventHistory = [];
    maxHistorySize = 1000;
    constructor() {
        super();
        this.setMaxListeners(1000);
        logger.info('Realtime notifier initialized');
    }
    async emitEvent(type, data) {
        const event = {
            type,
            tenantId: data.tenantId,
            timestamp: new Date(),
            data: data.data,
            actor: data.actor,
            id: this.generateEventId(),
        };
        this.addToHistory(event);
        const promises = [];
        for (const subscription of this.subscriptions.values()) {
            if (this.matchesFilter(event, subscription.filter)) {
                const promise = (async () => {
                    try {
                        await subscription.callback(event);
                    }
                    catch (error) {
                        logger.error('Subscriber callback error', {
                            subscriptionId: subscription.id,
                            eventType: type,
                            error: error.message,
                        });
                    }
                })();
                promises.push(promise);
            }
        }
        await Promise.all(promises);
        super.emit(type, event);
        super.emit('*', event);
        logger.debug('Event emitted', {
            type,
            tenantId: data.tenantId,
            subscriberCount: promises.length,
        });
    }
    subscribe(filter, callback) {
        const subscriptionId = this.generateSubscriptionId();
        const subscription = {
            id: subscriptionId,
            filter,
            callback,
            createdAt: new Date(),
        };
        this.subscriptions.set(subscriptionId, subscription);
        logger.info('Subscription created', {
            subscriptionId,
            tenantIds: filter.tenantIds,
            eventTypes: filter.eventTypes,
        });
        return subscriptionId;
    }
    unsubscribe(subscriptionId) {
        const deleted = this.subscriptions.delete(subscriptionId);
        if (deleted) {
            logger.info('Subscription removed', { subscriptionId });
        }
        return deleted;
    }
    getHistory(filter) {
        let history = [...this.eventHistory];
        if (filter) {
            if (filter.tenantId) {
                history = history.filter((e) => e.tenantId === filter.tenantId);
            }
            if (filter.eventType) {
                history = history.filter((e) => e.type === filter.eventType);
            }
            if (filter.since) {
                history = history.filter((e) => e.timestamp >= filter.since);
            }
            if (filter.limit) {
                history = history.slice(-filter.limit);
            }
        }
        return history;
    }
    clearHistory() {
        this.eventHistory = [];
        logger.info('Event history cleared');
    }
    getSubscriptionCount() {
        return this.subscriptions.size;
    }
    getTenantSubscriptions(tenantId) {
        return Array.from(this.subscriptions.values()).filter((sub) => sub.filter.tenantIds ? sub.filter.tenantIds.includes(tenantId) : true);
    }
    async notifyCredentialCreated(tenantId, credential, actor) {
        await this.emitEvent(EventType.CREDENTIAL_CREATED, {
            tenantId,
            data: {
                service: credential.service,
                account: credential.account,
                metadata: credential.metadata,
            },
            actor,
        });
    }
    async notifyCredentialUpdated(tenantId, service, account, fields, actor) {
        await this.emitEvent(EventType.CREDENTIAL_UPDATED, {
            tenantId,
            data: { service, account, fields },
            actor,
        });
    }
    async notifyCredentialDeleted(tenantId, service, account, actor) {
        await this.emitEvent(EventType.CREDENTIAL_DELETED, {
            tenantId,
            data: { service, account },
            actor,
        });
    }
    async notifyCredentialRotated(tenantId, service, account, reason) {
        await this.emitEvent(EventType.CREDENTIAL_ROTATED, {
            tenantId,
            data: { service, account, reason },
        });
    }
    async notifyCredentialExpiring(tenantId, service, account, expiresAt, daysUntilExpiry) {
        await this.emitEvent(EventType.CREDENTIAL_EXPIRING, {
            tenantId,
            data: { service, account, expiresAt, daysUntilExpiry },
        });
    }
    async notifyQuotaWarning(tenantId, resource, usage, limit, percentage) {
        await this.emitEvent(EventType.QUOTA_WARNING, {
            tenantId,
            data: { resource, usage, limit, percentage },
        });
    }
    async notifyQuotaExceeded(tenantId, resource, usage, limit) {
        await this.emitEvent(EventType.QUOTA_EXCEEDED, {
            tenantId,
            data: { resource, usage, limit },
        });
    }
    async notifySecurityAlert(tenantId, alertType, severity, details) {
        await this.emitEvent(EventType.SECURITY_ALERT, {
            tenantId,
            data: { alertType, severity, ...details },
        });
    }
    matchesFilter(event, filter) {
        if (filter.tenantIds && !filter.tenantIds.includes(event.tenantId)) {
            return false;
        }
        if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
            return false;
        }
        if (filter.services && event.data.service) {
            if (!filter.services.includes(event.data.service)) {
                return false;
            }
        }
        if (filter.filter && !filter.filter(event)) {
            return false;
        }
        return true;
    }
    addToHistory(event) {
        this.eventHistory.push(event);
        while (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    generateSubscriptionId() {
        return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    dispose() {
        this.subscriptions.clear();
        this.eventHistory = [];
        this.removeAllListeners();
        logger.info('Realtime notifier disposed');
    }
}
//# sourceMappingURL=RealtimeNotifier.js.map