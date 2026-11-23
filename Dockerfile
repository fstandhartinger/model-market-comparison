# Portable container image (works on Azure Container Apps, AWS, any Docker host).
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# CR-848: .next/cache (~1.1 GB webpack cache) is build-only; dropping it keeps every deploy image smaller on sandy-prod.
RUN npm run build && rm -rf .next/cache

FROM node:20-slim AS run
# eMudhra CA distrust (Oct 2026): current CA bundle, and make Node trust it instead of its bundled root list
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
# Heap: V8 default (~790 MB in a 1536M container) OOM-crashed next-server 35x on 16 Nov 2026; raise it below the limit
ENV NODE_OPTIONS="--use-openssl-ca --max-old-space-size=1152"
WORKDIR /app
ARG SOURCE_COMMIT=unknown
# Coolify injects SOURCE_COMMIT for every deployed container. Local/non-Coolify
# images retain the explicit non-identity sentinel rather than a guessed SHA.
ENV NODE_ENV=production \
    SOURCE_COMMIT=${SOURCE_COMMIT}
COPY --from=build /app ./
EXPOSE 3000
# Structured JSON logs + request ids (CR-822, logging standard AGENTS.md; logkit/README.md). No IPs or user agents.
ENV LOG_APP=benchmark-heaven LOG_IP=0 LOG_UA=0
# Seed the DB at boot when DATABASE_URL is set (skips if snapshot unchanged), then serve (same as `npm start`, with logkit).
CMD ["sh", "-c", "node scripts/seed-db.mjs || true; exec node -r ./logkit/logkit-preload.cjs node_modules/next/dist/bin/next start -p ${PORT:-3000}"]
