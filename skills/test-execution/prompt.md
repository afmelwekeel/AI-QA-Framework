# Skill: Test Execution

Run Playwright in **headed** mode (real browser visible). Always:
- Capture screenshot on failure
- Capture video on failure
- Capture trace on first retry
- Emit JUnit XML + HTML report into `reports/`
- Forward console + network errors to the Playwright report
