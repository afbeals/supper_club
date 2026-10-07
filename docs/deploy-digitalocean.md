# Deploying to a DigitalOcean droplet

Supper Club is developed and built locally, published as a Docker image to Docker Hub, and
deployed to DigitalOcean by pulling that image.

The DigitalOcean droplet does **not** need the Git repository, Node.js, Yarn, or the application
source code. It only needs Docker, Docker Compose, the production Compose configuration, and the
persistent application data.

The architecture is:

```text
LOCAL DEVELOPMENT
Windows
  │
  ├── yarn dev
  ├── local development database
  └── source code
       │
       │ when ready
       ▼
LOCAL PRODUCTION IMAGE
  │
  ├── yarn docker:build
  ├── yarn docker:tag
  └── yarn docker:test
       │
       │ when verified
       ▼
DOCKER HUB
  │
  ├── afbeals/supper-club:<version>
  └── afbeals/supper-club:latest
       │
       │ docker compose pull
       ▼
DIGITALOCEAN
  │
  ├── Docker container
  ├── Nginx
  └── persistent host data
       │
       └── /var/lib/supper-club/data/
             ├── prod.db
             └── uploads/
```

The application listens on port `3000` inside the container. Docker binds that port only to
`127.0.0.1` on the droplet, so public traffic must go through the reverse proxy.

---

## 1. Prerequisites

### Local development machine

The development machine needs:

- Node.js 24+
- Yarn 4.18.0
- Docker Desktop
- Git
- Access to the `afbeals/supper-club` Docker Hub repository

Normal development does **not** require Docker:

```bash
clear
yarn dev
```

The local development environment uses the development database and `.env` configuration.

### DigitalOcean droplet

The droplet needs:

- Docker
- Docker Compose plugin (`docker compose version` should work)
- A DNS A/AAAA record for the production subdomain pointing at the droplet
- Ports 80 and 443 reachable from the internet
- An existing reverse proxy such as nginx or Caddy

The application itself does not need port 3000 exposed to the internet.

---

## 2. Local development environment

Local development uses the normal Next.js development server rather than Docker.

Create a local `.env` from `.env.example`:

```bash
clear
cp .env.example .env
```

For local development:

```dotenv
DATABASE_URL="file:../data/dev.db"
SESSION_SECRET="change-me-to-a-long-random-string"
COOKIE_SECURE="false"
UPLOAD_DIR="./data/uploads"
```

The development database and uploads are local development state. They are not part of the Docker
image and are not used by the DigitalOcean deployment.

Run the application with:

```bash
clear
yarn dev
```

The application should normally be available at:

```text
http://localhost:3000
```

Seed local development data when needed:

```bash
clear
yarn db:seed
```

The seed data is intended for development/testing. It contains demo accounts and content and
should **not** be automatically seeded into production.

---

## 3. Production Docker image

The production Docker image is built on the local development machine.

The Dockerfile:

- Uses Node 24 on Debian Bookworm
- Installs application dependencies
- Generates the Prisma client
- Builds Next.js
- Runs the application as the non-root `supperclub` user
- Exposes port 3000
- Runs database migrations automatically when the container starts
- Includes a health check against `/api/health`

The production container does not contain the production SQLite database.

The database and uploaded files are stored outside the container on a mounted volume.

---

## 4. Docker scripts

`scripts/docker.js` provides the Docker build, test, tag, and release workflow.

The corresponding `package.json` scripts are:

```json
"docker:build": "node scripts/docker.js build",
"docker:tag": "node scripts/docker.js tag",
"docker:test": "node scripts/docker.js test",
"docker:push": "node scripts/docker.js push",
"docker:release": "node scripts/docker.js release"
```

### Build

Build the versioned image using the version from `package.json`:

```bash
clear
yarn docker:build
```

For example, with version `0.1.0`, this creates:

```text
afbeals/supper-club:0.1.0
```

### Tag

Tag the versioned image as `latest`:

```bash
clear
yarn docker:tag
```

This creates:

```text
afbeals/supper-club:latest
```

### Test

Run the production Docker image locally:

```bash
clear
yarn docker:test
```

See [Local production-image testing](#5-local-production-image-testing) below.

### Push

Push both the versioned and `latest` images to Docker Hub:

```bash
clear
yarn docker:push
```

### Release

Build, tag, and push the complete release:

```bash
clear
yarn docker:release
```

This performs:

```text
docker build
     ↓
version tag
     ↓
latest tag
     ↓
push version
     ↓
push latest
```

In normal use, `yarn docker:release` is the command used after the production image has been
tested locally.

---

## 5. Local production-image testing

Before publishing an image, test the actual production Docker image locally.

Build and tag it:

```bash
clear
yarn docker:build
yarn docker:tag
```

Then run:

```bash
clear
yarn docker:test
```

The Docker test runner:

- Uses `afbeals/supper-club:latest`
- Maps local port 3000 to container port 3000
- Uses a temporary `SESSION_SECRET`
- Uses `COOKIE_SECURE=false` because the local test is HTTP
- Uses `DATABASE_URL=file:/app/data/prod.db`
- Mounts `./docker-data` to `/app/data`
- Keeps the test database and uploads outside the container

The test application is available at:

```text
http://localhost:3000
```

The test data is stored under:

```text
./docker-data/
```

This directory is local Docker test data. It is completely separate from the DigitalOcean
production data.

Press `Ctrl+C` to stop the test container.

The local production-image test should verify:

- Application starts successfully
- Prisma migrations run successfully
- Login works
- Session cookies work
- Pages render correctly
- Database reads and writes work
- Image uploads work
- Uploaded images can be displayed
- `/api/health` responds successfully

---

## 6. Publish a release to Docker Hub

Once the production image has been tested successfully:

```bash
clear
yarn docker:release
```

For example, if `package.json` contains:

```json
"version": "0.1.0"
```

the release produces:

```text
afbeals/supper-club:0.1.0
afbeals/supper-club:latest
```

Both tags are pushed to Docker Hub.

The versioned tag provides a stable rollback target, while `latest` is used by the DigitalOcean
deployment.

The Docker image contains the application code and dependencies, but does **not** contain the
production SQLite database or production uploads.

---

## 7. Prepare the DigitalOcean droplet

The DigitalOcean droplet should contain only the deployment configuration and persistent data.

The application source code does **not** need to be copied or cloned onto the droplet.

Create the application data directory:

```bash
clear
sudo mkdir -p /var/lib/supper-club/data
sudo chown -R 10001:10001 /var/lib/supper-club/data
```

UID/GID `10001` matches the `supperclub` user created by the Dockerfile.

Create the deployment directory:

```bash
clear
sudo mkdir -p /opt/supper-club
```

The production deployment directory should contain:

```text
/opt/supper-club/
├── compose.yaml
└── .env
```

The application source code, `node_modules`, development database, and Git repository do not need
to be present on the droplet.

---

## 8. Production Compose configuration

The DigitalOcean Compose file pulls the image from Docker Hub.

It does **not** build the application.

`/opt/supper-club/compose.yaml`:

```yaml
services:
  supper-club:
    image: afbeals/supper-club:latest
    container_name: supper-club
    restart: unless-stopped

    ports:
      - "127.0.0.1:3000:3000"

    volumes:
      - /var/lib/supper-club/data:/app/data

    environment:
      DATABASE_URL: "file:/app/data/prod.db"
      SESSION_SECRET: ${SESSION_SECRET}
      UPLOAD_DIR: "./data/uploads"
      COOKIE_SECURE: "true"
```

The important difference from a development Compose file is that there is **no `build:` section**.

The droplet pulls a pre-built image:

```text
Docker Hub
    ↓
afbeals/supper-club:latest
    ↓
DigitalOcean Docker
```

This keeps application builds off the production server.

---

## 9. Production environment

Create `/opt/supper-club/.env`.

Generate a secure production secret on the droplet:

```bash
clear
openssl rand -hex 32
```

Put the generated value in:

```dotenv
SESSION_SECRET="REPLACE_WITH_THE_GENERATED_VALUE"
```

Protect the file:

```bash
clear
sudo chmod 600 /opt/supper-club/.env
```

The production Compose file supplies the remaining application configuration.

Production values are:

| Variable         | Production value                                     |
| ---------------- | ---------------------------------------------------- |
| `DATABASE_URL`   | `file:/app/data/prod.db`                             |
| `SESSION_SECRET` | Long random secret stored in `/opt/supper-club/.env` |
| `UPLOAD_DIR`     | `./data/uploads`                                     |
| `COOKIE_SECURE`  | `true`                                               |

`COOKIE_SECURE=true` is required because nginx/Caddy terminates HTTPS before forwarding requests
to the HTTP application on port 3000.

Do **not** commit the production `.env` file to Git.

---

## 10. Initial production deployment

After the production Compose file and `.env` are in place:

```bash
clear
cd /opt/supper-club
docker compose pull
docker compose up -d
```

Check the container:

```bash
clear
cd /opt/supper-club
docker compose ps
```

Then inspect startup logs:

```bash
clear
cd /opt/supper-club
docker compose logs --tail=100 supper-club
```

The startup sequence should be:

```text
Applying database migrations...
        ↓
prisma migrate deploy
        ↓
Next.js starts
        ↓
health check becomes healthy
```

The `docker/entrypoint.sh` script runs:

```sh
#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

exec "$@"
```

Every container start therefore applies any pending Prisma migrations before starting Next.js.
Already-applied migrations are no-ops.

---

## 11. Production account initialization

The production seed file is **not automatically executed** by the container.

This is intentional.

`prisma/seed.ts` contains development/demo accounts such as:

```text
admin@supperclub.local
changeme123

writer@supperclub.local
changeme123
```

Those credentials should not become the permanent production credentials.

Production account initialization should therefore be handled separately.

Do not run:

```bash
clear
docker compose exec supper-club yarn db:seed
```

against the production database unless the seed has explicitly been reviewed and is intended
for that production database.

The preferred production workflow is to create the real initial administrator account using the
application's intended account-management/setup mechanism.

---

## 12. Persistent production data

The container mounts:

```text
/var/lib/supper-club/data
        ↓
/app/data
```

Inside the container:

```text
/app/data/prod.db
/app/data/uploads/
```

On the droplet:

```text
/var/lib/supper-club/data/prod.db
/var/lib/supper-club/data/uploads/
```

This data survives:

- Container restarts
- Container replacement
- New Docker image releases
- Docker image deletion
- `docker compose down`

The database and uploads are therefore completely separate from the Docker image.

---

## 13. Reverse proxy

The application should not be exposed directly to the internet.

Docker binds port 3000 only to:

```text
127.0.0.1:3000
```

The reverse proxy handles public HTTP/HTTPS traffic.

Use the reverse proxy already installed on the droplet. Do not install a second reverse proxy.

Replace `supperclub.your-domain.com` below with the actual production hostname.

### Option A: nginx + certbot

Create:

```text
/etc/nginx/sites-available/supper-club
```

with:

```nginx
server {
    listen 80;
    server_name supperclub.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
clear
sudo ln -s /etc/nginx/sites-available/supper-club /etc/nginx/sites-enabled/supper-club
sudo nginx -t
sudo systemctl reload nginx
```

Then obtain the certificate:

```bash
clear
sudo certbot --nginx -d supperclub.your-domain.com
```

Certbot handles the HTTPS server configuration and HTTP-to-HTTPS redirect.

### Option B: Caddy

If Caddy is already the reverse proxy:

```caddyfile
supperclub.your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```

Then:

```bash
clear
sudo systemctl reload caddy
```

Caddy obtains and renews the TLS certificate automatically.

---

## 14. Verify production

Check the container:

```bash
clear
cd /opt/supper-club
docker compose ps
```

The container should eventually show:

```text
healthy
```

Test the health endpoint locally on the droplet:

```bash
clear
curl -fsS http://127.0.0.1:3000/api/health
```

Expected response:

```text
{"status":"ok"}
```

Then test through HTTPS:

```bash
clear
curl -fsS https://supperclub.your-domain.com/api/health
```

Expected response:

```text
{"status":"ok"}
```

Finally:

- Open the production site in a browser.
- Log in with the real production administrator account.
- Confirm the session cookie has the `Secure` attribute.
- Test creating/editing content.
- Upload an image and confirm it is accessible.
- Restart the container and confirm the data remains.
- Confirm `docker compose ps` reports `healthy`.

---

## 15. Updating the production application

Application updates happen on the local development machine first.

### Local workflow

```text
Make code changes
      ↓
yarn dev
      ↓
Test application
      ↓
yarn typecheck
      ↓
yarn test
      ↓
yarn docker:build
      ↓
yarn docker:tag
      ↓
yarn docker:test
      ↓
Test production Docker image
      ↓
yarn docker:release
```

Once the release is on Docker Hub, deploy it to DigitalOcean.

### DigitalOcean workflow

```bash
clear
cd /opt/supper-club
docker compose pull
docker compose up -d
docker compose ps
```

Then inspect the logs:

```bash
clear
cd /opt/supper-club
docker compose logs --tail=100 supper-club
```

The new container starts from the newly pulled image.

Any new Prisma migrations are applied automatically by `docker/entrypoint.sh`.

The existing:

```text
/var/lib/supper-club/data/prod.db
```

remains intact.

The existing:

```text
/var/lib/supper-club/data/uploads/
```

also remains intact.

There is no `git pull`, `yarn install`, `yarn build`, or Docker build on the DigitalOcean droplet.

---

## 16. Rollback

Every release has a versioned Docker image.

For example:

```text
afbeals/supper-club:0.1.0
afbeals/supper-club:0.2.0
```

If `latest` has a problem, change the production Compose file from:

```yaml
image: afbeals/supper-club:latest
```

to the known-good version:

```yaml
image: afbeals/supper-club:0.1.0
```

Then:

```bash
clear
cd /opt/supper-club
docker compose pull
docker compose up -d
docker compose ps
```

The application image can therefore be rolled back without restoring the database or uploads.

**Database migrations require additional care:** rolling back application code does not automatically
roll back database migrations. A migration that changes the database schema must be designed with
rollback compatibility in mind.

---

## 17. Day-to-day DigitalOcean operations

All deployment commands run from `/opt/supper-club`.

Check status:

```bash
clear
cd /opt/supper-club
docker compose ps
```

View recent logs:

```bash
clear
cd /opt/supper-club
docker compose logs --tail=100 supper-club
```

Follow logs:

```bash
clear
cd /opt/supper-club
docker compose logs -f supper-club
```

Restart without changing the image:

```bash
clear
cd /opt/supper-club
docker compose restart supper-club
```

Stop the application:

```bash
clear
cd /opt/supper-club
docker compose down
```

Start it again:

```bash
clear
cd /opt/supper-club
docker compose up -d
```

Pull the newest Docker Hub image:

```bash
clear
cd /opt/supper-club
docker compose pull
```

Deploy the newest image:

```bash
clear
cd /opt/supper-club
docker compose up -d
```

Open a shell in the running container:

```bash
clear
cd /opt/supper-club
docker compose exec supper-club sh
```

---

## 18. Permissions

The Dockerfile creates the application user with:

```text
UID 10001
GID 10001
```

The production data directory must therefore be owned by that UID/GID:

```bash
clear
sudo chown -R 10001:10001 /var/lib/supper-club/data
```

If the database or uploads produce `EACCES` errors after a filesystem restore or manual file
operation, correct the ownership again:

```bash
clear
sudo chown -R 10001:10001 /var/lib/supper-club/data
```

No other host-side application permissions are required.

---

## 19. Backups

The only persistent application state is:

```text
/var/lib/supper-club/data/
```

This contains:

```text
prod.db
uploads/
```

Back up this entire directory to off-droplet storage.

For example:

```bash
clear
sudo tar -czf "/tmp/supper-club-$(date +%Y%m%d).tar.gz" \
  -C /var/lib/supper-club data
```

A backup must include both the SQLite database and the uploads directory.

Do not rely on Docker images as database backups.

---

## 20. Environment variables reference

| Variable         | Local development        | Local Docker test        | DigitalOcean production       |
| ---------------- | ------------------------ | ------------------------ | ----------------------------- |
| `DATABASE_URL`   | `file:../data/dev.db`    | `file:/app/data/prod.db` | `file:/app/data/prod.db`      |
| `SESSION_SECRET` | Local development secret | Temporary test secret    | Long random production secret |
| `COOKIE_SECURE`  | `false`                  | `false`                  | `true`                        |
| `UPLOAD_DIR`     | `./data/uploads`         | `./data/uploads`         | `./data/uploads`              |

The paths are relative to the application/container environment.

For Docker:

```text
/app/data/
    prod.db
    uploads/
```

is backed by:

```text
Local:
./docker-data/

DigitalOcean:
/var/lib/supper-club/data/
```

---

## 21. Troubleshooting

### Build fails installing `better-sqlite3` or Prisma

The Dockerfile uses:

```text
node:24-bookworm-slim
```

rather than Alpine.

This provides glibc compatibility for `better-sqlite3` and Prisma's default engine binaries.

Do not switch the production image to Alpine without also reviewing the native dependency and
Prisma configuration.

---

### Login redirects back to `/login`

Check the production cookie setting:

```bash
clear
cd /opt/supper-club
docker compose exec supper-club env | grep COOKIE_SECURE
```

Production should show:

```text
COOKIE_SECURE=true
```

The browser must be accessing the application through HTTPS.

---

### Container exits during startup

Check:

```bash
clear
cd /opt/supper-club
docker compose logs --tail=200 supper-club
```

If the failure occurs immediately after:

```text
Applying database migrations...
```

the problem is likely Prisma/database related.

Do not delete `prod.db` to fix a migration error.

Investigate the migration failure first.

---

### Database or uploads return `EACCES`

Check ownership:

```bash
clear
sudo chown -R 10001:10001 /var/lib/supper-club/data
```

Then restart:

```bash
clear
cd /opt/supper-club
docker compose restart supper-club
```

---

### Port 3000 is already in use

Check what owns the port:

```bash
clear
sudo ss -ltnp | grep ':3000'
```

The intended architecture is:

```text
Internet
   ↓
Reverse proxy :443
   ↓
127.0.0.1:3000
   ↓
Docker
   ↓
Supper Club :3000
```

Port 3000 should not be publicly exposed.

If another application already requires port 3000, change the host-side Docker port and update the
reverse proxy accordingly.

---

### Container is running but never becomes healthy

Check:

```bash
clear
cd /opt/supper-club
docker compose ps
docker compose logs --tail=200 supper-club
```

The Dockerfile health check calls:

```text
/api/health
```

The health endpoint should verify that the application and database are functioning.

Also verify the persistent volume:

```bash
clear
sudo ls -lah /var/lib/supper-club/data
```

and its ownership:

```bash
clear
sudo stat -c '%u:%g %n' /var/lib/supper-club/data
```

Expected ownership is:

```text
10001:10001
```

---

## 22. Complete release/deployment workflow

The normal workflow is:

```text
┌─────────────────────────────┐
│       LOCAL WINDOWS         │
│                             │
│  Make code changes          │
│       ↓                     │
│  yarn dev                   │
│       ↓                     │
│  Test application           │
│       ↓                     │
│  yarn typecheck             │
│  yarn test                  │
│       ↓                     │
│  yarn docker:build          │
│       ↓                     │
│  yarn docker:tag            │
│       ↓                     │
│  yarn docker:test           │
│       ↓                     │
│  Test production image      │
│       ↓                     │
│  yarn docker:release        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         DOCKER HUB          │
│                             │
│  afbeals/supper-club:0.1.0  │
│  afbeals/supper-club:latest │
└──────────────┬──────────────┘
               │
               │ docker compose pull
               ▼
┌─────────────────────────────┐
│       DIGITALOCEAN          │
│                             │
│  /opt/supper-club/          │
│    compose.yaml             │
│    .env                     │
│                             │
│  Docker                     │
│       ↓                     │
│  Supper Club container      │
│       ↓                     │
│  /app/data                  │
│       ↕                     │
│  /var/lib/supper-club/data/ │
│    prod.db                  │
│    uploads/                 │
│                             │
│  Nginx/Caddy                │
│       ↓                     │
│  HTTPS                      │
└─────────────────────────────┘
```

The key rule is:

**Build locally → test locally → push to Docker Hub → pull on DigitalOcean → run the image.**

The DigitalOcean server never builds the application and never needs the source repository.
