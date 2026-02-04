/**
 * VersionManager - Daemon Version Compatibility Management
 *
 * Handles semantic version parsing, comparison, and compatibility checking
 * for the MeMesh daemon singleton architecture.
 *
 * Compatibility Rules:
 * - Same major.minor is compatible (patch differences OK)
 * - Protocol version must match exactly
 * - Client > Daemon recommends daemon upgrade
 * - Client with newer minor/major is incompatible (daemon should upgrade)
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parsed semantic version components
 */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Version info returned by the manager
 */
export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  protocolVersion: number;
  minCompatibleVersion: string;
}

/**
 * Result of client compatibility check
 */
export interface CompatibilityResult {
  compatible: boolean;
  reason?: string;
  upgradeRecommended: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Version Parsing Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Regex pattern for semantic versioning
 * Matches: major.minor.patch[-prerelease][+build]
 */
const SEMVER_REGEX =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

/**
 * Parse a semantic version string into components
 *
 * @param version - Version string (e.g., "2.6.0", "2.6.0-beta.1+build.123")
 * @returns Parsed version components or null if invalid
 */
/**
 * Maximum allowed value for version number components.
 * Prevents integer overflow and ensures reasonable version numbers.
 */
const MAX_VERSION_NUMBER = 999999;

/**
 * Maximum allowed length for version string input.
 * Prevents potential DoS from extremely long malicious strings.
 */
const MAX_VERSION_LENGTH = 256;

export function parseVersion(version: string): ParsedVersion | null {
  // Guard against excessively long input strings
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

  // Bounds checking to prevent unreasonably large version numbers
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

/**
 * Compare two prerelease strings.
 *
 * Follows semver precedence rules:
 * - No prerelease is "greater" than having one (1.0.0 > 1.0.0-beta)
 * - Numeric identifiers are compared numerically
 * - Alphanumeric identifiers are compared lexically
 * - Identifiers consisting of only digits have lower precedence
 *
 * @param a - First prerelease string (optional)
 * @param b - Second prerelease string (optional)
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
function comparePrereleases(a?: string, b?: string): number {
  // No prerelease is "greater" than having one (1.0.0 > 1.0.0-beta)
  if (!a && !b) return 0;
  if (!a && b) return 1;
  if (a && !b) return -1;

  // Compare prerelease identifiers
  const partsA = a!.split('.');
  const partsB = b!.split('.');

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i];
    const partB = partsB[i];

    if (partA === undefined && partB !== undefined) return -1;
    if (partA !== undefined && partB === undefined) return 1;
    if (partA === partB) continue;

    // Numeric comparison if both are numbers
    const numA = parseInt(partA, 10);
    const numB = parseInt(partB, 10);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // String comparison otherwise
    return partA.localeCompare(partB);
  }

  return 0;
}

/**
 * Compare two semantic version strings
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns negative if a < b, positive if a > b, 0 if equal
 * @throws Error if either version is invalid
 */
export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  if (!parsedA) {
    throw new Error(`Invalid version string: ${a}`);
  }

  if (!parsedB) {
    throw new Error(`Invalid version string: ${b}`);
  }

  // Compare major.minor.patch first
  if (parsedA.major !== parsedB.major) {
    return parsedA.major - parsedB.major;
  }

  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor - parsedB.minor;
  }

  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch - parsedB.patch;
  }

  // Compare prerelease (build metadata is ignored in semver comparison)
  return comparePrereleases(parsedA.prerelease, parsedB.prerelease);
}

// ═══════════════════════════════════════════════════════════════════════════
// VersionManager Class
// ═══════════════════════════════════════════════════════════════════════════

/**
 * VersionManager - Manages version compatibility for daemon
 *
 * @example
 * ```typescript
 * const manager = new VersionManager('2.6.0', 1);
 *
 * // Check if a client is compatible
 * const result = manager.isClientCompatible('2.6.1', 1);
 * if (!result.compatible) {
 *   console.log('Incompatible:', result.reason);
 * }
 *
 * // Check if daemon should upgrade
 * if (manager.shouldUpgrade('2.6.5')) {
 *   console.log('Newer client detected, upgrade recommended');
 * }
 * ```
 */
export class VersionManager {
  private readonly version: string;
  private readonly parsed: ParsedVersion;
  private readonly protocolVersion: number;
  private readonly minCompatibleVersion: string;

  /**
   * Create a new VersionManager
   *
   * @param version - Daemon's semantic version (e.g., "2.6.0")
   * @param protocolVersion - Protocol version number
   * @throws Error if version is invalid
   */
  constructor(version: string, protocolVersion: number) {
    const parsed = parseVersion(version);

    if (!parsed) {
      throw new Error(`Invalid daemon version: ${version}`);
    }

    this.version = version;
    this.parsed = parsed;
    this.protocolVersion = protocolVersion;
    this.minCompatibleVersion = `${parsed.major}.${parsed.minor}.0`;
  }

  /**
   * Get version information.
   *
   * @returns Object containing version details and compatibility info
   */
  getVersionInfo(): VersionInfo {
    return {
      version: this.version,
      major: this.parsed.major,
      minor: this.parsed.minor,
      patch: this.parsed.patch,
      protocolVersion: this.protocolVersion,
      minCompatibleVersion: this.minCompatibleVersion,
    };
  }

  /**
   * Check if a client version is compatible with this daemon
   *
   * Compatibility rules:
   * 1. Protocol version must match exactly
   * 2. Major version must match
   * 3. Minor version must match
   * 4. Patch version can differ (newer client recommends upgrade)
   *
   * @param clientVersion - Client's semantic version
   * @param clientProtocolVersion - Client's protocol version
   * @returns Compatibility result with reason and upgrade recommendation
   */
  isClientCompatible(
    clientVersion: string,
    clientProtocolVersion: number
  ): CompatibilityResult {
    // Validate client version format
    const clientParsed = parseVersion(clientVersion);

    if (!clientParsed) {
      return {
        compatible: false,
        reason: `Invalid client version format: ${clientVersion}`,
        upgradeRecommended: false,
      };
    }

    // Rule 1: Protocol version must match exactly
    if (clientProtocolVersion !== this.protocolVersion) {
      return {
        compatible: false,
        reason: `Protocol version mismatch: client=${clientProtocolVersion}, daemon=${this.protocolVersion}`,
        upgradeRecommended: clientProtocolVersion > this.protocolVersion,
      };
    }

    // Rule 2: Major version must match
    if (clientParsed.major !== this.parsed.major) {
      const isClientNewer = clientParsed.major > this.parsed.major;
      return {
        compatible: false,
        reason: `Incompatible major version: client=${clientParsed.major}.x.x, daemon=${this.parsed.major}.x.x`,
        upgradeRecommended: isClientNewer,
      };
    }

    // Rule 3: Minor version must match
    if (clientParsed.minor !== this.parsed.minor) {
      const isClientNewer = clientParsed.minor > this.parsed.minor;
      if (isClientNewer) {
        return {
          compatible: false,
          reason: `Client minor version ${clientParsed.minor} is newer than daemon ${this.parsed.minor}, upgrade recommended`,
          upgradeRecommended: true,
        };
      } else {
        return {
          compatible: false,
          reason: `Client version ${clientVersion} is below minimum compatible version ${this.minCompatibleVersion}`,
          upgradeRecommended: false,
        };
      }
    }

    // Rule 4: Patch version can differ
    // If client has newer patch, recommend daemon upgrade
    const isClientNewer = clientParsed.patch > this.parsed.patch;

    return {
      compatible: true,
      reason: isClientNewer
        ? `Client version ${clientVersion} is newer than daemon ${this.version}, daemon upgrade recommended`
        : undefined,
      upgradeRecommended: isClientNewer,
    };
  }

  /**
   * Check if daemon should upgrade based on client version
   *
   * Returns true if:
   * - Client has a newer version (comparing semver)
   *
   * @param clientVersion - Client's semantic version
   * @returns true if daemon should upgrade
   */
  shouldUpgrade(clientVersion: string): boolean {
    try {
      const comparison = compareVersions(clientVersion, this.version);
      return comparison > 0;
    } catch {
      // Invalid version, don't upgrade
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Static Utility Methods
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get the minimum compatible version for a given version
   * (always returns major.minor.0)
   *
   * @param version - Semantic version string
   * @returns Minimum compatible version string
   * @throws Error if version is invalid
   */
  static getMinCompatibleVersion(version: string): string {
    const parsed = parseVersion(version);

    if (!parsed) {
      throw new Error(`Invalid version: ${version}`);
    }

    return `${parsed.major}.${parsed.minor}.0`;
  }

  /**
   * Check if two protocol versions are compatible
   * (Protocol versions must match exactly)
   *
   * @param a - First protocol version
   * @param b - Second protocol version
   * @returns true if protocols are compatible
   */
  static isProtocolCompatible(a: number, b: number): boolean {
    return a === b;
  }
}
