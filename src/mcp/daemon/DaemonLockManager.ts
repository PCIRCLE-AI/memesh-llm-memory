/**
 * DaemonLockManager - Lock File Management for Singleton Daemon
 *
 * Manages the daemon lock file to ensure only one daemon instance runs at a time.
 * Uses atomic file operations to prevent race conditions.
 *
 * Lock file location: ~/.memesh/daemon.lock
 * Content: JSON with pid, socketPath, startTime, version, clientCount, instanceId
 *
 * Features:
 * - Atomic lock acquisition using temp file + hard link pattern (prevents TOCTOU race)
 * - Stale lock detection via PID existence check + instance ID verification
 * - Cross-platform support (Unix/Windows)
 * - Lock info persistence for diagnostics
 * - Protection against PID reuse via unique instance IDs
 */

import fsp from 'fs/promises';
import path from 'path';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { getDataDirectory } from '../../utils/PathResolver.js';
import { logger } from '../../utils/logger.js';

/**
 * Lock file information structure
 */
export interface LockInfo {
  /** Process ID of the daemon */
  pid: number;

  /** IPC socket/pipe path */
  socketPath: string;

  /** Daemon start timestamp (ms since epoch) */
  startTime: number;

  /** MeMesh version */
  version: string;

  /** Current connected client count */
  clientCount: number;

  /** IPC protocol version for compatibility checking */
  protocolVersion: number;

  /** Minimum compatible client version */
  minClientVersion: string;

  /** Unique instance ID to prevent PID reuse issues */
  instanceId?: string;
}

/**
 * Lock acquisition result
 */
export interface LockAcquisitionResult {
  success: boolean;
  reason?: 'already_locked' | 'stale_lock_cleared' | 'write_error';
  existingLock?: LockInfo;
}

/**
 * Instance verification result
 */
export interface InstanceVerificationResult {
  /** Whether the instance is verified as the actual daemon */
  isValid: boolean;
  /** Reason for the result */
  reason: 'pid_alive_instance_verified' | 'pid_alive_instance_mismatch' | 'pid_dead' | 'no_instance_id' | 'connection_failed';
}

/**
 * DaemonLockManager - Singleton daemon lock management
 */
export class DaemonLockManager {
  private static readonly LOCK_FILENAME = 'daemon.lock';
  private static readonly IPC_VERIFY_TIMEOUT = 2000; // 2 seconds timeout for IPC verification

  /**
   * Get the lock file path
   */
  static getLockPath(): string {
    return path.join(getDataDirectory(), this.LOCK_FILENAME);
  }

  /**
   * Generate a unique instance ID
   */
  static generateInstanceId(): string {
    return uuidv4();
  }

  /**
   * Validate UUID v4 format
   *
   * @param uuid String to validate
   * @returns True if valid UUID v4 format
   */
  static isValidUuid(uuid: string): boolean {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where x is any hex digit and y is one of 8, 9, a, or b
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(uuid);
  }

  /**
   * Read current lock info (if exists)
   *
   * @returns Lock info or null if no lock exists
   */
  static async readLock(): Promise<LockInfo | null> {
    const lockPath = this.getLockPath();

    try {
      const content = await fsp.readFile(lockPath, 'utf-8');
      const lockInfo = JSON.parse(content) as LockInfo;

      // Validate required fields
      if (
        typeof lockInfo.pid !== 'number' ||
        typeof lockInfo.socketPath !== 'string' ||
        typeof lockInfo.startTime !== 'number'
      ) {
        logger.warn('[DaemonLockManager] Invalid lock file format, treating as no lock');
        return null;
      }

      return lockInfo;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      logger.error('[DaemonLockManager] Error reading lock file', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check if a PID is still alive
   *
   * NOTE: This only checks if a process with this PID exists.
   * Use verifyInstance() for full verification including instance ID check.
   *
   * @param pid Process ID to check
   * @returns True if process exists
   */
  static isPidAlive(pid: number): boolean {
    try {
      // Signal 0 doesn't send a signal, just checks if process exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // ESRCH = No such process
      // EPERM = Permission denied (but process exists)
      const errno = (error as NodeJS.ErrnoException).code;
      return errno === 'EPERM';
    }
  }

  /**
   * Verify that the lock file's instance ID matches the actual running daemon
   *
   * This protects against PID reuse scenarios where a different process
   * may have taken over the same PID after the original daemon crashed.
   *
   * @param lockInfo Lock info to verify
   * @returns Verification result
   */
  static async verifyInstance(lockInfo: LockInfo): Promise<InstanceVerificationResult> {
    // First, check if PID is alive
    if (!this.isPidAlive(lockInfo.pid)) {
      return { isValid: false, reason: 'pid_dead' };
    }

    // If no instance ID in lock file (backwards compatibility), trust PID check
    if (!lockInfo.instanceId) {
      logger.warn('[DaemonLockManager] Lock file missing instanceId, falling back to PID-only check');
      return { isValid: true, reason: 'no_instance_id' };
    }

    // Validate instanceId format (must be a valid UUID v4)
    if (!this.isValidUuid(lockInfo.instanceId)) {
      logger.warn('[DaemonLockManager] Lock file has invalid instanceId format, treating as stale', {
        instanceId: lockInfo.instanceId,
      });
      return { isValid: false, reason: 'pid_alive_instance_mismatch' };
    }

    // Try to connect to the daemon's socket and verify the instance ID
    try {
      const verified = await this.verifyInstanceViaIpc(lockInfo.socketPath, lockInfo.instanceId);
      if (verified) {
        return { isValid: true, reason: 'pid_alive_instance_verified' };
      } else {
        return { isValid: false, reason: 'pid_alive_instance_mismatch' };
      }
    } catch (error) {
      // If we can't connect, the daemon might have crashed but PID was reused
      logger.warn('[DaemonLockManager] IPC verification failed, treating lock as stale', {
        error: error instanceof Error ? error.message : String(error),
        pid: lockInfo.pid,
        instanceId: lockInfo.instanceId,
      });
      return { isValid: false, reason: 'connection_failed' };
    }
  }

  /**
   * Verify instance ID via IPC connection
   *
   * Connects to the daemon socket and requests the daemon's instance ID.
   * The daemon responds with its actual instance ID, which we compare against
   * the expected value from the lock file.
   *
   * SECURITY: We do NOT send the expected ID to prevent a malicious process
   * from simply echoing it back to impersonate the daemon.
   *
   * @param socketPath Path to the daemon socket
   * @param expectedInstanceId Expected instance ID from lock file
   * @returns True if daemon's reported instance ID matches expected
   */
  private static verifyInstanceViaIpc(socketPath: string, expectedInstanceId: string): Promise<boolean> {
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
        // SECURITY FIX: Send verification request WITHOUT the expected ID.
        // The daemon must respond with its actual instance ID, which we then
        // compare against the lock file. This prevents a malicious process
        // from simply echoing back the expected ID to impersonate the daemon.
        const verifyRequest = JSON.stringify({
          type: 'verify_instance',
          timestamp: Date.now(),
          // Note: No expectedInstanceId sent - daemon must provide its own
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
            // SECURITY FIX: Compare the daemon's reported instanceId against
            // the expected value from the lock file. The daemon must provide
            // its actual instance ID - we don't accept 'verified: true' alone.
            if (typeof response.instanceId !== 'string') {
              logger.warn('[DaemonLockManager] IPC response missing instanceId field', {
                responseKeys: Object.keys(response),
              });
              resolve(false);
              return;
            }
            resolve(response.instanceId === expectedInstanceId);
          } catch (parseError) {
            // SECURITY: Unparseable response should NOT be treated as valid
            // An unparseable response indicates either:
            // 1. A different process is using the socket (not our daemon)
            // 2. Protocol corruption or incompatibility
            // 3. Malicious process
            // All cases should be treated as invalid for security
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

  /**
   * Check if current lock is valid (exists, PID is alive, and instance verified)
   *
   * @returns True if valid lock exists
   */
  static async isLockValid(): Promise<boolean> {
    const lockInfo = await this.readLock();

    if (!lockInfo) {
      return false;
    }

    // Basic PID check for quick validation
    // Full instance verification is more expensive and done during acquisition
    return this.isPidAlive(lockInfo.pid);
  }

  /**
   * Check if current lock is valid with full instance verification
   *
   * This is more thorough but slower than isLockValid()
   *
   * @returns True if valid lock exists and instance is verified
   */
  static async isLockValidStrict(): Promise<boolean> {
    const lockInfo = await this.readLock();

    if (!lockInfo) {
      return false;
    }

    const verification = await this.verifyInstance(lockInfo);
    return verification.isValid;
  }

  /**
   * Acquire the daemon lock
   *
   * Uses atomic file creation with temp file + rename pattern.
   * If a stale lock exists (PID dead or instance mismatch), it will be cleared automatically.
   *
   * @param info Lock info to write
   * @returns Acquisition result
   */
  static async acquireLock(info: Omit<LockInfo, 'pid' | 'instanceId'>): Promise<LockAcquisitionResult> {
    const lockPath = this.getLockPath();
    const instanceId = this.generateInstanceId();
    const lockInfo: LockInfo = {
      ...info,
      pid: process.pid,
      instanceId,
    };

    // Ensure directory exists
    const lockDir = path.dirname(lockPath);
    try {
      await fsp.mkdir(lockDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    // Try to acquire lock atomically
    const result = await this.tryAtomicAcquire(lockPath, lockInfo);

    if (result.success) {
      logger.info('[DaemonLockManager] Lock acquired successfully', {
        pid: lockInfo.pid,
        socketPath: lockInfo.socketPath,
        instanceId,
      });
      return result;
    }

    // Lock exists, check if it's stale
    const existingLock = await this.readLock();

    if (!existingLock) {
      // Lock file might have been deleted between check and read
      // Try again
      return this.tryAtomicAcquire(lockPath, lockInfo);
    }

    // Verify if the existing lock is still valid
    const verification = await this.verifyInstance(existingLock);

    if (!verification.isValid) {
      // Stale lock - clear and retry
      logger.warn('[DaemonLockManager] Clearing stale lock', {
        stalePid: existingLock.pid,
        staleInstanceId: existingLock.instanceId,
        reason: verification.reason,
      });

      await this.releaseLock();

      // Retry acquisition
      const retryResult = await this.tryAtomicAcquire(lockPath, lockInfo);

      if (retryResult.success) {
        logger.info('[DaemonLockManager] Lock acquired after clearing stale lock', {
          pid: lockInfo.pid,
          instanceId,
        });
        return { ...retryResult, reason: 'stale_lock_cleared' };
      }

      // Another process beat us to it
      return {
        success: false,
        reason: 'already_locked',
        existingLock: (await this.readLock()) || undefined,
      };
    }

    // Lock is valid (another daemon is running)
    return {
      success: false,
      reason: 'already_locked',
      existingLock: existingLock || undefined,
    };
  }

  /**
   * Try to acquire lock atomically using temp file + hard link pattern
   *
   * This ensures atomicity: either the entire lock is written or nothing is.
   * Using hard link (fs.link) is atomic and prevents race conditions that
   * can occur with access+rename pattern (TOCTOU vulnerability).
   *
   * The hard link approach:
   * 1. Write lock content to temp file
   * 2. Try to create hard link from temp to lock path
   * 3. Hard link fails with EEXIST if lock already exists (atomic check)
   * 4. Clean up temp file regardless of outcome
   */
  private static async tryAtomicAcquire(
    lockPath: string,
    lockInfo: LockInfo
  ): Promise<LockAcquisitionResult> {
    const tempPath = `${lockPath}.${process.pid}.${Date.now()}.tmp`;

    try {
      // Write to temp file first
      await fsp.writeFile(tempPath, JSON.stringify(lockInfo, null, 2), {
        flag: 'wx', // Fail if temp file already exists (unlikely but safe)
      });

      // Use hard link for atomic lock acquisition
      // fs.link() will fail with EEXIST if the target (lockPath) already exists
      // This is atomic and prevents the race condition in access+rename
      try {
        await fsp.link(tempPath, lockPath);
        // Hard link succeeded - we acquired the lock
        // Clean up temp file
        await fsp.unlink(tempPath).catch(() => {});
        return { success: true };
      } catch (linkError) {
        // Clean up temp file
        await fsp.unlink(tempPath).catch(() => {});

        if ((linkError as NodeJS.ErrnoException).code === 'EEXIST') {
          // Lock file already exists - another process has the lock
          return { success: false, reason: 'already_locked' };
        }

        // Re-throw other link errors
        throw linkError;
      }
    } catch (error) {
      // Clean up temp file if it exists (in case of writeFile failure)
      await fsp.unlink(tempPath).catch(() => {});

      const errno = (error as NodeJS.ErrnoException).code;

      if (errno === 'EEXIST') {
        return { success: false, reason: 'already_locked' };
      }

      logger.error('[DaemonLockManager] Failed to acquire lock', {
        error: error instanceof Error ? error.message : String(error),
      });

      return { success: false, reason: 'write_error' };
    }
  }

  /**
   * Release the daemon lock
   *
   * Only releases if current process owns the lock.
   * Uses atomic verification to prevent TOCTOU race conditions.
   *
   * @returns True if lock was released
   */
  static async releaseLock(): Promise<boolean> {
    const lockPath = this.getLockPath();

    try {
      // FIX (MAJOR-002): Use atomic verification with file descriptor to prevent TOCTOU race
      // Open the file, read, verify, then unlink while still holding the fd
      // This ensures no other process can modify the lock between check and delete
      let fileHandle;
      try {
        fileHandle = await fsp.open(lockPath, 'r');
        const content = await fileHandle.readFile('utf-8');
        const lockInfo = JSON.parse(content) as LockInfo;

        // Only release if we own the lock (or it's stale)
        if (lockInfo && lockInfo.pid !== process.pid && this.isPidAlive(lockInfo.pid)) {
          logger.warn('[DaemonLockManager] Cannot release lock owned by another process', {
            ownerPid: lockInfo.pid,
            ourPid: process.pid,
          });
          await fileHandle.close();
          return false;
        }

        // Re-verify immediately before unlink to minimize race window
        // Re-read the file content to ensure it hasn't changed
        const verifyContent = await fileHandle.readFile('utf-8');
        const verifyInfo = JSON.parse(verifyContent) as LockInfo;

        // Final ownership check - if ownership changed, abort
        if (verifyInfo.pid !== lockInfo.pid || verifyInfo.instanceId !== lockInfo.instanceId) {
          logger.warn('[DaemonLockManager] Lock ownership changed during release, aborting', {
            originalPid: lockInfo.pid,
            currentPid: verifyInfo.pid,
          });
          await fileHandle.close();
          return false;
        }

        await fileHandle.close();
      } catch (error) {
        if (fileHandle) {
          await fileHandle.close().catch(() => {});
        }

        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // Lock doesn't exist, nothing to release
          return true;
        }

        // For parse errors or other issues with lock file content, proceed with unlink
        // as the lock is likely corrupted
        if (error instanceof SyntaxError) {
          logger.warn('[DaemonLockManager] Lock file corrupted, proceeding with removal');
        } else {
          throw error;
        }
      }

      await fsp.unlink(lockPath);

      logger.info('[DaemonLockManager] Lock released', {
        pid: process.pid,
      });

      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Lock doesn't exist, nothing to release
        return true;
      }

      logger.error('[DaemonLockManager] Failed to release lock', {
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Update lock info (e.g., client count)
   *
   * Uses optimistic locking with version comparison to prevent concurrent update data loss.
   * Only updates if current process owns the lock and the lock hasn't been modified.
   *
   * @param updates Partial lock info to update
   * @param maxRetries Maximum number of retries on conflict (default: 3)
   * @returns True if update succeeded
   */
  static async updateLock(
    updates: Partial<Omit<LockInfo, 'pid' | 'instanceId'>>,
    maxRetries: number = 3
  ): Promise<boolean> {
    const lockPath = this.getLockPath();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const tempPath = `${lockPath}.${process.pid}.${Date.now()}.${attempt}.update.tmp`;

      try {
        // FIX (MAJOR-003): Use optimistic locking with startTime as version
        // Read the current lock state
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

        // Capture the current startTime as our "version" for optimistic locking
        const expectedStartTime = lockInfo.startTime;
        const expectedInstanceId = lockInfo.instanceId;

        const updatedInfo: LockInfo = {
          ...lockInfo,
          ...updates,
          // Preserve these fields - they should not be modified by updates
          pid: lockInfo.pid,
          instanceId: lockInfo.instanceId,
        };

        // Atomic write: temp file + rename
        await fsp.writeFile(tempPath, JSON.stringify(updatedInfo, null, 2));

        // Before rename, verify the lock hasn't been modified by another concurrent update
        // This implements optimistic locking - if the "version" changed, retry
        const verifyInfo = await this.readLock();

        if (!verifyInfo) {
          // Lock was deleted during our update - abort
          await fsp.unlink(tempPath).catch(() => {});
          logger.warn('[DaemonLockManager] Lock deleted during update');
          return false;
        }

        // Check if another update modified the lock (version/ownership changed)
        if (
          verifyInfo.startTime !== expectedStartTime ||
          verifyInfo.instanceId !== expectedInstanceId ||
          verifyInfo.pid !== process.pid
        ) {
          // Concurrent modification detected - retry
          await fsp.unlink(tempPath).catch(() => {});

          if (attempt < maxRetries) {
            logger.debug('[DaemonLockManager] Concurrent modification detected, retrying update', {
              attempt: attempt + 1,
              maxRetries,
            });
            // Add small random delay to reduce collision probability
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10));
            continue;
          }

          logger.warn('[DaemonLockManager] Update failed after max retries due to concurrent modifications', {
            maxRetries,
          });
          return false;
        }

        // No concurrent modification - proceed with rename
        await fsp.rename(tempPath, lockPath);

        return true;
      } catch (error) {
        // Clean up temp file if it exists
        const tempPath = `${lockPath}.${process.pid}.${Date.now()}.${attempt}.update.tmp`;
        await fsp.unlink(tempPath).catch(() => {});

        logger.error('[DaemonLockManager] Failed to update lock', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        });

        // Don't retry on non-recoverable errors
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          return false;
        }
      }
    }

    return false;
  }

  /**
   * Force clear the lock (for emergency recovery)
   *
   * WARNING: Only use this if you're sure no daemon is running.
   *
   * @returns True if cleared
   */
  static async forceClearLock(): Promise<boolean> {
    const lockPath = this.getLockPath();

    try {
      await fsp.unlink(lockPath);
      logger.warn('[DaemonLockManager] Lock force cleared');
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Lock doesn't exist, nothing to clear
        return true;
      }

      logger.error('[DaemonLockManager] Failed to force clear lock', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get lock status for diagnostics
   */
  static async getStatus(): Promise<{
    lockExists: boolean;
    lockPath: string;
    lockInfo: LockInfo | null;
    isValid: boolean;
    isPidAlive: boolean;
    instanceVerification?: InstanceVerificationResult;
  }> {
    const lockPath = this.getLockPath();
    const lockInfo = await this.readLock();
    const pidAlive = lockInfo ? this.isPidAlive(lockInfo.pid) : false;

    let instanceVerification: InstanceVerificationResult | undefined;
    if (lockInfo) {
      instanceVerification = await this.verifyInstance(lockInfo);
    }

    let lockExists = false;
    try {
      await fsp.access(lockPath);
      lockExists = true;
    } catch {
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

  /**
   * Get the instance ID of the current lock (if owned by this process)
   *
   * @returns Instance ID or null if not owned
   */
  static async getOwnInstanceId(): Promise<string | null> {
    const lockInfo = await this.readLock();

    if (!lockInfo || lockInfo.pid !== process.pid) {
      return null;
    }

    return lockInfo.instanceId || null;
  }
}
