# GitHub Repository Protection Setup
# Repository: https://github.com/afmelwekeel/AI-QA-Framework
# Owner: @afmelwekeel
# Goal: Only @afmelwekeel can push or merge changes

---

## Layer 1 — CODEOWNERS (already done)

File `.github/CODEOWNERS` is committed with:
```
* @afmelwekeel
```
This means every PR touching any file auto-requires your approval before merge.

---

## Layer 2 — Branch Protection Rules (do this in GitHub UI)

### Step-by-step

1. Go to: https://github.com/afmelwekeel/AI-QA-Framework/settings/branches
2. Click **"Add branch ruleset"** (or "Add rule" depending on your GitHub plan)
3. Branch name pattern: `main`
4. Enable these settings:

| Setting | Value | Why |
|---|---|---|
| Require a pull request before merging | ON | Nobody can push directly to main — must go through a PR |
| Required approvals | 1 | Every PR needs your approval |
| Dismiss stale pull request approvals when new commits are pushed | ON | Prevents approval-then-sneak-commit |
| Require review from Code Owners | ON | Forces CODEOWNERS file to take effect |
| Require status checks to pass before merging | ON (after CI is set up) | CI must be green before merge |
| Require branches to be up to date before merging | ON | No stale merges |
| Restrict who can push to matching branches | ON → add only: `afmelwekeel` | Only you can push |
| Allow force pushes | OFF | Prevents history rewriting |
| Allow deletions | OFF | Prevents branch deletion |
| Do not allow bypassing the above settings | ON | Even admins (you) must follow the rules |

> **Note on "Do not allow bypassing":** If you turn this ON, even you must go through a PR to merge to main.
> If you want to be able to push directly as owner, leave this OFF and add yourself to "Restrict who can push".

---

## Layer 3 — Repository Ruleset (Newer GitHub Feature)

GitHub now has **Rulesets** (more powerful than classic branch protection).

1. Go to: https://github.com/afmelwekeel/AI-QA-Framework/settings/rules
2. Click **"New ruleset"** → **"New branch ruleset"**
3. Name: `owner-only-push`
4. Enforcement: **Active**
5. Target branches: Include → `main`
6. Rules to enable:
   - **Restrict creations** — only you can create the branch
   - **Restrict updates** (push) — add Bypass: `afmelwekeel` (Repository owner role)
   - **Restrict deletions** — nobody can delete main
   - **Require pull requests** — require 1 approval
   - **Block force pushes** — ON

---

## Layer 4 — Repository Settings (General)

Go to: https://github.com/afmelwekeel/AI-QA-Framework/settings

| Setting | Value |
|---|---|
| Wikis | Disable (unless you want a wiki) |
| Issues | Keep ON (for bug reports) |
| Allow forking | Your choice — forking lets community contribute via PRs but cannot push |
| Default branch | `main` |

Go to: https://github.com/afmelwekeel/AI-QA-Framework/settings/access

- Add NO collaborators — as the sole owner, only you have push access
- If you ever add a collaborator, set their role to **Read** (not Write)

---

## Layer 5 — Using gh CLI (Optional but Recommended)

Install GitHub CLI: https://cli.github.com/

Then run these commands to configure branch protection in one shot:

```powershell
# Login
gh auth login

# Create branch protection rule via API
gh api repos/afmelwekeel/AI-QA-Framework/branches/main/protection `
  --method PUT `
  --field required_status_checks=null `
  --field enforce_admins=true `
  --field "required_pull_request_reviews[required_approving_review_count]=1" `
  --field "required_pull_request_reviews[dismiss_stale_reviews]=true" `
  --field "required_pull_request_reviews[require_code_owner_reviews]=true" `
  --field "restrictions[users][]=afmelwekeel" `
  --field "restrictions[teams][]=" `
  --field allow_force_pushes=false `
  --field allow_deletions=false
```

---

## Verification Checklist

After setup, verify protection is working:

- [ ] Try pushing directly to `main` from a different account — should be rejected
- [ ] Try deleting the `main` branch — should be blocked
- [ ] Try force-pushing — should be blocked
- [ ] Open a PR and check that CODEOWNERS auto-assigns you as reviewer
- [ ] Merge a PR without your approval — should be blocked

---

## Summary: What Each Layer Does

```
Public repo (read-only to world)
  └── No collaborators added (write-access = only owner)
       └── Branch protection on main (no direct push, must use PR)
            └── CODEOWNERS (every PR auto-requires your review)
                 └── Ruleset (explicit push restriction by username)
```

This gives you 4 independent layers of protection. Even if one is misconfigured, the others hold.
