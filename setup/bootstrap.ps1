# AI QA Framework v2 — Bootstrap
# Run once per machine. Idempotent.
# Installs: Playwright, ExcelJS, and all framework dependencies.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot\..

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   AI QA Framework v2 — Bootstrap Setup" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Install framework-level dependencies (ExcelJS + Playwright) ───────
Write-Host "==> [1/4] Installing framework dependencies (ExcelJS + Playwright)..." -ForegroundColor Cyan
npm install | Out-Host

# ── Step 2: Install Playwright browsers ───────────────────────────────────────
Write-Host "==> [2/4] Installing Playwright browsers..." -ForegroundColor Cyan
npx playwright install chromium | Out-Host
# Uncomment for cross-browser:
# npx playwright install | Out-Host

# ── Step 3: Install legacy testing/ dependencies (TypeScript Playwright) ──────
Write-Host "==> [3/4] Installing legacy testing/ dependencies..." -ForegroundColor Cyan
Push-Location testing
npm install | Out-Host
Pop-Location

# ── Step 4: Auto-detect host project ──────────────────────────────────────────
Write-Host "==> [4/4] Auto-detecting host project..." -ForegroundColor Cyan
node ./core/orchestrator.mjs detect | Out-Host

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "   ✅  Setup complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Quick start commands:" -ForegroundColor Yellow
Write-Host "  npm run full            -- Run the full QA workflow" -ForegroundColor White
Write-Host "  npm run test-cases      -- Generate test cases from a story" -ForegroundColor White
Write-Host "  npm run e2e             -- Generate E2E tests (JavaScript)" -ForegroundColor White
Write-Host "  npm run run-tests       -- Execute tests (browser opens)" -ForegroundColor White
Write-Host "  npm run report          -- Generate QA report" -ForegroundColor White
Write-Host ""
Write-Host "Or use orchestrator directly:" -ForegroundColor Yellow
Write-Host "  node ./core/orchestrator.mjs full-workflow --story ../docs/my-story.md --suite my-feature" -ForegroundColor White
Write-Host "  node ./core/orchestrator.mjs help" -ForegroundColor White
Write-Host ""
Pop-Location
