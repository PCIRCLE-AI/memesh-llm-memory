import net from 'net';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getDataDirectory } from '../../utils/PathResolver.js';
import { logger } from '../../utils/logger.js';
const DEFAULT_CONNECT_TIMEOUT_MS = 5000;
const DEFAULT_KEEPALIVE_INITIAL_DELAY_MS = 10000;
const DEFAULT_SERVER_BACKLOG = 50;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_RETRIES = 3;
const STALE_SOCKET_TEST_TIMEOUT_MS = 500;
const IS_RUNNING_DEFAULT_TIMEOUT_MS = 2000;
const PING_DEFAULT_TIMEOUT_MS = 2000;
export class IpcTransport {
    config;
    constructor(config = {}) {
        this.config = {
            socketName: config.socketName ?? 'daemon',
            connectTimeout: config.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_MS,
            keepAlive: config.keepAlive ?? true,
            keepAliveInitialDelay: config.keepAliveInitialDelay ?? DEFAULT_KEEPALIVE_INITIAL_DELAY_MS,
        };
    }
    getPath() {
        if (process.platform === 'win32') {
            const username = os.userInfo().username.replace(/[^a-zA-Z0-9_-]/g, '_');
            return `\\\\.\\pipe\\memesh-${this.config.socketName}-${username}`;
        }
        else {
            return path.join(getDataDirectory(), `${this.config.socketName}.sock`);
        }
    }
    isWindows() {
        return process.platform === 'win32';
    }
    cleanup() {
        if (this.isWindows()) {
            return;
        }
        const socketPath = this.getPath();
        if (fs.existsSync(socketPath)) {
            try {
                fs.unlinkSync(socketPath);
                logger.debug('[IpcTransport] Cleaned up socket file', { socketPath });
            }
            catch (error) {
                logger.warn('[IpcTransport] Failed to clean up socket file', {
                    socketPath,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    async cleanupStaleSocket() {
        if (this.isWindows()) {
            return false;
        }
        const socketPath = this.getPath();
        if (!fs.existsSync(socketPath)) {
            logger.debug('[IpcTransport] No socket file to clean up', { socketPath });
            return false;
        }
        const isAlive = await this.testSocketConnection(socketPath);
        if (isAlive) {
            logger.debug('[IpcTransport] Socket is alive, not cleaning up', { socketPath });
            return false;
        }
        try {
            fs.unlinkSync(socketPath);
            logger.info('[IpcTransport] Cleaned up stale socket file', { socketPath });
            return true;
        }
        catch (error) {
            logger.warn('[IpcTransport] Failed to clean up stale socket file', {
                socketPath,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    testSocketConnection(socketPath) {
        return new Promise((resolve) => {
            const socket = net.connect({ path: socketPath });
            const timeoutId = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, STALE_SOCKET_TEST_TIMEOUT_MS);
            socket.once('connect', () => {
                clearTimeout(timeoutId);
                socket.destroy();
                resolve(true);
            });
            socket.once('error', () => {
                clearTimeout(timeoutId);
                socket.destroy();
                resolve(false);
            });
        });
    }
    createServer(options = {}) {
        const server = net.createServer();
        server.maxConnections = options.backlog ?? DEFAULT_SERVER_BACKLOG;
        return server;
    }
    async listen(server, options = {}) {
        const ipcPath = this.getPath();
        if (!this.isWindows()) {
            await this.cleanupStaleSocket();
        }
        return new Promise((resolve, reject) => {
            server.once('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`IPC path already in use: ${ipcPath}`));
                }
                else {
                    reject(error);
                }
            });
            server.once('listening', () => {
                if (!this.isWindows()) {
                    try {
                        fs.chmodSync(ipcPath, 0o600);
                        logger.debug('[IpcTransport] Socket file permissions set to 0600', { ipcPath });
                    }
                    catch (error) {
                        logger.warn('[IpcTransport] Failed to set socket file permissions', {
                            ipcPath,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                }
                logger.info('[IpcTransport] Server listening', { ipcPath });
                resolve();
            });
            server.listen({
                path: ipcPath,
                exclusive: options.exclusive ?? true,
                backlog: options.backlog ?? DEFAULT_SERVER_BACKLOG,
            });
        });
    }
    connect(options = {}) {
        const timeout = options.timeout ?? this.config.connectTimeout;
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
        const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS;
        return this.connectWithRetry(timeout, options.retry ? maxRetries : 0, retryDelay);
    }
    async connectWithRetry(timeout, retriesLeft, retryDelay) {
        const ipcPath = this.getPath();
        try {
            return await this.connectOnce(ipcPath, timeout);
        }
        catch (error) {
            if (retriesLeft > 0) {
                logger.debug('[IpcTransport] Connection failed, retrying...', {
                    retriesLeft,
                    retryDelay,
                });
                await this.sleep(retryDelay);
                return this.connectWithRetry(timeout, retriesLeft - 1, retryDelay * 2);
            }
            throw error;
        }
    }
    connectOnce(ipcPath, timeout) {
        return new Promise((resolve, reject) => {
            const socket = net.connect({ path: ipcPath });
            const timeoutId = setTimeout(() => {
                socket.destroy();
                reject(new Error(`Connection timeout after ${timeout}ms`));
            }, timeout);
            socket.once('connect', () => {
                clearTimeout(timeoutId);
                if (this.config.keepAlive) {
                    socket.setKeepAlive(true, this.config.keepAliveInitialDelay);
                }
                logger.debug('[IpcTransport] Connected to daemon', { ipcPath });
                resolve(socket);
            });
            socket.once('error', (error) => {
                clearTimeout(timeoutId);
                socket.destroy();
                if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
                    reject(new Error(`Daemon not running (${error.code}): ${ipcPath}`));
                }
                else {
                    reject(error);
                }
            });
        });
    }
    async isRunning(timeout) {
        try {
            const socket = await this.connect({ timeout: timeout ?? IS_RUNNING_DEFAULT_TIMEOUT_MS });
            socket.destroy();
            return true;
        }
        catch {
            return false;
        }
    }
    async ping() {
        const startTime = Date.now();
        try {
            const socket = await this.connect({ timeout: PING_DEFAULT_TIMEOUT_MS });
            const latency = Date.now() - startTime;
            socket.destroy();
            return latency;
        }
        catch {
            return null;
        }
    }
    getPathInfo() {
        const ipcPath = this.getPath();
        return {
            path: ipcPath,
            platform: process.platform,
            type: this.isWindows() ? 'pipe' : 'socket',
            exists: this.isWindows() ? true : fs.existsSync(ipcPath),
        };
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
export function createIpcTransport(config) {
    return new IpcTransport(config);
}
//# sourceMappingURL=IpcTransport.js.map