# Portable container image (works on Azure Container Apps, AWS, any Docker host).
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
# Seed the DB at boot when DATABASE_URL is set (skips if snapshot unchanged), then serve.
CMD ["sh", "-c", "node scripts/seed-db.mjs || true; npm start"]
