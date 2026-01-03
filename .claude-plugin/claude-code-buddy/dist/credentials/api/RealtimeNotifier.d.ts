import { EventEmitter } from 'events';
import type { Credential } from '../types.js';
import type { Identity } from '../AccessControl.js';
export declare enum EventType {
    CREDENTIAL_CREATED = "credential.created",
    CREDENTIAL_UPDATED = "credential.updated",
    CREDENTIAL_DELETED = "credential.deleted",
    CREDENTIAL_ACCESSED = "credential.accessed",
    CREDENTIAL_ROTATED = "credential.rotated",
    CREDENTIAL_EXPIRING = "credential.expiring",
    CREDENTIAL_EXPIRED = "credential.expired",
    SHARE_CREATED = "share.created",
    SHARE_REVOKED = "share.revoked",
    QUOTA_WARNING = "quota.warning",
    QUOTA_EXCEEDED = "quota.exceeded",
    SECURITY_ALERT = "security.alert",
    TENANT_CREATED = "tenant.created",
    TENANT_UPDATED = "tenant.updated",
    TENANT_SUSPENDED = "tenant.suspended"
}
export interface Event {
    type: EventType;
    tenantId: string;
    timestamp: Date;
    data: Record<string, any>;
    actor?: Identity;
    id: string;
}
export interface SubscriptionFilter {
    tenantIds?: string[];
    eventTypes?: EventType[];
    services?: string[];
    filter?: (event: Event) => boolean;
}
export type SubscriberCallback = (event: Event) => void | Promise<void>;
interface Subscription {
    id: string;
    filter: SubscriptionFilter;
    callback: SubscriberCallback;
    createdAt: Date;
}
export declare class RealtimeNotifier extends EventEmitter {
    private subscriptions;
    private eventHistory;
    private maxHistorySize;
    constructor();
    emitEvent(type: EventType, data: {
        tenantId: string;
        data: Record<string, any>;
        actor?: Identity;
    }): Promise<void>;
    subscribe(filter: SubscriptionFilter, callback: SubscriberCallback): string;
    unsubscribe(subscriptionId: string): boolean;
    getHistory(filter?: {
        tenantId?: string;
        eventType?: EventType;
        since?: Date;
        limit?: number;
    }): Event[];
    clearHistory(): void;
    getSubscriptionCount(): number;
    getTenantSubscriptions(tenantId: string): Subscription[];
    notifyCredentialCreated(tenantId: string, credential: Omit<Credential, 'value'>, actor?: Identity): Promise<void>;
    notifyCredentialUpdated(tenantId: string, service: string, account: string, fields: string[], actor?: Identity): Promise<void>;
    notifyCredentialDeleted(tenantId: string, service: string, account: string, actor?: Identity): Promise<void>;
    notifyCredentialRotated(tenantId: string, service: string, account: string, reason?: string): Promise<void>;
    notifyCredentialExpiring(tenantId: string, service: string, account: string, expiresAt: Date, daysUntilExpiry: number): Promise<void>;
    notifyQuotaWarning(tenantId: string, resource: string, usage: number, limit: number, percentage: number): Promise<void>;
    notifyQuotaExceeded(tenantId: string, resource: string, usage: number, limit: number): Promise<void>;
    notifySecurityAlert(tenantId: string, alertType: string, severity: string, details: Record<string, any>): Promise<void>;
    private matchesFilter;
    private addToHistory;
    private generateEventId;
    private generateSubscriptionId;
    dispose(): void;
}
export {};
//# sourceMappingURL=RealtimeNotifier.d.ts.map