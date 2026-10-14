# Worktree Isolation Rule

Applies to every `/aiqa-*` command that does work: `/aiqa-create-testcases`, `/aiqa-run-tests`,
`/aiqa-fixbug`, `/aiqa-fullworkflow`. Controlled by `worktree_isolation` in `config.yaml` (default `true`).

Exempt (run in place, no worktree): `/aiqa-help`, `/aiqa-setup`, `/aiqa-chat`, `/aiqa-listskills`,
`/aiqa-listworkflows`, `/aiqa-init`, `/aiqa-reset`, `/aiqa-terse`, `/aiqa-terse-help`,
`/aiqa-tokenstats`, `/aiqa-exit`.

## Why

Work happens on a separate branch in a separate folder, so the main/master branch and its running
app are never touched. The app in the worktree runs on a different port, so both can run side by side.

## Phase A — Start (before the command's first step)

ALWAYS FRESH: every command invocation creates a brand-new branch and a brand-new worktree from the current tip of `{base_branch}`. Never reuse, resume, or continue in an existing `aiqa/*` worktree or branch, even for the same unit (same test file or bug), and even if a previous run was unfinished or its folder still exists. Re-running a command = new worktree.

1. Preconditions. Stop and tell the user if any fails:
   - `git rev-parse --is-inside-work-tree` is true.
   - Working tree is clean except `AI-QA-Framework/` and untracked files. Uncommitted source changes → ask the user to commit or stash first.
2. Record `{base_branch}` = `base_branch` from config, else the current branch (usually `main`/`master`).
   Record `{base_port}` = `app_port` from config, else the port parsed from `{app_url}`.
   Write both into `{project-root}/.aiqa-worktree-<branch-slug>.json` (see State file).
3. Branch name: `aiqa/<command>-<unit>-<yyyymmdd-hhmm>`
   (`<unit>` = test-file stem, bug ID, or story stem; lowercase, `[a-z0-9-]` only; timestamp includes seconds). If the branch name or folder already exists, append `-2`, `-3`… until both are unused. Never delete or overwrite an existing one.
4. Create the worktree as a sibling folder, outside the host repo:
   `git worktree add "{project-root}/../{repo-name}.aiqa/<branch-slug>" -b <branch> {base_branch}`
5. From now on `{work_root}` = the worktree path. Read and write ALL files there: source, `AI-QA-Framework/`,
   `TestResult/`. Nothing is written in the main checkout until Phase C.
   If `AI-QA-Framework/` or `TestResult/` is untracked/ignored in git, copy it into the worktree first
   (so config, guide, test cases, bug files exist there).
6. Port switch — only if the command needs the app running or Playwright (`/aiqa-run-tests`, `/aiqa-fixbug`,
   `/aiqa-fullworkflow`). `/aiqa-create-testcases` does not change the port.
   - `{work_port}` = `worktree_port` from config, else `{base_port} + 1`; if busy, increment until free
     (check with a TCP connect; never kill a process).
   - Change the port ONLY in the worktree copy of the files listed in `port_config_files` (config),
     for example `.env`, `launchSettings.json`, `appsettings.json`, `vite.config.*`, `package.json` scripts.
     If the list is empty, detect them (grep the old port); show the user the files and the diff, then proceed.
   - Set `{app_url}` for this run = old URL with `{work_port}`. Do NOT edit the base value in `config.yaml`
     on the base branch.
   - Start the app on `{work_port}` only if `restart_command` is set and `allow_ai_restart` is true
     (run it from `{work_root}`). Otherwise ask the user to start the worktree app on `{work_port}` and wait.
   - Health check hits `{app_url}` on `{work_port}`, never `{base_port}`.
   - Playwright MCP navigates only to `{work_port}` URLs.
   - Record `{work_port}` and the changed files in the state file.

The "no app changes while testing" rule is satisfied: the port edit is isolation setup, done before the
first case, inside the worktree, and reverted in Phase B. No other app change is allowed during execution.

## Phase B — Finish (after the command's review pass, before the final report)

1. Stop the app/processes you started on `{work_port}`.
2. Reset the port: restore every file in `changed_port_files` to the `{base_port}` value
   (`git checkout {base_branch} -- <file>` or revert the edit), and set `{app_url}` back to the base URL.
   Verify with `git diff {base_branch} -- <those files>` — empty for port lines. Report any difference.
   Result files (`TestResult/`, bug files, fixed source) stay.
3. Commit in the worktree on the sub-branch:
   - `/aiqa-fixbug`: the fix commit already follows `fix-bug.prompt.md`; commit any leftover files.
   - Others: `test(<scope>): <summary>` using the commit-message rules in `agents/qae.md`.
   - Add the trailer lines required by the host environment. Never use `--no-verify`.
4. Do NOT push, merge, or delete the branch. The user decides.

## Phase C — Hand-off to the user

Final report always ends with these lines, plain prose (auto-clarity applies; destructive steps):

```
Work is on branch <branch> in worktree <work_root>. Port reset to <base_port> (same as <base_branch>).
Please review, then run, from the main repo:
  1. git -C <work_root> push -u origin <branch>      (optional: open a PR instead)
  2. git checkout <base_branch> && git merge --no-ff <branch>
  3. git push origin <base_branch>
  4. git worktree remove <work_root> && git branch -d <branch> && git push origin --delete <branch>
Tell me "merged" and I will run steps 2–4 for you. I never merge, push or delete without your OK.
```

When the user says "commit", "push", "merge" or "merged", do exactly the step asked, confirm each
destructive step first, then `git worktree prune`. After cleanup delete that worktree's state file.
If a merge conflicts, stop and show the conflicting files; never force.

## State file

`{project-root}/.aiqa-worktree-<branch-slug>.json`, one file per worktree (`.aiqa-worktree*.json` is in `.gitignore`):

```json
{ "branch": "", "work_root": "", "base_branch": "", "base_port": 0, "work_port": 0,
  "changed_port_files": [], "command": "", "unit": "", "started": "" }
```

If other state files exist at Phase A, earlier runs are unfinished. List them in one line for the user
(branch + path, awaiting merge) and continue anyway with a fresh worktree; never touch or resume them.

## Next-step line

EVERY response of every `/aiqa-*` command ends with exactly one last line:

`(Next Step is : <next command>)`

Pick the command that logically follows, with real arguments, e.g.
- after `/aiqa-setup` → `/aiqa-create-testcases <story-file>`
- after `/aiqa-create-testcases` → `/aiqa-run-tests <first test-case file>`
- after `/aiqa-run-tests` with bugs → `/aiqa-fixbug <first bug file>`; no bugs and more files → `/aiqa-run-tests <next file>`; last file → `/aiqa-run-tests <file> --summary`
- after `/aiqa-fixbug` → `/aiqa-run-tests <the test file that found it>` to re-verify, else next bug
- while a branch awaits merge → `commit, push and merge branch <branch> to <base_branch>, then tell me "merged"`
- after `/aiqa-help` → `/aiqa-setup` (first time) or `/aiqa-create-testcases <story-file>`
Nothing may follow that line, not even a blank line or code fence.
