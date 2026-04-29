---
description: Run the lawyer agent on uncommitted changes to review legal correctness
---

Run a **legal-correctness review** on the uncommitted changes in this branch.

Steps:

1. Run `git status` and `git diff` to see what changed.

2. Identify any change that touches:
   - `apps/api/app/prompts/` — prompt templates
   - `apps/api/app/schemas/extraction.py` — clause / extraction schemas
   - Anything that defines `clause_type`, `risk_level`, `risk_score`, or `doc_type` enums
   - Anything that defines suggested-alternative language

3. If no legal-relevant files changed, report "no legal review needed" and stop.

4. Otherwise, **launch the `lawyer` agent** with the diff context. Pass it the specific files and ask for a structured review covering:
   - Clause classifications
   - Risk-level appropriateness
   - Suggested-alternative enforceability
   - Missing-clause coverage

5. Relay the lawyer's findings verbatim, grouped by severity.

Do not modify any code. The user will decide what to act on.

If the user asked you to also review prompts engineering-wise, suggest they additionally run `/check-prompts` or invoke the `prompt-engineer` agent.
