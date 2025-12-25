#!/bin/bash

# RAG Agent Setup Verification Script
# This script verifies that the RAG Agent is properly configured and ready to use.

set -e

echo "🔍 Verifying RAG Agent Setup..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ERRORS=0

# Function to check command exists
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is missing"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check environment variable
check_env() {
    if [ -n "${!1}" ]; then
        echo -e "${GREEN}✓${NC} $1 is set"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $1 is not set (optional but recommended)"
        return 1
    fi
}

echo "=== 1. System Requirements ==="
check_command node
check_command npm
check_command docker
check_command curl
echo ""

echo "=== 2. Node.js Version ==="
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"
if [[ "$NODE_VERSION" =~ v([0-9]+) ]]; then
    VERSION_NUM="${BASH_REMATCH[1]}"
    if [ "$VERSION_NUM" -ge 18 ]; then
        echo -e "${GREEN}✓${NC} Node.js version is >= 18"
    else
        echo -e "${RED}✗${NC} Node.js version must be >= 18"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

echo "=== 3. Project Files ==="
check_file "package.json"
check_file "tsconfig.json"
check_file ".env.example"
check_file "src/agents/rag/index.ts"
check_file "src/agents/rag/embeddings.ts"
check_file "src/agents/rag/vectorstore.ts"
check_file "src/agents/rag/reranker.ts"
check_file "src/agents/rag/types.ts"
check_file "src/agents/rag/demo.ts"
check_file "src/agents/rag/rag.test.ts"
check_file "docker-compose.rag.yml"
echo ""

echo "=== 4. Environment Variables ==="
if [ -f .env ]; then
    source .env
    echo -e "${GREEN}✓${NC} .env file exists"
    check_env OPENAI_API_KEY
    check_env OPENAI_EMBEDDING_MODEL
    check_env CHROMA_HOST
    check_env CHROMA_PORT
else
    echo -e "${YELLOW}⚠${NC} .env file not found (copy from .env.example)"
fi
echo ""

echo "=== 5. Node Dependencies ==="
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules directory exists"

    # Check for specific packages
    if [ -d "node_modules/chromadb" ]; then
        echo -e "${GREEN}✓${NC} chromadb package installed"
    else
        echo -e "${RED}✗${NC} chromadb package not installed"
        ERRORS=$((ERRORS + 1))
    fi

    if [ -d "node_modules/openai" ]; then
        echo -e "${GREEN}✓${NC} openai package installed"
    else
        echo -e "${RED}✗${NC} openai package not installed"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} node_modules directory not found (run: npm install)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

echo "=== 6. ChromaDB Status ==="
if docker ps | grep -q chromadb; then
    echo -e "${GREEN}✓${NC} ChromaDB container is running"

    # Test ChromaDB connection
    if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} ChromaDB is responding to requests"
    else
        echo -e "${YELLOW}⚠${NC} ChromaDB container is running but not responding"
    fi
else
    echo -e "${YELLOW}⚠${NC} ChromaDB container is not running"
    echo "   Start it with: docker-compose -f docker-compose.rag.yml up -d"
fi
echo ""

echo "=== 7. TypeScript Compilation ==="
if npx tsc --noEmit --project tsconfig.json 2>&1 | grep -q "error"; then
    echo -e "${RED}✗${NC} TypeScript compilation has errors"
    echo "   Run: npx tsc --noEmit to see details"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓${NC} TypeScript compilation successful"
fi
echo ""

echo "=== 8. Documentation ==="
check_file "src/agents/rag/README.md"
check_file "src/agents/rag/INTEGRATION_GUIDE.md"
check_file "src/agents/rag/IMPLEMENTATION_SUMMARY.md"
check_file "docs/RAG_DEPLOYMENT.md"
echo ""

echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "🚀 Your RAG Agent is ready to use!"
    echo ""
    echo "Next steps:"
    echo "  1. Start ChromaDB: docker-compose -f docker-compose.rag.yml up -d"
    echo "  2. Run demo: npm run rag"
    echo "  3. Run tests: npm test src/agents/rag/rag.test.ts"
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo ""
    echo "Please fix the errors above before using RAG Agent."
    echo ""
    echo "Quick fixes:"
    echo "  - Install Node.js >= 18: brew install node"
    echo "  - Install dependencies: npm install"
    echo "  - Copy .env: cp .env.example .env"
    echo "  - Start ChromaDB: docker-compose -f docker-compose.rag.yml up -d"
    echo ""
    exit 1
fi
