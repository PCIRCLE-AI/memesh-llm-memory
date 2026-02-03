import { resolve, normalize, isAbsolute, dirname, basename, join } from 'path';
import { realpathSync } from 'fs';
import { ValidationError } from '../errors/index.js';
export function validateDatabasePath(dbPath, allowedDir) {
    if (dbPath === ':memory:') {
        return dbPath;
    }
    if (!dbPath || typeof dbPath !== 'string') {
        throw new ValidationError('Database path must be a non-empty string', {
            provided: dbPath,
            type: typeof dbPath,
        });
    }
    if (dbPath.includes('\0')) {
        throw new ValidationError('Database path contains invalid null byte', {
            provided: dbPath,
            security: 'Null bytes are commonly used in path traversal attacks',
        });
    }
    const normalizedPath = normalize(dbPath);
    const absolutePath = isAbsolute(normalizedPath)
        ? normalizedPath
        : resolve(process.cwd(), normalizedPath);
    let resolvedPath;
    try {
        resolvedPath = realpathSync(absolutePath);
    }
    catch (error) {
        const parent = dirname(absolutePath);
        try {
            const parentResolved = realpathSync(parent);
            resolvedPath = join(parentResolved, basename(absolutePath));
        }
        catch {
            throw new ValidationError('Database parent directory does not exist', {
                provided: dbPath,
                parent,
                solution: `Create directory first: mkdir -p ${parent}`,
            });
        }
    }
    const allowedBase = allowedDir
        ? resolve(process.cwd(), allowedDir)
        : resolve(process.cwd(), 'data');
    if (!resolvedPath.startsWith(allowedBase + '/') && resolvedPath !== allowedBase) {
        throw new ValidationError('Database path must be within allowed directory', {
            provided: dbPath,
            resolved: resolvedPath,
            allowed: allowedBase,
            security: 'This prevents path traversal attacks like ../../etc/passwd',
        });
    }
    if (!resolvedPath.endsWith('.db')) {
        throw new ValidationError('Database path must have .db extension', {
            provided: dbPath,
            resolved: resolvedPath,
            expectedExtension: '.db',
        });
    }
    return resolvedPath;
}
//# sourceMappingURL=pathValidation.js.map