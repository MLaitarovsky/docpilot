---
description: Verify TypeScript types in apps/web/src/types/ match Pydantic schemas in apps/api/app/schemas/
---

Audit type-shape parity between the **frontend TypeScript interfaces** and the **backend Pydantic schemas**.

## Pairs to check

| Frontend                                                 | Backend                                          |
|----------------------------------------------------------|--------------------------------------------------|
| `apps/web/src/types/auth.ts` → `User`, `Team`            | `apps/api/app/schemas/auth.py` → `UserResponse`, `TeamResponse` |
| `apps/web/src/types/document.ts` → `Document`, `DocumentDetail` | `apps/api/app/schemas/document.py` (or wherever) |
| `apps/web/src/types/extraction.ts` → `Extraction`, `Clause`, `ExtractedField` | `apps/api/app/schemas/extraction.py` |

## What to verify

For each pair:

1. **Field presence**: Every backend field exists on the frontend (and vice versa).
2. **Field name**: Exact snake_case match (FE uses snake_case to mirror BE).
3. **Field type**:
   - Pydantic `str` → TS `string`
   - Pydantic `int` / `float` → TS `number`
   - Pydantic `bool` → TS `boolean`
   - Pydantic `datetime` → TS `string` (ISO)
   - Pydantic `uuid.UUID` → TS `string`
   - Pydantic `X | None` → TS `X | null` (NOT `X | undefined`)
   - Pydantic `Literal["a", "b"]` → TS string-literal union
   - Pydantic nested model → TS nested interface
4. **Optionality**: A required Pydantic field must not be optional on the frontend.

## How to report

Produce a per-pair report:

```
### auth.User vs UserResponse

| Field         | Backend type       | Frontend type | Status |
|---------------|--------------------|---------------|--------|
| id            | uuid.UUID          | string        | ✓      |
| email         | str                | string        | ✓      |
| ...
```

Then a summary list of mismatches with file:line on both sides.

Don't modify code — report only. If mismatches exist, recommend which side to fix (usually FE follows BE).
