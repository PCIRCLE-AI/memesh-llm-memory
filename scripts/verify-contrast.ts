#!/usr/bin/env tsx
/**
 * Verify Theme Contrast Ratios
 *
 * Checks all color combinations in the theme meet WCAG AA standards
 */

import { verifyThemeContrast, printContrastResults } from '../src/ui/theme.js';

console.log('🎨 Verifying MeMesh Theme Contrast Ratios...\n');

// Print results
printContrastResults();

// Check if all pass
const results = verifyThemeContrast();
const allPass = results.every(r => r.passes);

if (allPass) {
  console.log('✅ All color combinations meet WCAG AA standards!\n');
  process.exit(0);
} else {
  console.log('❌ Some color combinations fail WCAG AA standards.\n');
  process.exit(1);
}
