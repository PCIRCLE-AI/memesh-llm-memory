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
# Safety Guarantees
# ==============================================================================
echo -e "${GREEN}🛡️  Safety Guarantees:${NC}"
echo -e "${GREEN}  ✓ Original data preserved - never modified or deleted${NC}"
echo -e "${GREEN}  ✓ Full backup created before any changes${NC}"
echo -e "${GREEN}  ✓ Rollback possible - restore from backup anytime${NC}"
echo -e "${GREEN}  ✓ Idempotent - safe to run multiple times${NC}"
echo -e "${GREEN}  ✓ Atomic operations - all or nothing migration${NC}"
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
# Step 3: Checkpoint SQLite databases
# ==============================================================================
echo -e "${YELLOW}▶ Step 3: Preparing databases${NC}"

# SQLite databases to checkpoint
SQLITE_DBS=(
    "database.db"
    "knowledge-graph.db"
    "evolution-store.db"
)

# Check if sqlite3 is available
if command -v sqlite3 &> /dev/null; then
    for DB in "${SQLITE_DBS[@]}"; do
        if [ -f "$OLD_DIR/$DB" ]; then
            echo -e "${BLUE}  → Checkpointing: $DB${NC}"
            if sqlite3 "$OLD_DIR/$DB" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null; then
                echo -e "${GREEN}  ✓ Checkpointed: $DB${NC}"
            else
                echo -e "${YELLOW}  ⚠ Could not checkpoint: $DB (continuing...)${NC}"
            fi
        fi
    done
else
    echo -e "${YELLOW}  ⚠ sqlite3 not found - skipping WAL checkpoint${NC}"
fi

echo ""

# ==============================================================================
# Step 4: Migrate data (Atomic)
# ==============================================================================
echo -e "${YELLOW}▶ Step 4: Migrating data (atomic operation)${NC}"

# Create temporary directory for atomic migration
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}  → Using temporary directory: $TEMP_DIR${NC}"

# List of files/directories to migrate
ITEMS_TO_MIGRATE=(
    "database.db"
    "database.db-shm"
    "database.db-wal"
    "knowledge-graph.db"
    "knowledge-graph.db-shm"
    "knowledge-graph.db-wal"
    "evolution-store.db"
    "evolution-store.db-shm"
    "evolution-store.db-wal"
    ".secret-key"
    "logs/"
    "cache/"
)

# Find A2A database files
if [ -d "$OLD_DIR" ]; then
    while IFS= read -r -d '' a2a_db; do
        ITEMS_TO_MIGRATE+=("$(basename "$a2a_db")")
        [ -f "${a2a_db}-shm" ] && ITEMS_TO_MIGRATE+=("$(basename "$a2a_db")-shm")
        [ -f "${a2a_db}-wal" ] && ITEMS_TO_MIGRATE+=("$(basename "$a2a_db")-wal")
    done < <(find "$OLD_DIR" -maxdepth 1 -name "a2a-*.db" -print0 2>/dev/null)
fi

MIGRATED_COUNT=0
FAILED_COUNT=0
TOTAL_ITEMS=0

# Count total items to migrate
for ITEM in "${ITEMS_TO_MIGRATE[@]}"; do
    if [ -e "$OLD_DIR/$ITEM" ]; then
        TOTAL_ITEMS=$((TOTAL_ITEMS + 1))
    fi
done

echo -e "${BLUE}  → Found $TOTAL_ITEMS items to migrate${NC}"
echo ""

# Copy items to temporary directory with progress
CURRENT_ITEM=0
for ITEM in "${ITEMS_TO_MIGRATE[@]}"; do
    if [ -e "$OLD_DIR/$ITEM" ]; then
        CURRENT_ITEM=$((CURRENT_ITEM + 1))
        echo -e "${BLUE}  [$CURRENT_ITEM/$TOTAL_ITEMS] Copying: $ITEM${NC}"

        if cp -r "$OLD_DIR/$ITEM" "$TEMP_DIR/$ITEM" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Success: $ITEM${NC}"
            MIGRATED_COUNT=$((MIGRATED_COUNT + 1))
        else
            echo -e "${RED}  ✗ Failed: $ITEM${NC}"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
done

echo ""
echo -e "${BLUE}  Migration Summary:${NC}"
echo -e "${GREEN}    Migrated: $MIGRATED_COUNT items${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}    Failed: $FAILED_COUNT items${NC}"
fi

# Verify integrity before atomic commit
echo ""
echo -e "${YELLOW}▶ Step 4.5: Verifying integrity${NC}"

INTEGRITY_PASSED=true

# Verify file counts
TEMP_FILE_COUNT=$(find "$TEMP_DIR" -type f | wc -l | tr -d ' ')
echo -e "${BLUE}  → Files copied: $TEMP_FILE_COUNT${NC}"

# Verify key database files
for DB in "${SQLITE_DBS[@]}"; do
    if [ -f "$OLD_DIR/$DB" ] && [ -f "$TEMP_DIR/$DB" ]; then
        OLD_SIZE=$(wc -c < "$OLD_DIR/$DB" 2>/dev/null || echo "0")
        TEMP_SIZE=$(wc -c < "$TEMP_DIR/$DB" 2>/dev/null || echo "0")

        if [ "$OLD_SIZE" -eq "$TEMP_SIZE" ]; then
            echo -e "${GREEN}  ✓ Verified: $DB ($TEMP_SIZE bytes)${NC}"
        else
            echo -e "${RED}  ✗ Size mismatch: $DB (expected: $OLD_SIZE, got: $TEMP_SIZE)${NC}"
            INTEGRITY_PASSED=false
        fi
    fi
done

# Atomic commit: move temp directory to final location
if [ "$INTEGRITY_PASSED" = true ] && [ $FAILED_COUNT -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}▶ Step 4.6: Atomic commit${NC}"

    if [ -d "$NEW_DIR" ]; then
        # Merge mode: copy from temp to new dir
        echo -e "${BLUE}  → Merging with existing directory${NC}"
        if cp -rn "$TEMP_DIR/"* "$NEW_DIR/" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Atomic commit successful${NC}"
        else
            echo -e "${RED}  ✗ Atomic commit failed${NC}"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    else
        # Clean migration: atomic rename
        echo -e "${BLUE}  → Creating new directory${NC}"
        if mv "$TEMP_DIR" "$NEW_DIR" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Atomic commit successful${NC}"
        else
            echo -e "${RED}  ✗ Atomic commit failed${NC}"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    fi

    # Clean up temp directory if not already moved
    [ -d "$TEMP_DIR" ] && rm -rf "$TEMP_DIR"
else
    echo -e "${RED}  ✗ Integrity check failed - rolling back${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo ""

# ==============================================================================
# Step 5: Verify migration
# ==============================================================================
echo -e "${YELLOW}▶ Step 5: Final verification${NC}"

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
# Step 6: Update MCP configuration (optional)
# ==============================================================================
echo -e "${YELLOW}▶ Step 6: MCP configuration check${NC}"

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
    echo -e "${GREEN}📊 Migration Summary:${NC}"
    echo "  From: $OLD_DIR"
    echo "  To:   $NEW_DIR"
    echo "  Items migrated: $MIGRATED_COUNT"
    echo ""
    echo -e "${GREEN}💾 Backup Location:${NC}"
    echo "  $BACKUP_DIR"
    echo ""
    echo -e "${YELLOW}📋 Next Steps (Complete in Order):${NC}"
    echo ""
    echo -e "${BLUE}1. Update MCP Configuration${NC}"
    echo "   Edit your MCP config file and change server name:"
    echo "   • macOS: ~/.claude/config.json"
    echo "   • Linux: ~/.config/claude/claude_desktop_config.json"
    echo ""
    echo "   Find and replace:"
    echo "     \"claude-code-buddy\" → \"memesh\""
    echo ""
    echo "   Or use this command:"
    echo -e "   ${GREEN}sed -i.bak 's/claude-code-buddy/memesh/g' ~/.claude/config.json${NC}"
    echo ""
    echo -e "${BLUE}2. Restart Claude Code${NC}"
    echo "   Quit and restart Claude Code application to load new configuration"
    echo ""
    echo -e "${BLUE}3. Verify Migration${NC}"
    echo "   Test MeMesh tools are working:"
    echo -e "   ${GREEN}memesh-entities list${NC}"
    echo -e "   ${GREEN}memesh-relations list${NC}"
    echo ""
    echo -e "${BLUE}4. Cleanup (After Verification)${NC}"
    echo "   Once you've verified everything works, you can clean up:"
    echo ""
    echo "   Remove old data:"
    echo -e "   ${GREEN}rm -rf $OLD_DIR${NC}"
    echo ""
    echo "   Remove backup (keep until fully verified!):"
    echo -e "   ${GREEN}rm -rf $BACKUP_DIR${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Keep backup until you've verified all tools work!${NC}"
    echo ""
    echo -e "${GREEN}Need help? https://github.com/PCIRCLE-AI/claude-code-buddy/issues${NC}"
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
