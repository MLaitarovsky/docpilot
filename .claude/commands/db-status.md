---
description: Inspect the local Postgres state — migration version, table row counts, recent documents, stuck jobs
---

Inspect the **local DocPilot Postgres database** for diagnostic info.

Steps (run in order):

1. **Migration version:**
   `docker compose exec -T postgres psql -U postgres -d docpilot -c "SELECT version_num FROM alembic_version;"`
   Compare against the latest file in `apps/api/alembic/versions/`. Report whether the DB is up-to-date.

2. **Table row counts:**
   ```sql
   SELECT 'users' AS t, COUNT(*) FROM users
   UNION ALL SELECT 'teams', COUNT(*) FROM teams
   UNION ALL SELECT 'documents', COUNT(*) FROM documents
   UNION ALL SELECT 'extractions', COUNT(*) FROM extractions
   UNION ALL SELECT 'clauses', COUNT(*) FROM clauses;
   ```

3. **Document status breakdown:**
   ```sql
   SELECT status, COUNT(*) FROM documents GROUP BY status ORDER BY status;
   ```

4. **Stuck-in-processing detection:**
   ```sql
   SELECT id, filename, status, created_at, updated_at
   FROM documents
   WHERE status IN ('uploaded', 'processing')
     AND updated_at < NOW() - INTERVAL '10 minutes'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
   Any rows here are likely zombie jobs (worker died, restart needed).

5. **Recent failures:**
   ```sql
   SELECT id, filename, updated_at
   FROM documents
   WHERE status = 'failed'
   ORDER BY updated_at DESC
   LIMIT 5;
   ```

## How to report

Format as a clean dashboard:

```
=== DB Status ===
Migration:        7e7aabf0b65f (latest)
Up-to-date:       ✓

Row counts:
  users:        12
  teams:        4
  documents:    87
  extractions:  84
  clauses:      312

Status breakdown:
  completed: 80
  failed:    2
  processing: 1  ← stuck >10min: 0
  uploaded:  4   ← stuck >10min: 4  ⚠

Recent failures:
  abc-123  service.pdf  2026-04-29 11:02
  ...
```

Highlight anomalies (stuck jobs, failed runs, pending migrations) with `⚠`.

Do not modify data. Do not run migrations. Just report.

If `docker compose exec` fails, check that postgres is running first via `docker compose ps`.
