# Supper Club

Team blog for product reviews — ratings, pros/cons, chapter/item breakdowns, and side-by-side
comparisons between writers. Next.js 16 + Mantine + Prisma/SQLite, deployed as a subdomain on a
DigitalOcean droplet.

See [`docs/README.md`](docs/README.md) for the full documentation index — architecture, database
schema, auth, API reference, testing, and the DigitalOcean deploy runbook.

## Local development

```bash
cp .env.example .env
yarn install
yarn db:migrate
yarn db:seed
yarn dev
```

## Scripts

| Command | Purpose |
| --- | --- |
| `yarn dev` | Start the dev server |
| `yarn build` / `yarn start` | Production build and run |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | ESLint |
| `yarn test` / `yarn test:ci` | Vitest (watch / CI mode) |
| `yarn test:e2e` | Playwright |
| `yarn db:generate` | Regenerate the Prisma client after a schema change |
| `yarn db:migrate` | Create/apply a dev migration |
| `yarn db:deploy` | Apply migrations in production (no schema drift check) |
| `yarn db:reset` | Wipe and reseed the dev database — **local only** |
| `yarn db:seed` | Seed sample data |
| `yarn db:studio` | Prisma Studio |
