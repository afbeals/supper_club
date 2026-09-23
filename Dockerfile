# syntax=docker/dockerfile:1

# Debian-based (not Alpine) so Prisma's default engine binaries and better-sqlite3's
# prebuilt glibc binary work without extra binaryTargets config — matches finapp_2.0.
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl curl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN yarn build

FROM base AS runner
ENV NODE_ENV=production

# Non-root runtime user, owning only the app dir and the mounted data volume's
# mountpoint — matches the m3 pattern (finapp_2.0 stays root; this project's SQLite
# file + uploads live on a mounted volume, so a dedicated owner is worth it here).
# UID/GID pinned explicitly (10001, chosen to be outside any range a base image
# would plausibly pre-assign) rather than left to useradd's default allocation —
# node:*-bookworm-slim already ships a "node" user at uid/gid 1000, so an
# unpinned `useradd -m` here would silently land on 1001 instead, breaking the
# host-side `chown` in deploy-digitalocean.md the moment either image changes.
RUN groupadd -g 10001 supperclub \
  && useradd -m -u 10001 -g 10001 supperclub \
  && mkdir -p /app/data \
  && chown -R supperclub:supperclub /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh && chown -R supperclub:supperclub /app

USER supperclub

EXPOSE 3000

# start-period gives Next time to finish booting before failures count against it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["yarn", "start"]
