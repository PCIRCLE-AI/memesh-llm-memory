import { logger } from '../../utils/logger.js';
export const PROTOCOL_VERSION = 1;
export var MessageType;
(function (MessageType) {
    MessageType["HANDSHAKE"] = "handshake";
    MessageType["HANDSHAKE_ACK"] = "handshake_ack";
    MessageType["HEARTBEAT"] = "heartbeat";
    MessageType["HEARTBEAT_ACK"] = "heartbeat_ack";
    MessageType["DISCONNECT"] = "disconnect";
    MessageType["MCP_REQUEST"] = "mcp_request";
    MessageType["MCP_RESPONSE"] = "mcp_response";
    MessageType["MCP_NOTIFICATION"] = "mcp_notification";
    MessageType["REQUEST_UPGRADE"] = "request_upgrade";
    MessageType["UPGRADE_PENDING"] = "upgrade_pending";
    MessageType["UPGRADE_ABORT"] = "upgrade_abort";
    MessageType["SHUTDOWN"] = "shutdown";
    MessageType["ERROR"] = "error";
})(MessageType || (MessageType = {}));
export function createHandshake(clientId, clientVersion, capabilities = []) {
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
export function createHandshakeAck(success, daemonVersion, assignedClientId, upgradeRecommended = false, error) {
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
export function createMcpRequest(requestId, clientId, payload) {
    return {
        type: MessageType.MCP_REQUEST,
        timestamp: Date.now(),
        requestId,
        clientId,
        payload,
    };
}
export function createMcpResponse(requestId, clientId, payload) {
    return {
        type: MessageType.MCP_RESPONSE,
        timestamp: Date.now(),
        requestId,
        clientId,
        payload,
    };
}
export function createError(code, message, details, requestId, clientId) {
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
export function createShutdown(reason, gracePeriod = 5000) {
    return {
        type: MessageType.SHUTDOWN,
        timestamp: Date.now(),
        reason,
        gracePeriod,
    };
}
export function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isValidMessageType(value) {
    return Object.values(MessageType).includes(value);
}
function hasValidBaseFields(msg) {
    return (isValidMessageType(msg.type) &&
        typeof msg.timestamp === 'number' &&
        Number.isFinite(msg.timestamp));
}
function logValidationFailure(messageType, reason, data) {
    logger.debug(`[DaemonProtocol] Validation failed for ${messageType}: ${reason}`, {
        ...(data !== undefined ? { data } : {}),
    });
}
export function validateHandshakeMessage(msg) {
    if (msg.type !== MessageType.HANDSHAKE) {
        logValidationFailure('HANDSHAKE', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.clientId !== 'string') {
        logValidationFailure('HANDSHAKE', 'clientId must be string', msg.clientId);
        return false;
    }
    if (typeof msg.clientVersion !== 'string') {
        logValidationFailure('HANDSHAKE', 'clientVersion must be string', msg.clientVersion);
        return false;
    }
    if (typeof msg.protocolVersion !== 'number' ||
        !Number.isInteger(msg.protocolVersion)) {
        logValidationFailure('HANDSHAKE', 'protocolVersion must be integer', msg.protocolVersion);
        return false;
    }
    if (msg.protocolVersion < 1 || msg.protocolVersion > 100) {
        logValidationFailure('HANDSHAKE', 'protocolVersion must be between 1 and 100', msg.protocolVersion);
        return false;
    }
    if (!Array.isArray(msg.capabilities)) {
        logValidationFailure('HANDSHAKE', 'capabilities must be array', msg.capabilities);
        return false;
    }
    if (!msg.capabilities.every((cap) => typeof cap === 'string')) {
        logValidationFailure('HANDSHAKE', 'all capabilities must be strings', msg.capabilities);
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
export function validateHandshakeAckMessage(msg) {
    if (msg.type !== MessageType.HANDSHAKE_ACK) {
        logValidationFailure('HANDSHAKE_ACK', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.success !== 'boolean') {
        logValidationFailure('HANDSHAKE_ACK', 'success must be boolean', msg.success);
        return false;
    }
    if (typeof msg.daemonVersion !== 'string') {
        logValidationFailure('HANDSHAKE_ACK', 'daemonVersion must be string', msg.daemonVersion);
        return false;
    }
    if (typeof msg.protocolVersion !== 'number' ||
        !Number.isInteger(msg.protocolVersion)) {
        logValidationFailure('HANDSHAKE_ACK', 'protocolVersion must be integer', msg.protocolVersion);
        return false;
    }
    if (msg.protocolVersion < 1 || msg.protocolVersion > 100) {
        logValidationFailure('HANDSHAKE_ACK', 'protocolVersion must be between 1 and 100', msg.protocolVersion);
        return false;
    }
    if (typeof msg.upgradeRecommended !== 'boolean') {
        logValidationFailure('HANDSHAKE_ACK', 'upgradeRecommended must be boolean', msg.upgradeRecommended);
        return false;
    }
    if (typeof msg.assignedClientId !== 'string') {
        logValidationFailure('HANDSHAKE_ACK', 'assignedClientId must be string', msg.assignedClientId);
        return false;
    }
    if (msg.error !== undefined && typeof msg.error !== 'string') {
        logValidationFailure('HANDSHAKE_ACK', 'error must be string if present', msg.error);
        return false;
    }
    return true;
}
export function validateHeartbeatMessage(msg) {
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
export function validateHeartbeatAckMessage(msg) {
    if (msg.type !== MessageType.HEARTBEAT_ACK) {
        logValidationFailure('HEARTBEAT_ACK', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.clientId !== 'string') {
        logValidationFailure('HEARTBEAT_ACK', 'clientId must be string', msg.clientId);
        return false;
    }
    if (!isObject(msg.stats)) {
        logValidationFailure('HEARTBEAT_ACK', 'stats must be object', msg.stats);
        return false;
    }
    const stats = msg.stats;
    if (typeof stats.clientCount !== 'number' || !Number.isFinite(stats.clientCount)) {
        logValidationFailure('HEARTBEAT_ACK', 'stats.clientCount must be number', stats.clientCount);
        return false;
    }
    if (typeof stats.uptime !== 'number' || !Number.isFinite(stats.uptime)) {
        logValidationFailure('HEARTBEAT_ACK', 'stats.uptime must be number', stats.uptime);
        return false;
    }
    if (typeof stats.requestsProcessed !== 'number' ||
        !Number.isFinite(stats.requestsProcessed)) {
        logValidationFailure('HEARTBEAT_ACK', 'stats.requestsProcessed must be number', stats.requestsProcessed);
        return false;
    }
    return true;
}
export function validateDisconnectMessage(msg) {
    if (msg.type !== MessageType.DISCONNECT) {
        logValidationFailure('DISCONNECT', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.clientId !== 'string') {
        logValidationFailure('DISCONNECT', 'clientId must be string', msg.clientId);
        return false;
    }
    const validReasons = ['normal', 'error', 'timeout', 'upgrade'];
    if (!validReasons.includes(msg.reason)) {
        logValidationFailure('DISCONNECT', `reason must be one of: ${validReasons.join(', ')}`, msg.reason);
        return false;
    }
    return true;
}
export function validateMcpRequestMessage(msg) {
    if (msg.type !== MessageType.MCP_REQUEST) {
        logValidationFailure('MCP_REQUEST', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.requestId !== 'string') {
        logValidationFailure('MCP_REQUEST', 'requestId must be string', msg.requestId);
        return false;
    }
    if (typeof msg.clientId !== 'string') {
        logValidationFailure('MCP_REQUEST', 'clientId must be string', msg.clientId);
        return false;
    }
    if (!('payload' in msg)) {
        logValidationFailure('MCP_REQUEST', 'payload field is required');
        return false;
    }
    return true;
}
export function validateMcpResponseMessage(msg) {
    if (msg.type !== MessageType.MCP_RESPONSE) {
        logValidationFailure('MCP_RESPONSE', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.requestId !== 'string') {
        logValidationFailure('MCP_RESPONSE', 'requestId must be string', msg.requestId);
        return false;
    }
    if (typeof msg.clientId !== 'string') {
        logValidationFailure('MCP_RESPONSE', 'clientId must be string', msg.clientId);
        return false;
    }
    if (!('payload' in msg)) {
        logValidationFailure('MCP_RESPONSE', 'payload field is required');
        return false;
    }
    return true;
}
export function validateMcpNotificationMessage(msg) {
    if (msg.type !== MessageType.MCP_NOTIFICATION) {
        logValidationFailure('MCP_NOTIFICATION', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.clientId !== 'string') {
        logValidationFailure('MCP_NOTIFICATION', 'clientId must be string', msg.clientId);
        return false;
    }
    if (!('payload' in msg)) {
        logValidationFailure('MCP_NOTIFICATION', 'payload field is required');
        return false;
    }
    return true;
}
export function validateRequestUpgradeMessage(msg) {
    if (msg.type !== MessageType.REQUEST_UPGRADE) {
        logValidationFailure('REQUEST_UPGRADE', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.clientId !== 'string') {
        logValidationFailure('REQUEST_UPGRADE', 'clientId must be string', msg.clientId);
        return false;
    }
    if (typeof msg.newVersion !== 'string') {
        logValidationFailure('REQUEST_UPGRADE', 'newVersion must be string', msg.newVersion);
        return false;
    }
    const validReasons = ['version_mismatch', 'user_requested', 'health_check_failed'];
    if (!validReasons.includes(msg.reason)) {
        logValidationFailure('REQUEST_UPGRADE', `reason must be one of: ${validReasons.join(', ')}`, msg.reason);
        return false;
    }
    return true;
}
export function validateUpgradePendingMessage(msg) {
    if (msg.type !== MessageType.UPGRADE_PENDING) {
        logValidationFailure('UPGRADE_PENDING', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.newVersion !== 'string') {
        logValidationFailure('UPGRADE_PENDING', 'newVersion must be string', msg.newVersion);
        return false;
    }
    if (typeof msg.estimatedShutdownTime !== 'number' ||
        !Number.isFinite(msg.estimatedShutdownTime)) {
        logValidationFailure('UPGRADE_PENDING', 'estimatedShutdownTime must be number', msg.estimatedShutdownTime);
        return false;
    }
    if (typeof msg.initiatorClientId !== 'string') {
        logValidationFailure('UPGRADE_PENDING', 'initiatorClientId must be string', msg.initiatorClientId);
        return false;
    }
    return true;
}
export function validateUpgradeAbortMessage(msg) {
    if (msg.type !== MessageType.UPGRADE_ABORT) {
        logValidationFailure('UPGRADE_ABORT', 'incorrect type', msg.type);
        return false;
    }
    if (typeof msg.reason !== 'string') {
        logValidationFailure('UPGRADE_ABORT', 'reason must be string', msg.reason);
        return false;
    }
    return true;
}
export function validateShutdownMessage(msg) {
    if (msg.type !== MessageType.SHUTDOWN) {
        logValidationFailure('SHUTDOWN', 'incorrect type', msg.type);
        return false;
    }
    const validReasons = ['upgrade', 'user_requested', 'idle_timeout', 'error'];
    if (!validReasons.includes(msg.reason)) {
        logValidationFailure('SHUTDOWN', `reason must be one of: ${validReasons.join(', ')}`, msg.reason);
        return false;
    }
    if (typeof msg.gracePeriod !== 'number' ||
        !Number.isFinite(msg.gracePeriod)) {
        logValidationFailure('SHUTDOWN', 'gracePeriod must be number', msg.gracePeriod);
        return false;
    }
    return true;
}
export function validateErrorMessage(msg) {
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
    if (msg.requestId !== undefined && typeof msg.requestId !== 'string') {
        logValidationFailure('ERROR', 'requestId must be string if present', msg.requestId);
        return false;
    }
    if (msg.clientId !== undefined && typeof msg.clientId !== 'string') {
        logValidationFailure('ERROR', 'clientId must be string if present', msg.clientId);
        return false;
    }
    return true;
}
export function validateMessage(msg) {
    if (!hasValidBaseFields(msg)) {
        logValidationFailure('BaseMessage', 'invalid base fields (type or timestamp)');
        return null;
    }
    switch (msg.type) {
        case MessageType.HANDSHAKE:
            return validateHandshakeMessage(msg)
                ? msg
                : null;
        case MessageType.HANDSHAKE_ACK:
            return validateHandshakeAckMessage(msg)
                ? msg
                : null;
        case MessageType.HEARTBEAT:
            return validateHeartbeatMessage(msg)
                ? msg
                : null;
        case MessageType.HEARTBEAT_ACK:
            return validateHeartbeatAckMessage(msg)
                ? msg
                : null;
        case MessageType.DISCONNECT:
            return validateDisconnectMessage(msg)
                ? msg
                : null;
        case MessageType.MCP_REQUEST:
            return validateMcpRequestMessage(msg)
                ? msg
                : null;
        case MessageType.MCP_RESPONSE:
            return validateMcpResponseMessage(msg)
                ? msg
                : null;
        case MessageType.MCP_NOTIFICATION:
            return validateMcpNotificationMessage(msg)
                ? msg
                : null;
        case MessageType.REQUEST_UPGRADE:
            return validateRequestUpgradeMessage(msg)
                ? msg
                : null;
        case MessageType.UPGRADE_PENDING:
            return validateUpgradePendingMessage(msg)
                ? msg
                : null;
        case MessageType.UPGRADE_ABORT:
            return validateUpgradeAbortMessage(msg)
                ? msg
                : null;
        case MessageType.SHUTDOWN:
            return validateShutdownMessage(msg)
                ? msg
                : null;
        case MessageType.ERROR:
            return validateErrorMessage(msg)
                ? msg
                : null;
        default:
            logValidationFailure('Unknown', `unrecognized message type: ${msg.type}`);
            return null;
    }
}
export function parseMessage(data) {
    try {
        const parsed = JSON.parse(data);
        if (!isObject(parsed)) {
            logValidationFailure('parseMessage', 'parsed data is not an object');
            return null;
        }
        return validateMessage(parsed);
    }
    catch (error) {
        logValidationFailure('parseMessage', 'JSON parse error', error instanceof Error ? error.message : String(error));
        return null;
    }
}
export function serializeMessage(message) {
    return JSON.stringify(message) + '\n';
}
export const MESSAGE_DELIMITER = '\n';
//# sourceMappingURL=DaemonProtocol.js.map