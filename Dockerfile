# Portable container image (works on Azure Container Apps, AWS, any Docker host).
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ARG SOURCE_COMMIT=unknown
# Coolify injects SOURCE_COMMIT for every deployed container. Local/non-Coolify
# images retain the explicit non-identity sentinel rather than a guessed SHA.
ENV NODE_ENV=production \
    SOURCE_COMMIT=${SOURCE_COMMIT}
COPY --from=build /app ./
EXPOSE 3000
# Seed the DB at boot when DATABASE_URL is set (skips if snapshot unchanged), then serve.
CMD ["sh", "-c", "node scripts/seed-db.mjs || true; npm start"]
