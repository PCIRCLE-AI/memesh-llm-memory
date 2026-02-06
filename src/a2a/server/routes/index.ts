/**
 * A2A Server Routes Index
 *
 * Exports all route handlers for the A2A server.
 */

export { createEventsRouter, matchesFilter, formatSSE } from './events.js';
export type { EventFilter } from './events.js';
