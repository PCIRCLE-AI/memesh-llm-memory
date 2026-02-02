#!/bin/bash
# One-command release script
# 一鍵發布：自動執行完整發布流程

set -e

# Check arguments
if [ -z "$1" ]; then
  echo "Usage: ./scripts/release.sh [patch|minor|major]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/release.sh patch   # 2.5.0 → 2.5.1"
  echo "  ./scripts/release.sh minor   # 2.5.0 → 2.6.0"
  echo "  ./scripts/release.sh major   # 2.5.0 → 3.0.0"
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
echo "📋 Step 1/6: Running pre-deployment checks..."
if ./scripts/pre-deployment-check.sh; then
  echo "✅ Pre-deployment checks passed"
else
  echo "❌ Pre-deployment checks failed"
  exit 1
fi
echo ""

# 2. Bump version
echo "📦 Step 2/6: Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE

NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: v$NEW_VERSION"
echo ""

# 3. Push to GitHub
echo "⬆️  Step 3/6: Pushing to GitHub..."
git push origin main --tags
echo "✅ Pushed to GitHub with tags"
echo ""

# 4. Create GitHub Release
echo "🎉 Step 4/6: Creating GitHub Release..."

# Extract changelog for this version
RELEASE_NOTES=$(mktemp)
sed -n "/^## \[$NEW_VERSION\]/,/^## \[/p" CHANGELOG.md | head -n -1 > "$RELEASE_NOTES"

if [ ! -s "$RELEASE_NOTES" ]; then
  echo "⚠️  No changelog entry found for v$NEW_VERSION"
  echo "Creating release with auto-generated notes..."
  gh release create "v$NEW_VERSION" \
    --title "v$NEW_VERSION" \
    --generate-notes
else
  gh release create "v$NEW_VERSION" \
    --title "v$NEW_VERSION" \
    --notes-file "$RELEASE_NOTES"
fi

rm -f "$RELEASE_NOTES"
echo "✅ GitHub Release created"
echo ""

# 5. Wait for GitHub Actions
echo "⏳ Step 5/6: Waiting for GitHub Actions..."
echo "Waiting 10 seconds for workflow to start..."
sleep 10

# Check if workflow started
WORKFLOW_RUN=$(gh run list --workflow="publish-npm.yml" --limit 1 --json status,conclusion | jq -r '.[0]')

if [ "$WORKFLOW_RUN" = "null" ] || [ -z "$WORKFLOW_RUN" ]; then
  echo "⚠️  Warning: Workflow may not have started yet"
  echo "Check manually: gh run list --workflow=\"publish-npm.yml\""
else
  echo "Watching workflow execution..."
  gh run watch --exit-status || {
    echo "❌ GitHub Actions workflow failed"
    echo "Check logs: gh run view"
    exit 1
  }
fi

echo "✅ GitHub Actions completed"
echo ""

# 6. Verify deployment
echo "✅ Step 6/6: Verifying deployment..."
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
echo "3. Verify functionality: claude-code-buddy --version"
