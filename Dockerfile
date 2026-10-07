# syntax=docker/dockerfile:1

# Debian-based so better-sqlite3, sharp, and Prisma work with
# their normal glibc binaries without extra binaryTargets configuration.
FROM node:24-bookworm-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/*

# Make Yarn 4.18.0 available in every stage that inherits from base.
RUN corepack enable \
  && corepack prepare yarn@4.18.0 --activate


# ------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------

FROM base AS deps

COPY package.json yarn.lock .yarnrc.yml ./

RUN yarn install --immutable


# ------------------------------------------------------------
# Build
# ------------------------------------------------------------

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma config requires DATABASE_URL during the build.
# This is only a temporary build-time database.
# Production supplies the real DATABASE_URL at runtime.
ENV DATABASE_URL="file:/tmp/build.db"

RUN npx prisma generate
RUN yarn build


# ------------------------------------------------------------
# Production runtime
# ------------------------------------------------------------

FROM base AS runner

ENV NODE_ENV=production

# Dedicated non-root runtime user with a stable UID/GID.
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

RUN chmod +x ./docker/entrypoint.sh \
  && chown -R supperclub:supperclub /app

USER supperclub

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node_modules/.bin/next", "start"]