import os from 'os';
import path from 'path';
export function getHomeDir() {
    const home = os.homedir();
    if (home && home.trim() !== '') {
        return home;
    }
    const envHome = process.env.HOME || process.env.USERPROFILE;
    if (envHome && envHome.trim() !== '') {
        return envHome;
    }
    return process.cwd();
}
export function expandHome(inputPath) {
    if (!inputPath)
        return inputPath;
    if (inputPath === '~') {
        return getHomeDir();
    }
    if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
        return path.join(getHomeDir(), inputPath.slice(2));
    }
    return inputPath;
}
export function resolveUserPath(inputPath) {
    return path.resolve(expandHome(inputPath));
}
//# sourceMappingURL=paths.js.map