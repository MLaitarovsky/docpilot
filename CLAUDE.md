# DocPilot — Claude Code Kickoff Prompt

## HOW TO USE THIS FILE
Copy and paste the prompt below into Claude Code when you're ready to start building.
You can also save this as a CLAUDE.md file in your project root — Claude Code will
automatically read it as project context every session.

---

## PROMPT (copy everything below this line)

---

I'm building a project called **DocPilot** — an AI-powered contract review and extraction platform. I'm a junior developer building this as a portfolio project to land a full-stack job. I need your help building it incrementally, starting with the foundation.

## What DocPilot Does
Users upload PDF contracts (NDAs, service agreements, employment contracts). The system:
1. Extracts text from the PDF (PyMuPDF)
2. Classifies the document type using an LLM
3. Extracts key fields (parties, dates, payment terms, etc.) using type-specific prompts
4. Flags risky clauses with plain-English explanations
5. Lets users compare two contracts side-by-side

Processing happens async via Celery workers, with real-time progress updates via SSE (Server-Sent Events).

## Architecture
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Python 3.12 + FastAPI
- **Database:** PostgreSQL (SQLAlchemy ORM + Alembic migrations)
- **Task Queue:** Celery + Redis
- **AI:** OpenAI API (GPT-4o) — will use structured JSON output + Pydantic validation
- **File Storage:** Local filesystem for dev, S3/R2 for production
- **Auth:** JWT (access + refresh tokens) with bcrypt password hashing
- **DevOps:** Docker Compose for local dev (postgres + redis + api + worker)

## Monorepo Structure
```
docpilot/
├── apps/
│   ├── web/                          ← Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                  ← App Router pages
│   │   │   │   ├── (auth)/login/page.tsx
│   │   │   │   ├── (auth)/register/page.tsx
│   │   │   │   ├── (dashboard)/layout.tsx
│   │   │   │   ├── (dashboard)/page.tsx
│   │   │   │   ├── (dashboard)/documents/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── (dashboard)/compare/page.tsx
│   │   │   │   └── (dashboard)/team/page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/               ← shadcn components
│   │   │   │   ├── upload-dropzone.tsx
│   │   │   │   ├── extraction-card.tsx
│   │   │   │   ├── clause-risk-badge.tsx
│   │   │   │   ├── confidence-indicator.tsx
│   │   │   │   ├── processing-progress.tsx
│   │   │   │   ├── contract-diff-view.tsx
│   │   │   │   └── document-table.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-sse.ts
│   │   │   │   ├── use-auth.ts
│   │   │   │   └── use-documents.ts
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── utils.ts
│   │   │   └── types/
│   │   │       ├── document.ts
│   │   │       ├── extraction.ts
│   │   │       └── api.ts
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── api/                          ← FastAPI backend
│       ├── app/
│       │   ├── main.py
│       │   ├── config.py
│       │   ├── database.py
│       │   ├── celery_app.py
│       │   ├── models/               ← SQLAlchemy ORM models
│       │   │   ├── user.py
│       │   │   ├── team.py
│       │   │   ├── document.py
│       │   │   ├── extraction.py
│       │   │   └── clause.py
│       │   ├── schemas/              ← Pydantic request/response
│       │   │   ├── auth.py
│       │   │   ├── document.py
│       │   │   └── extraction.py
│       │   ├── routers/
│       │   │   ├── auth.py
│       │   │   ├── documents.py
│       │   │   ├── extractions.py
│       │   │   ├── compare.py
│       │   │   └── jobs.py
│       │   ├── services/
│       │   │   ├── auth_service.py
│       │   │   ├── document_service.py
│       │   │   ├── extraction_pipeline.py
│       │   │   ├── compare_service.py
│       │   │   └── redis_client.py
│       │   ├── tasks/
│       │   │   └── process_document.py
│       │   ├── prompts/
│       │   │   ├── classify.py
│       │   │   ├── extract_nda.py
│       │   │   ├── extract_service_agreement.py
│       │   │   ├── extract_employment.py
│       │   │   └── analyze_clauses.py
│       │   └── utils/
│       │       ├── pdf_parser.py
│       │       ├── chunker.py
│       │       └── llm_client.py
│       ├── requirements.txt
│       ├── Dockerfile
│       └── alembic/
│
├── docker-compose.yml
├── .env.example
├── README.md
└── .github/workflows/deploy.yml
```

## Database Schema
```sql
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    team_id         UUID REFERENCES teams(id),
    role            VARCHAR(20) DEFAULT 'member',  -- 'owner', 'admin', 'member'
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID REFERENCES teams(id) NOT NULL,
    uploaded_by     UUID REFERENCES users(id) NOT NULL,
    filename        VARCHAR(500) NOT NULL,
    file_path       VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT,
    page_count      INTEGER,
    raw_text        TEXT,
    doc_type        VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'uploaded',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE extractions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
    extracted_data  JSONB NOT NULL,
    model_used      VARCHAR(100),
    processing_ms   INTEGER,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clauses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
    clause_type     VARCHAR(100) NOT NULL,
    original_text   TEXT NOT NULL,
    plain_summary   TEXT,
    risk_level      VARCHAR(10),
    risk_reason     TEXT,
    confidence      DECIMAL(3,2),
    page_number     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comparisons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID REFERENCES teams(id),
    doc_a_id        UUID REFERENCES documents(id),
    doc_b_id        UUID REFERENCES documents(id),
    diff_result     JSONB,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

## What I Need Right Now (Week 1)
Let's start with the foundation. Please help me:

1. **Initialize the monorepo** — Create the folder structure for both apps/web and apps/api
2. **Set up Docker Compose** — postgres:16 + redis:7-alpine containers for local dev
3. **Set up the FastAPI backend:**
   - Project structure with all folders from the tree above
   - SQLAlchemy async setup + database.py
   - All ORM models matching the schema above
   - Alembic for migrations
   - Config with Pydantic Settings (reading from .env)
4. **Build auth:**
   - POST /api/auth/register (creates user + team)
   - POST /api/auth/login (returns JWT access + refresh tokens)
   - POST /api/auth/refresh
   - GET /api/auth/me (protected route)
   - JWT middleware/dependency for protected routes
   - bcrypt password hashing
5. **Initialize the Next.js frontend:**
   - Next.js 14 with App Router + TypeScript + Tailwind
   - Install shadcn/ui
   - Create the (auth) route group with login and register pages
   - Build a basic api-client.ts with typed fetch wrapper + token management
   - Functional login/register that connects to the backend

Please build this step by step. After each major step, let me verify it works before moving on. Start with the monorepo structure + Docker Compose, then we'll move to the FastAPI setup.

## Important Notes
- Use async SQLAlchemy (asyncpg driver)
- Use Pydantic v2 for all schemas
- Use python-jose for JWT
- Use passlib[bcrypt] for password hashing
- For the frontend, use the App Router (not pages router)
- Make every API response follow this envelope: { "data": ..., "error": null }
- Add proper error handling from the start — don't skip it
- Write clean, well-commented code — this is a portfolio project, people will read it
