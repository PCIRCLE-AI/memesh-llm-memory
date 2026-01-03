export function getPlatform() {
    return process.platform;
}
export function isMacOS() {
    return getPlatform() === 'darwin';
}
export function isWindows() {
    return getPlatform() === 'win32';
}
export function isLinux() {
    return getPlatform() === 'linux';
}
//# sourceMappingURL=types.js.map