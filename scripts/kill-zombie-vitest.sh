#!/bin/bash

#
# Kill Zombie Vitest Processes
#
# This script kills all orphaned vitest and npm test processes.
# Use this when vitest processes fail to terminate properly.
#

set -e

echo "🔍 Searching for zombie vitest processes..."

# Count vitest processes
vitest_count=$(ps aux | grep -E "node.*vitest|npm test" | grep -v grep | wc -l | tr -d ' ')

if [ "$vitest_count" -eq 0 ]; then
  echo "✅ No zombie vitest processes found"
  exit 0
fi

echo "⚠️  Found $vitest_count zombie processes"
echo ""
echo "Processes to be killed:"
ps aux | grep -E "node.*vitest|npm test" | grep -v grep | head -20
echo ""

# Ask for confirmation
read -p "Kill all these processes? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi

echo "🔪 Killing all vitest and npm test processes..."

# Kill all vitest worker processes first
pkill -9 -f "node.*vitest [0-9]" || true

# Kill main vitest processes
pkill -9 -f "node.*vitest" || true

# Kill npm test processes
pkill -9 -f "npm test" || true

# Kill shell snapshot processes running npm test
pkill -9 -f "shell-snapshots.*npm test" || true

# Wait a moment for processes to die
sleep 1

# Check if any survived
remaining=$(ps aux | grep -E "node.*vitest|npm test" | grep -v grep | wc -l | tr -d ' ')

if [ "$remaining" -eq 0 ]; then
  echo "✅ All zombie processes killed successfully"
  echo "📊 Freed approximately: $((vitest_count * 70))MB of memory"
else
  echo "⚠️  Warning: $remaining processes still running"
  echo "They may be unkillable. Try running with sudo:"
  echo "  sudo $0"
fi
