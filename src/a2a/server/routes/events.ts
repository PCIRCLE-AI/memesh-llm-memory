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
  if (filter.types && filter.types.length > 0) {
    if (!filter.types.includes(event.type)) {
      return false;
    }
  }

  // For task events, apply task-specific filters
  if (isTaskEvent(event.type)) {
    const data = event.data as {
      status?: string;
      creator_platform?: string;
      metadata?: string;
    };

    // Filter by status
    if (filter.status && data.status !== filter.status) {
      return false;
    }

    // Filter by platform
    if (filter.platform && data.creator_platform !== filter.platform) {
      return false;
    }

    // Filter by skills (match if ANY skill overlaps)
    if (filter.skills && filter.skills.length > 0) {
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
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Parse filter from query params
    const filter: EventFilter = {
      status: req.query.status as string | undefined,
      platform: req.query.platform as string | undefined,
      skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
      types: req.query.types ? (req.query.types as string).split(',') : undefined,
    };

    // Send any buffered events matching filter (for reconnection)
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    const missedEvents = eventEmitter.getEventsAfter(lastEventId);
    for (const event of missedEvents) {
      if (matchesFilter(event, filter)) {
        res.write(formatSSE(event));
      }
    }

    // Subscribe to new events
    const unsubscribe = eventEmitter.subscribe((event) => {
      if (matchesFilter(event, filter)) {
        res.write(formatSSE(event));
      }
    });

    // Cleanup on disconnect
    req.on('close', () => {
      unsubscribe();
    });
  });

  return router;
}
