#!/usr/bin/env python3
"""
Find actual console.* statements in TypeScript files (excluding JSDoc comments and tests)
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

# Pattern to match console statements
CONSOLE_PATTERN = re.compile(r'console\.(log|error|warn|debug|info|clear)\s*\(')

def is_in_jsdoc(lines: List[str], line_num: int) -> bool:
    """Check if a line is inside JSDoc comment block."""
    # Look backwards for JSDoc start
    for i in range(line_num - 1, -1, -1):
        line = lines[i].strip()
        if line.startswith('/**'):
            # Found JSDoc start, check if we're before the end
            for j in range(i, line_num):
                if '*/' in lines[j]:
                    # JSDoc ended before our line
                    return False
            return True
        elif not line.startswith('*') and line and not line.startswith('//'):
            # Hit non-comment code
            break
    return False

def is_comment_line(line: str) -> bool:
    """Check if line is a comment."""
    stripped = line.strip()
    return (stripped.startswith('//') or
            stripped.startswith('*') or
            stripped.startswith('/**') or
            stripped.startswith('*/'))

def find_console_statements(file_path: Path) -> List[Tuple[int, str]]:
    """Find console statements in a file that are not in comments."""
    results = []

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for i, line in enumerate(lines, 1):
            # Skip comment lines
            if is_comment_line(line):
                continue

            # Skip JSDoc blocks
            if is_in_jsdoc(lines, i - 1):
                continue

            # Check for console statements
            if CONSOLE_PATTERN.search(line):
                results.append((i, line.rstrip()))

    except Exception as e:
        print(f"Error reading {file_path}: {e}")

    return results

def main():
    src_dir = Path("src")

    if not src_dir.exists():
        print("Error: src/ directory not found")
        return

    # Find all TypeScript files (excluding tests)
    ts_files = []
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.ts') and not file.endswith('.test.ts') and not file.endswith('.spec.ts'):
                ts_files.append(Path(root) / file)

    print(f"Scanning {len(ts_files)} TypeScript files...")
    print()

    # Collect all console statements
    all_statements = {}
    total_count = 0

    for file_path in sorted(ts_files):
        statements = find_console_statements(file_path)
        if statements:
            all_statements[file_path] = statements
            total_count += len(statements)

    # Print results grouped by file
    if all_statements:
        print(f"Found {total_count} console statements in {len(all_statements)} files:\n")

        for file_path, statements in sorted(all_statements.items(), key=lambda x: -len(x[1])):
            print(f"\n{file_path} ({len(statements)} statements):")
            for line_num, line in statements[:10]:  # Show first 10
                print(f"  {line_num:4d}: {line[:100]}")
            if len(statements) > 10:
                print(f"  ... and {len(statements) - 10} more")
    else:
        print("No console statements found!")

if __name__ == "__main__":
    main()
