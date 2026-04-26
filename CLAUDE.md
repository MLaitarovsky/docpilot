# DocPilot — Project Context

## What is this?
AI-powered contract review platform. Upload PDF contracts → classify document type → extract key fields → analyze risky clauses → compare contracts side-by-side.

## Architecture
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui (`apps/web/`)
- **Backend**: Python 3.12, FastAPI, async SQLAlchemy, Alembic (`apps/api/`)
- **AI**: OpenAI GPT-4o-mini, structured JSON output, Pydantic validation
- **Queue**: Celery + Redis for async document processing
- **Database**: PostgreSQL 16 with JSONB for flexible extraction results
- **Auth**: JWT with bcrypt, role-based access (owner/admin/member)

## Key Files
- `apps/api/app/services/extraction_pipeline.py` — 5-step document processing pipeline
- `apps/api/app/prompts/` — LLM prompt templates per document type
- `apps/api/app/tasks/process_document.py` — Celery task (uses NullPool for prefork compatibility)
- `apps/api/app/routers/` — API endpoints (auth, documents, compare, teams)
- `apps/api/app/config.py` — Pydantic Settings, env var configuration
- `apps/web/src/hooks/use-sse.ts` — EventSource hook for real-time progress
- `apps/web/src/components/` — All UI components

## Development
```bash
# Start backend services
docker compose up -d

# Run migrations
docker compose run --rm api alembic upgrade head

# Start frontend
cd apps/web && npm run dev
```

## Deployment
- **Frontend**: Vercel (root: apps/web)
- **Backend + Worker**: Railway (root: apps/api)
- **Start command (API)**: `bash start.sh` (runs migrations then uvicorn)
- **Start command (Worker)**: `celery -A app.celery_app worker --loglevel=info`

## Known Issues & Decisions
- Celery worker uses NullPool (not QueuePool) to avoid stale connections with prefork
- SSE endpoint is public (no auth) — EventSource API can't send Bearer tokens
- Upload dir reads from UPLOAD_DIR env var, created on startup via lifespan hook
- DATABASE_URL auto-normalized: postgresql:// → postgresql+asyncpg:// for async, postgresql+psycopg2:// for sync worker

## Build History
- Week 1-2: Monorepo, Docker, FastAPI, JWT auth, document upload, full AI extraction pipeline
- Week 3: Frontend — upload dropzone, SSE progress, extraction display, risk analysis UI
- Week 4: Comparison feature, team management, UX polish (filters, pagination, breadcrumbs)
- Week 5: Production Dockerfiles, GitHub Actions CI, README, landing page, deployment config
- Week 6: Smarter risk analysis — selective clause flagging, document-type-aware prompts
