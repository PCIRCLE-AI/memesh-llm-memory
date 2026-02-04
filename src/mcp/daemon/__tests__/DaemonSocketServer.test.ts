/**
 * DaemonSocketServer Tests
 *
 * Tests for multi-client IPC server:
 * - Client connection/disconnection
 * - Message routing by clientId
 * - Handshake flow
 * - Heartbeat handling
 * - MCP request/response routing
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'net';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { DaemonSocketServer, type DaemonSocketServerConfig, type ClientInfo } from '../DaemonSocketServer.js';
import { IpcTransport } from '../IpcTransport.js';
import {
  MessageType,
  PROTOCOL_VERSION,
  serializeMessage,
  parseMessage,
  createHandshake,
  type DaemonMessage,
  type HandshakeMessage,
  type HandshakeAckMessage,
  type HeartbeatMessage,
  type HeartbeatAckMessage,
  type McpRequestMessage,
  type McpResponseMessage,
  type ErrorMessage,
} from '../DaemonProtocol.js';

// Test in a temporary directory
const TEST_DIR = path.join(os.tmpdir(), 'memesh-socket-server-test-' + process.pid);

// Mock the PathResolver to use test directory
vi.mock('../../../utils/PathResolver.js', () => ({
  getDataDirectory: () => TEST_DIR,
}));

// Mock logger to suppress output during tests
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Helper to create a test client that connects to the server
 */
async function createTestClient(transport: IpcTransport): Promise<net.Socket> {
  return transport.connect({ timeout: 2000 });
}

/**
 * Helper to send a message and wait for response
 */
async function sendAndReceive(
  socket: net.Socket,
  message: DaemonMessage,
  timeout: number = 2000
): Promise<DaemonMessage> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Response timeout'));
    }, timeout);

    let buffer = '';

    const onData = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const parsed = parseMessage(lines[i]);
        if (parsed) {
          clearTimeout(timeoutId);
          socket.off('data', onData);
          resolve(parsed);
          return;
        }
      }

      buffer = lines[lines.length - 1];
    };

    socket.on('data', onData);
    socket.write(serializeMessage(message));
  });
}

/**
 * Helper to perform handshake
 */
async function performHandshake(
  socket: net.Socket,
  clientId: string,
  clientVersion: string = '1.0.0'
): Promise<HandshakeAckMessage> {
  const handshake = createHandshake(clientId, clientVersion, []);
  const response = await sendAndReceive(socket, handshake);
  return response as HandshakeAckMessage;
}

describe('DaemonSocketServer', () => {
  let transport: IpcTransport;
  let server: DaemonSocketServer;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    transport = new IpcTransport({ socketName: 'test-server' });
  });

  afterEach(async () => {
    // Stop server if running
    if (server) {
      await server.stop();
    }

    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('lifecycle', () => {
    it('should start and stop successfully', async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
      });

      await server.start();
      expect(server.getClientCount()).toBe(0);

      await server.stop();
    });

    it('should not allow double start', async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
      });

      await server.start();
      await expect(server.start()).rejects.toThrow('already');
    });

    it('should be safe to stop when not started', async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
      });

      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('client connection', () => {
    beforeEach(async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
        heartbeatTimeout: 60000, // Long timeout for tests
      });
      await server.start();
    });

    it('should accept client connections', async () => {
      const connectEvents: ClientInfo[] = [];
      server.on('client_connect', (client) => connectEvents.push(client));

      const client = await createTestClient(transport);
      const ack = await performHandshake(client, 'test-client-1');

      expect(ack.success).toBe(true);
      expect(ack.daemonVersion).toBe('1.0.0');
      expect(ack.protocolVersion).toBe(PROTOCOL_VERSION);
      expect(server.getClientCount()).toBe(1);

      // Wait for event to fire
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(connectEvents.length).toBe(1);
      expect(connectEvents[0].clientId).toBe('test-client-1');

      client.destroy();
    });

    it('should handle multiple client connections', async () => {
      const clients: net.Socket[] = [];

      for (let i = 1; i <= 3; i++) {
        const client = await createTestClient(transport);
        await performHandshake(client, `client-${i}`);
        clients.push(client);
      }

      expect(server.getClientCount()).toBe(3);

      const clientList = server.getClients();
      expect(clientList.length).toBe(3);
      expect(clientList.map((c) => c.clientId).sort()).toEqual(['client-1', 'client-2', 'client-3']);

      clients.forEach((c) => c.destroy());
    });

    it('should generate unique clientId if duplicate requested', async () => {
      const client1 = await createTestClient(transport);
      const ack1 = await performHandshake(client1, 'same-id');
      expect(ack1.assignedClientId).toBe('same-id');

      const client2 = await createTestClient(transport);
      const ack2 = await performHandshake(client2, 'same-id');
      expect(ack2.success).toBe(true);
      expect(ack2.assignedClientId).not.toBe('same-id'); // Should be different

      expect(server.getClientCount()).toBe(2);

      client1.destroy();
      client2.destroy();
    });

    it('should emit client_disconnect on socket close', async () => {
      const disconnectEvents: string[] = [];
      server.on('client_disconnect', (clientId) => disconnectEvents.push(clientId));

      const client = await createTestClient(transport);
      await performHandshake(client, 'disconnect-test');

      expect(server.getClientCount()).toBe(1);

      client.destroy();

      // Wait for disconnect event
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(disconnectEvents.length).toBe(1);
      expect(disconnectEvents[0]).toBe('disconnect-test');
      expect(server.getClientCount()).toBe(0);
    });

    it('should handle graceful disconnect message', async () => {
      const client = await createTestClient(transport);
      await performHandshake(client, 'graceful-disconnect');

      expect(server.getClientCount()).toBe(1);

      // Send disconnect message
      const disconnectMsg: DaemonMessage = {
        type: MessageType.DISCONNECT,
        timestamp: Date.now(),
        clientId: 'graceful-disconnect',
        reason: 'normal',
      };
      client.write(serializeMessage(disconnectMsg));

      // Wait for server to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(server.getClientCount()).toBe(0);

      client.destroy();
    });

    it('should allow manual disconnection of client', async () => {
      const client = await createTestClient(transport);
      await performHandshake(client, 'manual-disconnect');

      expect(server.getClientCount()).toBe(1);

      server.disconnectClient('manual-disconnect');

      // Wait for disconnect
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(server.getClientCount()).toBe(0);

      client.destroy();
    });
  });

  describe('handshake', () => {
    beforeEach(async () => {
      server = new DaemonSocketServer({
        transport,
        version: '2.0.0',
        heartbeatTimeout: 60000,
      });
      await server.start();
    });

    it('should recommend upgrade when client version is newer', async () => {
      const client = await createTestClient(transport);
      const ack = await performHandshake(client, 'newer-client', '3.0.0');

      expect(ack.success).toBe(true);
      expect(ack.upgradeRecommended).toBe(true);
      expect(ack.daemonVersion).toBe('2.0.0');

      client.destroy();
    });

    it('should not recommend upgrade when daemon is same or newer', async () => {
      const client = await createTestClient(transport);
      const ack = await performHandshake(client, 'older-client', '1.0.0');

      expect(ack.success).toBe(true);
      expect(ack.upgradeRecommended).toBe(false);

      client.destroy();
    });
  });

  describe('heartbeat', () => {
    beforeEach(async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
        heartbeatInterval: 100,
        heartbeatTimeout: 60000,
      });
      await server.start();
    });

    it('should respond to heartbeat with stats', async () => {
      const client = await createTestClient(transport);
      await performHandshake(client, 'heartbeat-client');

      const heartbeat: HeartbeatMessage = {
        type: MessageType.HEARTBEAT,
        timestamp: Date.now(),
        clientId: 'heartbeat-client',
      };

      const response = (await sendAndReceive(client, heartbeat)) as HeartbeatAckMessage;

      expect(response.type).toBe(MessageType.HEARTBEAT_ACK);
      expect(response.clientId).toBe('heartbeat-client');
      expect(response.stats).toBeDefined();
      expect(response.stats.clientCount).toBe(1);
      expect(response.stats.uptime).toBeGreaterThanOrEqual(0);

      client.destroy();
    });
  });

  describe('MCP request routing', () => {
    let mcpHandler: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      mcpHandler = vi.fn().mockImplementation(async (request: unknown) => {
        // Echo the request back as response
        return { result: request };
      });

      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
        heartbeatTimeout: 60000,
      });
      server.setMcpHandler(mcpHandler);
      await server.start();
    });

    it('should forward MCP request to handler and return response', async () => {
      const client = await createTestClient(transport);
      await performHandshake(client, 'mcp-client');

      const mcpRequest: McpRequestMessage = {
        type: MessageType.MCP_REQUEST,
        timestamp: Date.now(),
        requestId: 'req-123',
        clientId: 'mcp-client',
        payload: { method: 'tools/list', params: {} },
      };

      const response = (await sendAndReceive(client, mcpRequest)) as McpResponseMessage;

      expect(response.type).toBe(MessageType.MCP_RESPONSE);
      expect(response.requestId).toBe('req-123');
      expect(response.clientId).toBe('mcp-client');
      expect(response.payload).toEqual({ result: { method: 'tools/list', params: {} } });
      expect(mcpHandler).toHaveBeenCalledWith({ method: 'tools/list', params: {} });

      client.destroy();
    });

    it('should route responses to correct client', async () => {
      const client1 = await createTestClient(transport);
      await performHandshake(client1, 'client-1');

      const client2 = await createTestClient(transport);
      await performHandshake(client2, 'client-2');

      // Slow handler to test routing
      mcpHandler.mockImplementation(async (request: unknown) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { result: request };
      });

      // Send requests from both clients
      const req1: McpRequestMessage = {
        type: MessageType.MCP_REQUEST,
        timestamp: Date.now(),
        requestId: 'req-from-1',
        clientId: 'client-1',
        payload: { from: 'client-1' },
      };

      const req2: McpRequestMessage = {
        type: MessageType.MCP_REQUEST,
        timestamp: Date.now(),
        requestId: 'req-from-2',
        clientId: 'client-2',
        payload: { from: 'client-2' },
      };

      const [resp1, resp2] = await Promise.all([
        sendAndReceive(client1, req1),
        sendAndReceive(client2, req2),
      ]);

      // Each client should receive their own response
      expect((resp1 as McpResponseMessage).requestId).toBe('req-from-1');
      expect((resp1 as McpResponseMessage).clientId).toBe('client-1');

      expect((resp2 as McpResponseMessage).requestId).toBe('req-from-2');
      expect((resp2 as McpResponseMessage).clientId).toBe('client-2');

      client1.destroy();
      client2.destroy();
    });

    it('should return error response when handler throws', async () => {
      mcpHandler.mockImplementation(async () => {
        throw new Error('Handler error');
      });

      const client = await createTestClient(transport);
      await performHandshake(client, 'error-client');

      const mcpRequest: McpRequestMessage = {
        type: MessageType.MCP_REQUEST,
        timestamp: Date.now(),
        requestId: 'req-error',
        clientId: 'error-client',
        payload: { method: 'will/fail' },
      };

      const response = (await sendAndReceive(client, mcpRequest)) as ErrorMessage;

      expect(response.type).toBe(MessageType.ERROR);
      expect(response.requestId).toBe('req-error');
      expect(response.clientId).toBe('error-client');
      expect(response.message).toContain('Handler error');

      client.destroy();
    });

    it('should return error when no MCP handler set', async () => {
      const serverNoHandler = new DaemonSocketServer({
        transport: new IpcTransport({ socketName: 'no-handler' }),
        version: '1.0.0',
      });
      // Don't set MCP handler
      await serverNoHandler.start();

      const noHandlerTransport = new IpcTransport({ socketName: 'no-handler' });
      const client = await createTestClient(noHandlerTransport);
      await performHandshake(client, 'no-handler-client');

      const mcpRequest: McpRequestMessage = {
        type: MessageType.MCP_REQUEST,
        timestamp: Date.now(),
        requestId: 'req-no-handler',
        clientId: 'no-handler-client',
        payload: { method: 'tools/list' },
      };

      const response = (await sendAndReceive(client, mcpRequest)) as ErrorMessage;

      expect(response.type).toBe(MessageType.ERROR);
      expect(response.code).toBe('NO_HANDLER');

      client.destroy();
      await serverNoHandler.stop();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
        heartbeatTimeout: 60000,
      });
      await server.start();
    });

    it('should send error on invalid JSON', async () => {
      const client = await createTestClient(transport);

      // Send invalid JSON
      client.write('not valid json\n');

      // Read response
      const response = await new Promise<DaemonMessage>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout')), 2000);
        let buffer = '';

        client.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parsed = parseMessage(line);
              if (parsed) {
                clearTimeout(timeoutId);
                resolve(parsed);
                return;
              }
            }
          }
        });
      });

      expect(response.type).toBe(MessageType.ERROR);
      expect((response as ErrorMessage).code).toBe('INVALID_MESSAGE');

      client.destroy();
    });

    it('should send error on unknown message type', async () => {
      const client = await createTestClient(transport);
      await performHandshake(client, 'unknown-type-client');

      // Send message with unknown type
      // Note: With the new validateMessage() in parseMessage(), unknown types
      // are rejected during parsing and return INVALID_MESSAGE instead of
      // reaching the switch statement that would return UNKNOWN_MESSAGE_TYPE.
      const unknownMsg = {
        type: 'unknown_type',
        timestamp: Date.now(),
      };
      client.write(JSON.stringify(unknownMsg) + '\n');

      // Read response
      const response = await new Promise<DaemonMessage>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout')), 2000);
        let buffer = '';

        client.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              // Parse the raw JSON since parseMessage() might reject it
              try {
                const parsed = JSON.parse(line);
                if (parsed && parsed.type === MessageType.ERROR) {
                  clearTimeout(timeoutId);
                  resolve(parsed);
                  return;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        });
      });

      expect(response.type).toBe(MessageType.ERROR);
      // Unknown message types are now caught during validation in parseMessage(),
      // so they return INVALID_MESSAGE instead of UNKNOWN_MESSAGE_TYPE
      expect((response as ErrorMessage).code).toBe('INVALID_MESSAGE');

      client.destroy();
    });

    it('should require handshake before other messages', async () => {
      const client = await createTestClient(transport);

      // Send heartbeat without handshake
      const heartbeat: HeartbeatMessage = {
        type: MessageType.HEARTBEAT,
        timestamp: Date.now(),
        clientId: 'no-handshake',
      };
      client.write(serializeMessage(heartbeat));

      const response = await new Promise<DaemonMessage>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout')), 2000);
        let buffer = '';

        client.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parsed = parseMessage(line);
              if (parsed) {
                clearTimeout(timeoutId);
                resolve(parsed);
                return;
              }
            }
          }
        });
      });

      expect(response.type).toBe(MessageType.ERROR);
      expect((response as ErrorMessage).code).toBe('HANDSHAKE_REQUIRED');

      client.destroy();
    });
  });

  describe('upgrade request', () => {
    beforeEach(async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
        heartbeatTimeout: 60000,
      });
      await server.start();
    });

    it('should emit upgrade_requested event', async () => {
      const upgradeRequests: unknown[] = [];
      server.on('upgrade_requested', (request) => upgradeRequests.push(request));

      const client = await createTestClient(transport);
      await performHandshake(client, 'upgrade-client', '2.0.0');

      const upgradeRequest: DaemonMessage = {
        type: MessageType.REQUEST_UPGRADE,
        timestamp: Date.now(),
        clientId: 'upgrade-client',
        newVersion: '2.0.0',
        reason: 'version_mismatch',
      };
      client.write(serializeMessage(upgradeRequest));

      // Wait for event
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(upgradeRequests.length).toBe(1);

      client.destroy();
    });
  });

  describe('message framing', () => {
    beforeEach(async () => {
      server = new DaemonSocketServer({
        transport,
        version: '1.0.0',
        heartbeatTimeout: 60000,
      });
      await server.start();
    });

    it('should handle fragmented messages', async () => {
      const client = await createTestClient(transport);

      // Send handshake in fragments
      const handshake = createHandshake('fragmented-client', '1.0.0', []);
      const serialized = serializeMessage(handshake);

      // Split into chunks
      const mid = Math.floor(serialized.length / 2);
      client.write(serialized.slice(0, mid));
      await new Promise((resolve) => setTimeout(resolve, 50));
      client.write(serialized.slice(mid));

      // Wait for response
      const response = await new Promise<DaemonMessage>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout')), 2000);
        let buffer = '';

        client.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parsed = parseMessage(line);
              if (parsed) {
                clearTimeout(timeoutId);
                resolve(parsed);
                return;
              }
            }
          }
        });
      });

      expect(response.type).toBe(MessageType.HANDSHAKE_ACK);
      expect((response as HandshakeAckMessage).success).toBe(true);

      client.destroy();
    });

    it('should handle multiple messages in single packet', async () => {
      const client = await createTestClient(transport);
      await performHandshake(client, 'multi-msg-client');

      // Send multiple heartbeats in one write
      const heartbeat1: HeartbeatMessage = {
        type: MessageType.HEARTBEAT,
        timestamp: Date.now(),
        clientId: 'multi-msg-client',
      };
      const heartbeat2: HeartbeatMessage = {
        type: MessageType.HEARTBEAT,
        timestamp: Date.now() + 1,
        clientId: 'multi-msg-client',
      };

      client.write(serializeMessage(heartbeat1) + serializeMessage(heartbeat2));

      // Collect responses
      const responses: DaemonMessage[] = [];
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(), 500);
        let buffer = '';

        client.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');

          for (let i = 0; i < lines.length - 1; i++) {
            const parsed = parseMessage(lines[i]);
            if (parsed) {
              responses.push(parsed);
              if (responses.length >= 2) {
                clearTimeout(timeoutId);
                resolve();
                return;
              }
            }
          }

          buffer = lines[lines.length - 1];
        });
      });

      expect(responses.length).toBe(2);
      expect(responses[0].type).toBe(MessageType.HEARTBEAT_ACK);
      expect(responses[1].type).toBe(MessageType.HEARTBEAT_ACK);

      client.destroy();
    });
  });
});
