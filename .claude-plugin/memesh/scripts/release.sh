#!/bin/bash
# Semi-automated release script
# Handles pre-checks, version bump, and commit
# Auto-release.yml workflow handles tag creation, GitHub release, and npm publish trigger

set -e

# Check arguments
if [ -z "$1" ]; then
  echo "Usage: ./scripts/release.sh [patch|minor|major]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/release.sh patch   # 2.5.0 → 2.5.1"
  echo "  ./scripts/release.sh minor   # 2.5.0 → 2.6.0"
  echo "  ./scripts/release.sh major   # 2.5.0 → 3.0.0"
  echo ""
  echo "This script will:"
  echo "  1. Run pre-deployment checks"
  echo "  2. Bump version in all locations"
  echo "  3. Commit and push to GitHub"
  echo "  4. Trigger auto-release.yml workflow (tag + release + npm publish)"
  exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "❌ Invalid version type: $VERSION_TYPE"
  echo "Must be: patch, minor, or major"
  exit 1
fi

echo "🚀 Release Process Started"
echo "================================"
echo "Version bump type: $VERSION_TYPE"
echo ""

# 1. Pre-deployment checks
echo "📋 Step 1/4: Running pre-deployment checks..."
if ./scripts/pre-deployment-check.sh; then
  echo "✅ Pre-deployment checks passed"
else
  echo "❌ Pre-deployment checks failed"
  exit 1
fi
echo ""

# 2. Bump version (all 4 locations)
echo "📦 Step 2/4: Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo "  package.json → v$NEW_VERSION"

# Sync plugin.json version
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('plugin.json', 'utf8'));
p.version = '$NEW_VERSION';
fs.writeFileSync('plugin.json', JSON.stringify(p, null, 2) + '\n');
"
echo "  plugin.json → v$NEW_VERSION"

# Run build (includes prepare:plugin which syncs .claude-plugin/ versions + dist)
npm run build > /dev/null 2>&1
echo "  .claude-plugin/memesh/ → synced via prepare:plugin"

echo "✅ All 4 version locations synced to v$NEW_VERSION"
echo ""

# 3. Commit version changes (no tag - auto-release.yml will create it)
echo "💾 Step 3/4: Committing version changes..."
git add package.json plugin.json .claude-plugin/
git commit -m "chore(release): bump version to v$NEW_VERSION"
echo "✅ Created commit for v$NEW_VERSION"
echo ""

# 4. Push to GitHub (triggers auto-release.yml)
echo "⬆️  Step 4/4: Pushing to GitHub..."
git push origin main
echo "✅ Pushed to GitHub"
echo ""

# Wait for Auto Release workflow
echo "⏳ Waiting for Auto Release workflow to start..."
echo "The workflow will automatically:"
echo "  • Create git tag v$NEW_VERSION"
echo "  • Create GitHub release with changelog"
echo "  • Trigger npm publish workflow"
echo ""
sleep 5

# Monitor Auto Release workflow
echo "📊 Monitoring Auto Release workflow..."
WORKFLOW_ID=$(gh run list --workflow="Auto Release" --limit 1 --json databaseId,status --jq '.[0] | select(.status == "in_progress" or .status == "queued") | .databaseId')

if [ -n "$WORKFLOW_ID" ]; then
  echo "Auto Release workflow started (ID: $WORKFLOW_ID)"
  echo "Watching workflow execution..."
  gh run watch $WORKFLOW_ID --exit-status || {
    echo "❌ Auto Release workflow failed"
    echo "Check logs: gh run view $WORKFLOW_ID"
    exit 1
  }
  echo "✅ Auto Release workflow completed"
else
  echo "⚠️  Workflow not detected yet. Check manually:"
  echo "  gh run list --workflow=\"Auto Release\""
  echo ""
  echo "Expected workflow actions:"
  echo "  1. Detect version change in package.json"
  echo "  2. Create tag v$NEW_VERSION"
  echo "  3. Create GitHub release"
  echo "  4. Trigger npm publish"
  exit 0
fi
echo ""

# Monitor npm publish workflow
echo "📦 Monitoring npm publish workflow..."
sleep 5
NPM_WORKFLOW_ID=$(gh run list --workflow="Publish to npm" --limit 1 --json databaseId,status --jq '.[0] | select(.status == "in_progress" or .status == "queued") | .databaseId')

if [ -n "$NPM_WORKFLOW_ID" ]; then
  echo "npm publish workflow started (ID: $NPM_WORKFLOW_ID)"
  gh run watch $NPM_WORKFLOW_ID --exit-status || {
    echo "❌ npm publish workflow failed"
    echo "Check logs: gh run view $NPM_WORKFLOW_ID"
    exit 1
  }
  echo "✅ npm publish workflow completed"
else
  echo "⚠️  npm workflow not detected. It may start shortly."
  echo "Check manually: gh run list --workflow=\"Publish to npm\""
fi
echo ""

# Verify deployment
echo "✅ Verifying deployment..."
echo "Waiting 10 seconds for npm registry to update..."
sleep 10

PUBLISHED_VERSION=$(npm view @pcircle/memesh version 2>/dev/null || echo "unknown")

if [ "$PUBLISHED_VERSION" = "$NEW_VERSION" ]; then
  echo "✅ Successfully published v$NEW_VERSION to npm"
else
  echo "⚠️  npm version mismatch:"
  echo "   Expected: v$NEW_VERSION"
  echo "   Got: $PUBLISHED_VERSION"
  echo ""
  echo "This might be a registry delay. Wait a few minutes and check:"
  echo "  npm view @pcircle/memesh version"
fi
echo ""

# Success summary
echo "================================"
echo "🎊 Release Complete!"
echo ""
echo "Version: v$NEW_VERSION"
echo "npm: https://www.npmjs.com/package/@pcircle/memesh/v/$NEW_VERSION"
echo "GitHub: https://github.com/PCIRCLE-AI/claude-code-buddy/releases/tag/v$NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Monitor GitHub Issues for any reports"
echo "2. Test installation: npm install -g @pcircle/memesh@latest"
echo "3. Verify MCP tools: memesh --version"
