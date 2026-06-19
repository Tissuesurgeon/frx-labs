# Deploy FRX Labs on Railway

Railway runs the **backend services** (API, AI engine, chain runner) and optionally the dashboard via Docker. PostgreSQL and ChromaDB are added as separate Railway services.

## Prerequisites

- [Railway account](https://railway.app/)
- GitHub repo connected to Railway
- Sui testnet package IDs in `.env.example` (already published for wallet/shield)

## 1. Create a Railway project

1. **New Project** → **Deploy from GitHub repo** → select `frx-labs`
2. You will create **multiple services** from the same repo (one per Dockerfile).

## 2. PostgreSQL

1. **Add service** → **Database** → **PostgreSQL**
2. Copy the **`DATABASE_URL`** (or `DATABASE_PRIVATE_URL` for internal networking)
3. Ensure the URL includes SSL if required: append `?sslmode=require` if missing

The API runs migrations automatically on boot.

## 3. API service

1. **Add service** → **GitHub repo** → same repository
2. **Settings** → **Build**:
   - Builder: **Dockerfile**
   - Dockerfile path: `apps/api/Dockerfile`
   - Root directory: `/` (repo root)
3. **Variables** (minimum):

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<long-random-secret>
AI_ENGINE_URL=http://${{AI-Engine.RAILWAY_PRIVATE_DOMAIN}}:8001
CHAIN_RUNNER_URL=http://${{Chain-Runner.RAILWAY_PRIVATE_DOMAIN}}:8090
SUI_MODE=mock
SUI_NETWORK=testnet
DEMO_RUNNER_ENABLED=true
RUST_LOG=info,frx_labs_api=info
```

4. **Networking** → **Generate domain** (public HTTPS URL for the API)
5. **Deploy** — verify `https://<api-domain>/health` returns `ok`

Railway sets `PORT` automatically; the API reads `PORT` or `API_PORT`.

## 4. AI Engine service

1. **Add service** → Dockerfile path: `apps/ai-engine/Dockerfile`
2. **Variables**:

```env
PORT=8001
CHROMA_HOST=${{Chroma.RAILWAY_PRIVATE_DOMAIN}}
CHROMA_PORT=8000
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
# Or for Ollama (self-hosted elsewhere):
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=https://your-ollama-host:11434
```

3. Generate a **private** domain (AI engine should not need to be public if only the API calls it)

## 5. ChromaDB service

1. **Add service** → **Empty service**
2. **Settings** → **Source** → Docker image: `chromadb/chroma:latest`
3. Set **PORT** `8000` (Railway auto-detects)
4. Name the service `Chroma` so `${{Chroma.RAILWAY_PRIVATE_DOMAIN}}` resolves in AI engine vars

Alternatively run Chroma locally during development only and use OpenAI without RAG in cloud (deterministic scoring still works).

## 6. Chain Runner (optional — on-chain demo)

1. **Add service** → Dockerfile path: `apps/chain-runner/Dockerfile`
2. **Variables**:

```env
SUI_NETWORK=testnet
FRX_WALLET_PACKAGE_ID=0x7708398894df08d136ba54b7cc5f4e5af2eb408808148c1da5419002a67f8d49
FRX_AGENT_PRIVATE_KEY=suiprivkey1...
FRX_AGENT_ADDRESS=0x...
```

3. Fund the agent wallet with testnet SUI
4. Set API `SUI_MODE=testnet` and `CHAIN_RUNNER_URL` to this service’s private URL

## 7. Dashboard on Railway (alternative to Vercel)

1. **Add service** → Dockerfile path: `apps/dashboard/Dockerfile`
2. **Build args** (Railway → Variables → build-time):

```env
NEXT_PUBLIC_API_URL=https://<your-api-railway-domain>
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID=0x7708398894df08d136ba54b7cc5f4e5af2eb408808148c1da5419002a67f8d49
NEXT_PUBLIC_FRX_AGENT_ADDRESS=0x...
```

3. Generate public domain → open dashboard

> **Tip:** `NEXT_PUBLIC_*` vars are baked in at **build time**. Redeploy after changing them.

## 8. Service wiring checklist

| From | To | Variable |
|------|-----|----------|
| Dashboard | API | `NEXT_PUBLIC_API_URL` |
| API | Postgres | `DATABASE_URL` |
| API | AI Engine | `AI_ENGINE_URL` |
| API | Chain Runner | `CHAIN_RUNNER_URL` |
| AI Engine | Chroma | `CHROMA_HOST` / `CHROMA_PORT` |

## 9. Local test with production compose

Before pushing to Railway:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api
```

## Troubleshooting

### API fails to connect to Postgres

- Use Railway **private** networking URL for `DATABASE_URL` when API and Postgres are in the same project
- Append `?sslmode=require` for external/managed URLs

### Migrations fail on boot

- Check API logs — sqlx runs migrations on startup
- Ensure Postgres user has CREATE privileges

### AI engine cannot reach Chroma

- Use `RAILWAY_PRIVATE_DOMAIN` not public URL
- Confirm Chroma service is running on port 8000

### Dashboard shows wrong API / CORS errors

- Rebuild dashboard after changing `NEXT_PUBLIC_API_URL`
- API CORS is open (`Any` origin) — issues are usually wrong API URL

### On-chain demo not submitting txs

- `SUI_MODE=testnet` on API
- Chain runner running with valid `FRX_AGENT_PRIVATE_KEY`
- Agent wallet funded with testnet SUI

## Cost tips

- Start with **mock mode** (`SUI_MODE=mock`) — no chain runner needed
- Use **OpenAI** for AI engine instead of running Ollama
- Deploy dashboard on **Vercel** (free tier) and backend on Railway

See also: [Vercel dashboard deploy](./deploy-vercel.md) · [Overview](./DEPLOYMENT.md)
