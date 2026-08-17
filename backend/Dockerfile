# RPFMS backend - multi-stage production Dockerfile
# Requires network access to Prisma's engine CDN (binaries.prisma.sh) during `prisma generate`
# in the build stage. If you build behind a restrictive egress proxy, allowlist that host.

# ---- deps: install all dependencies (incl. dev, needed to compile TypeScript) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- build: generate Prisma client + compile TypeScript ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime: slim image with only production deps + compiled output ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# poppler-utils provides pdftoppm (used by the OCR pipeline to rasterize PDF page 1)
RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p /app/uploads

EXPOSE 4000
CMD ["node", "dist/server.js"]
