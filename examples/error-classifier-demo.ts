#!/usr/bin/env ts-node
/**
 * Error Classifier Demo
 *
 * Demonstrates the enhanced error classification and formatting system
 * Run: npx tsx examples/error-classifier-demo.ts
 */

import { ErrorClassifier } from '../src/errors/ErrorClassifier.js';

const classifier = new ErrorClassifier();

console.log('\n' + '='.repeat(80));
console.log('Error Classification System Demo');
console.log('='.repeat(80) + '\n');

// Example 1: Configuration Error
console.log('📝 Example 1: Configuration Error\n');
const configError = new Error('Configuration file not found at ~/.config/claude/claude_desktop_config.json');
const classified1 = classifier.classify(configError, { configPath: '~/.config/claude/claude_desktop_config.json' });
console.log(classifier.format(classified1));

// Example 2: Connection Error
console.log('\n\n📝 Example 2: Connection Error\n');
const connectionError = new Error('ECONNREFUSED: Connection refused to MCP server');
const classified2 = classifier.classify(connectionError, {});
console.log(classifier.format(classified2));

// Example 3: Permission Error
console.log('\n\n📝 Example 3: Permission Error\n');
const permissionError = new Error('EACCES: permission denied, open \'/usr/local/lib/memesh/data.db\'');
const classified3 = classifier.classify(permissionError, {});
console.log(classifier.format(classified3));

// Example 4: Validation Error
console.log('\n\n📝 Example 4: Validation Error\n');
const validationError = new Error('Invalid input: task description must be at least 1 character');
const classified4 = classifier.classify(validationError, {});
console.log(classifier.format(classified4));

// Example 5: Resource Error
console.log('\n\n📝 Example 5: Resource Error\n');
const resourceError = new Error('Memory limit exceeded: 2GB / 2GB used');
const classified5 = classifier.classify(resourceError, {});
console.log(classifier.format(classified5));

// Example 6: Integration Error
console.log('\n\n📝 Example 6: Integration Error\n');
const integrationError = new Error('Database connection failed: timeout after 30s');
const classified6 = classifier.classify(integrationError, {});
console.log(classifier.format(classified6));

console.log('\n' + '='.repeat(80));
console.log('Demo Complete! Check the error classifications and guidance above.');
console.log('='.repeat(80) + '\n');
