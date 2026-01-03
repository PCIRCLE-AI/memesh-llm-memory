#!/usr/bin/env node

/**
 * System Resource Checker
 *
 * Checks system resources (CPU, memory, disk) and warns if insufficient.
 * This runs during installation to ensure the system can run CCB properly.
 */

import os from 'os';
import { execSync } from 'child_process';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
};

// Resource requirements
const REQUIREMENTS = {
  minMemoryGB: 4, // Minimum 4GB RAM
  minCpuCores: 2, // Minimum 2 CPU cores
  minDiskSpaceGB: 1, // Minimum 1GB free disk space
};

function formatBytes(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function checkMemory() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const totalGB = totalMemory / 1024 / 1024 / 1024;
  const freeGB = freeMemory / 1024 / 1024 / 1024;

  console.log(`${colors.blue}Memory:${colors.reset}`);
  console.log(`  Total: ${formatBytes(totalMemory)}`);
  console.log(`  Free:  ${formatBytes(freeMemory)}`);

  if (totalGB < REQUIREMENTS.minMemoryGB) {
    console.log(
      `  ${colors.yellow}⚠ Warning: Total memory (${totalGB.toFixed(2)}GB) is below recommended ${REQUIREMENTS.minMemoryGB}GB${colors.reset}`
    );
    return false;
  }

  if (freeGB < 2) {
    console.log(
      `  ${colors.yellow}⚠ Warning: Low free memory (${freeGB.toFixed(2)}GB). Consider closing some applications.${colors.reset}`
    );
    return false;
  }

  console.log(`  ${colors.green}✓ Memory OK${colors.reset}`);
  return true;
}

function checkCPU() {
  const cpuCount = os.cpus().length;
  const cpuModel = os.cpus()[0].model;

  console.log(`\n${colors.blue}CPU:${colors.reset}`);
  console.log(`  Cores: ${cpuCount}`);
  console.log(`  Model: ${cpuModel}`);

  if (cpuCount < REQUIREMENTS.minCpuCores) {
    console.log(
      `  ${colors.yellow}⚠ Warning: CPU cores (${cpuCount}) is below recommended ${REQUIREMENTS.minCpuCores}${colors.reset}`
    );
    return false;
  }

  console.log(`  ${colors.green}✓ CPU OK${colors.reset}`);
  return true;
}

function checkDiskSpace() {
  console.log(`\n${colors.blue}Disk Space:${colors.reset}`);

  try {
    let availableGB;
    if (process.platform === 'win32') {
      // Windows
      const output = execSync('wmic logicaldisk get size,freespace,caption')
        .toString()
        .split('\n')[1];
      const parts = output.trim().split(/\s+/);
      const freeBytes = parseInt(parts[1]);
      availableGB = freeBytes / 1024 / 1024 / 1024;
    } else {
      // macOS / Linux
      const output = execSync("df -k . | tail -1 | awk '{print $4}'")
        .toString()
        .trim();
      availableGB = (parseInt(output) * 1024) / 1024 / 1024 / 1024;
    }

    console.log(`  Available: ${availableGB.toFixed(2)} GB`);

    if (availableGB < REQUIREMENTS.minDiskSpaceGB) {
      console.log(
        `  ${colors.red}✗ Error: Insufficient disk space (${availableGB.toFixed(2)}GB). Need at least ${REQUIREMENTS.minDiskSpaceGB}GB${colors.reset}`
      );
      return false;
    }

    console.log(`  ${colors.green}✓ Disk space OK${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`  ${colors.yellow}⚠ Could not check disk space${colors.reset}`);
    return true; // Don't fail if we can't check
  }
}

function main() {
  console.log('System Resource Check\n');
  console.log(`Platform: ${process.platform}`);
  console.log(`Node.js: ${process.version}\n`);

  const memoryOK = checkMemory();
  const cpuOK = checkCPU();
  const diskOK = checkDiskSpace();

  console.log('\n' + '─'.repeat(50));

  if (memoryOK && cpuOK && diskOK) {
    console.log(`${colors.green}✓ All system requirements met!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(
      `${colors.yellow}⚠ Some system requirements not met. CCB may run slower than expected.${colors.reset}\n`
    );
    console.log('Recommended system requirements:');
    console.log(`  - Memory: ${REQUIREMENTS.minMemoryGB}GB+ RAM`);
    console.log(`  - CPU: ${REQUIREMENTS.minCpuCores}+ cores`);
    console.log(`  - Disk: ${REQUIREMENTS.minDiskSpaceGB}GB+ free space\n`);
    process.exit(0); // Don't fail installation, just warn
  }
}

main();
