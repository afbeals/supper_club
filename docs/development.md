# Development

## Setup

```bash
yarn install
cp .env.example .env        # edit if you want a non-default DATABASE_URL/UPLOAD_DIR
yarn db:migrate              # applies migrations to a fresh data/dev.db
yarn db:seed                 # seeded admin + writer + sample data (see database.md)
yarn dev                     # http://localhost:3000
```

Seeded logins: `admin@supperclub.local` / `writer@supperclub.local`, both password
`changeme123`.

## Everyday commands

```bash
yarn dev              # Next dev server
yarn typecheck        # tsc --noEmit — run before every push
yarn lint             # eslint .
yarn test             # vitest, watch mode
yarn test:ci          # vitest run — single pass, what CI runs
yarn test:e2e         # playwright test — spins up its own dev server (see testing.md)
yarn db:studio        # Prisma Studio GUI against data/dev.db
yarn db:reset         # wipe + reseed — LOCAL ONLY, never against a real deployment
```

## Package management

`yarn` only — this project has no lockfile compatibility with npm/pnpm. Never install a new
dependency without checking it's actually needed; this is a small POC and every added package is
another thing to keep patched.

## Yarn install scripts are disabled

`enableScripts: false` in `.yarnrc.yml` (supply-chain hardening). `better-sqlite3` and Prisma's own
engine both work anyway because they ship prebuilt binaries rather than needing to compile on
install. If you add a dependency that needs a native build step and doesn't ship prebuilds, it
will fail silently at import time, not at `yarn install` time — check `node_modules/<pkg>` for a
`.node` file before assuming an install succeeded.

## Common pitfalls (see `architecture.md` for the full explanation of each)

- **Never use `component={Link}` directly inside an `async function Page()`** (a Server
  Component). Use `LinkButton`/`LinkCard`/`LinkText` from `src/components/shared/`, or put the
  Mantine tree inside a dedicated `'use client'` wrapper.
- **Never destructure a compound component's static property** (`AppShell.Header`, `List.Item`,
  etc.) from a Server Component if that compound component comes from a `'use client'` module —
  it resolves to `undefined` at runtime, not at typecheck.
- **Never pass a bare Prisma model object into a client component's props.** Always `select` the
  exact fields the UI needs and give the client component a narrowed local type. See `auth.md`'s
  passwordHash section for why this matters beyond just payload size.
- **Sanitize tiptap HTML on save, not just on render** — `src/lib/sanitize.ts`'s
  `sanitizePostHtml` already does this in both `POST` and `PATCH /api/posts`; if you add another
  write path for `bodyHtml`, route it through the same function.
- **`yak`, `bazel`, and every pineapple skill do not apply here.** This is a standalone repo —
  plain `yarn`/`vitest`/`playwright` only, tests written by hand, no test-generation skill routing.

## Project layout

See `architecture.md` for the full directory map and the route-group access model.
