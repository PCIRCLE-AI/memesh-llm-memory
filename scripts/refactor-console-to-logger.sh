#!/bin/bash
# Script to refactor console.* statements to proper logger usage
# Skips test files and provides backup functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_FILES=0
MODIFIED_FILES=0
SKIPPED_FILES=0

echo -e "${GREEN}=== Console to Logger Refactoring Script ===${NC}"
echo ""

# Function to check if file should be skipped
should_skip() {
    local file=$1

    # Skip test files
    if [[ $file == *.test.ts ]] || [[ $file == *.spec.ts ]]; then
        return 0
    fi

    # Skip if no console statements
    if ! grep -q "console\\.log\|console\\.error\|console\\.warn\|console\\.debug\|console\\.info" "$file" 2>/dev/null; then
        return 0
    fi

    return 1
}

# Function to check if file already imports logger
has_logger_import() {
    local file=$1
    grep -q "import.*logger.*from.*utils/logger" "$file" 2>/dev/null
}

# Function to add logger import
add_logger_import() {
    local file=$1

    # Find the last import statement
    local last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)

    if [ -z "$last_import_line" ]; then
        # No imports found, add at top after comments
        local first_code_line=$(grep -n "^[^/\*]" "$file" | head -1 | cut -d: -f1)
        if [ -z "$first_code_line" ]; then
            first_code_line=1
        fi
        sed -i.bak "${first_code_line}i\\
import { logger } from '../utils/logger.js';\\
" "$file"
    else
        # Add after last import
        sed -i.bak "${last_import_line}a\\
import { logger } from '../utils/logger.js';
" "$file"
    fi
}

# Function to refactor console statements in a file
refactor_file() {
    local file=$1

    echo -e "${YELLOW}Processing: $file${NC}"

    # Create backup
    cp "$file" "$file.backup"

    # Add logger import if not present
    if ! has_logger_import "$file"; then
        add_logger_import "$file"
    fi

    # Perform replacements using sed
    # Note: These are basic patterns and may need manual review

    # Replace console.error with logger.error
    sed -i.bak "s/console\.error(/logger.error(/g" "$file"

    # Replace console.warn with logger.warn
    sed -i.bak "s/console\.warn(/logger.warn(/g" "$file"

    # Replace console.log with logger.info
    sed -i.bak "s/console\.log(/logger.info(/g" "$file"

    # Replace console.debug with logger.debug
    sed -i.bak "s/console\.debug(/logger.debug(/g" "$file"

    # Replace console.info with logger.info
    sed -i.bak "s/console\.info(/logger.info(/g" "$file"

    # Clean up backup files from sed
    rm -f "$file.bak"

    echo -e "${GREEN}✓ Refactored: $file${NC}"
    ((MODIFIED_FILES++))
}

# Main processing
echo "Finding TypeScript files in src/ ..."
echo ""

# Process all TypeScript files in src/
while IFS= read -r file; do
    ((TOTAL_FILES++))

    if should_skip "$file"; then
        echo -e "  Skipping: $file (test file or no console statements)"
        ((SKIPPED_FILES++))
        continue
    fi

    refactor_file "$file"

done < <(find src -name "*.ts" -type f)

echo ""
echo -e "${GREEN}=== Refactoring Complete ===${NC}"
echo -e "Total files processed: $TOTAL_FILES"
echo -e "${GREEN}Modified: $MODIFIED_FILES${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED_FILES${NC}"
echo ""
echo -e "${YELLOW}Note: Backup files created with .backup extension${NC}"
echo -e "${YELLOW}Please review changes and run tests before committing${NC}"
