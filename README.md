# Zora Launcher Backend

Modernized Express backend for minting Zora coins.

## Requirements

* Node 18+
* Redis (e.g. Upstash) – used for global rate-limiting
* Environment variables (see `.env.example`)

```env
DEPLOYER_PRIVATE_KEY=0x...
ZORA_API_KEY=zora_...
REDIS_URL=rediss://...
RPC_URL=https://mainnet.base.org
PORT=3000
```

## Local development

```bash
git clone …
cd zoralauncher
npm install
npm run dev    # runs src/index.js with pino logs
```

Visit `http://localhost:3000/api/health` for a quick health check.

### Launch a token

```
curl -X POST http://localhost:3000/api/launch \
  -F "name=My Coin" \
  -F "symbol=MYC" \
  -F "recipient=0xYourAddress" \
  -F "logo=@path/to/logo.png"
```

## Project layout

```
src/
  config/          # env + redis
  middlewares/     # error handler, ...
  routes/          # express routers
  services/        # zora + wallet logic
  app.js           # express app
  index.js         # server bootstrap
```

## Docker

```
docker build -t zora-launcher .
```

Container listens on port 3000 and runs a curl-based healthcheck.

## Deployment (Railway)

`railway.json` is pre-configured. Just set the env vars in the Railway dashboard and deploy.

---

© 2025 Zora Launcher 