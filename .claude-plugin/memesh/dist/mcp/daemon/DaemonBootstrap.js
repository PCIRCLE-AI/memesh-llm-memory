import { DaemonLockManager } from './DaemonLockManager.js';
import { IpcTransport } from './IpcTransport.js';
import { PROTOCOL_VERSION } from './DaemonProtocol.js';
import { logger } from '../../utils/logger.js';
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 5000;
const QUICK_CONNECTION_TEST_TIMEOUT_MS = 2000;
export function isDaemonDisabled() {
    return process.env.MEMESH_DISABLE_DAEMON === '1' ||
        process.env.MEMESH_DISABLE_DAEMON === 'true';
}
export class DaemonBootstrap {
    config;
    transport;
    constructor(config) {
        this.config = {
            version: config.version,
            protocolVersion: config.protocolVersion ?? PROTOCOL_VERSION,
            healthCheckTimeout: config.healthCheckTimeout ?? DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
            forceStandalone: config.forceStandalone ?? isDaemonDisabled(),
        };
        this.transport = new IpcTransport();
    }
    async determineMode() {
        if (this.config.forceStandalone) {
            logger.info('[DaemonBootstrap] Daemon mode disabled, running standalone');
            return {
                mode: 'standalone',
                reason: 'Daemon mode disabled via MEMESH_DISABLE_DAEMON',
            };
        }
        const lockInfo = await DaemonLockManager.readLock();
        if (!lockInfo) {
            logger.info('[DaemonBootstrap] No existing daemon, becoming daemon');
            return {
                mode: 'daemon',
                reason: 'No existing daemon found',
            };
        }
        if (!DaemonLockManager.isPidAlive(lockInfo.pid)) {
            logger.warn('[DaemonBootstrap] Stale daemon lock detected (PID dead)', {
                stalePid: lockInfo.pid,
            });
            return {
                mode: 'daemon',
                reason: 'Stale daemon lock (PID not alive)',
                existingDaemon: {
                    pid: lockInfo.pid,
                    version: lockInfo.version,
                    socketPath: lockInfo.socketPath,
                },
            };
        }
        const isHealthy = await this.checkDaemonHealth(lockInfo);
        if (!isHealthy) {
            logger.warn('[DaemonBootstrap] Daemon not responding (zombie process)', {
                pid: lockInfo.pid,
            });
            return {
                mode: 'daemon',
                reason: 'Daemon process not responding',
                existingDaemon: {
                    pid: lockInfo.pid,
                    version: lockInfo.version,
                    socketPath: lockInfo.socketPath,
                },
            };
        }
        logger.info('[DaemonBootstrap] Healthy daemon found, connecting as proxy', {
            daemonPid: lockInfo.pid,
            daemonVersion: lockInfo.version,
        });
        return {
            mode: 'proxy',
            reason: 'Healthy daemon already running',
            existingDaemon: {
                pid: lockInfo.pid,
                version: lockInfo.version,
                socketPath: lockInfo.socketPath,
            },
        };
    }
    async checkDaemonHealth(lockInfo) {
        try {
            const latency = await this.transport.ping();
            if (latency === null) {
                return false;
            }
            if (latency > this.config.healthCheckTimeout) {
                logger.warn('[DaemonBootstrap] Daemon responding slowly', { latency });
                return false;
            }
            return true;
        }
        catch (error) {
            logger.debug('[DaemonBootstrap] Health check failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    async acquireDaemonLock() {
        const socketPath = this.transport.getPath();
        const result = await DaemonLockManager.acquireLock({
            socketPath,
            startTime: Date.now(),
            version: this.config.version,
            clientCount: 0,
            protocolVersion: this.config.protocolVersion,
            minClientVersion: this.calculateMinClientVersion(),
        });
        if (!result.success) {
            logger.error('[DaemonBootstrap] Failed to acquire daemon lock', {
                reason: result.reason,
                existingLock: result.existingLock,
            });
            return false;
        }
        return true;
    }
    calculateMinClientVersion() {
        const parts = this.config.version.split('.');
        if (parts.length >= 2) {
            return `${parts[0]}.${parts[1]}.0`;
        }
        return this.config.version;
    }
    getTransport() {
        return this.transport;
    }
    getVersion() {
        return this.config.version;
    }
    getProtocolVersion() {
        return this.config.protocolVersion;
    }
}
export async function shouldRunAsProxy() {
    if (isDaemonDisabled()) {
        return false;
    }
    const lockInfo = await DaemonLockManager.readLock();
    if (!lockInfo) {
        return false;
    }
    if (!DaemonLockManager.isPidAlive(lockInfo.pid)) {
        return false;
    }
    const transport = new IpcTransport();
    return transport.isRunning(QUICK_CONNECTION_TEST_TIMEOUT_MS);
}
export async function bootstrap(config) {
    const bootstrapper = new DaemonBootstrap(config);
    return bootstrapper.determineMode();
}
//# sourceMappingURL=DaemonBootstrap.js.map