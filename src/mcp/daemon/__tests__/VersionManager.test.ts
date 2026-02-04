/**
 * VersionManager Tests
 *
 * Tests for daemon version compatibility management:
 * - Semantic version parsing
 * - Client compatibility checking
 * - Upgrade recommendation logic
 * - Protocol version validation
 * - Edge cases (pre-release, build metadata)
 */

import { describe, it, expect } from 'vitest';
import {
  VersionManager,
  parseVersion,
  compareVersions,
  type VersionInfo,
  type CompatibilityResult,
} from '../VersionManager.js';

// ═══════════════════════════════════════════════════════════════════════════
// Version Parsing Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('parseVersion', () => {
  it('should parse standard semantic version', () => {
    const result = parseVersion('2.6.0');
    expect(result).toEqual({
      major: 2,
      minor: 6,
      patch: 0,
      prerelease: undefined,
      build: undefined,
    });
  });

  it('should parse version with single digit components', () => {
    const result = parseVersion('1.0.0');
    expect(result).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: undefined,
      build: undefined,
    });
  });

  it('should parse version with multi-digit components', () => {
    const result = parseVersion('12.345.67');
    expect(result).toEqual({
      major: 12,
      minor: 345,
      patch: 67,
      prerelease: undefined,
      build: undefined,
    });
  });

  it('should parse version with prerelease identifier', () => {
    const result = parseVersion('2.6.0-beta.1');
    expect(result).toEqual({
      major: 2,
      minor: 6,
      patch: 0,
      prerelease: 'beta.1',
      build: undefined,
    });
  });

  it('should parse version with build metadata', () => {
    const result = parseVersion('2.6.0+build.123');
    expect(result).toEqual({
      major: 2,
      minor: 6,
      patch: 0,
      prerelease: undefined,
      build: 'build.123',
    });
  });

  it('should parse version with both prerelease and build metadata', () => {
    const result = parseVersion('2.6.0-alpha.2+build.456');
    expect(result).toEqual({
      major: 2,
      minor: 6,
      patch: 0,
      prerelease: 'alpha.2',
      build: 'build.456',
    });
  });

  it('should return null for invalid version string', () => {
    expect(parseVersion('invalid')).toBeNull();
    expect(parseVersion('2.6')).toBeNull();
    expect(parseVersion('v2.6.0')).toBeNull();
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('2.6.0.1')).toBeNull();
  });

  it('should return null for version numbers exceeding bounds (max 999999)', () => {
    // Major exceeds bounds
    expect(parseVersion('1000000.0.0')).toBeNull();
    // Minor exceeds bounds
    expect(parseVersion('0.1000000.0')).toBeNull();
    // Patch exceeds bounds
    expect(parseVersion('0.0.1000000')).toBeNull();
    // All exceed bounds
    expect(parseVersion('1000000.1000000.1000000')).toBeNull();
  });

  it('should accept version numbers at the boundary (999999)', () => {
    const result = parseVersion('999999.999999.999999');
    expect(result).toEqual({
      major: 999999,
      minor: 999999,
      patch: 999999,
      prerelease: undefined,
      build: undefined,
    });
  });

  it('should handle version with leading zeros', () => {
    // Leading zeros should be parsed as numbers
    const result = parseVersion('02.06.00');
    expect(result).toEqual({
      major: 2,
      minor: 6,
      patch: 0,
      prerelease: undefined,
      build: undefined,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Version Comparison Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('2.6.0', '2.6.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('should compare major versions correctly', () => {
    expect(compareVersions('3.0.0', '2.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('should compare minor versions correctly', () => {
    expect(compareVersions('2.7.0', '2.6.0')).toBeGreaterThan(0);
    expect(compareVersions('2.5.0', '2.6.0')).toBeLessThan(0);
  });

  it('should compare patch versions correctly', () => {
    expect(compareVersions('2.6.1', '2.6.0')).toBeGreaterThan(0);
    expect(compareVersions('2.6.0', '2.6.5')).toBeLessThan(0);
  });

  it('should handle mixed component comparisons', () => {
    expect(compareVersions('2.6.5', '2.5.10')).toBeGreaterThan(0);
    expect(compareVersions('3.0.0', '2.99.99')).toBeGreaterThan(0);
  });

  it('should treat prerelease versions as lower than release', () => {
    expect(compareVersions('2.6.0-beta.1', '2.6.0')).toBeLessThan(0);
    expect(compareVersions('2.6.0', '2.6.0-alpha.1')).toBeGreaterThan(0);
  });

  it('should compare prerelease versions', () => {
    expect(compareVersions('2.6.0-beta.1', '2.6.0-alpha.1')).toBeGreaterThan(0);
    expect(compareVersions('2.6.0-alpha.2', '2.6.0-alpha.1')).toBeGreaterThan(0);
  });

  it('should ignore build metadata in comparison', () => {
    expect(compareVersions('2.6.0+build.1', '2.6.0+build.2')).toBe(0);
    expect(compareVersions('2.6.0+build.123', '2.6.0')).toBe(0);
  });

  it('should throw for invalid versions', () => {
    expect(() => compareVersions('invalid', '2.6.0')).toThrow();
    expect(() => compareVersions('2.6.0', 'invalid')).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VersionManager Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('VersionManager', () => {
  describe('constructor', () => {
    it('should create instance with valid version and protocol', () => {
      const manager = new VersionManager('2.6.0', 1);
      expect(manager).toBeDefined();
    });

    it('should throw for invalid version', () => {
      expect(() => new VersionManager('invalid', 1)).toThrow();
    });
  });

  describe('getVersionInfo', () => {
    it('should return correct version info', () => {
      const manager = new VersionManager('2.6.5', 2);
      const info = manager.getVersionInfo();

      expect(info).toEqual({
        version: '2.6.5',
        major: 2,
        minor: 6,
        patch: 5,
        protocolVersion: 2,
        minCompatibleVersion: '2.6.0',
      });
    });

    it('should calculate minimum compatible version as major.minor.0', () => {
      const manager = new VersionManager('3.12.7', 1);
      const info = manager.getVersionInfo();

      expect(info.minCompatibleVersion).toBe('3.12.0');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Client Compatibility Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('isClientCompatible', () => {
    describe('compatible versions', () => {
      it('should accept same version', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('2.6.0', 1);

        expect(result.compatible).toBe(true);
        expect(result.upgradeRecommended).toBe(false);
        expect(result.reason).toBeUndefined();
      });

      it('should accept newer patch version (client > daemon)', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('2.6.1', 1);

        expect(result.compatible).toBe(true);
        expect(result.upgradeRecommended).toBe(true);
        expect(result.reason).toContain('upgrade');
      });

      it('should accept older patch version (client < daemon)', () => {
        const manager = new VersionManager('2.6.5', 1);
        const result = manager.isClientCompatible('2.6.0', 1);

        expect(result.compatible).toBe(true);
        expect(result.upgradeRecommended).toBe(false);
      });

      it('should accept same major.minor with different patches', () => {
        const manager = new VersionManager('2.6.3', 1);

        expect(manager.isClientCompatible('2.6.0', 1).compatible).toBe(true);
        expect(manager.isClientCompatible('2.6.1', 1).compatible).toBe(true);
        expect(manager.isClientCompatible('2.6.5', 1).compatible).toBe(true);
      });
    });

    describe('incompatible versions', () => {
      it('should reject protocol version mismatch', () => {
        const manager = new VersionManager('2.6.0', 2);
        const result = manager.isClientCompatible('2.6.0', 1);

        expect(result.compatible).toBe(false);
        expect(result.reason?.toLowerCase()).toContain('protocol');
      });

      it('should reject different major version', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('3.0.0', 1);

        expect(result.compatible).toBe(false);
        expect(result.reason).toContain('major');
      });

      it('should reject older major version', () => {
        const manager = new VersionManager('3.0.0', 1);
        const result = manager.isClientCompatible('2.6.0', 1);

        expect(result.compatible).toBe(false);
        expect(result.reason).toContain('major');
      });

      it('should reject different minor version (client newer)', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('2.7.0', 1);

        expect(result.compatible).toBe(false);
        expect(result.reason).toContain('minor');
        expect(result.upgradeRecommended).toBe(true);
      });

      it('should reject different minor version (client older)', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('2.5.0', 1);

        expect(result.compatible).toBe(false);
        expect(result.reason).toContain('minimum');
      });
    });

    describe('edge cases', () => {
      it('should handle prerelease client version', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('2.6.0-beta.1', 1);

        // Prerelease should be treated as compatible within same major.minor
        expect(result.compatible).toBe(true);
      });

      it('should handle invalid client version gracefully', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('invalid', 1);

        expect(result.compatible).toBe(false);
        expect(result.reason).toContain('Invalid');
      });

      it('should recommend upgrade when client has higher patch', () => {
        const manager = new VersionManager('2.6.0', 1);
        const result = manager.isClientCompatible('2.6.10', 1);

        expect(result.compatible).toBe(true);
        expect(result.upgradeRecommended).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Upgrade Recommendation Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('shouldUpgrade', () => {
    it('should return true when client is newer', () => {
      const manager = new VersionManager('2.6.0', 1);

      expect(manager.shouldUpgrade('2.6.1')).toBe(true);
      expect(manager.shouldUpgrade('2.6.5')).toBe(true);
    });

    it('should return false when versions are equal', () => {
      const manager = new VersionManager('2.6.0', 1);

      expect(manager.shouldUpgrade('2.6.0')).toBe(false);
    });

    it('should return false when daemon is newer', () => {
      const manager = new VersionManager('2.6.5', 1);

      expect(manager.shouldUpgrade('2.6.0')).toBe(false);
      expect(manager.shouldUpgrade('2.6.3')).toBe(false);
    });

    it('should return true for newer minor version', () => {
      const manager = new VersionManager('2.6.0', 1);

      expect(manager.shouldUpgrade('2.7.0')).toBe(true);
    });

    it('should return true for newer major version', () => {
      const manager = new VersionManager('2.6.0', 1);

      expect(manager.shouldUpgrade('3.0.0')).toBe(true);
    });

    it('should return false for invalid version', () => {
      const manager = new VersionManager('2.6.0', 1);

      expect(manager.shouldUpgrade('invalid')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Static Utility Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('static getMinCompatibleVersion', () => {
    it('should return major.minor.0 format', () => {
      expect(VersionManager.getMinCompatibleVersion('2.6.5')).toBe('2.6.0');
      expect(VersionManager.getMinCompatibleVersion('3.12.99')).toBe('3.12.0');
      expect(VersionManager.getMinCompatibleVersion('1.0.0')).toBe('1.0.0');
    });

    it('should throw for invalid version', () => {
      expect(() => VersionManager.getMinCompatibleVersion('invalid')).toThrow();
    });
  });

  describe('static isProtocolCompatible', () => {
    it('should return true for matching protocols', () => {
      expect(VersionManager.isProtocolCompatible(1, 1)).toBe(true);
      expect(VersionManager.isProtocolCompatible(2, 2)).toBe(true);
    });

    it('should return false for different protocols', () => {
      expect(VersionManager.isProtocolCompatible(1, 2)).toBe(false);
      expect(VersionManager.isProtocolCompatible(2, 1)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration Scenario Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('VersionManager Integration Scenarios', () => {
  describe('Scenario: Multiple clients with varying versions', () => {
    const daemonManager = new VersionManager('2.6.0', 1);

    it('should handle client at same version', () => {
      const result = daemonManager.isClientCompatible('2.6.0', 1);
      expect(result.compatible).toBe(true);
      expect(result.upgradeRecommended).toBe(false);
    });

    it('should handle client with newer patch (upgrade recommended)', () => {
      const result = daemonManager.isClientCompatible('2.6.1', 1);
      expect(result.compatible).toBe(true);
      expect(result.upgradeRecommended).toBe(true);
    });

    it('should handle client with older version (within same minor)', () => {
      // Edge case: daemon is 2.6.0, client is also at minimum
      const result = daemonManager.isClientCompatible('2.6.0', 1);
      expect(result.compatible).toBe(true);
    });

    it('should reject client with different protocol', () => {
      const result = daemonManager.isClientCompatible('2.6.0', 2);
      expect(result.compatible).toBe(false);
    });
  });

  describe('Scenario: Daemon upgrade decision', () => {
    const oldDaemon = new VersionManager('2.6.0', 1);

    it('should decide to upgrade for significantly newer client', () => {
      expect(oldDaemon.shouldUpgrade('2.6.5')).toBe(true);
    });

    it('should decide to upgrade for minor version bump', () => {
      expect(oldDaemon.shouldUpgrade('2.7.0')).toBe(true);
    });

    it('should not upgrade for older or equal client', () => {
      expect(oldDaemon.shouldUpgrade('2.6.0')).toBe(false);
    });
  });
});
