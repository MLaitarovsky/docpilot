---
description: Verify the local DocPilot stack is running and the extraction pipeline works end-to-end
---

Validate that the **DocPilot extraction pipeline** is working in the local development environment.

Steps:

1. **Stack health:**
   - Run `docker compose ps`. Confirm `postgres`, `redis`, `api`, and `worker` are all healthy.
   - If any container is down, stop and report — don't restart anything without user permission.

2. **Frontend (optional):**
   - Check if `apps/web` dev server is responding on port 3001 (`curl -s http://localhost:3001/`). Report the result; don't start it.

3. **API health:**
   - Hit `http://localhost:8001/health` (or the documented health endpoint). Confirm it returns 200.

4. **Auth smoke test:**
   - Without modifying any data, verify the login endpoint accepts credentials. (Use a test account if the user has one.)

5. **Pipeline smoke test:**
   - If a sample PDF is available in `apps/api/tests/fixtures/` (or wherever fixtures live), describe how the user can upload it and watch SSE events.
   - Do **not** automatically upload or burn OpenAI credits without explicit user confirmation.

6. **Report:**
   - Stack health table
   - Anything not green, with the recovery steps the user should run
   - Whether the user should invoke the `contract-tester` agent for a fuller end-to-end run

Don't write code. Don't restart services. Don't burn API quota without permission.
