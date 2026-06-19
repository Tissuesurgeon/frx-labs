# Deploying FRX Labs

FRX Labs is a multi-service monorepo. All app images build from a **single root `Dockerfile`** using named targets.

| Service | Build target | Best platform |
|---------|--------------|---------------|
| **API** (Rust) | `api` | [Railway](./deploy-railway.md) |
| **AI Engine** (Python) | `ai-engine` | Railway |
| **Chain Runner** (Node) | `chain-runner` | Railway (optional) |
| **Dashboard** (Next.js) | `dashboard` | [Vercel](./deploy-vercel.md) or Railway |
| **PostgreSQL** | — | Railway plugin / Render |
| **ChromaDB** | — | `chromadb/chroma` image |

## Docker — one file, one compose

**Build and run everything:**

```bash
cp .env.example .env
docker compose up -d --build
```

**Infra only** (Postgres + Chroma for local native dev):

```bash
docker compose up -d postgres chromadb
```

**On-chain chain-runner:**

```bash
docker compose --profile onchain up -d --build
```

**Build all images without starting:**

```bash
docker compose build
# or
bash scripts/docker-build.sh
```

**Build a single service:**

```bash
docker build --target api          -t frx-api .
docker build --target ai-engine    -t frx-ai .
docker build --target chain-runner -t frx-chain-runner .
docker build --target dashboard  -t frx-dashboard .
```

Dashboard build args (when building standalone):

```bash
docker build --target dashboard -t frx-dashboard \
  --build-arg NEXT_PUBLIC_API_URL=https://your-api.up.railway.app .
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
