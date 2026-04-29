---
description: Review all LLM prompt templates in apps/api/app/prompts/ for quality and schema alignment
---

Run a structured review of every prompt template under `apps/api/app/prompts/`.

For each prompt file:

1. **Identify the corresponding Pydantic schema** (likely in `apps/api/app/schemas/extraction.py` or similar). Verify every field in the schema is mentioned in the prompt with consistent naming.

2. **Check structured output discipline:**
   - No prose preamble allowed.
   - No markdown code fences around JSON.
   - Complete JSON example shown (not partial).
   - All enum-typed fields enumerate their allowed values.

3. **Check prompt injection resistance:**
   - User content (the contract text) is wrapped in delimiters like `<contract>...</contract>`.
   - Prompt explicitly states that content inside delimiters is data, not instructions.

4. **Check confidence calibration:**
   - For extraction prompts, confidence anchors are defined (>0.9 stated; 0.7-0.9 inferred; <0.7 weak).
   - Confidence is requested per field, not per document.

5. **Check doc-type specialization:**
   - The prompt is genuinely tailored to its doc type (asks about NDA-specific or lease-specific clauses).
   - Generic "extract anything" prompts are flagged.

6. **Check risk-analysis prompts specifically:**
   - Selectively flags clauses (not every clause is risky).
   - Each flag has a specific mechanism (not "this is risky").
   - `unfavorable_to` direction is required.

Produce a per-file report:

```
### apps/api/app/prompts/<file>.py

**Status**: GREEN / YELLOW / RED

**Findings:**
- [SEVERITY] line N: description — fix suggestion
- ...
```

Then a summary table at the top showing each prompt and its status.

Don't modify any files. Use the `prompt-engineer` agent if you want a deeper review of a specific file.
