#!/bin/bash
# MeMesh Demo Environment Setup Script
# This script prepares everything needed for recording the demo video

set -e

echo "🎬 Setting up MeMesh Demo Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create demo project directory
echo -e "${BLUE}📁 Step 1: Creating demo project...${NC}"
DEMO_DIR="$HOME/memesh-demo-project"

if [ -d "$DEMO_DIR" ]; then
    echo -e "${YELLOW}⚠️  Demo directory already exists. Removing...${NC}"
    rm -rf "$DEMO_DIR"
fi

mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

# Step 2: Initialize a sample Node.js project
echo -e "${BLUE}📦 Step 2: Initializing sample project...${NC}"
cat > package.json << 'EOF'
{
  "name": "demo-auth-app",
  "version": "1.0.0",
  "description": "Demo app for MeMesh video",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0"
  }
}
EOF

# Step 3: Create sample authentication code
echo -e "${BLUE}💻 Step 3: Creating sample code...${NC}"
mkdir -p src/auth

cat > src/auth/jwt.ts << 'EOF'
// JWT Authentication Implementation
// Access tokens: 15 minutes
// Refresh tokens: 7 days

import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'demo-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'demo-refresh-secret';

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};
EOF

cat > src/auth/middleware.ts << 'EOF'
// Express middleware for JWT authentication
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    const user = verifyAccessToken(token);
    req.user = user;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};
EOF

cat > README.md << 'EOF'
# Demo Authentication App

This is a sample project for demonstrating MeMesh's persistent memory capabilities.

## Architecture Decisions

- **Authentication**: JWT-based stateless authentication
- **Access Tokens**: 15 minutes expiry
- **Refresh Tokens**: 7 days expiry
- **Middleware**: Express middleware for route protection

## Setup

```bash
npm install
npm start
```
EOF

# Step 4: Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
EOF

# Step 5: Initialize git
echo -e "${BLUE}🔧 Step 4: Initializing git...${NC}"
git init
git add .
git commit -m "Initial commit: JWT authentication setup"

# Step 6: Create command reference for demo
echo -e "${BLUE}📝 Step 5: Creating command reference...${NC}"
cat > DEMO_COMMANDS.txt << 'EOF'
# MeMesh Demo Commands - Copy & Paste Ready

# ============================================
# Demo Scenario 1: buddy-do (Save Memory)
# ============================================

# Command to execute:
buddy-do "explain our authentication system"

# Expected: Claude explains the JWT auth setup, MeMesh saves it


# ============================================
# Demo Scenario 2: buddy-remember (Recall)
# ============================================

# IMPORTANT: Close and restart Claude Code session first!

# Command to execute:
buddy-remember "authentication"

# Expected: MeMesh recalls JWT auth details from previous session


# ============================================
# Demo Scenario 3: Project Isolation
# ============================================

# Switch to different project
cd ~/memesh-demo-project-b

# Search for auth
buddy-remember "authentication"

# Expected: Shows different auth approach (e.g., OAuth)

EOF

echo ""
echo -e "${GREEN}✅ Demo environment ready!${NC}"
echo ""
echo "📍 Demo project location: $DEMO_DIR"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd $DEMO_DIR"
echo "  2. Open DEMO_COMMANDS.txt for copy-paste commands"
echo "  3. Start recording!"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "  - Use 16-18pt font in terminal"
echo "  - Dark theme with high contrast"
echo "  - Close all notifications"
echo "  - Test screen recording first"
echo ""
