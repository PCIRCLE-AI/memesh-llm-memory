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

# Check if MEMESH_A2A_TOKEN already exists
if grep -q "^MEMESH_A2A_TOKEN=" "$ENV_FILE"; then
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

    # Replace existing token (works on both macOS and Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^MEMESH_A2A_TOKEN=.*|MEMESH_A2A_TOKEN=$TOKEN|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^MEMESH_A2A_TOKEN=.*|MEMESH_A2A_TOKEN=$TOKEN|" "$ENV_FILE"
    fi
else
    echo -e "${BLUE}  Adding MEMESH_A2A_TOKEN to .env...${NC}"

    # Add A2A section if it doesn't exist
    if ! grep -q "# A2A Protocol" "$ENV_FILE"; then
        echo "" >> "$ENV_FILE"
        echo "# A2A Protocol Phase 1.0 Configuration" >> "$ENV_FILE"
    fi

    # Add token
    echo "MEMESH_A2A_TOKEN=$TOKEN" >> "$ENV_FILE"
fi

echo -e "${GREEN}✓ .env file updated${NC}"
echo ""

# Step 3: Add optional configuration (if not exists)
echo -e "${YELLOW}[3/4] Checking optional configuration...${NC}"

if ! grep -q "^MEMESH_A2A_TASK_TIMEOUT=" "$ENV_FILE"; then
    echo "MEMESH_A2A_TASK_TIMEOUT=30000  # 30 seconds" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Added MEMESH_A2A_TASK_TIMEOUT (default: 30s)${NC}"
fi

if ! grep -q "^MEMESH_A2A_POLL_INTERVAL=" "$ENV_FILE"; then
    echo "MEMESH_A2A_POLL_INTERVAL=5000  # 5 seconds" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Added MEMESH_A2A_POLL_INTERVAL (default: 5s)${NC}"
fi

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
echo -e "       ${GREEN}-H 'Authorization: Bearer $TOKEN' \\${NC}"
echo -e "       ${GREEN}-d '{\"agentId\":\"test\",\"task\":\"Test task\"}'${NC}"
echo ""
echo -e "  3. ${BLUE}Read full setup guide:${NC}"
echo -e "     ${GREEN}cat docs/A2A_SETUP_GUIDE.md${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Configuration Summary:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "  Token:          ${GREEN}${TOKEN:0:16}...${NC} (64 chars)"
echo -e "  Timeout:        ${GREEN}30 seconds${NC}"
echo -e "  Poll Interval:  ${GREEN}5 seconds${NC}"
echo -e "  Server Port:    ${GREEN}3000${NC} (default)"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Done! Your A2A Protocol is ready to use.${NC}"
echo ""
