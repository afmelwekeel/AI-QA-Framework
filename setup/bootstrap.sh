#!/usr/bin/env bash
# AI QA Framework v2 — Bootstrap (Linux/macOS)
set -euo pipefail
cd "$(dirname "$0")/.."

echo ""
echo "======================================================"
echo "   AI QA Framework v2 — Bootstrap Setup"
echo "======================================================"
echo ""

echo "==> [1/4] Installing framework dependencies (ExcelJS + Playwright)..."
npm install

echo "==> [2/4] Installing Playwright browsers..."
npx playwright install chromium

echo "==> [3/4] Installing legacy testing/ dependencies..."
( cd testing && npm install )

echo "==> [4/4] Auto-detecting host project..."
node ./core/orchestrator.mjs detect

echo ""
echo "======================================================"
echo "   ✅  Setup complete!"
echo "======================================================"
echo ""
echo "Quick start:"
echo "  npm run full          # Full QA workflow"
echo "  npm run run-tests     # Run tests (browser opens)"
echo "  node ./core/orchestrator.mjs full-workflow --story ../docs/my-story.md"
echo ""
