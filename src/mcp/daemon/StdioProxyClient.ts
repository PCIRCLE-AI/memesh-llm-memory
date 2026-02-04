/**
 * StdioProxyClient - MCP stdin/stdout proxy to daemon
 *
 * Provides a transparent proxy between MCP JSON-RPC on stdin/stdout
 * and the MeMesh daemon via IPC. This allows Claude Code to use
 * the standard MCP stdio transport while sharing a single daemon.
 *
 * Flow:
 * 1. Claude Code sends MCP JSON-RPC to stdin
 * 2. Proxy wraps in MCP_REQUEST and sends to daemon
 * 3. Daemon processes and returns MCP_RESPONSE
 * 4. Proxy extracts payload and writes to stdout
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message buffering during reconnection
 * - Heartbeat to detect connection issues
 * - Version upgrade notifications
 */

import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { IpcTransport } from './IpcTransport.js';
import {
  MessageType,
  DaemonMessage,
  HandshakeAckMessage,
  McpResponseMessage,
  HeartbeatAckMessage,
  ErrorMessage,
  ShutdownMessage,
  createHandshake,
  createMcpRequest,
  parseMessage,
  serializeMessage,
  MESSAGE_DELIMITER,
  PROTOCOL_VERSION,
} from './DaemonProtocol.js';
import { logger } from '../../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default maximum size for receive buffers (10MB)
 * This limit prevents memory exhaustion from malformed data without delimiters
 */
export const DEFAULT_MAX_RECEIVE_BUFFER_SIZE = 10 * 1024 * 1024;

/**
 * Request timeout in milliseconds (60 seconds)
 * After this duration, pending requests are considered failed
 */
export const REQUEST_TIMEOUT_MS = 60000;

/**
 * Message stale threshold in milliseconds (5 minutes)
 * Buffered messages older than this are dropped during reconnection
 */
export const MESSAGE_STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Configuration for StdioProxyClient
 */
export interface StdioProxyClientConfig {
  /** IPC transport for daemon connection */
  transport: IpcTransport;

  /** Client's MeMesh version */
  clientVersion: string;

  /** Maximum reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;

  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;

  /** Maximum buffer size during reconnect in bytes (default: 10MB) */
  bufferSizeLimit?: number;

  /**
   * Maximum size for the socket receive buffer in bytes (default: 10MB)
   * Prevents memory exhaustion if daemon sends malformed data without newline delimiters.
   * When exceeded, the buffer is cleared and an error is emitted.
   */
  maxReceiveBufferSize?: number;

  /**
   * Maximum size for the stdin buffer in bytes (default: 10MB)
   * Prevents memory exhaustion if stdin receives data without newline delimiters.
   * When exceeded, the buffer is cleared and an error is logged.
   */
  maxStdinBufferSize?: number;

  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;

  /** Custom stdin stream (default: process.stdin) */
  stdin?: Readable;

  /** Custom stdout stream (default: process.stdout) */
  stdout?: Writable;

  /** Client capabilities */
  capabilities?: string[];
}

/**
 * Proxy client statistics
 */
export interface ProxyStats {
  /** Total requests forwarded to daemon */
  requestsForwarded: number;

  /** Total reconnection attempts */
  reconnects: number;

  /** Currently buffered messages count */
  bufferedMessages: number;

  /** Buffer size in bytes */
  bufferSizeBytes: number;

  /** Connection uptime in ms */
  connectionUptime: number;
}

/**
 * Buffered message for reconnection
 */
interface BufferedMessage {
  requestId: string;
  payload: unknown;
  timestamp: number;
}

/**
 * Pending request awaiting response
 */
interface PendingRequest {
  requestId: string;
  resolve: (response: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Types
// ═══════════════════════════════════════════════════════════════════════════

export interface StdioProxyClientEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  upgrade_available: (newVersion: string) => void;
  error: (error: Error) => void;
  shutdown: (reason: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// StdioProxyClient Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * StdioProxyClient - Proxy MCP stdin/stdout to daemon
 *
 * @example
 * ```typescript
 * const transport = new IpcTransport();
 * const proxy = new StdioProxyClient({
 *   transport,
 *   clientVersion: '1.0.0',
 * });
 *
 * await proxy.start();
 *
 * // stdin/stdout now proxied to daemon
 * // MCP JSON-RPC flows through automatically
 *
 * proxy.on('upgrade_available', (version) => {
 *   console.log(`New version available: ${version}`);
 * });
 *
 * // Later
 * await proxy.stop();
 * ```
 */
export class StdioProxyClient extends EventEmitter {
  private config: Required<Omit<StdioProxyClientConfig, 'stdin' | 'stdout' | 'capabilities'>> & {
    stdin: Readable;
    stdout: Writable;
    capabilities: string[];
    maxReceiveBufferSize: number;
    maxStdinBufferSize: number;
  };

  // Connection state
  private socket: net.Socket | null = null;
  private clientId: string;
  private assignedClientId: string | null = null;
  private connected = false;
  private connecting = false;
  private stopped = false;
  private connectionStartTime: number | null = null;

  // Message handling
  private receiveBuffer = '';
  private pendingRequests = new Map<string, PendingRequest>();
  private messageBuffer: BufferedMessage[] = [];
  private bufferSize = 0;

  // Reconnection
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Heartbeat
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // Stats
  private requestsForwarded = 0;
  private reconnects = 0;

  // Stdin event listener references for cleanup
  private stdinDataListener: ((data: Buffer | string) => void) | null = null;
  private stdinEndListener: (() => void) | null = null;

  // Stdin buffer - instance variable to persist across stop()/start() cycles
  private stdinBuffer = '';

  // Handshake buffer - for accumulating handshake response across TCP packets
  private handshakeBuffer = '';

  constructor(config: StdioProxyClientConfig) {
    super();

    this.config = {
      transport: config.transport,
      clientVersion: config.clientVersion,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      bufferSizeLimit: config.bufferSizeLimit ?? DEFAULT_MAX_RECEIVE_BUFFER_SIZE,
      maxReceiveBufferSize: config.maxReceiveBufferSize ?? DEFAULT_MAX_RECEIVE_BUFFER_SIZE,
      maxStdinBufferSize: config.maxStdinBufferSize ?? DEFAULT_MAX_RECEIVE_BUFFER_SIZE,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      stdin: config.stdin ?? process.stdin,
      stdout: config.stdout ?? process.stdout,
      capabilities: config.capabilities ?? [],
    };

    this.clientId = uuidv4();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start the proxy client
   *
   * Connects to daemon, performs handshake, and begins proxying
   * stdin/stdout to the daemon.
   */
  async start(): Promise<void> {
    if (this.connected || this.connecting) {
      throw new Error('Proxy client already started');
    }

    this.stopped = false;

    try {
      await this.connectToDaemon();
      this.setupStdinHandler();
      this.startHeartbeat();
    } catch (error) {
      this.stopped = true;
      throw error;
    }
  }

  /**
   * Stop the proxy client
   *
   * Disconnects from daemon, stops proxying, and cleans up resources.
   */
  async stop(): Promise<void> {
    this.stopped = true;
    this.connecting = false;

    // Stop reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Reject all pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Proxy client stopped'));
    }
    this.pendingRequests.clear();

    // Clear message buffer
    this.messageBuffer = [];
    this.bufferSize = 0;

    // Clear stdin buffer to prevent data leakage across stop()/start() cycles
    this.stdinBuffer = '';

    // Clear handshake buffer
    this.handshakeBuffer = '';

    // Remove stdin event listeners
    if (this.stdinDataListener) {
      this.config.stdin.removeListener('data', this.stdinDataListener);
      this.stdinDataListener = null;
    }
    if (this.stdinEndListener) {
      this.config.stdin.removeListener('end', this.stdinEndListener);
      this.stdinEndListener = null;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.connected = false;
    this.connectionStartTime = null;
  }

  /**
   * Check if connected to daemon
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get proxy statistics
   */
  getStats(): ProxyStats {
    return {
      requestsForwarded: this.requestsForwarded,
      reconnects: this.reconnects,
      bufferedMessages: this.messageBuffer.length,
      bufferSizeBytes: this.bufferSize,
      connectionUptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
    };
  }

  /**
   * Get assigned client ID (after handshake)
   */
  getClientId(): string {
    return this.assignedClientId ?? this.clientId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Connection Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Connect to daemon and perform handshake
   */
  private async connectToDaemon(): Promise<void> {
    this.connecting = true;

    try {
      // Connect via IPC transport
      this.socket = await this.config.transport.connect({
        timeout: 5000,
      });

      // Setup socket handlers
      this.setupSocketHandlers();

      // Perform handshake
      await this.performHandshake();

      this.connected = true;
      this.connecting = false;
      this.connectionStartTime = Date.now();
      this.reconnectAttempts = 0;

      // Flush buffered messages
      await this.flushMessageBuffer();

      this.emit('connected');
      logger.info('[StdioProxyClient] Connected to daemon', {
        clientId: this.getClientId(),
      });
    } catch (error) {
      this.connecting = false;
      throw error;
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('data', (data) => {
      this.handleSocketData(data);
    });

    this.socket.on('close', () => {
      this.handleDisconnect('socket_closed');
    });

    this.socket.on('error', (error) => {
      logger.error('[StdioProxyClient] Socket error', {
        error: error.message,
      });
      this.emit('error', error);
    });

    this.socket.on('end', () => {
      this.handleDisconnect('socket_ended');
    });
  }

  /**
   * Handle incoming socket data
   *
   * Processes newline-delimited messages from the daemon socket.
   * Includes buffer overflow protection to prevent memory exhaustion
   * from malformed data without delimiters.
   *
   * @param data - Raw data from socket
   */
  private handleSocketData(data: Buffer | string): void {
    const dataStr = data.toString();
    const incomingSize = Buffer.byteLength(dataStr, 'utf8');
    const currentSize = Buffer.byteLength(this.receiveBuffer, 'utf8');

    // Check if adding this data would exceed the buffer limit
    if (currentSize + incomingSize > this.config.maxReceiveBufferSize) {
      logger.error('[StdioProxyClient] Receive buffer overflow - clearing buffer to recover', {
        currentBufferSize: currentSize,
        incomingDataSize: incomingSize,
        maxBufferSize: this.config.maxReceiveBufferSize,
        bufferPreview: this.receiveBuffer.slice(0, 200),
      });

      // Clear buffer to recover from potential malformed data stream
      this.receiveBuffer = '';

      // Emit error event for monitoring/alerting
      this.emit('error', new Error(
        `Receive buffer overflow: buffer size (${currentSize}) + incoming data (${incomingSize}) ` +
        `exceeds limit (${this.config.maxReceiveBufferSize}). Buffer cleared.`
      ));

      // Don't append the data that caused overflow - it's likely part of malformed stream
      return;
    }

    this.receiveBuffer += dataStr;

    // Process complete messages (newline-delimited)
    let newlineIndex: number;
    while ((newlineIndex = this.receiveBuffer.indexOf(MESSAGE_DELIMITER)) !== -1) {
      const messageStr = this.receiveBuffer.slice(0, newlineIndex);
      this.receiveBuffer = this.receiveBuffer.slice(newlineIndex + 1);

      if (messageStr.trim()) {
        this.handleDaemonMessage(messageStr);
      }
    }
  }

  /**
   * Handle a complete daemon message
   */
  private handleDaemonMessage(messageStr: string): void {
    const message = parseMessage(messageStr);
    if (!message) {
      logger.warn('[StdioProxyClient] Failed to parse daemon message', {
        message: messageStr.slice(0, 100),
      });
      return;
    }

    switch (message.type) {
      case MessageType.MCP_RESPONSE:
        this.handleMcpResponse(message as McpResponseMessage);
        break;

      case MessageType.HEARTBEAT_ACK:
        // Heartbeat acknowledged - connection healthy
        logger.debug('[StdioProxyClient] Heartbeat acknowledged');
        break;

      case MessageType.SHUTDOWN:
        this.handleShutdown(message as ShutdownMessage);
        break;

      case MessageType.ERROR:
        this.handleError(message as ErrorMessage);
        break;

      case MessageType.UPGRADE_PENDING:
        // Upgrade notification - continue operating
        logger.info('[StdioProxyClient] Upgrade pending', {
          message,
        });
        break;

      default:
        logger.debug('[StdioProxyClient] Unhandled message type', {
          type: message.type,
        });
    }
  }

  /**
   * Handle MCP response from daemon
   */
  private handleMcpResponse(response: McpResponseMessage): void {
    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) {
      logger.warn('[StdioProxyClient] Received response for unknown request', {
        requestId: response.requestId,
      });
      return;
    }

    // Clear timeout and resolve
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.requestId);

    // Write response to stdout
    this.writeToStdout(response.payload);

    pending.resolve(response.payload);
  }

  /**
   * Handle shutdown notification from daemon
   */
  private handleShutdown(message: ShutdownMessage): void {
    logger.info('[StdioProxyClient] Daemon shutting down', {
      reason: message.reason,
      gracePeriod: message.gracePeriod,
    });

    this.emit('shutdown', message.reason);

    // Attempt reconnect after grace period
    if (!this.stopped && message.reason === 'upgrade') {
      setTimeout(() => {
        this.attemptReconnect();
      }, message.gracePeriod + 1000);
    }
  }

  /**
   * Handle error message from daemon
   */
  private handleError(message: ErrorMessage): void {
    logger.error('[StdioProxyClient] Daemon error', {
      code: message.code,
      message: message.message,
      requestId: message.requestId,
    });

    // If error is for a specific request, reject it
    if (message.requestId) {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);
        pending.reject(new Error(`Daemon error: ${message.code} - ${message.message}`));
      }
    }
  }

  /**
   * Handle disconnect event
   */
  private handleDisconnect(reason: string): void {
    if (this.stopped) return;

    const wasConnected = this.connected;
    this.connected = false;
    this.socket = null;
    this.receiveBuffer = '';

    if (wasConnected) {
      logger.warn('[StdioProxyClient] Disconnected from daemon', { reason });
      this.emit('disconnected', reason);
    }

    // Attempt reconnection
    if (!this.stopped) {
      this.attemptReconnect();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Handshake
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Perform handshake with daemon
   *
   * Uses buffer accumulation to handle handshake responses that may be
   * split across multiple TCP packets. Keeps accumulating data until
   * a complete message (ending with newline) is received.
   */
  private async performHandshake(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      // Clear handshake buffer at start
      this.handshakeBuffer = '';

      const timeoutId = setTimeout(() => {
        this.socket?.removeListener('data', handleHandshakeData);
        this.handshakeBuffer = '';
        reject(new Error('Handshake timeout'));
      }, 5000);

      // Handler that accumulates data until complete message is received
      const handleHandshakeData = (data: Buffer) => {
        this.handshakeBuffer += data.toString();

        // Check if we have a complete message (newline-delimited)
        const newlineIndex = this.handshakeBuffer.indexOf(MESSAGE_DELIMITER);
        if (newlineIndex === -1) {
          // Incomplete message, wait for more data
          return;
        }

        // Extract the complete message
        const messageStr = this.handshakeBuffer.slice(0, newlineIndex).trim();
        // Keep any remaining data for future messages (though unlikely during handshake)
        this.handshakeBuffer = this.handshakeBuffer.slice(newlineIndex + 1);

        const message = parseMessage(messageStr);

        if (!message || message.type !== MessageType.HANDSHAKE_ACK) {
          clearTimeout(timeoutId);
          this.socket?.removeListener('data', handleHandshakeData);
          this.handshakeBuffer = '';
          reject(new Error(`Invalid handshake response: ${messageStr.slice(0, 100)}`));
          return;
        }

        const ack = message as HandshakeAckMessage;

        if (!ack.success) {
          clearTimeout(timeoutId);
          this.socket?.removeListener('data', handleHandshakeData);
          this.handshakeBuffer = '';
          reject(new Error(`Handshake failed: ${ack.error}`));
          return;
        }

        // Store assigned client ID
        this.assignedClientId = ack.assignedClientId;

        // Emit upgrade available if recommended
        if (ack.upgradeRecommended) {
          this.emit('upgrade_available', ack.daemonVersion);
        }

        clearTimeout(timeoutId);
        this.socket?.removeListener('data', handleHandshakeData);
        this.handshakeBuffer = '';
        resolve();
      };

      // Use 'on' instead of 'once' to accumulate data across multiple packets
      this.socket.on('data', handleHandshakeData);

      // Send handshake
      const handshake = createHandshake(
        this.clientId,
        this.config.clientVersion,
        this.config.capabilities
      );

      this.socket.write(serializeMessage(handshake));
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Stdin Handling
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Setup stdin handler for MCP JSON-RPC
   *
   * Processes newline-delimited JSON-RPC messages from stdin.
   * Includes buffer overflow protection to prevent memory exhaustion
   * from malformed input without newline delimiters.
   *
   * Uses instance variable stdinBuffer to persist data across stop()/start() cycles.
   */
  private setupStdinHandler(): void {
    // Store listener reference for cleanup in stop()
    this.stdinDataListener = (data: Buffer | string) => {
      const dataStr = data.toString();
      const incomingSize = Buffer.byteLength(dataStr, 'utf8');
      const currentSize = Buffer.byteLength(this.stdinBuffer, 'utf8');

      // Check if adding this data would exceed the buffer limit
      if (currentSize + incomingSize > this.config.maxStdinBufferSize) {
        logger.error('[StdioProxyClient] Stdin buffer overflow - clearing buffer to recover', {
          currentBufferSize: currentSize,
          incomingDataSize: incomingSize,
          maxBufferSize: this.config.maxStdinBufferSize,
          bufferPreview: this.stdinBuffer.slice(0, 200),
        });

        // Clear buffer to recover
        this.stdinBuffer = '';

        // Write error response to stdout for MCP compliance
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700, // Parse error
            message: `Stdin buffer overflow: input exceeded ${this.config.maxStdinBufferSize} bytes without delimiter`,
          },
        };
        this.writeToStdout(errorResponse);

        // Don't append the data that caused overflow
        return;
      }

      this.stdinBuffer += dataStr;

      // Process complete JSON-RPC messages (newline-delimited)
      let newlineIndex: number;
      while ((newlineIndex = this.stdinBuffer.indexOf('\n')) !== -1) {
        const line = this.stdinBuffer.slice(0, newlineIndex);
        this.stdinBuffer = this.stdinBuffer.slice(newlineIndex + 1);

        if (line.trim()) {
          this.handleStdinMessage(line);
        }
      }
    };

    // Store listener reference for cleanup in stop()
    this.stdinEndListener = () => {
      logger.info('[StdioProxyClient] stdin ended');
      this.stop();
    };

    this.config.stdin.on('data', this.stdinDataListener);
    this.config.stdin.on('end', this.stdinEndListener);
  }

  /**
   * Handle a complete stdin message (MCP JSON-RPC)
   */
  private handleStdinMessage(messageStr: string): void {
    let payload: unknown;
    try {
      payload = JSON.parse(messageStr);
    } catch (error) {
      logger.error('[StdioProxyClient] Failed to parse stdin JSON', {
        error: error instanceof Error ? error.message : String(error),
        message: messageStr.slice(0, 100),
      });
      return;
    }

    // Forward to daemon
    this.forwardMcpRequest(payload);
  }

  /**
   * Forward MCP request to daemon
   */
  private forwardMcpRequest(payload: unknown): void {
    const requestId = uuidv4();

    if (!this.connected) {
      // Buffer during reconnect
      this.bufferMessage(requestId, payload);
      return;
    }

    this.sendMcpRequest(requestId, payload);
  }

  /**
   * Send MCP request to daemon
   */
  private sendMcpRequest(requestId: string, payload: unknown): void {
    if (!this.socket || !this.connected) {
      this.bufferMessage(requestId, payload);
      return;
    }

    // Create pending request entry
    const pending: PendingRequest = {
      requestId,
      resolve: () => {},
      reject: () => {},
      timeout: setTimeout(() => {
        this.pendingRequests.delete(requestId);
        logger.warn('[StdioProxyClient] Request timeout', { requestId });

        // Write error response to stdout for MCP compliance
        const errorResponse = {
          jsonrpc: '2.0',
          id: (payload as { id?: unknown })?.id ?? null,
          error: {
            code: -32000,
            message: 'Request timeout - daemon did not respond',
          },
        };
        this.writeToStdout(errorResponse);
      }, REQUEST_TIMEOUT_MS),
    };

    // Create promise to track completion (for internal use)
    new Promise<unknown>((resolve, reject) => {
      pending.resolve = resolve;
      pending.reject = reject;
    }).catch(() => {
      // Error already handled in timeout or handleError
    });

    this.pendingRequests.set(requestId, pending);

    // Send wrapped request
    const request = createMcpRequest(requestId, this.getClientId(), payload);
    this.socket.write(serializeMessage(request));

    this.requestsForwarded++;

    logger.debug('[StdioProxyClient] Forwarded MCP request', {
      requestId,
      method: (payload as { method?: string })?.method,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Message Buffering
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Buffer a message during reconnection
   */
  private bufferMessage(requestId: string, payload: unknown): void {
    const messageStr = JSON.stringify(payload);
    const messageSize = Buffer.byteLength(messageStr, 'utf8');

    // Check buffer size limit
    if (this.bufferSize + messageSize > this.config.bufferSizeLimit) {
      logger.error('[StdioProxyClient] Message buffer full, dropping message', {
        requestId,
        bufferSize: this.bufferSize,
        limit: this.config.bufferSizeLimit,
      });

      // Write error response to stdout
      const errorResponse = {
        jsonrpc: '2.0',
        id: (payload as { id?: unknown })?.id ?? null,
        error: {
          code: -32000,
          message: 'Daemon disconnected and message buffer full',
        },
      };
      this.writeToStdout(errorResponse);
      return;
    }

    this.messageBuffer.push({
      requestId,
      payload,
      timestamp: Date.now(),
    });
    this.bufferSize += messageSize;

    logger.debug('[StdioProxyClient] Buffered message during reconnect', {
      requestId,
      bufferCount: this.messageBuffer.length,
      bufferSize: this.bufferSize,
    });
  }

  /**
   * Flush buffered messages after reconnection
   */
  private async flushMessageBuffer(): Promise<void> {
    if (this.messageBuffer.length === 0) return;

    logger.info('[StdioProxyClient] Flushing buffered messages', {
      count: this.messageBuffer.length,
    });

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];
    this.bufferSize = 0;

    for (const buffered of messages) {
      // Check if message is too old
      if (Date.now() - buffered.timestamp > MESSAGE_STALE_THRESHOLD_MS) {
        logger.warn('[StdioProxyClient] Dropping stale buffered message', {
          requestId: buffered.requestId,
          age: Date.now() - buffered.timestamp,
        });

        // Write timeout error to stdout
        const errorResponse = {
          jsonrpc: '2.0',
          id: (buffered.payload as { id?: unknown })?.id ?? null,
          error: {
            code: -32000,
            message: 'Request expired during reconnection',
          },
        };
        this.writeToStdout(errorResponse);
        continue;
      }

      this.sendMcpRequest(buffered.requestId, buffered.payload);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Reconnection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Attempt to reconnect to daemon
   */
  private attemptReconnect(): void {
    if (this.stopped || this.connecting || this.connected) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('[StdioProxyClient] Max reconnect attempts reached', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts,
      });

      // Reject all pending and buffered requests
      this.rejectAllPending('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.reconnects++;

    // Exponential backoff
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info('[StdioProxyClient] Attempting reconnect', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connectToDaemon();
        this.startHeartbeat();
      } catch (error) {
        logger.warn('[StdioProxyClient] Reconnect failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(reason: string): void {
    // Reject pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();

    // Reject buffered messages
    for (const buffered of this.messageBuffer) {
      const errorResponse = {
        jsonrpc: '2.0',
        id: (buffered.payload as { id?: unknown })?.id ?? null,
        error: {
          code: -32000,
          message: reason,
        },
      };
      this.writeToStdout(errorResponse);
    }
    this.messageBuffer = [];
    this.bufferSize = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Heartbeat
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start heartbeat loop
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.connected || !this.socket) return;

      const heartbeat = {
        type: MessageType.HEARTBEAT,
        timestamp: Date.now(),
        clientId: this.getClientId(),
      };

      this.socket.write(serializeMessage(heartbeat as DaemonMessage));
      logger.debug('[StdioProxyClient] Sent heartbeat');
    }, this.config.heartbeatInterval);

    // Allow Node.js to exit naturally even if heartbeat timer is running
    this.heartbeatTimer.unref();
  }

  /**
   * Stop heartbeat loop
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Output
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Write JSON-RPC response to stdout
   */
  private writeToStdout(payload: unknown): void {
    const output = JSON.stringify(payload) + '\n';
    this.config.stdout.write(output);
  }
}

/**
 * Create a StdioProxyClient with default configuration
 */
export function createStdioProxyClient(
  transport: IpcTransport,
  clientVersion: string,
  options?: Partial<StdioProxyClientConfig>
): StdioProxyClient {
  return new StdioProxyClient({
    transport,
    clientVersion,
    ...options,
  });
}
