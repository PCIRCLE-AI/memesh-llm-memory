/**
 * DaemonProtocol - IPC Message Types and Protocol Definitions
 *
 * Defines the communication protocol between daemon and proxy clients.
 * Uses JSON-RPC-like message format with additional metadata for
 * multiplexing and version management.
 */

import { logger } from '../../utils/logger.js';

/**
 * Protocol version - increment on breaking changes
 */
export const PROTOCOL_VERSION = 1;

/**
 * Message types for daemon IPC communication
 */
export enum MessageType {
  // ═══════════════════════════════════════════════════════════
  // Connection Management
  // ═══════════════════════════════════════════════════════════

  /** Initial handshake from client */
  HANDSHAKE = 'handshake',

  /** Handshake response from daemon */
  HANDSHAKE_ACK = 'handshake_ack',

  /** Client heartbeat (keep-alive) */
  HEARTBEAT = 'heartbeat',

  /** Heartbeat response */
  HEARTBEAT_ACK = 'heartbeat_ack',

  /** Client disconnect notification */
  DISCONNECT = 'disconnect',

  // ═══════════════════════════════════════════════════════════
  // MCP Request/Response
  // ═══════════════════════════════════════════════════════════

  /** MCP JSON-RPC request wrapper */
  MCP_REQUEST = 'mcp_request',

  /** MCP JSON-RPC response wrapper */
  MCP_RESPONSE = 'mcp_response',

  /** MCP notification (no response expected) */
  // TODO: MCP_NOTIFICATION is reserved for future server-to-client push notifications
  // (e.g., progress updates, resource changes). Not yet implemented.
  MCP_NOTIFICATION = 'mcp_notification',

  // ═══════════════════════════════════════════════════════════
  // Version & Upgrade Management
  // ═══════════════════════════════════════════════════════════

  /** Request daemon upgrade (newer client detected) */
  REQUEST_UPGRADE = 'request_upgrade',

  /** Upgrade accepted, preparing to shutdown */
  UPGRADE_PENDING = 'upgrade_pending',

  /** Upgrade cancelled */
  // TODO: UPGRADE_ABORT is reserved for future upgrade cancellation flow
  // (e.g., when initiating client disconnects before upgrade completes). Not yet implemented.
  UPGRADE_ABORT = 'upgrade_abort',

  // ═══════════════════════════════════════════════════════════
  // Daemon Lifecycle
  // ═══════════════════════════════════════════════════════════

  /** Daemon is shutting down */
  SHUTDOWN = 'shutdown',

  /** Error message */
  ERROR = 'error',
}

// ═══════════════════════════════════════════════════════════════════════════
// Base Message Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base message interface
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Connection Management Messages
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handshake message from client to daemon
 */
export interface HandshakeMessage extends BaseMessage {
  type: MessageType.HANDSHAKE;

  /** Unique client identifier */
  clientId: string;

  /** Client's MeMesh version */
  clientVersion: string;

  /** Protocol version client supports */
  protocolVersion: number;

  /** Client capabilities */
  capabilities: string[];

  /** Process ID of the client */
  pid: number;
}

/**
 * Handshake acknowledgment from daemon
 */
export interface HandshakeAckMessage extends BaseMessage {
  type: MessageType.HANDSHAKE_ACK;

  /** Whether handshake succeeded */
  success: boolean;

  /** Daemon's MeMesh version */
  daemonVersion: string;

  /** Protocol version daemon supports */
  protocolVersion: number;

  /** Whether upgrade is recommended (client > daemon) */
  upgradeRecommended: boolean;

  /** Error message if handshake failed */
  error?: string;

  /** Assigned client ID (may differ from requested) */
  assignedClientId: string;
}

/**
 * Heartbeat message
 */
export interface HeartbeatMessage extends BaseMessage {
  type: MessageType.HEARTBEAT;
  clientId: string;
}

/**
 * Heartbeat acknowledgment
 */
export interface HeartbeatAckMessage extends BaseMessage {
  type: MessageType.HEARTBEAT_ACK;
  clientId: string;

  /** Current daemon stats */
  stats: {
    clientCount: number;
    uptime: number;
    requestsProcessed: number;
  };
}

/**
 * Disconnect notification
 */
export interface DisconnectMessage extends BaseMessage {
  type: MessageType.DISCONNECT;
  clientId: string;
  reason: 'normal' | 'error' | 'timeout' | 'upgrade';
}

// ═══════════════════════════════════════════════════════════════════════════
// MCP Request/Response Messages
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MCP request wrapper
 */
export interface McpRequestMessage extends BaseMessage {
  type: MessageType.MCP_REQUEST;

  /** Unique request ID for response correlation */
  requestId: string;

  /** Client that sent the request */
  clientId: string;

  /** Original MCP JSON-RPC request */
  payload: unknown;
}

/**
 * MCP response wrapper
 */
export interface McpResponseMessage extends BaseMessage {
  type: MessageType.MCP_RESPONSE;

  /** Request ID this responds to */
  requestId: string;

  /** Client to route response to */
  clientId: string;

  /** Original MCP JSON-RPC response */
  payload: unknown;
}

/**
 * MCP notification (no response expected)
 */
export interface McpNotificationMessage extends BaseMessage {
  type: MessageType.MCP_NOTIFICATION;
  clientId: string;
  payload: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// Upgrade Management Messages
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Upgrade request from newer client
 */
export interface RequestUpgradeMessage extends BaseMessage {
  type: MessageType.REQUEST_UPGRADE;
  clientId: string;

  /** New version to upgrade to */
  newVersion: string;

  /** Reason for upgrade request */
  reason: 'version_mismatch' | 'user_requested' | 'health_check_failed';
}

/**
 * Upgrade pending notification (sent to all clients)
 */
export interface UpgradePendingMessage extends BaseMessage {
  type: MessageType.UPGRADE_PENDING;

  /** New version being upgraded to */
  newVersion: string;

  /** Estimated time until shutdown (ms) */
  estimatedShutdownTime: number;

  /** Client that will become new daemon */
  initiatorClientId: string;
}

/**
 * Upgrade abort notification
 */
export interface UpgradeAbortMessage extends BaseMessage {
  type: MessageType.UPGRADE_ABORT;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Lifecycle Messages
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shutdown notification
 */
export interface ShutdownMessage extends BaseMessage {
  type: MessageType.SHUTDOWN;
  reason: 'upgrade' | 'user_requested' | 'idle_timeout' | 'error';

  /** Grace period before force shutdown (ms) */
  gracePeriod: number;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  code: string;
  message: string;
  details?: unknown;

  /** Related request ID if applicable */
  requestId?: string;

  /** Related client ID if applicable */
  clientId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Union Type
// ═══════════════════════════════════════════════════════════════════════════

/**
 * All possible daemon messages
 */
export type DaemonMessage =
  | HandshakeMessage
  | HandshakeAckMessage
  | HeartbeatMessage
  | HeartbeatAckMessage
  | DisconnectMessage
  | McpRequestMessage
  | McpResponseMessage
  | McpNotificationMessage
  | RequestUpgradeMessage
  | UpgradePendingMessage
  | UpgradeAbortMessage
  | ShutdownMessage
  | ErrorMessage;

// ═══════════════════════════════════════════════════════════════════════════
// Message Factories
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a handshake message
 */
export function createHandshake(
  clientId: string,
  clientVersion: string,
  capabilities: string[] = []
): HandshakeMessage {
  return {
    type: MessageType.HANDSHAKE,
    timestamp: Date.now(),
    clientId,
    clientVersion,
    protocolVersion: PROTOCOL_VERSION,
    capabilities,
    pid: process.pid,
  };
}

/**
 * Create a handshake acknowledgment
 */
export function createHandshakeAck(
  success: boolean,
  daemonVersion: string,
  assignedClientId: string,
  upgradeRecommended: boolean = false,
  error?: string
): HandshakeAckMessage {
  return {
    type: MessageType.HANDSHAKE_ACK,
    timestamp: Date.now(),
    success,
    daemonVersion,
    protocolVersion: PROTOCOL_VERSION,
    upgradeRecommended,
    assignedClientId,
    error,
  };
}

/**
 * Create an MCP request wrapper
 */
export function createMcpRequest(
  requestId: string,
  clientId: string,
  payload: unknown
): McpRequestMessage {
  return {
    type: MessageType.MCP_REQUEST,
    timestamp: Date.now(),
    requestId,
    clientId,
    payload,
  };
}

/**
 * Create an MCP response wrapper
 */
export function createMcpResponse(
  requestId: string,
  clientId: string,
  payload: unknown
): McpResponseMessage {
  return {
    type: MessageType.MCP_RESPONSE,
    timestamp: Date.now(),
    requestId,
    clientId,
    payload,
  };
}

/**
 * Create an error message
 */
export function createError(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
  clientId?: string
): ErrorMessage {
  return {
    type: MessageType.ERROR,
    timestamp: Date.now(),
    code,
    message,
    details,
    requestId,
    clientId,
  };
}

/**
 * Create a shutdown message
 */
export function createShutdown(
  reason: ShutdownMessage['reason'],
  gracePeriod: number = 5000
): ShutdownMessage {
  return {
    type: MessageType.SHUTDOWN,
    timestamp: Date.now(),
    reason,
    gracePeriod,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Message Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a valid MessageType enum value
 */
function isValidMessageType(value: unknown): value is MessageType {
  return Object.values(MessageType).includes(value as MessageType);
}

/**
 * Validate base message fields (type and timestamp)
 */
function hasValidBaseFields(msg: Record<string, unknown>): boolean {
  return (
    isValidMessageType(msg.type) &&
    typeof msg.timestamp === 'number' &&
    Number.isFinite(msg.timestamp)
  );
}

/**
 * Log validation failure for debugging
 */
function logValidationFailure(
  messageType: string,
  reason: string,
  data?: unknown
): void {
  // Use logger.debug for validation failures - helps debugging without cluttering logs
  logger.debug(`[DaemonProtocol] Validation failed for ${messageType}: ${reason}`, {
    ...(data !== undefined ? { data } : {}),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Message Type Validators
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate HandshakeMessage
 */
export function validateHandshakeMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.HANDSHAKE) {
    logValidationFailure('HANDSHAKE', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure('HANDSHAKE', 'clientId must be string', msg.clientId);
    return false;
  }
  if (typeof msg.clientVersion !== 'string') {
    logValidationFailure(
      'HANDSHAKE',
      'clientVersion must be string',
      msg.clientVersion
    );
    return false;
  }
  if (
    typeof msg.protocolVersion !== 'number' ||
    !Number.isInteger(msg.protocolVersion)
  ) {
    logValidationFailure(
      'HANDSHAKE',
      'protocolVersion must be integer',
      msg.protocolVersion
    );
    return false;
  }
  if (msg.protocolVersion < 1 || msg.protocolVersion > 100) {
    logValidationFailure(
      'HANDSHAKE',
      'protocolVersion must be between 1 and 100',
      msg.protocolVersion
    );
    return false;
  }
  if (!Array.isArray(msg.capabilities)) {
    logValidationFailure(
      'HANDSHAKE',
      'capabilities must be array',
      msg.capabilities
    );
    return false;
  }
  if (
    !msg.capabilities.every((cap: unknown) => typeof cap === 'string')
  ) {
    logValidationFailure(
      'HANDSHAKE',
      'all capabilities must be strings',
      msg.capabilities
    );
    return false;
  }
  if (typeof msg.pid !== 'number' || !Number.isInteger(msg.pid)) {
    logValidationFailure('HANDSHAKE', 'pid must be integer', msg.pid);
    return false;
  }
  if (msg.pid <= 0) {
    logValidationFailure('HANDSHAKE', 'pid must be positive (> 0)', msg.pid);
    return false;
  }
  return true;
}

/**
 * Validate HandshakeAckMessage
 */
export function validateHandshakeAckMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.HANDSHAKE_ACK) {
    logValidationFailure('HANDSHAKE_ACK', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.success !== 'boolean') {
    logValidationFailure(
      'HANDSHAKE_ACK',
      'success must be boolean',
      msg.success
    );
    return false;
  }
  if (typeof msg.daemonVersion !== 'string') {
    logValidationFailure(
      'HANDSHAKE_ACK',
      'daemonVersion must be string',
      msg.daemonVersion
    );
    return false;
  }
  if (
    typeof msg.protocolVersion !== 'number' ||
    !Number.isInteger(msg.protocolVersion)
  ) {
    logValidationFailure(
      'HANDSHAKE_ACK',
      'protocolVersion must be integer',
      msg.protocolVersion
    );
    return false;
  }
  if (msg.protocolVersion < 1 || msg.protocolVersion > 100) {
    logValidationFailure(
      'HANDSHAKE_ACK',
      'protocolVersion must be between 1 and 100',
      msg.protocolVersion
    );
    return false;
  }
  if (typeof msg.upgradeRecommended !== 'boolean') {
    logValidationFailure(
      'HANDSHAKE_ACK',
      'upgradeRecommended must be boolean',
      msg.upgradeRecommended
    );
    return false;
  }
  if (typeof msg.assignedClientId !== 'string') {
    logValidationFailure(
      'HANDSHAKE_ACK',
      'assignedClientId must be string',
      msg.assignedClientId
    );
    return false;
  }
  // error is optional
  if (msg.error !== undefined && typeof msg.error !== 'string') {
    logValidationFailure(
      'HANDSHAKE_ACK',
      'error must be string if present',
      msg.error
    );
    return false;
  }
  return true;
}

/**
 * Validate HeartbeatMessage
 */
export function validateHeartbeatMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.HEARTBEAT) {
    logValidationFailure('HEARTBEAT', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure('HEARTBEAT', 'clientId must be string', msg.clientId);
    return false;
  }
  return true;
}

/**
 * Validate HeartbeatAckMessage
 */
export function validateHeartbeatAckMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.HEARTBEAT_ACK) {
    logValidationFailure('HEARTBEAT_ACK', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure(
      'HEARTBEAT_ACK',
      'clientId must be string',
      msg.clientId
    );
    return false;
  }
  if (!isObject(msg.stats)) {
    logValidationFailure(
      'HEARTBEAT_ACK',
      'stats must be object',
      msg.stats
    );
    return false;
  }
  const stats = msg.stats as Record<string, unknown>;
  if (typeof stats.clientCount !== 'number' || !Number.isFinite(stats.clientCount)) {
    logValidationFailure(
      'HEARTBEAT_ACK',
      'stats.clientCount must be number',
      stats.clientCount
    );
    return false;
  }
  if (typeof stats.uptime !== 'number' || !Number.isFinite(stats.uptime)) {
    logValidationFailure(
      'HEARTBEAT_ACK',
      'stats.uptime must be number',
      stats.uptime
    );
    return false;
  }
  if (
    typeof stats.requestsProcessed !== 'number' ||
    !Number.isFinite(stats.requestsProcessed)
  ) {
    logValidationFailure(
      'HEARTBEAT_ACK',
      'stats.requestsProcessed must be number',
      stats.requestsProcessed
    );
    return false;
  }
  return true;
}

/**
 * Validate DisconnectMessage
 */
export function validateDisconnectMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.DISCONNECT) {
    logValidationFailure('DISCONNECT', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure('DISCONNECT', 'clientId must be string', msg.clientId);
    return false;
  }
  const validReasons = ['normal', 'error', 'timeout', 'upgrade'];
  if (!validReasons.includes(msg.reason as string)) {
    logValidationFailure(
      'DISCONNECT',
      `reason must be one of: ${validReasons.join(', ')}`,
      msg.reason
    );
    return false;
  }
  return true;
}

/**
 * Validate McpRequestMessage
 */
export function validateMcpRequestMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.MCP_REQUEST) {
    logValidationFailure('MCP_REQUEST', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.requestId !== 'string') {
    logValidationFailure(
      'MCP_REQUEST',
      'requestId must be string',
      msg.requestId
    );
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure(
      'MCP_REQUEST',
      'clientId must be string',
      msg.clientId
    );
    return false;
  }
  // payload can be any type, but must be present
  if (!('payload' in msg)) {
    logValidationFailure('MCP_REQUEST', 'payload field is required');
    return false;
  }
  return true;
}

/**
 * Validate McpResponseMessage
 */
export function validateMcpResponseMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.MCP_RESPONSE) {
    logValidationFailure('MCP_RESPONSE', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.requestId !== 'string') {
    logValidationFailure(
      'MCP_RESPONSE',
      'requestId must be string',
      msg.requestId
    );
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure(
      'MCP_RESPONSE',
      'clientId must be string',
      msg.clientId
    );
    return false;
  }
  // payload can be any type, but must be present
  if (!('payload' in msg)) {
    logValidationFailure('MCP_RESPONSE', 'payload field is required');
    return false;
  }
  return true;
}

/**
 * Validate McpNotificationMessage
 */
export function validateMcpNotificationMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.MCP_NOTIFICATION) {
    logValidationFailure('MCP_NOTIFICATION', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure(
      'MCP_NOTIFICATION',
      'clientId must be string',
      msg.clientId
    );
    return false;
  }
  // payload can be any type, but must be present
  if (!('payload' in msg)) {
    logValidationFailure('MCP_NOTIFICATION', 'payload field is required');
    return false;
  }
  return true;
}

/**
 * Validate RequestUpgradeMessage
 */
export function validateRequestUpgradeMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.REQUEST_UPGRADE) {
    logValidationFailure('REQUEST_UPGRADE', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.clientId !== 'string') {
    logValidationFailure(
      'REQUEST_UPGRADE',
      'clientId must be string',
      msg.clientId
    );
    return false;
  }
  if (typeof msg.newVersion !== 'string') {
    logValidationFailure(
      'REQUEST_UPGRADE',
      'newVersion must be string',
      msg.newVersion
    );
    return false;
  }
  const validReasons = ['version_mismatch', 'user_requested', 'health_check_failed'];
  if (!validReasons.includes(msg.reason as string)) {
    logValidationFailure(
      'REQUEST_UPGRADE',
      `reason must be one of: ${validReasons.join(', ')}`,
      msg.reason
    );
    return false;
  }
  return true;
}

/**
 * Validate UpgradePendingMessage
 */
export function validateUpgradePendingMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.UPGRADE_PENDING) {
    logValidationFailure('UPGRADE_PENDING', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.newVersion !== 'string') {
    logValidationFailure(
      'UPGRADE_PENDING',
      'newVersion must be string',
      msg.newVersion
    );
    return false;
  }
  if (
    typeof msg.estimatedShutdownTime !== 'number' ||
    !Number.isFinite(msg.estimatedShutdownTime)
  ) {
    logValidationFailure(
      'UPGRADE_PENDING',
      'estimatedShutdownTime must be number',
      msg.estimatedShutdownTime
    );
    return false;
  }
  if (typeof msg.initiatorClientId !== 'string') {
    logValidationFailure(
      'UPGRADE_PENDING',
      'initiatorClientId must be string',
      msg.initiatorClientId
    );
    return false;
  }
  return true;
}

/**
 * Validate UpgradeAbortMessage
 */
export function validateUpgradeAbortMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.UPGRADE_ABORT) {
    logValidationFailure('UPGRADE_ABORT', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.reason !== 'string') {
    logValidationFailure(
      'UPGRADE_ABORT',
      'reason must be string',
      msg.reason
    );
    return false;
  }
  return true;
}

/**
 * Validate ShutdownMessage
 */
export function validateShutdownMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.SHUTDOWN) {
    logValidationFailure('SHUTDOWN', 'incorrect type', msg.type);
    return false;
  }
  const validReasons = ['upgrade', 'user_requested', 'idle_timeout', 'error'];
  if (!validReasons.includes(msg.reason as string)) {
    logValidationFailure(
      'SHUTDOWN',
      `reason must be one of: ${validReasons.join(', ')}`,
      msg.reason
    );
    return false;
  }
  if (
    typeof msg.gracePeriod !== 'number' ||
    !Number.isFinite(msg.gracePeriod)
  ) {
    logValidationFailure(
      'SHUTDOWN',
      'gracePeriod must be number',
      msg.gracePeriod
    );
    return false;
  }
  return true;
}

/**
 * Validate ErrorMessage
 */
export function validateErrorMessage(
  msg: Record<string, unknown>
): boolean {
  if (msg.type !== MessageType.ERROR) {
    logValidationFailure('ERROR', 'incorrect type', msg.type);
    return false;
  }
  if (typeof msg.code !== 'string') {
    logValidationFailure('ERROR', 'code must be string', msg.code);
    return false;
  }
  if (typeof msg.message !== 'string') {
    logValidationFailure('ERROR', 'message must be string', msg.message);
    return false;
  }
  // details is optional and can be any type
  // requestId is optional
  if (msg.requestId !== undefined && typeof msg.requestId !== 'string') {
    logValidationFailure(
      'ERROR',
      'requestId must be string if present',
      msg.requestId
    );
    return false;
  }
  // clientId is optional
  if (msg.clientId !== undefined && typeof msg.clientId !== 'string') {
    logValidationFailure(
      'ERROR',
      'clientId must be string if present',
      msg.clientId
    );
    return false;
  }
  return true;
}

/**
 * Validate a message based on its type
 * Returns the validated message or null if validation fails
 */
export function validateMessage(
  msg: Record<string, unknown>
): DaemonMessage | null {
  // First check base fields
  if (!hasValidBaseFields(msg)) {
    logValidationFailure('BaseMessage', 'invalid base fields (type or timestamp)');
    return null;
  }

  // Validate based on message type
  // Note: We cast through 'unknown' first to satisfy TypeScript's type safety checks.
  // This is safe because we've validated all fields before casting.
  switch (msg.type) {
    case MessageType.HANDSHAKE:
      return validateHandshakeMessage(msg)
        ? (msg as unknown as HandshakeMessage)
        : null;

    case MessageType.HANDSHAKE_ACK:
      return validateHandshakeAckMessage(msg)
        ? (msg as unknown as HandshakeAckMessage)
        : null;

    case MessageType.HEARTBEAT:
      return validateHeartbeatMessage(msg)
        ? (msg as unknown as HeartbeatMessage)
        : null;

    case MessageType.HEARTBEAT_ACK:
      return validateHeartbeatAckMessage(msg)
        ? (msg as unknown as HeartbeatAckMessage)
        : null;

    case MessageType.DISCONNECT:
      return validateDisconnectMessage(msg)
        ? (msg as unknown as DisconnectMessage)
        : null;

    case MessageType.MCP_REQUEST:
      return validateMcpRequestMessage(msg)
        ? (msg as unknown as McpRequestMessage)
        : null;

    case MessageType.MCP_RESPONSE:
      return validateMcpResponseMessage(msg)
        ? (msg as unknown as McpResponseMessage)
        : null;

    case MessageType.MCP_NOTIFICATION:
      return validateMcpNotificationMessage(msg)
        ? (msg as unknown as McpNotificationMessage)
        : null;

    case MessageType.REQUEST_UPGRADE:
      return validateRequestUpgradeMessage(msg)
        ? (msg as unknown as RequestUpgradeMessage)
        : null;

    case MessageType.UPGRADE_PENDING:
      return validateUpgradePendingMessage(msg)
        ? (msg as unknown as UpgradePendingMessage)
        : null;

    case MessageType.UPGRADE_ABORT:
      return validateUpgradeAbortMessage(msg)
        ? (msg as unknown as UpgradeAbortMessage)
        : null;

    case MessageType.SHUTDOWN:
      return validateShutdownMessage(msg)
        ? (msg as unknown as ShutdownMessage)
        : null;

    case MessageType.ERROR:
      return validateErrorMessage(msg)
        ? (msg as unknown as ErrorMessage)
        : null;

    default:
      logValidationFailure('Unknown', `unrecognized message type: ${msg.type}`);
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Message Parsing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a raw message buffer into a DaemonMessage
 *
 * Messages are newline-delimited JSON.
 * Performs full runtime validation of all message fields.
 */
export function parseMessage(data: string): DaemonMessage | null {
  try {
    const parsed = JSON.parse(data);

    // Validate it's an object
    if (!isObject(parsed)) {
      logValidationFailure('parseMessage', 'parsed data is not an object');
      return null;
    }

    // Perform full validation based on message type
    return validateMessage(parsed);
  } catch (error) {
    logValidationFailure(
      'parseMessage',
      'JSON parse error',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Serialize a message for transmission
 *
 * Messages are newline-delimited JSON
 */
export function serializeMessage(message: DaemonMessage): string {
  return JSON.stringify(message) + '\n';
}

/**
 * Message delimiter for framing
 */
export const MESSAGE_DELIMITER = '\n';
