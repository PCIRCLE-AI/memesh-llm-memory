import path from 'path';
import os from 'os';
import fs from 'fs';
import { logger } from './logger.js';
const NEW_DIR_NAME = '.memesh';
const LEGACY_DIR_NAME = '.claude-code-buddy';
let cachedDataDir = null;
let migrationWarningShown = false;
export function getDataDirectory() {
    if (cachedDataDir) {
        return cachedDataDir;
    }
    const homeDir = os.homedir();
    const newDir = path.join(homeDir, NEW_DIR_NAME);
    const legacyDir = path.join(homeDir, LEGACY_DIR_NAME);
    if (fs.existsSync(newDir)) {
        cachedDataDir = newDir;
        return newDir;
    }
    if (fs.existsSync(legacyDir)) {
        if (!migrationWarningShown) {
            logger.warn('═══════════════════════════════════════════════════');
            logger.warn('⚠️  MIGRATION NOTICE');
            logger.warn('═══════════════════════════════════════════════════');
            logger.warn(`Found legacy data directory: ${legacyDir}`);
            logger.warn(`New directory should be: ${newDir}`);
            logger.warn('');
            logger.warn('MeMesh is using your existing data for backward compatibility.');
            logger.warn('To complete the migration, run:');
            logger.warn('  ./scripts/migrate-from-ccb.sh');
            logger.warn('');
            logger.warn('This warning appears once per session.');
            logger.warn('═══════════════════════════════════════════════════');
            migrationWarningShown = true;
        }
        cachedDataDir = legacyDir;
        return legacyDir;
    }
    try {
        fs.mkdirSync(newDir, { recursive: true });
        logger.info(`Created data directory: ${newDir}`);
        cachedDataDir = newDir;
        return newDir;
    }
    catch (error) {
        logger.error(`Failed to create data directory: ${newDir}`, error);
        throw new Error(`Failed to create data directory: ${error}`);
    }
}
export function getDataPath(filename) {
    return path.join(getDataDirectory(), filename);
}
export function isMigrationNeeded() {
    const homeDir = os.homedir();
    const newDir = path.join(homeDir, NEW_DIR_NAME);
    const legacyDir = path.join(homeDir, LEGACY_DIR_NAME);
    return fs.existsSync(legacyDir) && !fs.existsSync(newDir);
}
export function getMigrationInfo() {
    const homeDir = os.homedir();
    const newDir = path.join(homeDir, NEW_DIR_NAME);
    const legacyDir = path.join(homeDir, LEGACY_DIR_NAME);
    return {
        newDir,
        legacyDir,
        newDirExists: fs.existsSync(newDir),
        legacyDirExists: fs.existsSync(legacyDir),
        migrationNeeded: isMigrationNeeded(),
        currentlyUsing: getDataDirectory(),
    };
}
export function _clearCache() {
    cachedDataDir = null;
    migrationWarningShown = false;
}
//# sourceMappingURL=PathResolver.js.map