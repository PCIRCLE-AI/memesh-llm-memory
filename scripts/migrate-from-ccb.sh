#!/bin/bash

# ==============================================================================
# MeMesh Data Migration Script
# Migrates data from Claude Code Buddy (~/.claude-code-buddy) to MeMesh (~/.memesh)
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
OLD_DIR="$HOME/.claude-code-buddy"
NEW_DIR="$HOME/.memesh"
BACKUP_DIR="$HOME/.memesh-migration-backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   MeMesh Data Migration Tool${NC}"
echo -e "${BLUE}   From: Claude Code Buddy → MeMesh${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# ==============================================================================
# Step 1: Pre-flight checks
# ==============================================================================
echo -e "${YELLOW}▶ Step 1: Pre-flight checks${NC}"

# Check if old directory exists
if [ ! -d "$OLD_DIR" ]; then
    echo -e "${GREEN}  ✓ No legacy data found at $OLD_DIR${NC}"
    echo -e "${GREEN}  Nothing to migrate - you're good to go!${NC}"
    exit 0
fi

echo -e "${GREEN}  ✓ Found legacy data at: $OLD_DIR${NC}"

# Check if new directory already exists
if [ -d "$NEW_DIR" ]; then
    echo -e "${YELLOW}  ⚠ Target directory already exists: $NEW_DIR${NC}"
    echo ""
    echo "  Options:"
    echo "    1. Merge data (append to existing)"
    echo "    2. Cancel migration"
    echo ""
    read -p "  Enter your choice (1/2): " CHOICE

    case $CHOICE in
        1)
            echo -e "${YELLOW}  → Proceeding with merge...${NC}"
            ;;
        2)
            echo -e "${BLUE}  Migration cancelled.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}  Invalid choice. Exiting.${NC}"
            exit 1
            ;;
    esac
else
    echo -e "${GREEN}  ✓ Target directory does not exist${NC}"
fi

# Check disk space
OLD_SIZE=$(du -sh "$OLD_DIR" 2>/dev/null | awk '{print $1}')
echo -e "${GREEN}  ✓ Data size: $OLD_SIZE${NC}"

# Check for running MCP servers
if pgrep -f "claude-code-buddy|memesh|server-bootstrap" > /dev/null; then
    echo -e "${YELLOW}  ⚠ MCP server processes detected${NC}"
    echo ""
    read -p "  Stop all MCP servers before proceeding? (y/n): " STOP_SERVERS

    if [[ "$STOP_SERVERS" =~ ^[Yy]$ ]]; then
        pkill -f "claude-code-buddy|memesh|server-bootstrap" 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}  ✓ Stopped MCP servers${NC}"
    else
        echo -e "${YELLOW}  ⚠ Proceeding with servers running (not recommended)${NC}"
    fi
else
    echo -e "${GREEN}  ✓ No running MCP servers detected${NC}"
fi

echo ""

# ==============================================================================
# Step 2: Create backup
# ==============================================================================
echo -e "${YELLOW}▶ Step 2: Creating backup${NC}"

mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}  ✓ Created backup directory: $BACKUP_DIR${NC}"

# Copy old directory to backup
if cp -r "$OLD_DIR" "$BACKUP_DIR/claude-code-buddy-backup"; then
    echo -e "${GREEN}  ✓ Backup created successfully${NC}"
else
    echo -e "${RED}  ✗ Backup failed${NC}"
    exit 1
fi

echo ""

# ==============================================================================
# Step 3: Migrate data
# ==============================================================================
echo -e "${YELLOW}▶ Step 3: Migrating data${NC}"

if [ ! -d "$NEW_DIR" ]; then
    mkdir -p "$NEW_DIR"
    echo -e "${GREEN}  ✓ Created new directory: $NEW_DIR${NC}"
fi

# List of files/directories to migrate
ITEMS_TO_MIGRATE=(
    "database.db"
    "database.db-shm"
    "database.db-wal"
    "knowledge-graph.db"
    "knowledge-graph.db-shm"
    "knowledge-graph.db-wal"
    "evolution-store.db"
    ".secret-key"
    "logs/"
    "cache/"
)

MIGRATED_COUNT=0
FAILED_COUNT=0

for ITEM in "${ITEMS_TO_MIGRATE[@]}"; do
    if [ -e "$OLD_DIR/$ITEM" ]; then
        if cp -r "$OLD_DIR/$ITEM" "$NEW_DIR/$ITEM" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Migrated: $ITEM${NC}"
            MIGRATED_COUNT=$((MIGRATED_COUNT + 1))
        else
            echo -e "${RED}  ✗ Failed to migrate: $ITEM${NC}"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
done

echo ""
echo -e "${BLUE}  Summary:${NC}"
echo -e "${GREEN}    Migrated: $MIGRATED_COUNT items${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}    Failed: $FAILED_COUNT items${NC}"
fi

echo ""

# ==============================================================================
# Step 4: Verify migration
# ==============================================================================
echo -e "${YELLOW}▶ Step 4: Verifying migration${NC}"

VERIFICATION_PASSED=true

# Check if key files exist
KEY_FILES=(
    "database.db"
    "knowledge-graph.db"
)

for FILE in "${KEY_FILES[@]}"; do
    if [ -f "$NEW_DIR/$FILE" ]; then
        NEW_SIZE=$(wc -c < "$NEW_DIR/$FILE" 2>/dev/null || echo "0")
        OLD_SIZE=$(wc -c < "$OLD_DIR/$FILE" 2>/dev/null || echo "0")

        if [ "$NEW_SIZE" -eq "$OLD_SIZE" ]; then
            echo -e "${GREEN}  ✓ Verified: $FILE ($NEW_SIZE bytes)${NC}"
        else
            echo -e "${YELLOW}  ⚠ Size mismatch: $FILE (old: $OLD_SIZE, new: $NEW_SIZE)${NC}"
            VERIFICATION_PASSED=false
        fi
    elif [ -f "$OLD_DIR/$FILE" ]; then
        echo -e "${RED}  ✗ Missing: $FILE${NC}"
        VERIFICATION_PASSED=false
    fi
done

echo ""

# ==============================================================================
# Step 5: Update MCP configuration (optional)
# ==============================================================================
echo -e "${YELLOW}▶ Step 5: Update MCP configuration${NC}"

MCP_CONFIG_PATHS=(
    "$HOME/.claude/config.json"
    "$HOME/.config/claude/claude_desktop_config.json"
)

MCP_CONFIG_FOUND=false

for CONFIG_PATH in "${MCP_CONFIG_PATHS[@]}"; do
    if [ -f "$CONFIG_PATH" ]; then
        MCP_CONFIG_FOUND=true
        echo -e "${GREEN}  ✓ Found MCP config: $CONFIG_PATH${NC}"

        # Check if config contains old server name
        if grep -q "claude-code-buddy" "$CONFIG_PATH"; then
            echo -e "${YELLOW}  ⚠ Config still references 'claude-code-buddy'${NC}"
            echo ""
            echo "  Your MCP configuration needs to be updated."
            echo "  The server name should be changed from 'claude-code-buddy' to 'memesh'"
            echo ""
            echo "  Manual update required:"
            echo "  1. Open: $CONFIG_PATH"
            echo "  2. Find: \"claude-code-buddy\""
            echo "  3. Replace with: \"memesh\""
            echo ""
        else
            echo -e "${GREEN}  ✓ Config looks up to date${NC}"
        fi
    fi
done

if [ "$MCP_CONFIG_FOUND" = false ]; then
    echo -e "${YELLOW}  ⚠ No MCP config found${NC}"
    echo -e "${BLUE}  You may need to configure MCP manually${NC}"
fi

echo ""

# ==============================================================================
# Final summary
# ==============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Migration Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

if [ "$VERIFICATION_PASSED" = true ] && [ $FAILED_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    echo ""
    echo -e "${GREEN}Migrated data:${NC}"
    echo "  From: $OLD_DIR"
    echo "  To:   $NEW_DIR"
    echo ""
    echo -e "${GREEN}Backup location:${NC}"
    echo "  $BACKUP_DIR"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Restart Claude Code CLI"
    echo "  2. Verify MeMesh tools are working"
    echo "  3. If everything works, you can safely delete:"
    echo "     - $OLD_DIR (old data)"
    echo "     - $BACKUP_DIR (backup)"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Migration completed with warnings${NC}"
    echo ""
    echo -e "${YELLOW}Issues detected:${NC}"
    if [ $FAILED_COUNT -gt 0 ]; then
        echo "  - $FAILED_COUNT items failed to migrate"
    fi
    if [ "$VERIFICATION_PASSED" = false ]; then
        echo "  - Verification checks failed"
    fi
    echo ""
    echo -e "${YELLOW}Recommendations:${NC}"
    echo "  1. Check the error messages above"
    echo "  2. Your backup is safe at: $BACKUP_DIR"
    echo "  3. Your old data is still at: $OLD_DIR"
    echo "  4. Contact support if needed: https://github.com/PCIRCLE-AI/claude-code-buddy/issues"
    echo ""
    exit 1
fi
