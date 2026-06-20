# Deploying FRX Labs

| Component | Path / image | Platform |
|-----------|--------------|----------|
| **Frontend** (Next.js) | `frontend/` | [Vercel](./deploy-vercel.md) |
| **Backend** (API + AI + chain runner) | `Dockerfile.backend` | [Railway](./deploy-railway.md) |
| **PostgreSQL** | — | Railway plugin |
| **ChromaDB** | `chromadb/chroma` | Railway |

## Docker

**Full stack locally:**

```bash
cp .env.example .env
docker compose up -d --build
```

**Build images:**

```bash
docker build -f Dockerfile.backend -t frx-backend .
docker build -f Dockerfile.frontend -t frx-frontend .
# or
bash scripts/docker-build.sh
```

Open http://localhost:3000 (frontend) and http://localhost:8080/health (backend API).

## Architecture (production)

```
┌─────────────┐
│   Vercel    │  frontend/
└──────┬──────┘
       │ NEXT_PUBLIC_API_URL
       ▼
┌──────────┐    ┌─────────────────────────────┐
│ ChromaDB │◄───│  Railway backend (1 container)│
└──────────┘    │  • API :8080 (public)        │
                │  • AI engine :8001 (local)   │
                │  • Chain runner :8090 (local)│
                └──────────────┬──────────────┘
                               │
                          PostgreSQL
```

## Guides

- **[Vercel](./deploy-vercel.md)** — frontend
- **[Railway](./deploy-railway.md)** — backend + Postgres + Chroma
