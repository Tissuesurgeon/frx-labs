# Deploy FRX Labs Frontend on Vercel

Vercel is the recommended host for the **Next.js frontend** (`frontend/`). Backend services (API, AI engine, chain runner) stay on [Railway](./deploy-railway.md).

## Prerequisites

- [Vercel account](https://vercel.com/)
- GitHub repo connected to Vercel
- **API already deployed** with a public HTTPS URL (e.g. Railway)

## 1. Import project

1. [vercel.com/new](https://vercel.com/new) → import the `frx-labs` GitHub repository
2. **Framework Preset:** Next.js
3. **Root Directory:** `frontend`

## 2. Monorepo build settings

Vercel must install workspace dependencies from the repo root. Either use the included `frontend/vercel.json` or set these in **Project Settings → General → Build & Development Settings**:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Install Command | `cd .. && pnpm install --frozen-lockfile` |
| Build Command | `cd .. && pnpm --filter @frx/dashboard build` |
| Output Directory | `.next` (default) |

The repo includes `frontend/vercel.json` with these commands preconfigured.

## 3. Environment variables

In **Project Settings → Environment Variables**, add:

```env
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_FRX_WALLET_PACKAGE_ID=0x7708398894df08d136ba54b7cc5f4e5af2eb408808148c1da5419002a67f8d49
NEXT_PUBLIC_FRX_AGENT_ADDRESS=0x8efd2e406be3538281d3a16e8f20832e6c5eb86d2e0e35b89164f77de36d49f2
```

Apply to **Production**, **Preview**, and **Development**.

> `NEXT_PUBLIC_*` variables are embedded at build time. Trigger a redeploy after changing them.

## 4. Deploy

Click **Deploy**. Vercel will:

1. Run `pnpm install` from the monorepo root
2. Build `@frx/dashboard` and workspace packages (`@frx/shared`, `@frx/shield-sdk`, `@frx/wallet-sdk`)
3. Deploy serverless/edge functions for Next.js routes

## 5. Verify

1. Open your Vercel URL (e.g. `https://frx-labs.vercel.app`)
2. Go to `/login` → connect Sui wallet → sign in
3. Confirm API calls succeed (Network tab → requests to `NEXT_PUBLIC_API_URL`)

## 6. Custom domain (optional)

**Project Settings → Domains** → add your domain and follow DNS instructions.

## Docker alternative (Railway)

If you prefer Docker for the frontend on Railway, use `Dockerfile.frontend` at repo root with `railway/frontend.json`. Vercel is simpler for Next.js.

```bash
docker build -f Dockerfile.frontend -t frx-frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://your-api.up.railway.app .
```

## Troubleshooting

### `Module not found: @frx/shared` (or shield-sdk / wallet-sdk)

- Install/build must run from **monorepo root** — check Install Command includes `cd ..`
- Ensure `pnpm-lock.yaml` is committed at repo root

### API requests fail / 404 on login

- Verify `NEXT_PUBLIC_API_URL` has no trailing slash
- Confirm Railway API is public and `/health` works

### Build timeout on pnpm install

Add to Vercel environment or Install Command:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first
```

## Recommended production split

| Component | Platform |
|-----------|----------|
| Frontend | **Vercel** (`frontend/`) |
| API + Postgres + AI + Chroma | **Railway** (`backend/`) |
| Chain Runner (optional) | **Railway** |

See [Deployment overview](./DEPLOYMENT.md).
