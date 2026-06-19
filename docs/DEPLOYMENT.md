# Deploying FRX Labs

FRX Labs is a multi-service monorepo. Recommended split:

| Service | Best platform | Dockerfile |
|---------|---------------|------------|
| **Dashboard** (Next.js) | [Vercel](./deploy-vercel.md) or Railway | `apps/dashboard/Dockerfile` |
| **API** (Rust) | [Railway](./deploy-railway.md) | `apps/api/Dockerfile` |
| **AI Engine** (Python) | Railway | `apps/ai-engine/Dockerfile` |
| **Chain Runner** (Node, optional) | Railway | `apps/chain-runner/Dockerfile` |
| **PostgreSQL** | Railway plugin / Render | — |
| **ChromaDB** | Railway (Docker image) | `chromadb/chroma` |

## Quick local Docker stack

```bash
cp .env.example .env
# Set JWT_SECRET and (optional) OPENAI_API_KEY for production AI

docker compose -f docker-compose.prod.yml up -d --build
# On-chain mode: add --profile onchain
```

Open http://localhost:3000 (dashboard) and http://localhost:8080/health (API).

## Architecture (production)

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  Dashboard  │
                    └──────┬──────┘
                           │ NEXT_PUBLIC_API_URL
                           ▼
┌──────────┐    ┌──────────────────┐    ┌─────────────┐
│ ChromaDB │◄───│   Railway API    │───►│ Chain Runner│ (optional)
└──────────┘    └────────┬─────────┘    └─────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         PostgreSQL  AI Engine   Sui RPC
```

## Environment variables

Copy `.env.example` to `.env`. Critical production values:

| Variable | Service | Notes |
|----------|---------|-------|
| `JWT_SECRET` | API | Long random string |
| `DATABASE_URL` | API | Postgres with `?sslmode=require` on managed hosts |
| `AI_ENGINE_URL` | API | Internal Railway URL to AI service |
| `CHAIN_RUNNER_URL` | API | Internal URL if using on-chain mode |
| `NEXT_PUBLIC_API_URL` | Dashboard | Public HTTPS URL of the API |
| `OPENAI_API_KEY` | AI Engine | Recommended for cloud (no Ollama) |
| `FRX_AGENT_PRIVATE_KEY` | Chain Runner | For testnet on-chain demo |

## Guides

- **[Railway](./deploy-railway.md)** — API, AI engine, chain runner, dashboard, Postgres, ChromaDB
- **[Vercel](./deploy-vercel.md)** — Next.js dashboard + connecting to a hosted API

## Health checks

| Service | Path |
|---------|------|
| API | `GET /health` |
| AI Engine | `GET /health` |
| Chain Runner | `GET /health` |
| Dashboard | `GET /` |

## Build images manually

```bash
docker build -f apps/api/Dockerfile -t frx-api .
docker build -f apps/ai-engine/Dockerfile -t frx-ai .
docker build -f apps/chain-runner/Dockerfile -t frx-chain-runner .
docker build -f apps/dashboard/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://your-api.up.railway.app \
  -t frx-dashboard .
```
