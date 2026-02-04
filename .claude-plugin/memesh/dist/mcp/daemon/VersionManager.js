const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const MAX_VERSION_NUMBER = 999999;
const MAX_VERSION_LENGTH = 256;
export function parseVersion(version) {
    if (version.length > MAX_VERSION_LENGTH) {
        return null;
    }
    const match = version.match(SEMVER_REGEX);
    if (!match) {
        return null;
    }
    const [, major, minor, patch, prerelease, build] = match;
    const majorNum = parseInt(major, 10);
    const minorNum = parseInt(minor, 10);
    const patchNum = parseInt(patch, 10);
    if (majorNum > MAX_VERSION_NUMBER || minorNum > MAX_VERSION_NUMBER || patchNum > MAX_VERSION_NUMBER) {
        return null;
    }
    return {
        major: majorNum,
        minor: minorNum,
        patch: patchNum,
        prerelease: prerelease || undefined,
        build: build || undefined,
    };
}
function comparePrereleases(a, b) {
    if (!a && !b)
        return 0;
    if (!a && b)
        return 1;
    if (a && !b)
        return -1;
    const partsA = a.split('.');
    const partsB = b.split('.');
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const partA = partsA[i];
        const partB = partsB[i];
        if (partA === undefined && partB !== undefined)
            return -1;
        if (partA !== undefined && partB === undefined)
            return 1;
        if (partA === partB)
            continue;
        const numA = parseInt(partA, 10);
        const numB = parseInt(partB, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return partA.localeCompare(partB);
    }
    return 0;
}
export function compareVersions(a, b) {
    const parsedA = parseVersion(a);
    const parsedB = parseVersion(b);
    if (!parsedA) {
        throw new Error(`Invalid version string: ${a}`);
    }
    if (!parsedB) {
        throw new Error(`Invalid version string: ${b}`);
    }
    if (parsedA.major !== parsedB.major) {
        return parsedA.major - parsedB.major;
    }
    if (parsedA.minor !== parsedB.minor) {
        return parsedA.minor - parsedB.minor;
    }
    if (parsedA.patch !== parsedB.patch) {
        return parsedA.patch - parsedB.patch;
    }
    return comparePrereleases(parsedA.prerelease, parsedB.prerelease);
}
export class VersionManager {
    version;
    parsed;
    protocolVersion;
    minCompatibleVersion;
    constructor(version, protocolVersion) {
        const parsed = parseVersion(version);
        if (!parsed) {
            throw new Error(`Invalid daemon version: ${version}`);
        }
        this.version = version;
        this.parsed = parsed;
        this.protocolVersion = protocolVersion;
        this.minCompatibleVersion = `${parsed.major}.${parsed.minor}.0`;
    }
    getVersionInfo() {
        return {
            version: this.version,
            major: this.parsed.major,
            minor: this.parsed.minor,
            patch: this.parsed.patch,
            protocolVersion: this.protocolVersion,
            minCompatibleVersion: this.minCompatibleVersion,
        };
    }
    isClientCompatible(clientVersion, clientProtocolVersion) {
        const clientParsed = parseVersion(clientVersion);
        if (!clientParsed) {
            return {
                compatible: false,
                reason: `Invalid client version format: ${clientVersion}`,
                upgradeRecommended: false,
            };
        }
        if (clientProtocolVersion !== this.protocolVersion) {
            return {
                compatible: false,
                reason: `Protocol version mismatch: client=${clientProtocolVersion}, daemon=${this.protocolVersion}`,
                upgradeRecommended: clientProtocolVersion > this.protocolVersion,
            };
        }
        if (clientParsed.major !== this.parsed.major) {
            const isClientNewer = clientParsed.major > this.parsed.major;
            return {
                compatible: false,
                reason: `Incompatible major version: client=${clientParsed.major}.x.x, daemon=${this.parsed.major}.x.x`,
                upgradeRecommended: isClientNewer,
            };
        }
        if (clientParsed.minor !== this.parsed.minor) {
            const isClientNewer = clientParsed.minor > this.parsed.minor;
            if (isClientNewer) {
                return {
                    compatible: false,
                    reason: `Client minor version ${clientParsed.minor} is newer than daemon ${this.parsed.minor}, upgrade recommended`,
                    upgradeRecommended: true,
                };
            }
            else {
                return {
                    compatible: false,
                    reason: `Client version ${clientVersion} is below minimum compatible version ${this.minCompatibleVersion}`,
                    upgradeRecommended: false,
                };
            }
        }
        const isClientNewer = clientParsed.patch > this.parsed.patch;
        return {
            compatible: true,
            reason: isClientNewer
                ? `Client version ${clientVersion} is newer than daemon ${this.version}, daemon upgrade recommended`
                : undefined,
            upgradeRecommended: isClientNewer,
        };
    }
    shouldUpgrade(clientVersion) {
        try {
            const comparison = compareVersions(clientVersion, this.version);
            return comparison > 0;
        }
        catch {
            return false;
        }
    }
    static getMinCompatibleVersion(version) {
        const parsed = parseVersion(version);
        if (!parsed) {
            throw new Error(`Invalid version: ${version}`);
        }
        return `${parsed.major}.${parsed.minor}.0`;
    }
    static isProtocolCompatible(a, b) {
        return a === b;
    }
}
//# sourceMappingURL=VersionManager.js.map