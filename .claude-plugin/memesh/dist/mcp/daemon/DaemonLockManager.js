import fsp from 'fs/promises';
import path from 'path';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { getDataDirectory } from '../../utils/PathResolver.js';
import { logger } from '../../utils/logger.js';
export class DaemonLockManager {
    static LOCK_FILENAME = 'daemon.lock';
    static IPC_VERIFY_TIMEOUT = 2000;
    static getLockPath() {
        return path.join(getDataDirectory(), this.LOCK_FILENAME);
    }
    static generateInstanceId() {
        return uuidv4();
    }
    static isValidUuid(uuid) {
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidV4Regex.test(uuid);
    }
    static async readLock() {
        const lockPath = this.getLockPath();
        try {
            const content = await fsp.readFile(lockPath, 'utf-8');
            const lockInfo = JSON.parse(content);
            if (typeof lockInfo.pid !== 'number' ||
                typeof lockInfo.socketPath !== 'string' ||
                typeof lockInfo.startTime !== 'number') {
                logger.warn('[DaemonLockManager] Invalid lock file format, treating as no lock');
                return null;
            }
            return lockInfo;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            logger.error('[DaemonLockManager] Error reading lock file', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    static isPidAlive(pid) {
        try {
            process.kill(pid, 0);
            return true;
        }
        catch (error) {
            const errno = error.code;
            return errno === 'EPERM';
        }
    }
    static async verifyInstance(lockInfo) {
        if (!this.isPidAlive(lockInfo.pid)) {
            return { isValid: false, reason: 'pid_dead' };
        }
        if (!lockInfo.instanceId) {
            logger.warn('[DaemonLockManager] Lock file missing instanceId, falling back to PID-only check');
            return { isValid: true, reason: 'no_instance_id' };
        }
        if (!this.isValidUuid(lockInfo.instanceId)) {
            logger.warn('[DaemonLockManager] Lock file has invalid instanceId format, treating as stale', {
                instanceId: lockInfo.instanceId,
            });
            return { isValid: false, reason: 'pid_alive_instance_mismatch' };
        }
        try {
            const verified = await this.verifyInstanceViaIpc(lockInfo.socketPath, lockInfo.instanceId);
            if (verified) {
                return { isValid: true, reason: 'pid_alive_instance_verified' };
            }
            else {
                return { isValid: false, reason: 'pid_alive_instance_mismatch' };
            }
        }
        catch (error) {
            logger.warn('[DaemonLockManager] IPC verification failed, treating lock as stale', {
                error: error instanceof Error ? error.message : String(error),
                pid: lockInfo.pid,
                instanceId: lockInfo.instanceId,
            });
            return { isValid: false, reason: 'connection_failed' };
        }
    }
    static verifyInstanceViaIpc(socketPath, expectedInstanceId) {
        return new Promise((resolve, reject) => {
            const socket = net.connect({ path: socketPath });
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    socket.destroy();
                    reject(new Error('IPC verification timeout'));
                }
            }, this.IPC_VERIFY_TIMEOUT);
            socket.once('connect', () => {
                const verifyRequest = JSON.stringify({
                    type: 'verify_instance',
                    timestamp: Date.now(),
                }) + '\n';
                socket.write(verifyRequest);
            });
            socket.once('data', (data) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    socket.destroy();
                    try {
                        const response = JSON.parse(data.toString().trim());
                        if (typeof response.instanceId !== 'string') {
                            logger.warn('[DaemonLockManager] IPC response missing instanceId field', {
                                responseKeys: Object.keys(response),
                            });
                            resolve(false);
                            return;
                        }
                        resolve(response.instanceId === expectedInstanceId);
                    }
                    catch (parseError) {
                        logger.warn('[DaemonLockManager] IPC response JSON parse failed, treating as invalid', {
                            error: parseError instanceof Error ? parseError.message : String(parseError),
                            dataLength: data.length,
                            dataPreview: data.toString().slice(0, 100),
                        });
                        resolve(false);
                    }
                }
            });
            socket.once('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    socket.destroy();
                    reject(error);
                }
            });
        });
    }
    static async isLockValid() {
        const lockInfo = await this.readLock();
        if (!lockInfo) {
            return false;
        }
        return this.isPidAlive(lockInfo.pid);
    }
    static async isLockValidStrict() {
        const lockInfo = await this.readLock();
        if (!lockInfo) {
            return false;
        }
        const verification = await this.verifyInstance(lockInfo);
        return verification.isValid;
    }
    static async acquireLock(info) {
        const lockPath = this.getLockPath();
        const instanceId = this.generateInstanceId();
        const lockInfo = {
            ...info,
            pid: process.pid,
            instanceId,
        };
        const lockDir = path.dirname(lockPath);
        try {
            await fsp.mkdir(lockDir, { recursive: true });
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
        const result = await this.tryAtomicAcquire(lockPath, lockInfo);
        if (result.success) {
            logger.info('[DaemonLockManager] Lock acquired successfully', {
                pid: lockInfo.pid,
                socketPath: lockInfo.socketPath,
                instanceId,
            });
            return result;
        }
        const existingLock = await this.readLock();
        if (!existingLock) {
            return this.tryAtomicAcquire(lockPath, lockInfo);
        }
        const verification = await this.verifyInstance(existingLock);
        if (!verification.isValid) {
            logger.warn('[DaemonLockManager] Clearing stale lock', {
                stalePid: existingLock.pid,
                staleInstanceId: existingLock.instanceId,
                reason: verification.reason,
            });
            await this.releaseLock();
            const retryResult = await this.tryAtomicAcquire(lockPath, lockInfo);
            if (retryResult.success) {
                logger.info('[DaemonLockManager] Lock acquired after clearing stale lock', {
                    pid: lockInfo.pid,
                    instanceId,
                });
                return { ...retryResult, reason: 'stale_lock_cleared' };
            }
            return {
                success: false,
                reason: 'already_locked',
                existingLock: (await this.readLock()) || undefined,
            };
        }
        return {
            success: false,
            reason: 'already_locked',
            existingLock: existingLock || undefined,
        };
    }
    static async tryAtomicAcquire(lockPath, lockInfo) {
        const tempPath = `${lockPath}.${process.pid}.${Date.now()}.tmp`;
        try {
            await fsp.writeFile(tempPath, JSON.stringify(lockInfo, null, 2), {
                flag: 'wx',
            });
            try {
                await fsp.link(tempPath, lockPath);
                await fsp.unlink(tempPath).catch(() => { });
                return { success: true };
            }
            catch (linkError) {
                await fsp.unlink(tempPath).catch(() => { });
                if (linkError.code === 'EEXIST') {
                    return { success: false, reason: 'already_locked' };
                }
                throw linkError;
            }
        }
        catch (error) {
            await fsp.unlink(tempPath).catch(() => { });
            const errno = error.code;
            if (errno === 'EEXIST') {
                return { success: false, reason: 'already_locked' };
            }
            logger.error('[DaemonLockManager] Failed to acquire lock', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { success: false, reason: 'write_error' };
        }
    }
    static async releaseLock() {
        const lockPath = this.getLockPath();
        try {
            let fileHandle;
            try {
                fileHandle = await fsp.open(lockPath, 'r');
                const content = await fileHandle.readFile('utf-8');
                const lockInfo = JSON.parse(content);
                if (lockInfo && lockInfo.pid !== process.pid && this.isPidAlive(lockInfo.pid)) {
                    logger.warn('[DaemonLockManager] Cannot release lock owned by another process', {
                        ownerPid: lockInfo.pid,
                        ourPid: process.pid,
                    });
                    await fileHandle.close();
                    return false;
                }
                const verifyContent = await fileHandle.readFile('utf-8');
                const verifyInfo = JSON.parse(verifyContent);
                if (verifyInfo.pid !== lockInfo.pid || verifyInfo.instanceId !== lockInfo.instanceId) {
                    logger.warn('[DaemonLockManager] Lock ownership changed during release, aborting', {
                        originalPid: lockInfo.pid,
                        currentPid: verifyInfo.pid,
                    });
                    await fileHandle.close();
                    return false;
                }
                await fileHandle.close();
            }
            catch (error) {
                if (fileHandle) {
                    await fileHandle.close().catch(() => { });
                }
                if (error.code === 'ENOENT') {
                    return true;
                }
                if (error instanceof SyntaxError) {
                    logger.warn('[DaemonLockManager] Lock file corrupted, proceeding with removal');
                }
                else {
                    throw error;
                }
            }
            await fsp.unlink(lockPath);
            logger.info('[DaemonLockManager] Lock released', {
                pid: process.pid,
            });
            return true;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return true;
            }
            logger.error('[DaemonLockManager] Failed to release lock', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    static async updateLock(updates, maxRetries = 3) {
        const lockPath = this.getLockPath();
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const tempPath = `${lockPath}.${process.pid}.${Date.now()}.${attempt}.update.tmp`;
            try {
                const lockInfo = await this.readLock();
                if (!lockInfo) {
                    logger.warn('[DaemonLockManager] Cannot update non-existent lock');
                    return false;
                }
                if (lockInfo.pid !== process.pid) {
                    logger.warn('[DaemonLockManager] Cannot update lock owned by another process', {
                        ownerPid: lockInfo.pid,
                        ourPid: process.pid,
                    });
                    return false;
                }
                const expectedStartTime = lockInfo.startTime;
                const expectedInstanceId = lockInfo.instanceId;
                const updatedInfo = {
                    ...lockInfo,
                    ...updates,
                    pid: lockInfo.pid,
                    instanceId: lockInfo.instanceId,
                };
                await fsp.writeFile(tempPath, JSON.stringify(updatedInfo, null, 2));
                const verifyInfo = await this.readLock();
                if (!verifyInfo) {
                    await fsp.unlink(tempPath).catch(() => { });
                    logger.warn('[DaemonLockManager] Lock deleted during update');
                    return false;
                }
                if (verifyInfo.startTime !== expectedStartTime ||
                    verifyInfo.instanceId !== expectedInstanceId ||
                    verifyInfo.pid !== process.pid) {
                    await fsp.unlink(tempPath).catch(() => { });
                    if (attempt < maxRetries) {
                        logger.debug('[DaemonLockManager] Concurrent modification detected, retrying update', {
                            attempt: attempt + 1,
                            maxRetries,
                        });
                        await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10));
                        continue;
                    }
                    logger.warn('[DaemonLockManager] Update failed after max retries due to concurrent modifications', {
                        maxRetries,
                    });
                    return false;
                }
                await fsp.rename(tempPath, lockPath);
                return true;
            }
            catch (error) {
                const tempPath = `${lockPath}.${process.pid}.${Date.now()}.${attempt}.update.tmp`;
                await fsp.unlink(tempPath).catch(() => { });
                logger.error('[DaemonLockManager] Failed to update lock', {
                    error: error instanceof Error ? error.message : String(error),
                    attempt,
                });
                if (error.code !== 'ENOENT') {
                    return false;
                }
            }
        }
        return false;
    }
    static async forceClearLock() {
        const lockPath = this.getLockPath();
        try {
            await fsp.unlink(lockPath);
            logger.warn('[DaemonLockManager] Lock force cleared');
            return true;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return true;
            }
            logger.error('[DaemonLockManager] Failed to force clear lock', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    static async getStatus() {
        const lockPath = this.getLockPath();
        const lockInfo = await this.readLock();
        const pidAlive = lockInfo ? this.isPidAlive(lockInfo.pid) : false;
        let instanceVerification;
        if (lockInfo) {
            instanceVerification = await this.verifyInstance(lockInfo);
        }
        let lockExists = false;
        try {
            await fsp.access(lockPath);
            lockExists = true;
        }
        catch {
            lockExists = false;
        }
        return {
            lockExists,
            lockPath,
            lockInfo,
            isValid: lockInfo !== null && pidAlive,
            isPidAlive: pidAlive,
            instanceVerification,
        };
    }
    static async getOwnInstanceId() {
        const lockInfo = await this.readLock();
        if (!lockInfo || lockInfo.pid !== process.pid) {
            return null;
        }
        return lockInfo.instanceId || null;
    }
}
//# sourceMappingURL=DaemonLockManager.js.map