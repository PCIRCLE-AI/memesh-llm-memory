/**
 * Realtime Notifier - WebSocket Event Broadcasting
 *
 * Provides real-time notifications for:
 * - Credential changes (create, update, delete)
 * - Rotation events
 * - Expiration warnings
 * - Security alerts
 * - Quota warnings
 * - Tenant-isolated events
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import type { Credential } from '../types.js';
import type { Identity } from '../AccessControl.js';

/**
 * Event types
 */
export enum EventType {
  CREDENTIAL_CREATED = 'credential.created',
  CREDENTIAL_UPDATED = 'credential.updated',
  CREDENTIAL_DELETED = 'credential.deleted',
  CREDENTIAL_ACCESSED = 'credential.accessed',
  CREDENTIAL_ROTATED = 'credential.rotated',
  CREDENTIAL_EXPIRING = 'credential.expiring',
  CREDENTIAL_EXPIRED = 'credential.expired',
  SHARE_CREATED = 'share.created',
  SHARE_REVOKED = 'share.revoked',
  QUOTA_WARNING = 'quota.warning',
  QUOTA_EXCEEDED = 'quota.exceeded',
  SECURITY_ALERT = 'security.alert',
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_SUSPENDED = 'tenant.suspended',
}

/**
 * Event payload
 */
export interface Event {
  /**
   * Event type
   */
  type: EventType;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Event timestamp
   */
  timestamp: Date;

  /**
   * Event data
   */
  data: Record<string, any>;

  /**
   * Actor (who triggered the event)
   */
  actor?: Identity;

  /**
   * Event ID
   */
  id: string;
}

/**
 * Subscription filter
 */
export interface SubscriptionFilter {
  /**
   * Tenant IDs to subscribe to
   */
  tenantIds?: string[];

  /**
   * Event types to subscribe to
   */
  eventTypes?: EventType[];

  /**
   * Service names to filter
   */
  services?: string[];

  /**
   * Custom filter function
   */
  filter?: (event: Event) => boolean;
}

/**
 * Subscriber callback
 */
export type SubscriberCallback = (event: Event) => void | Promise<void>;

/**
 * Subscription
 */
interface Subscription {
  id: string;
  filter: SubscriptionFilter;
  callback: SubscriberCallback;
  createdAt: Date;
}

/**
 * Realtime Notifier
 */
export class RealtimeNotifier extends EventEmitter {
  private subscriptions: Map<string, Subscription> = new Map();
  private eventHistory: Event[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    super();
    this.setMaxListeners(1000); // Allow many WebSocket connections

    logger.info('Realtime notifier initialized');
  }

  /**
   * Emit an event to all subscribers
   * Note: Renamed from 'emit' to 'emitEvent' to avoid conflict with EventEmitter.emit()
   */
  async emitEvent(type: EventType, data: {
    tenantId: string;
    data: Record<string, any>;
    actor?: Identity;
  }): Promise<void> {
    const event: Event = {
      type,
      tenantId: data.tenantId,
      timestamp: new Date(),
      data: data.data,
      actor: data.actor,
      id: this.generateEventId(),
    };

    // Add to history
    this.addToHistory(event);

    // Notify all matching subscribers
    const promises: Promise<void>[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (this.matchesFilter(event, subscription.filter)) {
        const promise = (async () => {
          try {
            await subscription.callback(event);
          } catch (error: any) {
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

    // Wait for all subscribers
    await Promise.all(promises);

    // Also emit to EventEmitter listeners (legacy support)
    super.emit(type, event);
    super.emit('*', event);

    logger.debug('Event emitted', {
      type,
      tenantId: data.tenantId,
      subscriberCount: promises.length,
    });
  }

  /**
   * Subscribe to events
   */
  subscribe(filter: SubscriptionFilter, callback: SubscriberCallback): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: Subscription = {
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

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const deleted = this.subscriptions.delete(subscriptionId);

    if (deleted) {
      logger.info('Subscription removed', { subscriptionId });
    }

    return deleted;
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    tenantId?: string;
    eventType?: EventType;
    since?: Date;
    limit?: number;
  }): Event[] {
    let history = [...this.eventHistory];

    if (filter) {
      if (filter.tenantId) {
        history = history.filter((e) => e.tenantId === filter.tenantId);
      }

      if (filter.eventType) {
        history = history.filter((e) => e.type === filter.eventType);
      }

      if (filter.since) {
        history = history.filter((e) => e.timestamp >= filter.since!);
      }

      if (filter.limit) {
        history = history.slice(-filter.limit);
      }
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    logger.info('Event history cleared');
  }

  /**
   * Get active subscriptions count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get subscriptions for tenant
   */
  getTenantSubscriptions(tenantId: string): Subscription[] {
    return Array.from(this.subscriptions.values()).filter((sub) =>
      sub.filter.tenantIds ? sub.filter.tenantIds.includes(tenantId) : true
    );
  }

  /**
   * Convenience methods for common events
   */

  async notifyCredentialCreated(
    tenantId: string,
    credential: Omit<Credential, 'value'>,
    actor?: Identity
  ): Promise<void> {
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

  async notifyCredentialUpdated(
    tenantId: string,
    service: string,
    account: string,
    fields: string[],
    actor?: Identity
  ): Promise<void> {
    await this.emitEvent(EventType.CREDENTIAL_UPDATED, {
      tenantId,
      data: { service, account, fields },
      actor,
    });
  }

  async notifyCredentialDeleted(
    tenantId: string,
    service: string,
    account: string,
    actor?: Identity
  ): Promise<void> {
    await this.emitEvent(EventType.CREDENTIAL_DELETED, {
      tenantId,
      data: { service, account },
      actor,
    });
  }

  async notifyCredentialRotated(
    tenantId: string,
    service: string,
    account: string,
    reason?: string
  ): Promise<void> {
    await this.emitEvent(EventType.CREDENTIAL_ROTATED, {
      tenantId,
      data: { service, account, reason },
    });
  }

  async notifyCredentialExpiring(
    tenantId: string,
    service: string,
    account: string,
    expiresAt: Date,
    daysUntilExpiry: number
  ): Promise<void> {
    await this.emitEvent(EventType.CREDENTIAL_EXPIRING, {
      tenantId,
      data: { service, account, expiresAt, daysUntilExpiry },
    });
  }

  async notifyQuotaWarning(
    tenantId: string,
    resource: string,
    usage: number,
    limit: number,
    percentage: number
  ): Promise<void> {
    await this.emitEvent(EventType.QUOTA_WARNING, {
      tenantId,
      data: { resource, usage, limit, percentage },
    });
  }

  async notifyQuotaExceeded(
    tenantId: string,
    resource: string,
    usage: number,
    limit: number
  ): Promise<void> {
    await this.emitEvent(EventType.QUOTA_EXCEEDED, {
      tenantId,
      data: { resource, usage, limit },
    });
  }

  async notifySecurityAlert(
    tenantId: string,
    alertType: string,
    severity: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.emitEvent(EventType.SECURITY_ALERT, {
      tenantId,
      data: { alertType, severity, ...details },
    });
  }

  /**
   * Check if event matches subscription filter
   */
  private matchesFilter(event: Event, filter: SubscriptionFilter): boolean {
    // Check tenant filter
    if (filter.tenantIds && !filter.tenantIds.includes(event.tenantId)) {
      return false;
    }

    // Check event type filter
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false;
    }

    // Check service filter
    if (filter.services && event.data.service) {
      if (!filter.services.includes(event.data.service as string)) {
        return false;
      }
    }

    // Check custom filter
    if (filter.filter && !filter.filter(event)) {
      return false;
    }

    return true;
  }

  /**
   * Add event to history
   */
  private addToHistory(event: Event): void {
    this.eventHistory.push(event);

    // Trim history if too large - use shift() for memory efficiency
    // This removes elements from the front in-place instead of creating a new array
    while (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.subscriptions.clear();
    this.eventHistory = [];
    this.removeAllListeners();

    logger.info('Realtime notifier disposed');
  }
}
