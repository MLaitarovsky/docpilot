---
description: Walk through adding a new document type (e.g., "purchase_agreement") end-to-end across the stack
---

Help the user add a **new document type** (e.g., `purchase_agreement`, `partnership_agreement`) to DocPilot.

First, ask the user (in **one** question, with options listed) for:
1. The new doc type's snake_case enum value.
2. The display name (Title Case, e.g., "Purchase Agreement").
3. Which key fields should be extracted (3-8 fields).
4. Which clauses are particularly risk-prone for this doc type.

Once you have answers, present a step-by-step plan. **Don't make changes until the user confirms.**

## The plan must cover

### Backend
1. **Classifier prompt** — `apps/api/app/prompts/classifier.py`: add the new value to the enum and add a 1-line description so the LLM can distinguish it.

2. **Extraction prompt** — `apps/api/app/prompts/<new_type>.py`: a new file with:
   - JSON schema example
   - Confidence calibration anchors
   - The 3-8 fields the user listed
   - `<contract>...</contract>` delimiters

3. **Pydantic schema** — `apps/api/app/schemas/extraction.py`: a new model matching the prompt output.

4. **Pipeline router** — wherever the pipeline picks an extractor by `doc_type`, add a branch for the new type.

5. **Risk-analysis hints** — `apps/api/app/prompts/risk_analysis.py`: add doc-type-specific guidance for the new type if the prompt is doc-type-aware.

6. **Migration** — only if the doc_type is stored as a Postgres enum (vs varchar). Otherwise no migration needed.

### Frontend
7. **Display** — `apps/web/src/components/document-table.tsx` (`DOC_TYPE_STYLES`) and `apps/web/src/app/(dashboard)/documents/[id]/page.tsx` (`DOC_TYPE_STYLES`): add the new color/style entry.

8. **Filter** — `apps/web/src/app/(dashboard)/documents/page.tsx` (`DOC_TYPE_OPTIONS`): add the option.

9. **Extraction display** — `apps/web/src/components/extraction-card.tsx` (`FIELD_GROUPS`): add the field grouping for the new doc type, otherwise it falls back to the generic flat list.

### Cross-cutting
10. **Lawyer review** — recommend invoking the `lawyer` agent to review the new prompts before merging.

11. **Pipeline test** — recommend running the `contract-tester` agent against a sample of the new doc type once implementation is complete.

## After implementation

Once the user confirms and you've made changes:
- Run `npx tsc --noEmit` in `apps/web/`.
- Run `python -c "import ast; ast.parse(...)"` on each modified Python file.
- Suggest the user test locally before deploying.

Don't skip the `lawyer` step — new doc types are exactly when legal review matters most.
