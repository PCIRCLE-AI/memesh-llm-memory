import crypto from 'crypto';
import { EventEmitter } from 'events';
import { MessageType, parseMessage, serializeMessage, createHandshakeAck, createMcpResponse, createError, createShutdown, MESSAGE_DELIMITER, } from './DaemonProtocol.js';
import { DaemonLockManager } from './DaemonLockManager.js';
import { compareVersions } from './VersionManager.js';
import { logger } from '../../utils/logger.js';
export const ErrorCodes = {
    INVALID_MESSAGE: 'INVALID_MESSAGE',
    HANDSHAKE_REQUIRED: 'HANDSHAKE_REQUIRED',
    UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
    NO_HANDLER: 'NO_HANDLER',
    HANDLER_ERROR: 'HANDLER_ERROR',
    BUFFER_OVERFLOW: 'BUFFER_OVERFLOW',
    HANDSHAKE_TIMEOUT: 'HANDSHAKE_TIMEOUT',
};
const DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;
const DEFAULT_HANDSHAKE_TIMEOUT = 10000;
export class DaemonSocketServer extends EventEmitter {
    config;
    server = null;
    clients = new Map();
    mcpHandler = null;
    startTime = 0;
    requestsProcessed = 0;
    isRunning = false;
    heartbeatCheckInterval = null;
    constructor(config) {
        super();
        this.config = {
            transport: config.transport,
            version: config.version,
            heartbeatInterval: config.heartbeatInterval ?? 30000,
            heartbeatTimeout: config.heartbeatTimeout ?? 60000,
            maxBufferSize: config.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE,
            handshakeTimeout: config.handshakeTimeout ?? DEFAULT_HANDSHAKE_TIMEOUT,
        };
    }
    async start() {
        if (this.isRunning) {
            throw new Error('DaemonSocketServer is already running');
        }
        this.server = this.config.transport.createServer();
        this.startTime = Date.now();
        this.server.on('connection', (socket) => this.handleConnection(socket));
        this.server.on('error', (error) => {
            logger.error('[DaemonSocketServer] Server error', {
                error: error.message,
            });
        });
        await this.config.transport.listen(this.server);
        this.isRunning = true;
        this.startHeartbeatCheck();
        logger.info('[DaemonSocketServer] Server started', {
            version: this.config.version,
        });
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.stopHeartbeatCheck();
        const shutdownMsg = createShutdown('user_requested', 5000);
        for (const [, clientState] of this.clients) {
            try {
                this.sendMessage(clientState.socket, shutdownMsg);
                clientState.socket.destroy();
            }
            catch {
            }
        }
        this.clients.clear();
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(() => resolve());
            });
            this.server = null;
        }
        logger.info('[DaemonSocketServer] Server stopped');
    }
    getClientCount() {
        return this.clients.size;
    }
    getClients() {
        return Array.from(this.clients.values()).map((state) => ({
            clientId: state.clientId,
            version: state.version,
            protocolVersion: state.protocolVersion,
            capabilities: state.capabilities,
            pid: state.pid,
            connectedAt: state.connectedAt,
            lastActivity: state.lastActivity,
            handshakeComplete: state.handshakeComplete,
        }));
    }
    disconnectClient(clientId) {
        const clientState = this.clients.get(clientId);
        if (clientState) {
            logger.info('[DaemonSocketServer] Disconnecting client', { clientId });
            this.clearHandshakeTimer(clientState);
            clientState.socket.destroy();
        }
    }
    setMcpHandler(handler) {
        this.mcpHandler = handler;
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    handleConnection(socket) {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        logger.debug('[DaemonSocketServer] New connection', { tempId });
        const clientState = {
            clientId: tempId,
            version: '',
            protocolVersion: 0,
            capabilities: [],
            pid: 0,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            handshakeComplete: false,
            socket,
            buffer: '',
            handshakeTimer: null,
        };
        this.clients.set(tempId, clientState);
        clientState.handshakeTimer = setTimeout(() => {
            if (!clientState.handshakeComplete) {
                logger.warn('[DaemonSocketServer] Handshake timeout, disconnecting', {
                    clientId: clientState.clientId,
                    timeout: this.config.handshakeTimeout,
                });
                this.sendError(socket, ErrorCodes.HANDSHAKE_TIMEOUT, `Handshake not completed within ${this.config.handshakeTimeout}ms`, undefined, undefined, clientState.clientId);
                socket.destroy();
            }
        }, this.config.handshakeTimeout);
        socket.on('data', (data) => {
            this.handleData(clientState, data);
        });
        socket.on('close', () => {
            this.handleDisconnect(clientState);
        });
        socket.on('error', (error) => {
            logger.warn('[DaemonSocketServer] Socket error', {
                clientId: clientState.clientId,
                error: error.message,
            });
        });
    }
    handleData(clientState, data) {
        clientState.lastActivity = Date.now();
        const dataStr = data.toString();
        const incomingSize = Buffer.byteLength(dataStr, 'utf8');
        const currentSize = Buffer.byteLength(clientState.buffer, 'utf8');
        if (currentSize + incomingSize > this.config.maxBufferSize) {
            logger.error('[DaemonSocketServer] Buffer overflow - clearing buffer to recover', {
                clientId: clientState.clientId,
                currentBufferSize: currentSize,
                incomingDataSize: incomingSize,
                maxBufferSize: this.config.maxBufferSize,
                bufferPreview: clientState.buffer.slice(0, 200),
            });
            clientState.buffer = '';
            this.sendError(clientState.socket, ErrorCodes.BUFFER_OVERFLOW, `Buffer overflow: buffer size (${currentSize}) + incoming data (${incomingSize}) ` +
                `exceeds limit (${this.config.maxBufferSize}). Buffer cleared.`, undefined, undefined, clientState.clientId);
            return;
        }
        clientState.buffer += dataStr;
        const lines = clientState.buffer.split(MESSAGE_DELIMITER);
        clientState.buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.trim())
                continue;
            const message = parseMessage(line);
            if (!message) {
                this.sendError(clientState.socket, ErrorCodes.INVALID_MESSAGE, 'Invalid JSON message', undefined, undefined, clientState.clientId);
                continue;
            }
            this.handleMessage(clientState, message);
        }
    }
    handleMessage(clientState, message) {
        if (!clientState.handshakeComplete && message.type !== MessageType.HANDSHAKE) {
            this.sendError(clientState.socket, ErrorCodes.HANDSHAKE_REQUIRED, 'Handshake required before other messages', undefined, undefined, clientState.clientId);
            return;
        }
        switch (message.type) {
            case MessageType.HANDSHAKE:
                this.handleHandshake(clientState, message);
                break;
            case MessageType.HEARTBEAT:
                this.handleHeartbeat(clientState, message);
                break;
            case MessageType.MCP_REQUEST: {
                const mcpMessage = message;
                this.handleMcpRequest(clientState, mcpMessage).catch((err) => {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    logger.error('[DaemonSocketServer] Unhandled MCP request error', {
                        clientId: clientState.clientId,
                        requestId: mcpMessage.requestId,
                        error: errorMessage,
                    });
                    this.sendError(clientState.socket, ErrorCodes.HANDLER_ERROR, `Unhandled MCP request error: ${errorMessage}`, undefined, mcpMessage.requestId, clientState.clientId);
                });
                break;
            }
            case MessageType.DISCONNECT:
                this.handleDisconnectMessage(clientState, message);
                break;
            case MessageType.REQUEST_UPGRADE:
                this.handleUpgradeRequest(clientState, message);
                break;
            default:
                this.sendError(clientState.socket, ErrorCodes.UNKNOWN_MESSAGE_TYPE, `Unknown message type: ${message.type}`, undefined, undefined, clientState.clientId);
        }
    }
    handleHandshake(clientState, message) {
        this.clearHandshakeTimer(clientState);
        const requestedId = message.clientId;
        let assignedId = requestedId;
        if (this.clients.has(requestedId) && this.clients.get(requestedId) !== clientState) {
            do {
                assignedId = `${requestedId}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
            } while (this.clients.has(assignedId));
            logger.debug('[DaemonSocketServer] Duplicate clientId, assigning new', {
                requestedId,
                assignedId,
            });
        }
        const tempId = clientState.clientId;
        this.clients.delete(tempId);
        clientState.clientId = assignedId;
        clientState.version = message.clientVersion;
        clientState.protocolVersion = message.protocolVersion;
        clientState.capabilities = message.capabilities;
        clientState.pid = message.pid;
        clientState.handshakeComplete = true;
        this.clients.set(assignedId, clientState);
        const upgradeRecommended = compareVersions(message.clientVersion, this.config.version) > 0;
        const ack = createHandshakeAck(true, this.config.version, assignedId, upgradeRecommended);
        this.sendMessage(clientState.socket, ack);
        this.updateLockClientCount();
        this.emit('client_connect', {
            clientId: assignedId,
            version: clientState.version,
            protocolVersion: clientState.protocolVersion,
            capabilities: clientState.capabilities,
            pid: clientState.pid,
            connectedAt: clientState.connectedAt,
            lastActivity: clientState.lastActivity,
            handshakeComplete: true,
        });
        logger.info('[DaemonSocketServer] Client connected', {
            clientId: assignedId,
            version: clientState.version,
            upgradeRecommended,
        });
    }
    handleHeartbeat(clientState, message) {
        const ack = {
            type: MessageType.HEARTBEAT_ACK,
            timestamp: Date.now(),
            clientId: clientState.clientId,
            stats: {
                clientCount: this.clients.size,
                uptime: Date.now() - this.startTime,
                requestsProcessed: this.requestsProcessed,
            },
        };
        this.sendMessage(clientState.socket, ack);
    }
    async handleMcpRequest(clientState, message) {
        const { requestId, clientId, payload } = message;
        if (!this.mcpHandler) {
            this.sendError(clientState.socket, ErrorCodes.NO_HANDLER, 'No MCP handler registered', undefined, requestId, clientId);
            return;
        }
        try {
            const result = await this.mcpHandler(payload);
            this.requestsProcessed++;
            const response = createMcpResponse(requestId, clientId, result);
            this.sendMessage(clientState.socket, response);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendError(clientState.socket, ErrorCodes.HANDLER_ERROR, `MCP handler error: ${errorMessage}`, undefined, requestId, clientId);
        }
    }
    handleDisconnectMessage(clientState, message) {
        logger.info('[DaemonSocketServer] Client disconnect message', {
            clientId: clientState.clientId,
            reason: message.reason,
        });
        clientState.socket.destroy();
    }
    handleUpgradeRequest(clientState, message) {
        logger.info('[DaemonSocketServer] Upgrade requested', {
            clientId: clientState.clientId,
            newVersion: message.newVersion,
            reason: message.reason,
        });
        this.emit('upgrade_requested', message);
    }
    handleDisconnect(clientState) {
        const clientId = clientState.clientId;
        this.clearHandshakeTimer(clientState);
        if (this.clients.has(clientId)) {
            this.clients.delete(clientId);
            if (clientState.handshakeComplete) {
                this.updateLockClientCount();
                this.emit('client_disconnect', clientId);
                logger.info('[DaemonSocketServer] Client disconnected', { clientId });
            }
        }
    }
    clearHandshakeTimer(clientState) {
        if (clientState.handshakeTimer) {
            clearTimeout(clientState.handshakeTimer);
            clientState.handshakeTimer = null;
        }
    }
    sendMessage(socket, message) {
        try {
            socket.write(serializeMessage(message));
        }
        catch (error) {
            logger.warn('[DaemonSocketServer] Failed to send message', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    sendError(socket, code, message, details, requestId, clientId) {
        const errorMsg = createError(code, message, details, requestId, clientId);
        this.sendMessage(socket, errorMsg);
    }
    async updateLockClientCount() {
        try {
            await DaemonLockManager.updateLock({ clientCount: this.clients.size });
        }
        catch (error) {
            logger.warn('[DaemonSocketServer] Failed to update lock file', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    startHeartbeatCheck() {
        if (this.heartbeatCheckInterval) {
            logger.warn('[DaemonSocketServer] Heartbeat check already running, skipping');
            return;
        }
        this.heartbeatCheckInterval = setInterval(() => {
            if (!this.isRunning) {
                this.stopHeartbeatCheck();
                return;
            }
            const now = Date.now();
            const timeout = this.config.heartbeatTimeout;
            for (const [clientId, clientState] of this.clients) {
                if (clientState.handshakeComplete) {
                    const timeSinceActivity = now - clientState.lastActivity;
                    if (timeSinceActivity > timeout) {
                        logger.warn('[DaemonSocketServer] Client heartbeat timeout', {
                            clientId,
                            timeSinceActivity,
                            timeout,
                        });
                        this.disconnectClient(clientId);
                    }
                }
            }
        }, this.config.heartbeatInterval);
        this.heartbeatCheckInterval.unref();
    }
    stopHeartbeatCheck() {
        if (this.heartbeatCheckInterval) {
            clearInterval(this.heartbeatCheckInterval);
            this.heartbeatCheckInterval = null;
        }
    }
}
//# sourceMappingURL=DaemonSocketServer.js.map