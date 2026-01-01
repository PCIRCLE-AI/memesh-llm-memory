#!/usr/bin/env node

/**
 * System Resource Checker for Claude Code Buddy (CCB)
 *
 * Analyzes system resources during installation and warns users if their
 * system doesn't meet medium performance requirements. Does NOT block installation.
 */

import os from 'os';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Medium Performance Requirements for CCB
const REQUIREMENTS = {
  // Minimum (warn if below)
  minCpuCores: 4,
  minRamGB: 8,
  minFreeRamGB: 4,
  minFreeDiskGB: 2,

  // Recommended for optimal performance
  recommendedCpuCores: 8,
  recommendedRamGB: 16,
  recommendedFreeRamGB: 8,
  recommendedFreeDiskGB: 5,

  // Node.js requirements (already in package.json)
  minNodeVersion: '18.0.0',
  minNpmVersion: '9.0.0'
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Get free disk space for the current directory
 * @returns {number} Free disk space in GB
 */
function getFreeDiskSpaceGB() {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows: use WMIC to get free space
      const drive = process.cwd().charAt(0); // Get drive letter (e.g., 'C')
      const output = execSync(`wmic logicaldisk where "DeviceID='${drive}:'" get FreeSpace`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const freeSpaceBytes = parseInt(lines[1].trim());
      return freeSpaceBytes / (1024 ** 3); // Convert to GB
    } else {
      // Unix-like: use df command
      const output = execSync('df -k .', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const fields = lines[1].split(/\s+/);
      const availableKB = parseInt(fields[3]);
      return availableKB / (1024 ** 2); // Convert KB to GB
    }
  } catch (error) {
    console.error(`${colors.yellow}⚠️  Could not determine disk space${colors.reset}`);
    return Infinity; // Don't warn if we can't detect
  }
}

/**
 * Parse version string (e.g., "v18.19.0" -> [18, 19, 0])
 */
function parseVersion(versionString) {
  const cleaned = versionString.replace(/^v/, '');
  return cleaned.split('.').map(Number);
}

/**
 * Compare two version arrays
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

/**
 * Check Node.js and npm versions
 */
function checkNodeVersions() {
  const warnings = [];
  const recommendations = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const nodeParsed = parseVersion(nodeVersion);
  const minNodeParsed = parseVersion(REQUIREMENTS.minNodeVersion);

  if (compareVersions(nodeParsed, minNodeParsed) < 0) {
    warnings.push(`Node.js: ${nodeVersion} (minimum required: ${REQUIREMENTS.minNodeVersion})`);
  }

  // Check npm version
  try {
    const npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
    const npmParsed = parseVersion(npmVersion);
    const minNpmParsed = parseVersion(REQUIREMENTS.minNpmVersion);

    if (compareVersions(npmParsed, minNpmParsed) < 0) {
      warnings.push(`npm: ${npmVersion} (minimum required: ${REQUIREMENTS.minNpmVersion})`);
    }
  } catch (error) {
    warnings.push('npm: Could not detect version');
  }

  return { warnings, recommendations };
}

/**
 * Check system hardware resources
 */
function checkHardwareResources() {
  const warnings = [];
  const recommendations = [];

  // CPU check
  const cpuCores = os.cpus().length;
  if (cpuCores < REQUIREMENTS.minCpuCores) {
    warnings.push(`CPU: ${cpuCores} cores (minimum: ${REQUIREMENTS.minCpuCores} cores)`);
  } else if (cpuCores < REQUIREMENTS.recommendedCpuCores) {
    recommendations.push(`CPU: ${cpuCores} cores (recommended: ${REQUIREMENTS.recommendedCpuCores}+ cores for better performance)`);
  }

  // RAM check
  const totalRamGB = os.totalmem() / (1024 ** 3);
  const freeRamGB = os.freemem() / (1024 ** 3);

  if (totalRamGB < REQUIREMENTS.minRamGB) {
    warnings.push(`RAM: ${totalRamGB.toFixed(1)} GB total (minimum: ${REQUIREMENTS.minRamGB} GB)`);
  } else if (totalRamGB < REQUIREMENTS.recommendedRamGB) {
    recommendations.push(`RAM: ${totalRamGB.toFixed(1)} GB total (recommended: ${REQUIREMENTS.recommendedRamGB} GB)`);
  }

  if (freeRamGB < REQUIREMENTS.minFreeRamGB) {
    warnings.push(`Available RAM: ${freeRamGB.toFixed(1)} GB (minimum: ${REQUIREMENTS.minFreeRamGB} GB free)`);
  } else if (freeRamGB < REQUIREMENTS.recommendedFreeRamGB) {
    recommendations.push(`Available RAM: ${freeRamGB.toFixed(1)} GB (recommended: ${REQUIREMENTS.recommendedFreeRamGB} GB free)`);
  }

  // Disk space check
  const freeDiskGB = getFreeDiskSpaceGB();
  if (freeDiskGB < REQUIREMENTS.minFreeDiskGB) {
    warnings.push(`Free Disk Space: ${freeDiskGB.toFixed(1)} GB (minimum: ${REQUIREMENTS.minFreeDiskGB} GB)`);
  } else if (freeDiskGB < REQUIREMENTS.recommendedFreeDiskGB) {
    recommendations.push(`Free Disk Space: ${freeDiskGB.toFixed(1)} GB (recommended: ${REQUIREMENTS.recommendedFreeDiskGB} GB)`);
  }

  return { warnings, recommendations };
}

/**
 * Main resource check function
 */
function checkSystemResources() {
  const nodeChecks = checkNodeVersions();
  const hardwareChecks = checkHardwareResources();

  const warnings = [...nodeChecks.warnings, ...hardwareChecks.warnings];
  const recommendations = [...nodeChecks.recommendations, ...hardwareChecks.recommendations];

  return {
    warnings,
    recommendations,
    passes: warnings.length === 0
  };
}

/**
 * Display results in terminal
 */
function displayResults(result) {
  console.log('');
  console.log(`${colors.cyan}${colors.bold}🔍 System Resource Check${colors.reset}`);
  console.log(`${colors.cyan}${'━'.repeat(60)}${colors.reset}`);
  console.log('');

  // System info
  console.log(`${colors.bold}System Information:${colors.reset}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  Node.js: ${process.version}`);
  console.log(`  CPU Cores: ${os.cpus().length}`);
  console.log(`  Total RAM: ${(os.totalmem() / (1024 ** 3)).toFixed(1)} GB`);
  console.log(`  Free RAM: ${(os.freemem() / (1024 ** 3)).toFixed(1)} GB`);
  console.log('');

  // Warnings (minimum requirements not met)
  if (result.warnings.length > 0) {
    console.log(`${colors.red}${colors.bold}⚠️  WARNINGS - System Below Minimum Requirements:${colors.reset}`);
    console.log('');
    result.warnings.forEach(warning => {
      console.log(`  ${colors.red}❌ ${warning}${colors.reset}`);
    });
    console.log('');
    console.log(`${colors.yellow}⚠️  Your system does not meet the minimum requirements for CCB.${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Installation will continue, but CCB may experience:${colors.reset}`);
    console.log(`${colors.yellow}   - Slower response times${colors.reset}`);
    console.log(`${colors.yellow}   - Increased memory pressure${colors.reset}`);
    console.log(`${colors.yellow}   - Potential instability under heavy load${colors.reset}`);
    console.log('');
    console.log(`${colors.yellow}💡 Consider upgrading your system for optimal performance.${colors.reset}`);
    console.log('');
  }

  // Recommendations (meets minimum but not optimal)
  if (result.recommendations.length > 0) {
    console.log(`${colors.yellow}${colors.bold}💡 RECOMMENDATIONS for Better Performance:${colors.reset}`);
    console.log('');
    result.recommendations.forEach(rec => {
      console.log(`  ${colors.yellow}→ ${rec}${colors.reset}`);
    });
    console.log('');
  }

  // All good
  if (result.passes && result.recommendations.length === 0) {
    console.log(`${colors.green}${colors.bold}✅ Your system meets all recommended requirements!${colors.reset}`);
    console.log(`${colors.green}CCB should run smoothly on this system.${colors.reset}`);
    console.log('');
  }

  console.log(`${colors.cyan}${'━'.repeat(60)}${colors.reset}`);
  console.log('');
}

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkSystemResources();
  displayResults(result);

  // ALWAYS exit with 0 (success) - don't block installation
  process.exit(0);
}

// Export for use in other scripts
export {
  checkSystemResources,
  displayResults,
  REQUIREMENTS
};
