---
description: Audit clause-type and risk-level consistency between backend prompts/schemas and frontend display
---

Audit the DocPilot codebase for **clause-type and risk-level consistency** between backend and frontend.

Specifically:

1. Find every place a `clause_type` enum value is hard-coded:
   - Backend: search `apps/api/app/prompts/`, `apps/api/app/schemas/`, `apps/api/app/services/`, and any seed/test data.
   - Frontend: search `apps/web/src/` for `clause_type`, `formatClauseType`, and any color/style maps keyed by clause type.

2. Find every place a `risk_level` enum value is referenced:
   - Backend: prompt templates that set `risk_level: "high" | "medium" | "low"`.
   - Frontend: `clause-risk-badge.tsx` and any filter UIs.

3. Find every place a `risk_score` enum value is referenced:
   - Backend: prompts that set `risk_score: "red" | "amber" | "green"`.
   - Frontend: `risk-score-badge.tsx` and any filter UIs.

4. Find every `doc_type` reference:
   - Backend: prompts and the doc-type classifier.
   - Frontend: `DOC_TYPE_STYLES`, `formatDocType`, filters.

For each enum, produce a table:

```
| Enum          | Backend values                           | Frontend values                       | Mismatches |
|---------------|------------------------------------------|---------------------------------------|------------|
| clause_type   | indemnification, non_compete, ...        | indemnification, non_compete, ...     | (none)     |
| risk_level    | high, medium, low                        | high, medium, low                     | (none)     |
| ...
```

If you find mismatches:
- Flag each one with file:line on both sides.
- Recommend whether the BE or FE should change.
- Don't make changes — just report.

Use Grep extensively and Read sparingly. Cite specific files in the report.
