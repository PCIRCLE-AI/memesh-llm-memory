/**
 * StdioProxyClient Tests
 *
 * Tests for MCP stdin/stdout proxy to daemon:
 * - Connection and handshake
 * - Request forwarding
 * - Response handling
 * - Reconnection with exponential backoff
 * - Message buffering during reconnect
 * - Heartbeat
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter, PassThrough } from 'stream';
import net from 'net';
import { StdioProxyClient, createStdioProxyClient } from '../StdioProxyClient.js';
import { IpcTransport } from '../IpcTransport.js';
import {
  MessageType,
  createHandshakeAck,
  createMcpResponse,
  createError,
  createShutdown,
  serializeMessage,
  PROTOCOL_VERSION,
} from '../DaemonProtocol.js';

// Mock IpcTransport
vi.mock('../IpcTransport.js');

// Mock logger to avoid noise in tests
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Mock socket for testing
 */
class MockSocket extends EventEmitter {
  destroyed = false;
  writable = true;
  writtenData: string[] = [];

  write(data: string | Buffer): boolean {
    if (this.destroyed) return false;
    this.writtenData.push(data.toString());
    return true;
  }

  destroy(): void {
    this.destroyed = true;
    this.emit('close');
  }

  // Helper to simulate receiving data
  receiveData(data: string): void {
    this.emit('data', Buffer.from(data));
  }

  // Helper to get written messages
  getWrittenMessages(): unknown[] {
    return this.writtenData.map((data) => {
      const trimmed = data.trim();
      return trimmed ? JSON.parse(trimmed) : null;
    }).filter(Boolean);
  }

  // Reset for reuse
  reset(): void {
    this.destroyed = false;
    this.writable = true;
    this.writtenData = [];
    this.removeAllListeners();
  }
}

/**
 * Create mock transport
 */
function createMockTransport(mockSocket: MockSocket): IpcTransport {
  const transport = new IpcTransport() as jest.Mocked<IpcTransport>;

  transport.connect = vi.fn().mockImplementation(() => {
    mockSocket.reset();
    return Promise.resolve(mockSocket as unknown as net.Socket);
  });

  return transport;
}

/**
 * Create mock stdin/stdout streams
 */
function createMockStreams() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();

  const stdoutData: string[] = [];
  stdout.on('data', (data) => {
    stdoutData.push(data.toString());
  });

  return {
    stdin,
    stdout,
    getStdoutData: () => stdoutData,
    getStdoutMessages: () =>
      stdoutData.flatMap((data) =>
        data.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line))
      ),
  };
}

describe('StdioProxyClient', () => {
  let mockSocket: MockSocket;
  let mockTransport: IpcTransport;
  let proxy: StdioProxyClient;
  let streams: ReturnType<typeof createMockStreams>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket = new MockSocket();
    mockTransport = createMockTransport(mockSocket);
    streams = createMockStreams();
  });

  afterEach(async () => {
    if (proxy) {
      await proxy.stop();
    }
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create instance with required config', () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      expect(proxy).toBeInstanceOf(StdioProxyClient);
      expect(proxy.isConnected()).toBe(false);
    });

    it('should use default values for optional config', () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const stats = proxy.getStats();
      expect(stats.requestsForwarded).toBe(0);
      expect(stats.reconnects).toBe(0);
    });
  });

  describe('start', () => {
    it('should connect to daemon and perform handshake', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      // Start connection
      const startPromise = proxy.start();

      // Wait for handshake to be sent
      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      // Parse and verify handshake message
      const handshake = JSON.parse(mockSocket.writtenData[0]);
      expect(handshake.type).toBe(MessageType.HANDSHAKE);
      expect(handshake.clientVersion).toBe('1.0.0');
      expect(handshake.protocolVersion).toBe(PROTOCOL_VERSION);

      // Simulate handshake ack from daemon
      const ack = createHandshakeAck(true, '1.0.0', 'assigned-client-id');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      expect(proxy.isConnected()).toBe(true);
      expect(proxy.getClientId()).toBe('assigned-client-id');
    });

    it('should emit connected event after successful handshake', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const connectedHandler = vi.fn();
      proxy.on('connected', connectedHandler);

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      expect(connectedHandler).toHaveBeenCalled();
    });

    it('should emit upgrade_available when upgrade recommended', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const upgradeHandler = vi.fn();
      proxy.on('upgrade_available', upgradeHandler);

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      // Daemon has newer version
      const ack = createHandshakeAck(true, '2.0.0', 'client-123', true);
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      expect(upgradeHandler).toHaveBeenCalledWith('2.0.0');
    });

    it('should reject if handshake fails', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      // Handshake failed
      const ack = createHandshakeAck(false, '1.0.0', '', false, 'Protocol version mismatch');
      mockSocket.receiveData(serializeMessage(ack));

      await expect(startPromise).rejects.toThrow('Handshake failed');
    });

    it('should throw if already started', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Second start should throw
      await expect(proxy.start()).rejects.toThrow('already started');
    });
  });

  describe('stop', () => {
    it('should disconnect and clean up resources', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      expect(proxy.isConnected()).toBe(true);

      await proxy.stop();

      expect(proxy.isConnected()).toBe(false);
      expect(mockSocket.destroyed).toBe(true);
    });
  });

  describe('request forwarding', () => {
    beforeEach(async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Clear handshake message
      mockSocket.writtenData = [];
    });

    it('should forward MCP JSON-RPC from stdin to daemon', async () => {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      // Send request via stdin
      streams.stdin.write(JSON.stringify(mcpRequest) + '\n');

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      // Verify wrapped request
      const wrappedRequest = JSON.parse(mockSocket.writtenData[0]);
      expect(wrappedRequest.type).toBe(MessageType.MCP_REQUEST);
      expect(wrappedRequest.clientId).toBe('client-123');
      expect(wrappedRequest.payload).toEqual(mcpRequest);
      expect(wrappedRequest.requestId).toBeDefined();
    });

    it('should write MCP response from daemon to stdout', async () => {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      streams.stdin.write(JSON.stringify(mcpRequest) + '\n');

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const wrappedRequest = JSON.parse(mockSocket.writtenData[0]);

      // Simulate response from daemon
      const mcpResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [] },
      };
      const response = createMcpResponse(wrappedRequest.requestId, 'client-123', mcpResponse);
      mockSocket.receiveData(serializeMessage(response));

      await vi.waitFor(() => {
        expect(streams.getStdoutData().length).toBeGreaterThan(0);
      });

      const outputMessages = streams.getStdoutMessages();
      expect(outputMessages[0]).toEqual(mcpResponse);
    });

    it('should track forwarded requests in stats', async () => {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      streams.stdin.write(JSON.stringify(mcpRequest) + '\n');

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const stats = proxy.getStats();
      expect(stats.requestsForwarded).toBe(1);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = [
        { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
        { jsonrpc: '2.0', id: 2, method: 'resources/list', params: {} },
        { jsonrpc: '2.0', id: 3, method: 'prompts/list', params: {} },
      ];

      // Send all requests
      for (const req of requests) {
        streams.stdin.write(JSON.stringify(req) + '\n');
      }

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBe(3);
      });

      // Send responses out of order
      const wrappedRequests = mockSocket.writtenData.map(d => JSON.parse(d));

      // Respond to request 2 first
      const response2 = createMcpResponse(
        wrappedRequests[1].requestId,
        'client-123',
        { jsonrpc: '2.0', id: 2, result: { resources: [] } }
      );
      mockSocket.receiveData(serializeMessage(response2));

      await vi.waitFor(() => {
        expect(streams.getStdoutData().length).toBeGreaterThan(0);
      });

      // Then respond to request 1
      const response1 = createMcpResponse(
        wrappedRequests[0].requestId,
        'client-123',
        { jsonrpc: '2.0', id: 1, result: { tools: [] } }
      );
      mockSocket.receiveData(serializeMessage(response1));

      await vi.waitFor(() => {
        expect(streams.getStdoutMessages().length).toBe(2);
      });

      const outputMessages = streams.getStdoutMessages();
      expect(outputMessages.map(m => m.id)).toContain(1);
      expect(outputMessages.map(m => m.id)).toContain(2);
    });
  });

  describe('reconnection', () => {
    it('should buffer messages during reconnect', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        maxReconnectAttempts: 3,
        reconnectDelay: 100,
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Simulate disconnect
      mockSocket.emit('close');

      expect(proxy.isConnected()).toBe(false);

      // Send request while disconnected
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };
      streams.stdin.write(JSON.stringify(mcpRequest) + '\n');

      // Should be buffered
      const stats = proxy.getStats();
      expect(stats.bufferedMessages).toBe(1);
    });

    it('should attempt reconnect with exponential backoff', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        maxReconnectAttempts: 3,
        reconnectDelay: 100,
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      const disconnectedHandler = vi.fn();
      proxy.on('disconnected', disconnectedHandler);

      // Simulate disconnect
      mockSocket.emit('close');

      expect(disconnectedHandler).toHaveBeenCalledWith('socket_closed');

      // Wait for first reconnect attempt (100ms)
      vi.advanceTimersByTime(100);

      await vi.waitFor(() => {
        expect(mockTransport.connect).toHaveBeenCalledTimes(2);
      });

      // Complete reconnection
      const ack2 = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack2));

      await vi.waitFor(() => {
        expect(proxy.isConnected()).toBe(true);
      });

      expect(proxy.getStats().reconnects).toBe(1);
    });

    it('should flush buffered messages after reconnect', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        maxReconnectAttempts: 3,
        reconnectDelay: 100,
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Clear initial handshake
      mockSocket.writtenData = [];

      // Disconnect
      mockSocket.emit('close');

      // Buffer a message
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };
      streams.stdin.write(JSON.stringify(mcpRequest) + '\n');

      expect(proxy.getStats().bufferedMessages).toBe(1);

      // Reconnect
      vi.advanceTimersByTime(100);

      await vi.waitFor(() => {
        expect(mockTransport.connect).toHaveBeenCalledTimes(2);
      });

      // Complete handshake
      const ack2 = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack2));

      await vi.waitFor(() => {
        expect(proxy.isConnected()).toBe(true);
      });

      // Buffered message should be flushed (after handshake)
      await vi.waitFor(() => {
        // Filter out handshake messages
        const mcpRequests = mockSocket.getWrittenMessages()
          .filter(m => (m as { type: string }).type === MessageType.MCP_REQUEST);
        expect(mcpRequests.length).toBeGreaterThan(0);
      });

      expect(proxy.getStats().bufferedMessages).toBe(0);
    });

    it('should give up after max reconnect attempts', async () => {
      // Make connect fail after initial connection
      let connectCount = 0;
      mockTransport.connect = vi.fn().mockImplementation(() => {
        connectCount++;
        if (connectCount === 1) {
          mockSocket.reset();
          return Promise.resolve(mockSocket as unknown as net.Socket);
        }
        return Promise.reject(new Error('Connection failed'));
      });

      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        maxReconnectAttempts: 2,
        reconnectDelay: 100,
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Disconnect
      mockSocket.emit('close');

      // First attempt (100ms)
      vi.advanceTimersByTime(100);

      // Second attempt (200ms with backoff)
      vi.advanceTimersByTime(200);

      // Should have given up after 2 attempts
      await vi.waitFor(() => {
        expect(connectCount).toBe(3); // 1 initial + 2 reconnect attempts
      });
    });
  });

  describe('heartbeat', () => {
    it('should send periodic heartbeats', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        heartbeatInterval: 1000,
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Clear handshake
      mockSocket.writtenData = [];

      // Advance time to trigger heartbeat
      vi.advanceTimersByTime(1000);

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const heartbeat = JSON.parse(mockSocket.writtenData[0]);
      expect(heartbeat.type).toBe(MessageType.HEARTBEAT);
      expect(heartbeat.clientId).toBe('client-123');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      mockSocket.writtenData = [];
    });

    it('should handle daemon error for specific request', async () => {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'invalid' },
      };

      streams.stdin.write(JSON.stringify(mcpRequest) + '\n');

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const wrappedRequest = JSON.parse(mockSocket.writtenData[0]);

      // Daemon sends error
      const errorMsg = createError(
        'TOOL_NOT_FOUND',
        'Tool not found: invalid',
        undefined,
        wrappedRequest.requestId,
        'client-123'
      );
      mockSocket.receiveData(serializeMessage(errorMsg));

      // Error should be logged but not written to stdout
      // (MCP error responses go through MCP_RESPONSE)
    });

    it('should handle shutdown notification', async () => {
      const shutdownHandler = vi.fn();
      proxy.on('shutdown', shutdownHandler);

      const shutdown = createShutdown('upgrade', 5000);
      mockSocket.receiveData(serializeMessage(shutdown));

      expect(shutdownHandler).toHaveBeenCalledWith('upgrade');
    });

    it('should handle invalid stdin JSON', async () => {
      // Send invalid JSON
      streams.stdin.write('not valid json\n');

      // Should not throw or crash - error is logged
      // Verify proxy is still operational
      expect(proxy.isConnected()).toBe(true);
    });

    it('should handle buffer size limit', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        bufferSizeLimit: 100, // Very small buffer
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Disconnect to trigger buffering
      mockSocket.emit('close');

      // Try to buffer a large message
      const largeRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: { data: 'x'.repeat(200) },
      };
      streams.stdin.write(JSON.stringify(largeRequest) + '\n');

      // Should write error to stdout since buffer is full
      await vi.waitFor(() => {
        const messages = streams.getStdoutMessages();
        return messages.some(m => m.error?.code === -32000);
      });

      const errorMessages = streams.getStdoutMessages().filter(m => m.error);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0].error.code).toBe(-32000);
    });

    it('should protect against receive buffer overflow from daemon', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        maxReceiveBufferSize: 100, // Very small receive buffer
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const errorHandler = vi.fn();
      proxy.on('error', errorHandler);

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Send data without newline delimiter that exceeds buffer limit
      // This simulates malformed data that could cause unbounded buffer growth
      const largeDataWithoutDelimiter = 'x'.repeat(150); // No newline, exceeds 100 byte limit
      mockSocket.emit('data', Buffer.from(largeDataWithoutDelimiter));

      // Should emit error event for buffer overflow
      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      });

      const errorArg = errorHandler.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toContain('Receive buffer overflow');

      // Proxy should still be operational after buffer clear
      expect(proxy.isConnected()).toBe(true);
    });

    it('should protect against stdin buffer overflow', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        maxStdinBufferSize: 100, // Very small stdin buffer
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Send data without newline delimiter that exceeds buffer limit
      const largeDataWithoutDelimiter = 'x'.repeat(150); // No newline, exceeds 100 byte limit
      streams.stdin.write(largeDataWithoutDelimiter);

      // Should write JSON-RPC parse error to stdout
      await vi.waitFor(() => {
        const messages = streams.getStdoutMessages();
        return messages.some(m => m.error?.code === -32700);
      });

      const errorMessages = streams.getStdoutMessages().filter(m => m.error);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0].error.code).toBe(-32700); // Parse error
      expect(errorMessages[0].error.message).toContain('Stdin buffer overflow');
    });

    it('should recover from receive buffer overflow and continue processing', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        maxReceiveBufferSize: 100,
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      // Add error handler to prevent unhandled error
      const errorHandler = vi.fn();
      proxy.on('error', errorHandler);

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Clear handshake
      mockSocket.writtenData = [];

      // Cause buffer overflow
      const largeDataWithoutDelimiter = 'x'.repeat(150);
      mockSocket.emit('data', Buffer.from(largeDataWithoutDelimiter));

      // Wait for error to be handled
      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      });

      // Now send a valid request via stdin
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };
      streams.stdin.write(JSON.stringify(mcpRequest) + '\n');

      // Request should still be forwarded successfully
      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const wrappedRequest = JSON.parse(mockSocket.writtenData[0]);
      expect(wrappedRequest.type).toBe(MessageType.MCP_REQUEST);
      expect(wrappedRequest.payload).toEqual(mcpRequest);
    });
  });

  describe('createStdioProxyClient factory', () => {
    it('should create StdioProxyClient instance', () => {
      const client = createStdioProxyClient(mockTransport, '1.0.0', {
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      expect(client).toBeInstanceOf(StdioProxyClient);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      proxy = new StdioProxyClient({
        transport: mockTransport,
        clientVersion: '1.0.0',
        stdin: streams.stdin,
        stdout: streams.stdout,
      });

      const initialStats = proxy.getStats();
      expect(initialStats.requestsForwarded).toBe(0);
      expect(initialStats.reconnects).toBe(0);
      expect(initialStats.bufferedMessages).toBe(0);
      expect(initialStats.connectionUptime).toBe(0);

      const startPromise = proxy.start();

      await vi.waitFor(() => {
        expect(mockSocket.writtenData.length).toBeGreaterThan(0);
      });

      const ack = createHandshakeAck(true, '1.0.0', 'client-123');
      mockSocket.receiveData(serializeMessage(ack));

      await startPromise;

      // Advance time
      vi.advanceTimersByTime(5000);

      const stats = proxy.getStats();
      expect(stats.connectionUptime).toBe(5000);
    });
  });
});
