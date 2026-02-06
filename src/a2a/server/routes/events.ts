/**
 * SSE Events Endpoint
 *
 * Server-Sent Events endpoint for real-time task notifications.
 * Streams events to connected clients with optional filtering.
 *
 * Filter parameters:
 * - ?status=pending - Filter by task status
 * - ?platform=claude-code - Filter by creator platform
 * - ?skills=typescript,testing - Filter by required skills (comma-separated)
 * - ?types=task.created,task.claimed - Filter by event types (comma-separated)
 *
 * Supports reconnection via Last-Event-ID header.
 */

import { Router, Request, Response } from 'express';
import { A2AEventEmitter } from '../../events/A2AEventEmitter.js';
import { A2AEvent, isTaskEvent } from '../../events/types.js';

/**
 * Maximum number of concurrent SSE connections allowed
 * Prevents resource exhaustion from too many open connections (CRITICAL-SSE-2)
 */
const MAX_SSE_CONNECTIONS = 100;

// Validation constants for query parameters (MAJOR-5)
const MAX_FILTER_ITEMS = 20;
const MAX_STRING_LENGTH = 100;

/**
 * Parse and validate a comma-separated filter array from query string
 * Prevents DoS via excessive input length and limits array size
 *
 * @param value - The raw query parameter value
 * @returns Validated array of filter values, or undefined if invalid
 */
function parseFilterArray(value: unknown): string[] | undefined {
  if (!value || typeof value !== 'string') return undefined;
  // Reject overly long input to prevent DoS
  if (value.length > MAX_STRING_LENGTH * MAX_FILTER_ITEMS) return undefined;
  const items = value
    .split(',')
    .slice(0, MAX_FILTER_ITEMS)
    .map((s) => s.trim().substring(0, MAX_STRING_LENGTH))
    .filter((s) => s.length > 0);
  return items.length > 0 ? items : undefined;
}

/**
 * Track active SSE connections for connection limiting
 */
const activeConnections = new Set<Response>();

/**
 * Get current number of active SSE connections (for testing/monitoring)
 */
export function getActiveConnectionCount(): number {
  return activeConnections.size;
}

/**
 * Clear all active connections (for testing cleanup)
 */
export function clearActiveConnections(): void {
  activeConnections.clear();
}

/**
 * Event filter options for SSE streaming
 */
export interface EventFilter {
  /** Filter by task status (pending, in_progress, completed, etc.) */
  status?: string;
  /** Filter by creator platform (claude-code, cursor, etc.) */
  platform?: string;
  /** Filter by required skills (match if ANY skill overlaps) */
  skills?: string[];
  /** Filter by event types (task.created, task.claimed, etc.) */
  types?: string[];
}

/**
 * Check if an event matches the given filter
 *
 * Filter logic:
 * - If types filter is specified, event type must be in the list
 * - For task events, status and platform filters apply
 * - Agent events pass through when no task-specific filters match
 * - Multiple filters are combined with AND logic
 *
 * @param event - The event to check
 * @param filter - The filter criteria
 * @returns true if the event matches all filter criteria
 */
export function matchesFilter(event: A2AEvent, filter: EventFilter): boolean {
  // Filter by event type
  if (filter.types?.length && !filter.types.includes(event.type)) {
    return false;
  }

  // For task events, apply task-specific filters
  if (isTaskEvent(event.type)) {
    const data = event.data as {
      status?: string;
      creator_platform?: string;
      metadata?: string;
    };

    if (filter.status && data.status !== filter.status) {
      return false;
    }

    if (filter.platform && data.creator_platform !== filter.platform) {
      return false;
    }

    // Filter by skills (match if ANY skill overlaps)
    if (filter.skills?.length) {
      try {
        const metadata = data.metadata ? JSON.parse(data.metadata) : {};
        const requiredSkills: string[] = metadata.required_skills || [];
        if (requiredSkills.length > 0) {
          const hasMatch = filter.skills.some((s) => requiredSkills.includes(s));
          if (!hasMatch) {
            return false;
          }
        }
      } catch {
        // If metadata parse fails, don't filter by skills
      }
    }
  }

  return true;
}

/**
 * Format event as SSE message
 *
 * SSE format:
 * id: <event-id>
 * event: <event-type>
 * data: <json-data>
 *
 * @param event - The event to format
 * @returns Formatted SSE message string
 */
export function formatSSE(event: A2AEvent): string {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Create SSE events router
 *
 * Creates an Express router that handles SSE connections for real-time
 * event streaming. Supports optional filtering and reconnection.
 *
 * @param eventEmitter - The A2A event emitter to subscribe to
 * @returns Express router for the /events endpoint
 */
export function createEventsRouter(eventEmitter: A2AEventEmitter): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    // 🔒 SECURITY: Check connection limit (CRITICAL-SSE-2)
    if (activeConnections.size >= MAX_SSE_CONNECTIONS) {
      res.status(503).json({ error: 'Too many SSE connections' });
      return;
    }
    activeConnections.add(res);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Parse filter from query params with validation (MAJOR-5)
    const filter: EventFilter = {
      status:
        typeof req.query.status === 'string'
          ? req.query.status.substring(0, MAX_STRING_LENGTH)
          : undefined,
      platform:
        typeof req.query.platform === 'string'
          ? req.query.platform.substring(0, MAX_STRING_LENGTH)
          : undefined,
      skills: parseFilterArray(req.query.skills),
      types: parseFilterArray(req.query.types),
    };

    // Send any buffered events matching filter (for reconnection)
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    const missedEvents = eventEmitter.getEventsAfter(lastEventId);
    for (const event of missedEvents) {
      if (matchesFilter(event, filter)) {
        try {
          if (!res.writableEnded) {
            res.write(formatSSE(event));
          }
        } catch (error) {
          console.error('SSE write failed for buffered event:', error);
        }
      }
    }

    // Add heartbeat to detect stale connections
    const heartbeatInterval = setInterval(() => {
      if (!res.writableEnded) {
        try {
          res.write(':heartbeat\n\n');
        } catch (error) {
          console.error('SSE heartbeat failed:', error);
          clearInterval(heartbeatInterval);
        }
      }
    }, 30000);

    // Subscribe to new events with error handling
    const unsubscribe = eventEmitter.subscribe((event) => {
      if (matchesFilter(event, filter)) {
        try {
          if (!res.writableEnded) {
            res.write(formatSSE(event));
          }
        } catch (error) {
          console.error('SSE write failed:', error);
          unsubscribe();
          clearInterval(heartbeatInterval);
        }
      }
    });

    // Cleanup on disconnect
    req.on('close', () => {
      // 🔒 SECURITY: Remove from active connections (CRITICAL-SSE-2)
      activeConnections.delete(res);
      clearInterval(heartbeatInterval);
      unsubscribe();
    });
  });

  return router;
}
