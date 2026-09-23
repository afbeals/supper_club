# Supper Club — Developer Documentation

This directory covers everything needed to understand, run, and deploy Supper Club: a
Next.js/Prisma/SQLite app for team-internal product reviews, comparisons, and discussion.

## Documents

| File | What it covers |
| --- | --- |
| [architecture.md](./architecture.md) | System shape, route groups, the RSC (Server/Client Component) rules that bit us, directory map |
| [database.md](./database.md) | Prisma schema, all models, migrations, seed data, why Prisma 6 not 7 |
| [auth.md](./auth.md) | Sessions, the access model by area, route guards, cookie security |
| [api.md](./api.md) | Every API route, its auth requirement, and its request/response shape |
| [development.md](./development.md) | Local setup, everyday commands, common pitfalls |
| [testing.md](./testing.md) | Running tests, what's covered, happy-dom/RTL gotchas found writing them |
| [deploy-digitalocean.md](./deploy-digitalocean.md) | Docker build, running on a droplet, reverse proxy, backups, troubleshooting |

## New to this repo? Start here

```bash
# 1. Install dependencies
yarn install

# 2. Create .env
cp .env.example .env

# 3. Apply DB migrations + seed sample data
yarn db:migrate
yarn db:seed

# 4. Start the dev server
yarn dev
```

Open <http://localhost:3000>. Seeded logins: `admin@supperclub.local` / `writer@supperclub.local`,
both password `changeme123` — see [database.md](./database.md#seed-data-prismaseedts).

Then read [architecture.md](./architecture.md) for the shape of the app before making changes —
in particular the Server/Client Component rules, which fail at runtime, not at typecheck or lint.

## Deploying? Start here

[deploy-digitalocean.md](./deploy-digitalocean.md) covers the whole path: preparing the droplet,
building and starting the container, wiring up a reverse proxy (nginx+certbot or Caddy — pick
whichever the droplet already runs), backups, updates, and a troubleshooting section for the
failure modes actually hit while writing that guide (permission errors on the mounted volume,
the `Secure`-cookie-over-HTTP login failure, migration errors on start).

## Stack at a glance

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.3 (App Router), one process, no separate API server |
| Language | TypeScript 5.9 (not 7 — see [development.md](./development.md)) |
| UI | React 19, Mantine 9 (`@mantine/core`, `form`, `dropzone`, `notifications`, `tiptap`) |
| Database | SQLite, file-based, via Prisma 6.19 (not 7 — see [database.md](./database.md)) |
| Auth | bcryptjs password hash + DB-backed session cookie (see [auth.md](./auth.md)) |
| Validation | zod, shared between forms and API routes |
| Images | `sharp` — validates real image bytes, strips EXIF, generates thumbnails |
| Testing | Vitest + Testing Library (`happy-dom`), Playwright |
| Deploy | Single Docker container + host-mounted volume, no separate DB server |

Not a pineapple project — plain `yarn`/`vitest`/`playwright`, no skill routing, tests written by
hand. See [development.md](./development.md) for everyday commands.
