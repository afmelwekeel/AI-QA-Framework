# QAE Agent — Persistent Preferences
# This file is auto-updated by the Rayan agent across sessions.
# Edit manually or via /aiqa-preferences to change defaults.

## Reporting
- Language: en (English)
- Files: Markdown (test cases, results, bugs, summary)

## Test Execution
- Engine: Playwright MCP
- Browser: visible (headed) unless user says headless
- Viewport: 1920x1080
- One test-case file per session

## Quality Gates
- Minimum pass rate: 95%
- Block on critical bugs: true
- Block on high severity bugs: true

## Artifacts
- Screenshot for every Fail and key Pass
- One bug file per real defect + BUGS-INDEX.md
