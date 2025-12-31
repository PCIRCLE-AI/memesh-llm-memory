#!/bin/bash
# Automated console.log to logger migration tracker

echo "=== Console.log Migration Finder ==="
echo ""

# Find all TypeScript files with console.log
files=$(grep -rl "console\\.log\\|console\\.error\\|console\\.warn\\|console\\.debug" src --include="*.ts" --exclude="*.test.ts" | sort)

file_count=$(echo "$files" | wc -l | tr -d ' ')
total_count=$(grep -r "console\\.log\\|console\\.error\\|console\\.warn\\|console\\.debug" src --include="*.ts" --exclude="*.test.ts" | wc -l | tr -d ' ')

echo "Found $file_count files with $total_count console.* calls to migrate"
echo ""
echo "Files to migrate:"
echo "$files"
echo ""
echo "Priority order for migration:"
echo "1. High:   orchestrator/, core/, mcp/"
echo "2. Medium: agents/"
echo "3. Low:    remaining files"
echo ""
echo "⚠️  Manual migration required - do NOT auto-replace!"
echo "Each file needs context-aware logger.info/error/warn/debug replacement"
