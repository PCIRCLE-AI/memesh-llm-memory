#!/bin/bash
#
# Cleanup Orphan MeMesh Processes
# Runs on SessionStart to prevent MCP connection failures
#

# Check for orphan memesh processes
ORPHANS=$(ps aux | grep "server-bootstrap.js" | grep -v grep | wc -l | tr -d ' ')

if [ "$ORPHANS" -gt 0 ]; then
  echo "⚠️  Found $ORPHANS orphan memesh process(es), cleaning up..."
  pkill -f "server-bootstrap.js"
  sleep 1

  # Verify cleanup
  REMAINING=$(ps aux | grep "server-bootstrap.js" | grep -v grep | wc -l | tr -d ' ')
  if [ "$REMAINING" -eq 0 ]; then
    echo "✅ Cleaned up orphan processes"
  else
    echo "❌ Failed to clean up all orphan processes"
  fi
else
  # Silent if no orphans (don't clutter output)
  true
fi
