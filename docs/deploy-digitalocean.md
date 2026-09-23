# Deploying to a DigitalOcean droplet

This app is one Docker container plus a host-mounted data volume (SQLite file + uploaded images).
There's no database server, load balancer, or CDN to provision — a single small droplet is enough
for a team-internal tool.

**Open item, decided at actual deploy time:** which reverse proxy is already on the droplet, and
which subdomain to use. This doc covers both options below — pick whichever matches what's
already running there; don't install a second reverse proxy alongside an existing one.

## 1. Prerequisites on the droplet

- Docker + Docker Compose plugin installed (`docker compose version` should work)
- A DNS A/AAAA record for the chosen subdomain pointing at the droplet's IP
- Ports 80 and 443 reachable (the app itself only needs to be reachable on 3000 from the reverse
  proxy, not from the internet directly)

## 2. Prepare the host

```bash
sudo mkdir -p /var/lib/supper-club/data
sudo chown -R 10001:10001 /var/lib/supper-club/data   # matches the `supperclub` uid/gid pinned in the Dockerfile
```

Clone the repo (or pull a release tarball) to wherever you keep app code on this droplet, e.g.
`/opt/supper-club`.

## 3. Configure environment

```bash
cd /opt/supper-club
cp .env.example .env
```

Edit `.env` (or export these as real environment variables for `docker compose` to pick up —
`docker-compose.yml` reads `SESSION_SECRET` from the shell environment):

- `SESSION_SECRET` — generate a real random value: `openssl rand -hex 32`
- `COOKIE_SECURE` — `"true"` (the reverse proxy terminates TLS; the app itself only ever speaks
  plain HTTP on :3000). **If you skip this, logins will silently fail** — see `auth.md`.
- Change both seeded account passwords (`admin@supperclub.local` / `writer@supperclub.local`,
  both `changeme123` by default) before this is reachable from outside your own machine — either
  edit `prisma/seed.ts` before first seed, or update the rows directly after.

## 4. Build and start

```bash
docker compose build
docker compose up -d
docker compose logs -f supper-club   # confirm "Applying database migrations..." then Next boots
```

`docker/entrypoint.sh` runs `prisma migrate deploy` on every container start before execing the
server — safe to restart the container repeatedly; migrations that have already applied are
no-ops. First start on a fresh volume also needs seeding:

```bash
docker compose exec supper-club yarn db:seed
```

Confirm persistence survives a restart before wiring up the subdomain:

```bash
docker compose down
docker compose up -d
docker compose exec supper-club sqlite3 /app/data/prod.db "SELECT count(*) FROM User;"
```

## 5. Reverse proxy

Pick whichever of these two matches what's already running on the droplet — don't install a
second reverse proxy alongside an existing one.

### Option A: nginx + certbot

```nginx
# /etc/nginx/sites-available/supper-club
server {
    listen 80;
    server_name supper-club.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/supper-club /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d supper-club.your-domain.com
```

Certbot rewrites the server block to listen on 443 and add a redirect from 80 — no manual TLS
config needed.

### Option B: Caddy

Caddy gets automatic HTTPS with far less config, if it's already the droplet's proxy of choice:

```caddyfile
# /etc/caddy/Caddyfile
supper-club.your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

That's the entire config — Caddy obtains and renews the certificate automatically on first
request.

## 6. Verify

- `curl -fsS https://supper-club.your-domain.com/api/health` → `{"status":"ok"}`
- Log in as the (password-changed) admin account, confirm the session cookie has `Secure` set
  (browser devtools → Application → Cookies) — if it doesn't, `COOKIE_SECURE` isn't set to
  `"true"` in the running container's environment.
- Confirm `docker compose ps` shows the container `healthy`, not just `running` — the
  `HEALTHCHECK` in the `Dockerfile` hits `/api/health` every 30s.

## Day-to-day operations

Everything below runs from `/opt/supper-club` (or wherever the checkout lives on the droplet).

```bash
docker compose ps                     # running? healthy?
docker compose logs -f supper-club    # tail app logs (Next.js + the migration line on start)
docker compose restart supper-club    # restart without rebuilding
docker compose down                   # stop (the data volume is untouched — it's outside the container)
docker compose up -d                  # start again
docker compose exec supper-club sh    # shell into the running container
```

Nothing here needs `sudo` beyond the initial `chown` in Step 2 — once the volume is owned by
uid/gid `10001`, the containerized app (running as `supperclub`, also `10001`) can read and write
`prod.db` and `data/uploads/**` on its own for the container's entire lifetime, including across
restarts and rebuilds. If uploads or the DB start failing with `EACCES` after a droplet OS upgrade
or a volume restore, re-run the `chown` from Step 2 — that's the whole permission model, there's
nothing else to configure.

## Updating

```bash
cd /opt/supper-club
git pull
docker compose build
docker compose up -d   # entrypoint runs any new migrations automatically
```

## Backups

`/var/lib/supper-club/data/` (the mounted volume) contains everything stateful: `prod.db` and the
`uploads/` tree. A simple cron `tar`/`rsync` of that one directory to off-droplet storage is a
complete backup — there is no other state to capture.

```bash
tar -czf supper-club-$(date +%Y%m%d).tar.gz -C /var/lib/supper-club data
```

## Environment variables reference

| Variable | Purpose | Set where |
| --- | --- | --- |
| `SESSION_SECRET` | Signs the session cookie | `.env` next to `docker-compose.yml` (Step 3) — `docker compose` loads it for variable substitution |
| `DATABASE_URL` | Path to the SQLite file | Already set in `docker-compose.yml` (`file:../data/prod.db`) — leave as-is unless you change the volume mount path |
| `UPLOAD_DIR` | Where uploaded images are written | Already set in `docker-compose.yml` (`./data/uploads`, i.e. inside the mounted volume) |
| `COOKIE_SECURE` | Whether the session cookie requires HTTPS | `docker-compose.yml` — must be `"true"` once the reverse proxy terminates TLS (Step 3); see `auth.md` |

## Troubleshooting

### Build fails installing `better-sqlite3` or Prisma's engine

The `Dockerfile` uses `node:24-bookworm-slim` (glibc), not Alpine, specifically so
`better-sqlite3`'s prebuilt binary and Prisma's default engine binaries work without extra
`binaryTargets` config in `prisma/schema.prisma` — see `database.md`. If you've swapped the base
image for an Alpine one, this is almost certainly why the build breaks.

### Login flashes back to `/login` with no error

This is the `Secure`-cookie-over-HTTP issue described in Step 3 — a `Secure` cookie is silently
dropped by the browser over plain HTTP. Confirm `COOKIE_SECURE=true` is actually reaching the
running container (`docker compose exec supper-club env | grep COOKIE_SECURE`), and that the
reverse proxy is really terminating HTTPS in front of it.

### Container exits immediately, or logs show a migration error

`docker/entrypoint.sh` runs `prisma migrate deploy` before starting the server, so a failed
migration shows up in `docker compose logs supper-club` before any Next.js output at all. This
almost always means the volume's `prod.db` is from an older schema version than the code you just
deployed — resolve the migration (see `database.md`) rather than deleting the database file.

### Uploads or the DB fail with a permission error (`EACCES`)

The mounted volume's ownership doesn't match the container's `supperclub` user (uid/gid `10001`,
pinned in the `Dockerfile`) — re-run the `chown` from Step 2 against
`/var/lib/supper-club/data`. This is the only permission relationship in the whole deployment;
there's no other file-writing path to check.

### Port 3000 already in use on the droplet

Only the reverse proxy needs to reach port 3000 — nothing else needs it exposed. If something
else on the droplet already holds 3000, change the host side of the mapping in
`docker-compose.yml` (e.g. `"3001:3000"`) and point the reverse proxy's `proxy_pass`/
`reverse_proxy` target at the new port instead.

### `docker compose ps` shows `running` but never `healthy`

The `HEALTHCHECK` in the `Dockerfile` hits `/api/health`, which does a real `SELECT 1` against the
database (see `api.md`) — not just "is the process up." A container stuck unhealthy almost always
means the app can't reach `prod.db` (check the volume mount and its ownership, per the `EACCES`
entry above) rather than a slow boot; `start-period=30s` already covers normal Next.js startup
time.
