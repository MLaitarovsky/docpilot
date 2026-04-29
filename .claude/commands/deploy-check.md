---
description: Pre-deployment checklist for DocPilot — environment variables, build readiness, DB migrations, secrets
---

Run a **pre-deployment readiness check** for DocPilot before pushing to Railway / Vercel.

Walk through each item; report status (✓ / ⚠ / ✗) per item. Do not deploy or modify anything.

## 1. Repo state
- `git status` is clean (no uncommitted changes).
- Branch is up-to-date with `origin/main`.
- No `console.log`, `print(`, `pdb.set_trace`, or `# TODO: remove` left in changed files.

## 2. Frontend build
- `apps/web/package-lock.json` is committed and matches `package.json`.
- `npx tsc --noEmit` (in `apps/web/`) passes with zero errors.
- `next build` succeeds locally if the user wants a deeper check (skip by default — slow).

## 3. Backend
- `apps/api/requirements.txt` is committed.
- `python -c "import ast; ast.parse(open('apps/api/app/main.py').read())"` passes.
- No new top-level imports of secrets / dev-only libraries.
- `alembic heads` shows a single head (no migration conflicts).

## 4. Migrations
- The latest migration in `apps/api/alembic/versions/` matches the version recorded in production-equivalent staging.
- Any new migration is reversible (has both `upgrade()` and `downgrade()` defined).

## 5. Environment variables
For Railway (API + worker):
- `OPENAI_API_KEY` set (do not print value)
- `SECRET_KEY` set
- `DATABASE_URL` set (managed by Railway)
- `REDIS_URL` set (managed by Railway)
- `CORS_ORIGINS` includes the stable Vercel URL — no trailing slash, no quotes
- `UPLOAD_DIR` set (or relying on default)

For Vercel (web):
- `NEXT_PUBLIC_API_URL` points at the stable Railway API URL — note this is baked at build time, redeploy needed after change.

(Don't fetch values, just confirm with the user that they're set.)

## 6. Secrets in code
Run a grep for accidentally-committed secrets:
- `OPENAI_API_KEY = "sk-`
- `SECRET_KEY = "`
- `password = "` followed by a literal
- `.env` not in `.gitignore`

## 7. Tests / lint (optional, ask user)
- `pytest apps/api` passes (if there's a test suite)
- `ruff check apps/api` passes
- `next lint` passes

## How to report

Output a checklist:

```
[ ✓ ] Repo state — clean, up-to-date with main
[ ⚠ ] Frontend build — tsc passes, but next build not run (skipped)
[ ✓ ] Backend syntax — main.py parses
[ ✗ ] Migrations — two heads detected (conflict)
[ ✓ ] No committed secrets
[ ? ] Railway env vars — please confirm CORS_ORIGINS and OPENAI_API_KEY are set
```

For each `⚠` or `✗`, explain what needs to happen. End with a clear go/no-go recommendation.

Do not push, deploy, run migrations, or modify env vars.
