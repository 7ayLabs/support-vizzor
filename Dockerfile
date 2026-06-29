# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────
# Base — pnpm + node 20 (pinned image digest mirrors site-vizzor)
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ──────────────────────────────────────────────────────────────────────
# Dependencies — install only (deterministic, cacheable)
# ──────────────────────────────────────────────────────────────────────
FROM base AS deps
# Native build toolchain for better-sqlite3 only. support-vizzor has
# no wallet adapter dependencies so we don't ship eudev-dev.
RUN apk add --no-cache python3 make g++ libc-dev linux-headers
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prefer-offline

# ──────────────────────────────────────────────────────────────────────
# Build — produce Next.js standalone output
# ──────────────────────────────────────────────────────────────────────
FROM base AS build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
ENV GIT_SHA=$GIT_SHA
ENV BUILD_TIME=$BUILD_TIME

# Public env vars must be present at build time so they're inlined
ARG NEXT_PUBLIC_VIZZOR_ORIGIN=https://vizzor.ai
ENV NEXT_PUBLIC_VIZZOR_ORIGIN=$NEXT_PUBLIC_VIZZOR_ORIGIN
ARG NEXT_PUBLIC_SUPPORT_ORIGIN=https://support.vizzor.ai
ENV NEXT_PUBLIC_SUPPORT_ORIGIN=$NEXT_PUBLIC_SUPPORT_ORIGIN

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ──────────────────────────────────────────────────────────────────────
# Runner — minimal runtime image with the standalone bundle
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Pre-create the SQLite mount point with non-root ownership. The compose
# named volume mounts at /app/.support-data; if the dir doesn't exist in
# the image, Docker creates it as root:root and the nextjs user can't
# write the WAL files.
RUN mkdir -p /app/.support-data && chown -R nextjs:nodejs /app/.support-data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
