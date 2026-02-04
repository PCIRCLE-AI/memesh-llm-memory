export declare const PROTOCOL_VERSION = 1;
export declare enum MessageType {
    HANDSHAKE = "handshake",
    HANDSHAKE_ACK = "handshake_ack",
    HEARTBEAT = "heartbeat",
    HEARTBEAT_ACK = "heartbeat_ack",
    DISCONNECT = "disconnect",
    MCP_REQUEST = "mcp_request",
    MCP_RESPONSE = "mcp_response",
    MCP_NOTIFICATION = "mcp_notification",
    REQUEST_UPGRADE = "request_upgrade",
    UPGRADE_PENDING = "upgrade_pending",
    UPGRADE_ABORT = "upgrade_abort",
    SHUTDOWN = "shutdown",
    ERROR = "error"
}
export interface BaseMessage {
    type: MessageType;
    timestamp: number;
}
export interface HandshakeMessage extends BaseMessage {
    type: MessageType.HANDSHAKE;
    clientId: string;
    clientVersion: string;
    protocolVersion: number;
    capabilities: string[];
    pid: number;
}
export interface HandshakeAckMessage extends BaseMessage {
    type: MessageType.HANDSHAKE_ACK;
    success: boolean;
    daemonVersion: string;
    protocolVersion: number;
    upgradeRecommended: boolean;
    error?: string;
    assignedClientId: string;
}
export interface HeartbeatMessage extends BaseMessage {
    type: MessageType.HEARTBEAT;
    clientId: string;
}
export interface HeartbeatAckMessage extends BaseMessage {
    type: MessageType.HEARTBEAT_ACK;
    clientId: string;
    stats: {
        clientCount: number;
        uptime: number;
        requestsProcessed: number;
    };
}
export interface DisconnectMessage extends BaseMessage {
    type: MessageType.DISCONNECT;
    clientId: string;
    reason: 'normal' | 'error' | 'timeout' | 'upgrade';
}
export interface McpRequestMessage extends BaseMessage {
    type: MessageType.MCP_REQUEST;
    requestId: string;
    clientId: string;
    payload: unknown;
}
export interface McpResponseMessage extends BaseMessage {
    type: MessageType.MCP_RESPONSE;
    requestId: string;
    clientId: string;
    payload: unknown;
}
export interface McpNotificationMessage extends BaseMessage {
    type: MessageType.MCP_NOTIFICATION;
    clientId: string;
    payload: unknown;
}
export interface RequestUpgradeMessage extends BaseMessage {
    type: MessageType.REQUEST_UPGRADE;
    clientId: string;
    newVersion: string;
    reason: 'version_mismatch' | 'user_requested' | 'health_check_failed';
}
export interface UpgradePendingMessage extends BaseMessage {
    type: MessageType.UPGRADE_PENDING;
    newVersion: string;
    estimatedShutdownTime: number;
    initiatorClientId: string;
}
export interface UpgradeAbortMessage extends BaseMessage {
    type: MessageType.UPGRADE_ABORT;
    reason: string;
}
export interface ShutdownMessage extends BaseMessage {
    type: MessageType.SHUTDOWN;
    reason: 'upgrade' | 'user_requested' | 'idle_timeout' | 'error';
    gracePeriod: number;
}
export interface ErrorMessage extends BaseMessage {
    type: MessageType.ERROR;
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    clientId?: string;
}
export type DaemonMessage = HandshakeMessage | HandshakeAckMessage | HeartbeatMessage | HeartbeatAckMessage | DisconnectMessage | McpRequestMessage | McpResponseMessage | McpNotificationMessage | RequestUpgradeMessage | UpgradePendingMessage | UpgradeAbortMessage | ShutdownMessage | ErrorMessage;
export declare function createHandshake(clientId: string, clientVersion: string, capabilities?: string[]): HandshakeMessage;
export declare function createHandshakeAck(success: boolean, daemonVersion: string, assignedClientId: string, upgradeRecommended?: boolean, error?: string): HandshakeAckMessage;
export declare function createMcpRequest(requestId: string, clientId: string, payload: unknown): McpRequestMessage;
export declare function createMcpResponse(requestId: string, clientId: string, payload: unknown): McpResponseMessage;
export declare function createError(code: string, message: string, details?: unknown, requestId?: string, clientId?: string): ErrorMessage;
export declare function createShutdown(reason: ShutdownMessage['reason'], gracePeriod?: number): ShutdownMessage;
export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function validateHandshakeMessage(msg: Record<string, unknown>): boolean;
export declare function validateHandshakeAckMessage(msg: Record<string, unknown>): boolean;
export declare function validateHeartbeatMessage(msg: Record<string, unknown>): boolean;
export declare function validateHeartbeatAckMessage(msg: Record<string, unknown>): boolean;
export declare function validateDisconnectMessage(msg: Record<string, unknown>): boolean;
export declare function validateMcpRequestMessage(msg: Record<string, unknown>): boolean;
export declare function validateMcpResponseMessage(msg: Record<string, unknown>): boolean;
export declare function validateMcpNotificationMessage(msg: Record<string, unknown>): boolean;
export declare function validateRequestUpgradeMessage(msg: Record<string, unknown>): boolean;
export declare function validateUpgradePendingMessage(msg: Record<string, unknown>): boolean;
export declare function validateUpgradeAbortMessage(msg: Record<string, unknown>): boolean;
export declare function validateShutdownMessage(msg: Record<string, unknown>): boolean;
export declare function validateErrorMessage(msg: Record<string, unknown>): boolean;
export declare function validateMessage(msg: Record<string, unknown>): DaemonMessage | null;
export declare function parseMessage(data: string): DaemonMessage | null;
export declare function serializeMessage(message: DaemonMessage): string;
export declare const MESSAGE_DELIMITER = "\n";
//# sourceMappingURL=DaemonProtocol.d.ts.map