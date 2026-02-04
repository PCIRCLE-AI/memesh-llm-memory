/**
 * DaemonSocketServer - Multi-client IPC Server
 *
 * Accepts multiple Claude Code session connections via IPC.
 * Routes messages between clients and the shared MCP server.
 *
 * Features:
 * - Multi-client connection management
 * - Message framing (newline-delimited JSON)
 * - Request/response correlation by requestId
 * - Heartbeat monitoring
 * - Graceful shutdown coordination
 */

import net from 'net';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { IpcTransport } from './IpcTransport.js';
import {
  MessageType,
  parseMessage,
  serializeMessage,
  createHandshakeAck,
  createMcpResponse,
  createError,
  createShutdown,
  MESSAGE_DELIMITER,
  type DaemonMessage,
  type HandshakeMessage,
  type HeartbeatMessage,
  type McpRequestMessage,
  type DisconnectMessage,
  type RequestUpgradeMessage,
  type HeartbeatAckMessage,
} from './DaemonProtocol.js';
import { DaemonLockManager } from './DaemonLockManager.js';
import { compareVersions } from './VersionManager.js';
import { logger } from '../../utils/logger.js';

/**
 * Error codes for DaemonSocketServer
 */
export const ErrorCodes = {
  /** Invalid JSON message received */
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  /** Handshake required before other messages */
  HANDSHAKE_REQUIRED: 'HANDSHAKE_REQUIRED',
  /** Unknown message type received */
  UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
  /** No MCP handler registered */
  NO_HANDLER: 'NO_HANDLER',
  /** MCP handler error */
  HANDLER_ERROR: 'HANDLER_ERROR',
  /** Buffer overflow detected */
  BUFFER_OVERFLOW: 'BUFFER_OVERFLOW',
  /** Handshake timeout */
  HANDSHAKE_TIMEOUT: 'HANDSHAKE_TIMEOUT',
} as const;

/** Default maximum buffer size (10MB) */
const DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;

/** Default handshake timeout (10 seconds) */
const DEFAULT_HANDSHAKE_TIMEOUT = 10000;

/**
 * Information about a connected client
 */
export interface ClientInfo {
  /** Unique client identifier */
  clientId: string;

  /** Client version */
  version: string;

  /** Protocol version */
  protocolVersion: number;

  /** Client capabilities */
  capabilities: string[];

  /** Client process ID */
  pid: number;

  /** Connection timestamp */
  connectedAt: number;

  /** Last activity timestamp */
  lastActivity: number;

  /** Whether handshake is complete */
  handshakeComplete: boolean;
}

/**
 * Internal client state including socket
 */
interface ClientState extends ClientInfo {
  /** Socket connection */
  socket: net.Socket;

  /** Message buffer for framing */
  buffer: string;

  /** Handshake timeout timer */
  handshakeTimer: NodeJS.Timeout | null;
}

/**
 * Configuration for DaemonSocketServer
 */
export interface DaemonSocketServerConfig {
  /** IPC transport for server */
  transport: IpcTransport;

  /** Server version */
  version: string;

  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;

  /** Heartbeat timeout in ms (default: 60000) */
  heartbeatTimeout?: number;

  /** Maximum buffer size per client in bytes (default: 10MB) */
  maxBufferSize?: number;

  /** Handshake timeout in ms (default: 10000) */
  handshakeTimeout?: number;
}

/**
 * MCP request handler function type
 */
export type McpHandler = (request: unknown) => Promise<unknown>;

/**
 * Event map for DaemonSocketServer
 */
export interface DaemonSocketServerEvents {
  client_connect: (client: ClientInfo) => void;
  client_disconnect: (clientId: string) => void;
  upgrade_requested: (request: RequestUpgradeMessage) => void;
}

/**
 * DaemonSocketServer - Multi-client IPC server for MeMesh daemon
 */
export class DaemonSocketServer extends EventEmitter {
  private config: Required<DaemonSocketServerConfig>;
  private server: net.Server | null = null;
  private clients: Map<string, ClientState> = new Map();
  private mcpHandler: McpHandler | null = null;
  private startTime: number = 0;
  private requestsProcessed: number = 0;
  private isRunning: boolean = false;
  private heartbeatCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: DaemonSocketServerConfig) {
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

  /**
   * Start the socket server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('DaemonSocketServer is already running');
    }

    this.server = this.config.transport.createServer();
    this.startTime = Date.now();

    // Handle new connections
    this.server.on('connection', (socket) => this.handleConnection(socket));

    // Handle server errors
    this.server.on('error', (error) => {
      logger.error('[DaemonSocketServer] Server error', {
        error: error.message,
      });
    });

    // Start listening
    await this.config.transport.listen(this.server);
    this.isRunning = true;

    // Start heartbeat check
    this.startHeartbeatCheck();

    logger.info('[DaemonSocketServer] Server started', {
      version: this.config.version,
    });
  }

  /**
   * Stop the socket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Mark as not running first to prevent new operations
    this.isRunning = false;

    // Stop heartbeat check
    this.stopHeartbeatCheck();

    // Notify all clients of shutdown
    const shutdownMsg = createShutdown('user_requested', 5000);

    for (const [, clientState] of this.clients) {
      try {
        this.sendMessage(clientState.socket, shutdownMsg);
        clientState.socket.destroy();
      } catch {
        // Ignore errors during shutdown
      }
    }

    this.clients.clear();

    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    logger.info('[DaemonSocketServer] Server stopped');
  }

  /**
   * Get the number of connected clients.
   *
   * Returns the count of all currently connected clients, including those
   * that have not yet completed the handshake process.
   *
   * @returns The number of connected clients
   * @example
   * ```typescript
   * const server = new DaemonSocketServer(config);
   * await server.start();
   * console.log(`Active clients: ${server.getClientCount()}`);
   * ```
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get list of connected clients with their information.
   *
   * Returns an array of ClientInfo objects containing details about each
   * connected client, such as client ID, version, capabilities, and connection time.
   * This does not include the internal socket reference for security reasons.
   *
   * @returns Array of ClientInfo objects for all connected clients
   * @example
   * ```typescript
   * const clients = server.getClients();
   * clients.forEach(client => {
   *   console.log(`Client ${client.clientId} (v${client.version})`);
   * });
   * ```
   */
  getClients(): ClientInfo[] {
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

  /**
   * Disconnect a specific client by their client ID.
   *
   * Forcefully terminates the connection to the specified client.
   * The client will receive a socket close event, and cleanup will
   * be handled automatically by the handleDisconnect method.
   *
   * @param clientId - The unique identifier of the client to disconnect
   * @example
   * ```typescript
   * // Disconnect a misbehaving client
   * server.disconnectClient('client-abc123');
   * ```
   */
  disconnectClient(clientId: string): void {
    const clientState = this.clients.get(clientId);
    if (clientState) {
      logger.info('[DaemonSocketServer] Disconnecting client', { clientId });
      this.clearHandshakeTimer(clientState);
      clientState.socket.destroy();
      // Cleanup will happen in handleDisconnect
    }
  }

  /**
   * Set the MCP request handler
   */
  setMcpHandler(handler: McpHandler): void {
    this.mcpHandler = handler;
  }

  // Type-safe event emitter overrides
  on<K extends keyof DaemonSocketServerEvents>(
    event: K,
    listener: DaemonSocketServerEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof DaemonSocketServerEvents>(
    event: K,
    ...args: Parameters<DaemonSocketServerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle new client connection
   */
  private handleConnection(socket: net.Socket): void {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    logger.debug('[DaemonSocketServer] New connection', { tempId });

    // Create initial client state (not yet authenticated)
    const clientState: ClientState = {
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

    // Store with temp ID (will be replaced on handshake)
    this.clients.set(tempId, clientState);

    // Set handshake timeout
    clientState.handshakeTimer = setTimeout(() => {
      if (!clientState.handshakeComplete) {
        logger.warn('[DaemonSocketServer] Handshake timeout, disconnecting', {
          clientId: clientState.clientId,
          timeout: this.config.handshakeTimeout,
        });
        this.sendError(
          socket,
          ErrorCodes.HANDSHAKE_TIMEOUT,
          `Handshake not completed within ${this.config.handshakeTimeout}ms`,
          undefined,
          undefined,
          clientState.clientId
        );
        socket.destroy();
      }
    }, this.config.handshakeTimeout);

    // Handle incoming data
    socket.on('data', (data: Buffer) => {
      this.handleData(clientState, data);
    });

    // Handle socket close
    socket.on('close', () => {
      this.handleDisconnect(clientState);
    });

    // Handle socket errors
    socket.on('error', (error) => {
      logger.warn('[DaemonSocketServer] Socket error', {
        clientId: clientState.clientId,
        error: error.message,
      });
    });
  }

  /**
   * Handle incoming data from client.
   *
   * Includes buffer overflow protection to prevent memory exhaustion
   * from malformed data without delimiters.
   */
  private handleData(clientState: ClientState, data: Buffer): void {
    clientState.lastActivity = Date.now();

    const dataStr = data.toString();
    const incomingSize = Buffer.byteLength(dataStr, 'utf8');
    const currentSize = Buffer.byteLength(clientState.buffer, 'utf8');

    // Check if adding this data would exceed the buffer limit
    if (currentSize + incomingSize > this.config.maxBufferSize) {
      logger.error('[DaemonSocketServer] Buffer overflow - clearing buffer to recover', {
        clientId: clientState.clientId,
        currentBufferSize: currentSize,
        incomingDataSize: incomingSize,
        maxBufferSize: this.config.maxBufferSize,
        bufferPreview: clientState.buffer.slice(0, 200),
      });

      // Clear buffer to recover from potential malformed data stream
      clientState.buffer = '';

      // Send error to client
      this.sendError(
        clientState.socket,
        ErrorCodes.BUFFER_OVERFLOW,
        `Buffer overflow: buffer size (${currentSize}) + incoming data (${incomingSize}) ` +
          `exceeds limit (${this.config.maxBufferSize}). Buffer cleared.`,
        undefined,
        undefined,
        clientState.clientId
      );

      // Don't append the data that caused overflow - it's likely part of malformed stream
      return;
    }

    clientState.buffer += dataStr;

    // Process complete messages (newline-delimited)
    const lines = clientState.buffer.split(MESSAGE_DELIMITER);

    // Keep incomplete last line in buffer
    clientState.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      const message = parseMessage(line);

      if (!message) {
        this.sendError(
          clientState.socket,
          ErrorCodes.INVALID_MESSAGE,
          'Invalid JSON message',
          undefined,
          undefined,
          clientState.clientId
        );
        continue;
      }

      this.handleMessage(clientState, message);
    }
  }

  /**
   * Handle a parsed message
   */
  private handleMessage(clientState: ClientState, message: DaemonMessage): void {
    // Handshake must be first message
    if (!clientState.handshakeComplete && message.type !== MessageType.HANDSHAKE) {
      this.sendError(
        clientState.socket,
        ErrorCodes.HANDSHAKE_REQUIRED,
        'Handshake required before other messages',
        undefined,
        undefined,
        clientState.clientId
      );
      return;
    }

    switch (message.type) {
      case MessageType.HANDSHAKE:
        this.handleHandshake(clientState, message as HandshakeMessage);
        break;

      case MessageType.HEARTBEAT:
        this.handleHeartbeat(clientState, message as HeartbeatMessage);
        break;

      case MessageType.MCP_REQUEST: {
        const mcpMessage = message as McpRequestMessage;
        this.handleMcpRequest(clientState, mcpMessage).catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error('[DaemonSocketServer] Unhandled MCP request error', {
            clientId: clientState.clientId,
            requestId: mcpMessage.requestId,
            error: errorMessage,
          });
          // Send error response to client
          this.sendError(
            clientState.socket,
            ErrorCodes.HANDLER_ERROR,
            `Unhandled MCP request error: ${errorMessage}`,
            undefined,
            mcpMessage.requestId,
            clientState.clientId
          );
        });
        break;
      }

      case MessageType.DISCONNECT:
        this.handleDisconnectMessage(clientState, message as DisconnectMessage);
        break;

      case MessageType.REQUEST_UPGRADE:
        this.handleUpgradeRequest(clientState, message as RequestUpgradeMessage);
        break;

      default:
        this.sendError(
          clientState.socket,
          ErrorCodes.UNKNOWN_MESSAGE_TYPE,
          `Unknown message type: ${message.type}`,
          undefined,
          undefined,
          clientState.clientId
        );
    }
  }

  /**
   * Handle handshake message
   */
  private handleHandshake(clientState: ClientState, message: HandshakeMessage): void {
    // Clear handshake timeout since handshake message received
    this.clearHandshakeTimer(clientState);

    const requestedId = message.clientId;
    let assignedId = requestedId;

    // Check for duplicate client ID and ensure uniqueness with a loop
    if (this.clients.has(requestedId) && this.clients.get(requestedId) !== clientState) {
      // Generate unique ID using crypto.randomBytes for stronger randomness
      // Uses 4 bytes = 8 hex chars = 4 billion possibilities (vs ~1.6M with Math.random)
      do {
        assignedId = `${requestedId}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
      } while (this.clients.has(assignedId));

      logger.debug('[DaemonSocketServer] Duplicate clientId, assigning new', {
        requestedId,
        assignedId,
      });
    }

    // Remove temp entry and add with real ID
    const tempId = clientState.clientId;
    this.clients.delete(tempId);

    // Update client state
    clientState.clientId = assignedId;
    clientState.version = message.clientVersion;
    clientState.protocolVersion = message.protocolVersion;
    clientState.capabilities = message.capabilities;
    clientState.pid = message.pid;
    clientState.handshakeComplete = true;

    this.clients.set(assignedId, clientState);

    // Check if upgrade is recommended (client version > daemon version)
    const upgradeRecommended = compareVersions(message.clientVersion, this.config.version) > 0;

    // Send acknowledgment
    const ack = createHandshakeAck(true, this.config.version, assignedId, upgradeRecommended);

    this.sendMessage(clientState.socket, ack);

    // Update lock file client count
    this.updateLockClientCount();

    // Emit event
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

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(clientState: ClientState, message: HeartbeatMessage): void {
    const ack: HeartbeatAckMessage = {
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

  /**
   * Handle MCP request message
   */
  private async handleMcpRequest(
    clientState: ClientState,
    message: McpRequestMessage
  ): Promise<void> {
    const { requestId, clientId, payload } = message;

    if (!this.mcpHandler) {
      this.sendError(
        clientState.socket,
        ErrorCodes.NO_HANDLER,
        'No MCP handler registered',
        undefined,
        requestId,
        clientId
      );
      return;
    }

    try {
      const result = await this.mcpHandler(payload);
      this.requestsProcessed++;

      const response = createMcpResponse(requestId, clientId, result);
      this.sendMessage(clientState.socket, response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(
        clientState.socket,
        ErrorCodes.HANDLER_ERROR,
        `MCP handler error: ${errorMessage}`,
        undefined,
        requestId,
        clientId
      );
    }
  }

  /**
   * Handle disconnect message
   */
  private handleDisconnectMessage(
    clientState: ClientState,
    message: DisconnectMessage
  ): void {
    logger.info('[DaemonSocketServer] Client disconnect message', {
      clientId: clientState.clientId,
      reason: message.reason,
    });

    // Clean up and close
    clientState.socket.destroy();
    // handleDisconnect will be called by socket 'close' event
  }

  /**
   * Handle upgrade request
   */
  private handleUpgradeRequest(
    clientState: ClientState,
    message: RequestUpgradeMessage
  ): void {
    logger.info('[DaemonSocketServer] Upgrade requested', {
      clientId: clientState.clientId,
      newVersion: message.newVersion,
      reason: message.reason,
    });

    this.emit('upgrade_requested', message);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientState: ClientState): void {
    const clientId = clientState.clientId;

    // Clear handshake timer if still pending
    this.clearHandshakeTimer(clientState);

    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);

      if (clientState.handshakeComplete) {
        // Update lock file client count
        this.updateLockClientCount();

        // Emit event
        this.emit('client_disconnect', clientId);

        logger.info('[DaemonSocketServer] Client disconnected', { clientId });
      }
    }
  }

  /**
   * Clear the handshake timeout timer for a client
   */
  private clearHandshakeTimer(clientState: ClientState): void {
    if (clientState.handshakeTimer) {
      clearTimeout(clientState.handshakeTimer);
      clientState.handshakeTimer = null;
    }
  }

  /**
   * Send a message to a client
   */
  private sendMessage(socket: net.Socket, message: DaemonMessage): void {
    try {
      socket.write(serializeMessage(message));
    } catch (error) {
      logger.warn('[DaemonSocketServer] Failed to send message', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send an error message
   */
  private sendError(
    socket: net.Socket,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string,
    clientId?: string
  ): void {
    const errorMsg = createError(code, message, details, requestId, clientId);
    this.sendMessage(socket, errorMsg);
  }

  /**
   * Update client count in lock file
   */
  private async updateLockClientCount(): Promise<void> {
    try {
      await DaemonLockManager.updateLock({ clientCount: this.clients.size });
    } catch (error) {
      logger.warn('[DaemonSocketServer] Failed to update lock file', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start periodic heartbeat timeout check
   */
  private startHeartbeatCheck(): void {
    // Prevent multiple interval creations
    if (this.heartbeatCheckInterval) {
      logger.warn('[DaemonSocketServer] Heartbeat check already running, skipping');
      return;
    }

    this.heartbeatCheckInterval = setInterval(() => {
      // Guard against running after server stopped
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

            // Disconnect the client
            this.disconnectClient(clientId);
          }
        }
      }
    }, this.config.heartbeatInterval);

    // Allow process to exit even if heartbeat interval is still active
    // This prevents the interval from keeping the process alive during shutdown
    this.heartbeatCheckInterval.unref();
  }

  /**
   * Stop the heartbeat check interval
   */
  private stopHeartbeatCheck(): void {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }
}
