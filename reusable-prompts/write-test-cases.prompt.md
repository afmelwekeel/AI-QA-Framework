# Prompt 2 — Write the test cases for one story

Command: `/aiqa-writetestcases <story-file>` · One new session per story.
Generic: no project text. Project facts come from the **Execution Guide**, **INDEX**, **DATABASE-TABLES**.

```text
STORY FILE: {{story_file}}        # or several files of the same feature: merge them into one story folder

You are a QA analyst for {project_name}. UI language: {ui_language} ({ui_direction}).
Write test-case text in {document_output_language}. Use exact UI texts in their original language.

1. Read {output_folder}/EXECUTION-GUIDE.md, {output_folder}/INDEX.md, {output_folder}/DATABASE-TABLES.md
   and the STORY FILE (acceptance criteria, tasks, dev notes, file list, review notes).
   If the guide is missing or has "<TODO>" values, stop and tell me to run /aiqa-setup.
2. Read the requirement the story implements and its epic/parent (paths in the story, or in
   {project_knowledge}). Note requirement ids and exact quotes.
3. Read every source file in the story "File List" (controllers/handlers, views/components with inline
   JS, models, menu/route config). Take exact UI texts, element ids, routes and roles from the code.
   If there is no file list, locate the code from routes named in the story.
4. Use an existing file in {output_folder}/test-cases/ as the format template. If none exists, use
   templates/test-cases.template.md. Keep these sections: header table, "Known story/requirement ↔
   code gaps", "Deferred / not in scope", "Conventions" (exact texts), "Test data", test-case tables
   by section, "Playwright notes".
5. Cover, per screen, every applicable section:
   RBAC / access · functional (happy path) · validation (required, format, length, boundary,
   duplicate) · data (DB effect, counts, state change) · negative / error handling ·
   export / print · UI / layout / direction / responsive · security (injection, XSS, IDOR, CSRF
   token, forced browsing) · accessibility basics (labels, keyboard, focus) · regression of
   neighbouring screens. Trace each case to an AC id. Every AC has ≥1 case; say so in the header.
6. Write one file per screen to {output_folder}/test-cases/<story-folder>/<NN>-<screen>.test-cases.md.
   <story-folder> = story file name without extension. Case ids: TC-<E><S>-<SCREEN>-<NNN>
   (epic, story, 2-4 letter screen code, 3-digit number). Use only users and placeholders defined
   in the guide. Mark a case that needs a missing role with ⚠.
   Each case: id · title · preconditions · user/role · steps · expected result (exact text) ·
   priority (Critical/High/Medium/Low) · type · AC/requirement ref · Status (always "Pending").
   Header table gets a "Progress" row: "0 tested / <N> pending".
   Split files above ~60 cases into parts.
7. Verify test data with read-only queries only. Do not change data or code.
8. Record every mismatch between story/requirement and code as a gap G-<SCREEN>-<n>. Mark
   "likely defect" with severity when the code contradicts an AC. Do not hide gaps.
9. Add the new files to INDEX.md (table row: story, screen, route, file link, case count, status
   "Ready" + the file's gap table).
   Add one entry per test-case FILE (not per case) to {output_folder}/TEST-CASES-LOG.yaml (story, file path
   relative to {output_folder}, case count, status "Pending", updated date) and refresh its `totals` block. Create the log from
   templates/TEST-CASES-LOG.template.yaml if missing. Never delete entries of other stories; if the story
   already has entries (re-write), replace only that story's entries.
10. REVIEW AND FIX (mandatory, before the final report). Re-read every file you wrote, as a
    reviewer, against the "Review checklist" below. Fix each issue in the file itself, then
    re-check the fixed parts. Max 2 rounds. Fix only what you wrote; never touch app code.
11. Give me the file list, case counts and the review result: issues found / fixed / left open
    (with reason). Stop.
    Output is Markdown only. No XLSX, no generated spec files.
```

## Review checklist (step 10)

- Every AC has ≥1 case; every guide role touching the screen has an RBAC case.
- Every UI text, element id, route, role is traceable to code, story or DB. Remove or correct invented ones.
- Case ids unique, sequential, correctly formatted. No duplicate or near-duplicate cases.
- Each case has all fields, including Status = Pending; the Progress row's N equals the case count.
- Expected results are checkable (exact text, count, URL, DB value); preconditions name exact user and placeholder.
- Steps are in the right order and reproducible by someone who does not know the app.
- Data-changing cases state clean-up. Cases needing a missing role carry ⚠.
- Gaps G-… recorded for every story↔code mismatch; nothing in "Deferred" is also tested as a bug.
- INDEX.md row matches the file: path, case count, status, gaps.
- TEST-CASES-LOG.yaml has exactly one entry per test-case file (no missing, no duplicate), correct file path
  (the path resolves), correct case count, status Pending, `totals` equal to the entry count, and is valid YAML.

## Quality bar (self-check before finishing)

- Each AC → ≥1 case. Each role in the guide that touches the screen → ≥1 RBAC case.
- No invented texts, ids, routes: all from code, story or DB.
- Expected results are checkable (exact text, count, URL, DB value).
- Preconditions name the exact test user and placeholder.
- Data-changing cases state their clean-up.
