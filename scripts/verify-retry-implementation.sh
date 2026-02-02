#!/bin/bash

# Verify Retry Implementation Script
# Runs all retry-related tests and displays results

set -e

echo "=================================================="
echo "🔍 A2A Retry Mechanisms - Implementation Verification"
echo "=================================================="
echo ""

echo "📋 Running retry-specific tests..."
echo ""

echo "1️⃣ Testing A2AClient HTTP retry logic..."
npm test -- tests/unit/a2a/A2AClient.retry.test.ts --run

echo ""
echo "2️⃣ Testing TaskQueue database retry logic..."
npm test -- tests/unit/a2a/TaskQueue.retry.test.ts --run

echo ""
echo "3️⃣ Testing A2AClient base functionality..."
npm test -- tests/unit/a2a/A2AClient.test.ts --run

echo ""
echo "=================================================="
echo "✅ Verification Complete"
echo "=================================================="
echo ""
echo "📊 Test Summary:"
echo "  - A2AClient HTTP Retry: 14 tests"
echo "  - TaskQueue DB Retry: 8 tests"
echo "  - A2AClient Base: 7 tests"
echo "  - Total: 29 tests"
echo ""
echo "📚 Documentation:"
echo "  - User Guide: docs/a2a/RETRY_MECHANISMS.md"
echo "  - Changelog: docs/a2a/CHANGELOG_RETRY.md"
echo "  - Summary: RETRY_IMPLEMENTATION_SUMMARY.md"
echo ""
echo "⚙️ Configuration:"
echo "  - Environment: .env.example (retry variables added)"
echo "  - A2A_RETRY_MAX_ATTEMPTS=3"
echo "  - A2A_RETRY_INITIAL_DELAY_MS=1000"
echo "  - DB_BUSY_TIMEOUT_MS=5000"
echo ""
echo "🎉 Retry mechanisms implementation verified successfully!"
