# Deploy FRX Labs on Railway

Railway hosts the **unified backend** (API + AI engine + optional chain runner), **PostgreSQL**, and **ChromaDB**. Deploy the **frontend** on [Vercel](./deploy-vercel.md).

## Prerequisites

- [Railway account](https://railway.app/)
- GitHub repo connected to Railway

## 1. Backend service (single container)

One Docker image runs all backend processes:

| Process | Internal port | Notes |
|---------|---------------|-------|
| Rust API | `PORT` (8080) | Public — Railway health check |
| AI engine | 8001 | localhost only |
| Chain runner | 8090 | localhost only, optional |

1. **Add service** → **GitHub repo** → `frx-labs`
2. **Settings → Config file path:** `/railway/backend.json`
3. **Settings → Build:**
   - Builder: **Dockerfile**
   - Variable: `RAILWAY_DOCKERFILE_PATH=Dockerfile.backend`
   - Root directory: `/`
4. **Settings → Deploy:** clear **Start Command** and **Pre-deploy Command**
5. **Variables:**

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<long-random-secret>
SUI_MODE=mock
SUI_NETWORK=testnet
DEMO_RUNNER_ENABLED=true
RUST_LOG=info,frx_labs_api=info
CHROMA_HOST=${{Chroma.RAILWAY_PRIVATE_DOMAIN}}
CHROMA_PORT=8000
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

For on-chain mode, add:

```env
SUI_MODE=testnet
CHAIN_RUNNER_ENABLED=true
FRX_WALLET_PACKAGE_ID=0x7708398894df08d136ba54b7cc5f4e5af2eb408808148c1da5419002a67f8d49
FRX_AGENT_PRIVATE_KEY=suiprivkey1...
FRX_AGENT_ADDRESS=0x...
```

6. **Networking** → **Generate domain** → verify `https://<domain>/health`

> `AI_ENGINE_URL` and `CHAIN_RUNNER_URL` default to `http://127.0.0.1:8001` and `:8090` inside the container — do not override unless you split services again.

## 2. PostgreSQL

1. **Add service** → **Database** → **PostgreSQL**
2. Reference in backend: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

## 3. ChromaDB

1. **Add service** → Docker image: `chromadb/chroma:latest`
2. Name it `Chroma` for `${{Chroma.RAILWAY_PRIVATE_DOMAIN}}`
3. Set `CHROMA_HOST` / `CHROMA_PORT=8000` on the backend service

## 4. Frontend (Vercel)

Deploy `frontend/` on Vercel — see [deploy-vercel.md](./deploy-vercel.md).

Set `NEXT_PUBLIC_API_URL` to the Railway backend public URL.

## 5. Service wiring

| From | To | Variable |
|------|-----|----------|
| Frontend (Vercel) | Backend | `NEXT_PUBLIC_API_URL` |
| Backend | Postgres | `DATABASE_URL` |
| Backend | Chroma | `CHROMA_HOST` / `CHROMA_PORT` |

## Troubleshooting

### Pre-deploy command failed

Clear **Start Command** and **Pre-deploy Command** in Railway deploy settings. Root `railway.json` sets both to `null`.

### Backend starts but AI calls fail

- Confirm `CHROMA_HOST` points to the Chroma service private domain
- Check backend logs — AI engine starts before the API

### On-chain demo not submitting txs

- Set `CHAIN_RUNNER_ENABLED=true` and `FRX_AGENT_PRIVATE_KEY`
- Fund agent wallet with testnet SUI

See also: [Vercel](./deploy-vercel.md) · [Overview](./DEPLOYMENT.md)
