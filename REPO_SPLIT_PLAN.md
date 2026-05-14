# Property360 monorepo → three repos: split plan

**Status:** Plan only — do not execute without explicit go-ahead.
**Drafted:** 2026-05-10

## Target topology

| Folder         | Target GitHub repo                          | Notes                                                                 |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `backend/`     | `apcexchange/property360.git`               | Render auto-deploy already points here.                              |
| `mobile/`      | `apcexchange/property360-mobile.git`        | Already a git submodule (mode 160000) but `.gitmodules` is missing.   |
| `web/`         | `apcexchange/property360-web.git`           | Currently the (wrong) `origin` of the entire monorepo.                |

After the split, `~/Desktop/project/dev/property360/` will become **three independent working trees**, not a monorepo. There is no umbrella repo unless we deliberately create one with the three as submodules.

## Current state (as observed on 2026-05-10)

- Top-level repo `~/Desktop/project/dev/property360/`:
  - `origin = git@github.com:apcexchange/property360-web.git` ← misconfigured
  - Tracks `backend/`, `web/`, top-level files (`render.yaml`, `CLAUDE.md`, `PROPERTY360_POC.md`, etc.) as plain folders/files
  - Tracks `mobile/` as a submodule gitlink (commit pointer only)
- `mobile/` is its own git repo on disk; remote needs verifying from inside the folder
- No `.gitmodules` file
- Years of commits — backend, web, top-level, mobile-bumps — all sit in `property360-web.git` history. Examples from `git log`:
  - `b34d274 feat(backend): finance reports, clickwrap agreements, building community`
  - `64e66df feat: production deploy infra + email migration to Resend`
  - `003f666 chore: bump mobile submodule for editorial UI refresh`

## Step-by-step plan

### Phase 0 — Pre-flight (read-only, do first)

1. **Confirm what each target GitHub repo currently contains.** Run `gh repo view apcexchange/property360`, `apcexchange/property360-mobile`, `apcexchange/property360-web` and check:
   - Default branch
   - Whether the repo is empty or already has any commits / open PRs / issues / Actions
   - Branch protection rules
2. **Confirm the `mobile/` submodule's remote.** From inside `mobile/`, run `git remote -v`. It should already point at `apcexchange/property360-mobile.git`. If yes, that piece is correct already.
3. **Snapshot Render config.** Take a screenshot of the Render dashboard for `property360-api` confirming:
   - Connected repo
   - Connected branch
   - Auto-deploy on/off
   - Any environment variables you'd need to recreate
4. **Snapshot GitHub Actions workflows** (`.github/workflows/`). The mobile release workflows (`mobile-ios.yml`, `mobile-android.yml`) reference paths and triggers that may need re-pointing after the split.
5. **Pause CI/CD.** Disable Render auto-deploy and disable GitHub Actions until the split is complete to avoid half-state deploys.
6. **Tag the current monorepo state** for rollback: `git tag pre-split-2026-05-10 && git push origin pre-split-2026-05-10`.

### Phase 1 — Split history with `git filter-repo`

Use [git-filter-repo](https://github.com/newren/git-filter-repo) (NOT the deprecated `git filter-branch`). Install via `brew install git-filter-repo`.

**For backend:**
```bash
# In a fresh scratch directory
git clone --no-local ~/Desktop/project/dev/property360 ./property360-backend-extract
cd ./property360-backend-extract
git remote remove origin

# Keep only backend/ history; rewrite paths to drop the prefix
git filter-repo --path backend/ --path-rename backend/:

# Also keep top-level files that genuinely belong with the backend deploy
# (render.yaml, CLAUDE.md if it'll move with it, etc. — decide per file)
# Re-run filter-repo with --paths-from-file if you want to preserve specific top-level files.

# Verify
git log --oneline | head -20
ls
```

**For web:** identical pattern with `--path web/ --path-rename web/:`.

**For mobile:** the submodule already has its own history in `apcexchange/property360-mobile.git`. Do NOT filter-repo on the parent — the parent only stores submodule pointer commits, not the mobile source. Just confirm the mobile remote is correct.

### Phase 2 — Push extracted histories

For each extracted repo:
```bash
git remote add origin git@github.com:apcexchange/property360.git   # or -mobile / -web
git push -u origin main
```

**If the target repo is non-empty,** decide whether to:
- (a) Force-push the extracted history over it (destructive — only if the existing repo content is throwaway), OR
- (b) Merge the extracted history into the existing repo with `--allow-unrelated-histories` and reconcile conflicts manually.

This is the highest-risk decision in the whole split. Get explicit approval before force-pushing anything.

### Phase 3 — Reconfigure tooling

1. **Render** — point the `property360-api` service at the new `property360.git`. The `render.yaml` blueprint can be re-applied. Update `rootDir:` from `backend` to `.` (since backend is now the repo root).
2. **GitHub Actions mobile workflows** — these live at `.github/workflows/mobile-*.yml` in the current monorepo. Decide their new home:
   - If they go with `mobile/` → move into `property360-mobile.git/.github/workflows/` and update paths (no more `working-directory: mobile`).
   - If they stay coordinating from a parent → they need a new umbrella repo or remain in one of the three.
3. **GitHub secrets** (`ANDROID_KEYSTORE_BASE64`, `PLAY_STORE_JSON_KEY`, `ASC_API_KEY`, etc.) need to be **recreated in the new repo's secret store** — secrets do NOT transfer.
4. **Self-hosted Mac runner** — re-register the `mobile-ci` label runner with the new mobile repo (or org-level if you make it organization-scoped). Check `mobile/RELEASE.md` for the registration commands.
5. **CLAUDE.md** — currently lives at the monorepo root and documents all three packages. After split, either:
   - Duplicate a slimmed CLAUDE.md into each repo, OR
   - Consolidate into one repo (probably backend) and link from the others.
6. **DEPLOY.md, RELEASE.md** — same call as CLAUDE.md.

### Phase 4 — Re-clone locally

After the remote split is verified:
```bash
mv ~/Desktop/project/dev/property360 ~/Desktop/project/dev/property360.bak
mkdir -p ~/Desktop/project/dev/property360
cd ~/Desktop/project/dev/property360
git clone git@github.com:apcexchange/property360.git backend
git clone git@github.com:apcexchange/property360-mobile.git mobile
git clone git@github.com:apcexchange/property360-web.git web
```

Keep `property360.bak/` until you've verified at least one full round-trip per repo (push, deploy, test). Then archive or delete it.

### Phase 5 — Re-enable CI/CD and verify

1. Re-enable Render auto-deploy → push a no-op commit to `property360.git/main` → confirm deploy.
2. Re-enable GitHub Actions in the mobile repo → trigger a `workflow_dispatch` on the staging lane → confirm a build.
3. Tag each new repo as `post-split-2026-05-10` so the cut-over point is preserved.

## Risks and mitigations

| Risk                                                       | Mitigation                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Force-push erases existing content in a target repo        | Phase 0 step 1 + explicit approval before any force-push           |
| Render deploys mid-split with broken state                 | Phase 0 step 5 — pause auto-deploy first                           |
| GitHub Actions mobile workflows fire on the wrong branch   | Phase 0 step 5 — disable workflows; only re-enable in Phase 5      |
| Lost work in `mobile/` if the submodule is mishandled      | Phase 0 step 2 — verify the submodule's own remote before touching |
| Lost local uncommitted changes in `backend/src/`           | `git stash` everything in working tree before Phase 4              |
| Loss of cross-cutting commit history (multi-folder PRs)    | `pre-split-2026-05-10` tag in the monorepo preserves it for audit  |
| Render env-var loss on reconnect                           | Phase 0 step 3 snapshot; re-add in dashboard before re-enabling    |

## What this plan does NOT cover

- Migrating issues, PRs, or wiki pages between repos (manual or via `gh`).
- Branch protection rule recreation (manual in each repo's settings).
- Any internal links in docs/code that hard-code `apcexchange/property360-web` URLs.
- Whether to keep the three repos publicly visible vs private (decide before push).

## Estimated effort

- Phase 0: 30 min
- Phase 1–2: 1–2 hours per repo, mostly verification
- Phase 3: 1–2 hours (Render + secrets + runner + docs)
- Phase 4–5: 30 min if smooth, half a day if a deploy or build breaks

**Realistic total: a focused half-day to full day. Not safe to interleave with active feature work or a Play Store submission window.**
