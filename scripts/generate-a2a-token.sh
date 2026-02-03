#!/bin/bash

##############################################################################
# A2A Token Generator Script
#
# Generates a cryptographically secure random token for A2A Protocol Phase 1.0
# and adds it to the .env file.
#
# Usage:
#   bash scripts/generate-a2a-token.sh [--force]
#
# Options:
#   --force    Force regenerate token even if it already exists
#              WARNING: This will break existing agents using the old token!
#
# Requirements:
#   - openssl OR node (for random token generation)
#   - Write permission to .env file
##############################################################################

set -e

# Parse command line arguments
FORCE_REGENERATE=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_REGENERATE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--force]"
      exit 1
      ;;
  esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   A2A Protocol Token Generator (Phase 1.0)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Generate secure random token
echo -e "${YELLOW}[1/4] Generating secure random token...${NC}"

TOKEN=""

# Try OpenSSL first (most secure)
if command -v openssl &> /dev/null; then
    TOKEN=$(openssl rand -hex 32)
    echo -e "${GREEN}✓ Generated using OpenSSL (64 hex characters)${NC}"
# Fallback to Node.js
elif command -v node &> /dev/null; then
    TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo -e "${GREEN}✓ Generated using Node.js crypto (64 hex characters)${NC}"
# Last resort: Python
elif command -v python3 &> /dev/null; then
    TOKEN=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    echo -e "${GREEN}✓ Generated using Python secrets (64 hex characters)${NC}"
else
    echo -e "${RED}✗ Error: No suitable random generator found${NC}"
    echo -e "${RED}  Install one of: openssl, node, or python3${NC}"
    exit 1
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Error: Failed to generate token${NC}"
    exit 1
fi

echo -e "${GREEN}  Token: ${TOKEN}${NC}"
echo ""

# Step 2: Create or update .env file
echo -e "${YELLOW}[2/4] Updating .env file...${NC}"

# Create .env if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${BLUE}  Creating new .env file...${NC}"
    touch "$ENV_FILE"
fi

# ✅ FIX MAJOR-16: Atomic file operations for .env updates
# Create temporary file for atomic operations
TEMP_FILE="${ENV_FILE}.tmp.$$"

# Cleanup function for temp file
cleanup_temp() {
    if [ -f "$TEMP_FILE" ]; then
        rm -f "$TEMP_FILE"
    fi
}

# Register cleanup on exit
trap cleanup_temp EXIT INT TERM

# ✅ FIX MINOR-19: Standardize grep pattern for token checking
# Check if MEMESH_A2A_TOKEN already exists with non-empty value
if grep -q "^MEMESH_A2A_TOKEN=.\+$" "$ENV_FILE"; then
    if [ "$FORCE_REGENERATE" = false ]; then
        echo -e "${GREEN}✓ MEMESH_A2A_TOKEN already exists in .env${NC}"
        echo -e "${BLUE}  Token is preserved to maintain agent connectivity.${NC}"
        echo -e "${YELLOW}  To regenerate (WARNING: breaks existing agents):${NC}"
        echo -e "${YELLOW}    bash scripts/generate-a2a-token.sh --force${NC}"
        echo ""
        echo -e "${GREEN}✓ Token setup complete (no changes needed)${NC}"
        echo ""
        exit 0
    fi

    echo -e "${YELLOW}  ⚠ MEMESH_A2A_TOKEN already exists in .env${NC}"
    echo -e "${RED}  --force flag detected: Replacing existing token...${NC}"
    echo -e "${RED}  WARNING: All existing agents will need the new token!${NC}"
fi

# Start atomic update: Copy existing .env to temp file
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$TEMP_FILE" || {
        echo -e "${RED}✗ Failed to create temporary file${NC}"
        exit 1
    }
else
    touch "$TEMP_FILE" || {
        echo -e "${RED}✗ Failed to create temporary file${NC}"
        exit 1
    }
fi

# Update or add MEMESH_A2A_TOKEN in temp file
if grep -q "^MEMESH_A2A_TOKEN=.\+$" "$TEMP_FILE"; then
    # Replace existing token
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^MEMESH_A2A_TOKEN=.*|MEMESH_A2A_TOKEN=$TOKEN|" "$TEMP_FILE"
    else
        sed -i "s|^MEMESH_A2A_TOKEN=.*|MEMESH_A2A_TOKEN=$TOKEN|" "$TEMP_FILE"
    fi
else
    # Add token section
    echo -e "${BLUE}  Adding MEMESH_A2A_TOKEN to .env...${NC}"

    # Add A2A section header if it doesn't exist
    if ! grep -q "# A2A Protocol" "$TEMP_FILE"; then
        echo "" >> "$TEMP_FILE"
        echo "# A2A Protocol Phase 1.0 Configuration" >> "$TEMP_FILE"
    fi

    # Add token
    echo "MEMESH_A2A_TOKEN=$TOKEN" >> "$TEMP_FILE"
fi

# Step 3: Add optional configuration (if not exists)
echo -e "${YELLOW}[3/4] Checking optional configuration...${NC}"

if ! grep -q "^MEMESH_A2A_TASK_TIMEOUT=" "$TEMP_FILE"; then
    echo "MEMESH_A2A_TASK_TIMEOUT=30000  # 30 seconds" >> "$TEMP_FILE"
    echo -e "${GREEN}✓ Added MEMESH_A2A_TASK_TIMEOUT (default: 30s)${NC}"
fi

if ! grep -q "^MEMESH_A2A_POLL_INTERVAL=" "$TEMP_FILE"; then
    echo "MEMESH_A2A_POLL_INTERVAL=5000  # 5 seconds" >> "$TEMP_FILE"
    echo -e "${GREEN}✓ Added MEMESH_A2A_POLL_INTERVAL (default: 5s)${NC}"
fi

# Verify temp file is not empty
if [ ! -s "$TEMP_FILE" ]; then
    echo -e "${RED}✗ Temporary file is empty - aborting update${NC}"
    exit 1
fi

# Atomic move: Replace .env with updated temp file
mv "$TEMP_FILE" "$ENV_FILE" || {
    echo -e "${RED}✗ Failed to update .env file${NC}"
    exit 1
}

echo -e "${GREEN}✓ .env file updated atomically${NC}"
echo ""

echo ""

# Step 4: Print setup instructions
echo -e "${YELLOW}[4/4] Setup complete!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
if [ "$FORCE_REGENERATE" = true ]; then
    echo -e "${RED}⚠ Token regenerated (--force mode)${NC}"
    echo -e "${YELLOW}  All agents must be updated with the new token!${NC}"
else
    echo -e "${GREEN}✓ Token generated and saved to .env${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "  1. ${BLUE}Start MeMesh MCP Server:${NC}"
echo -e "     ${GREEN}npm run mcp${NC}"
echo ""
echo -e "  2. ${BLUE}Test token authentication:${NC}"
echo -e "     ${GREEN}curl -X POST http://localhost:3000/a2a/send-message \\${NC}"
echo -e "       ${GREEN}-H 'Content-Type: application/json' \\${NC}"
echo -e "       ${GREEN}-H 'Authorization: Bearer YOUR_TOKEN_HERE' \\${NC}"
echo -e "       ${GREEN}-d '{\"agentId\":\"test\",\"task\":\"Test task\"}'${NC}"
echo -e ""
echo -e "     ${YELLOW}(Replace YOUR_TOKEN_HERE with your actual token from .env)${NC}"
echo ""
echo -e "  3. ${BLUE}Read full setup guide:${NC}"
echo -e "     ${GREEN}cat docs/A2A_SETUP_GUIDE.md${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Configuration Summary:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "  Token:          ${GREEN}********************************${NC} (64 chars, stored in .env)"
echo -e "  Timeout:        ${GREEN}30 seconds${NC}"
echo -e "  Poll Interval:  ${GREEN}5 seconds${NC}"
echo -e "  Server Port:    ${GREEN}3000${NC} (default)"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Done! Your A2A Protocol is ready to use.${NC}"
echo ""
