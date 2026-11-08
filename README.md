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

## Release and update

Run `npm run docker:release` (or `yarn docker:release`) to build, tag and push the versioned image and `latest` to Docker Hub. The [DigitalOcean runbook](docs/deploy-digitalocean.md#15-updating-the-production-application) covers Docker login, versioning, architecture, local image testing, backups, container replacement, persistent data and post-update verification.
