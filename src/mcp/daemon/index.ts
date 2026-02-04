/**
 * MeMesh Daemon Module
 *
 * Singleton daemon architecture for sharing MCP server across
 * multiple Claude Code sessions.
 *
 * Components:
 * - DaemonLockManager: Lock file management for singleton pattern
 * - IpcTransport: Cross-platform IPC (Unix socket / Windows named pipe)
 * - DaemonProtocol: Message types and serialization
 * - DaemonSocketServer: Multi-client IPC server
 * - StdioProxyClient: MCP stdin/stdout proxy
 * - GracefulShutdownCoordinator: Graceful upgrade flow
 * - VersionManager: Version compatibility checking
 */

// Lock management
export {
  DaemonLockManager,
  type LockInfo,
  type LockAcquisitionResult,
} from './DaemonLockManager.js';

// IPC transport
export {
  IpcTransport,
  createIpcTransport,
  type IpcTransportConfig,
  type ConnectOptions,
  type ServerOptions,
} from './IpcTransport.js';

// Protocol definitions
export {
  PROTOCOL_VERSION,
  MessageType,
  type BaseMessage,
  type HandshakeMessage,
  type HandshakeAckMessage,
  type HeartbeatMessage,
  type HeartbeatAckMessage,
  type DisconnectMessage,
  type McpRequestMessage,
  type McpResponseMessage,
  type McpNotificationMessage,
  type RequestUpgradeMessage,
  type UpgradePendingMessage,
  type UpgradeAbortMessage,
  type ShutdownMessage,
  type ErrorMessage,
  type DaemonMessage,
  // Message factories
  createHandshake,
  createHandshakeAck,
  createMcpRequest,
  createMcpResponse,
  createError,
  createShutdown,
  // Parsing utilities
  parseMessage,
  serializeMessage,
  MESSAGE_DELIMITER,
} from './DaemonProtocol.js';

// Socket server
export {
  DaemonSocketServer,
  type DaemonSocketServerConfig,
  type ClientInfo,
  type McpHandler,
  type DaemonSocketServerEvents,
} from './DaemonSocketServer.js';

// Version management
export {
  VersionManager,
  parseVersion,
  compareVersions,
  type ParsedVersion,
  type VersionInfo,
  type CompatibilityResult,
} from './VersionManager.js';

// Bootstrap
export {
  DaemonBootstrap,
  isDaemonDisabled,
  shouldRunAsProxy,
  bootstrap,
  type BootstrapMode,
  type BootstrapResult,
  type DaemonBootstrapConfig,
} from './DaemonBootstrap.js';

// Graceful shutdown coordination
export {
  GracefulShutdownCoordinator,
  ShutdownReason,
  type ShutdownConfig,
  type RequestInfo,
  type CoordinatorNotification,
  type ShutdownMetrics,
} from './GracefulShutdownCoordinator.js';

// Stdio proxy client
export {
  StdioProxyClient,
  createStdioProxyClient,
  type StdioProxyClientConfig,
  type ProxyStats,
  type StdioProxyClientEvents,
} from './StdioProxyClient.js';
