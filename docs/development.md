# Development and deployment

## Required tools

- Go version declared in `backend-go/go.mod`
- Node.js compatible with the Vite version in `frontend/package.json`
- PostgreSQL 15 or newer

## First setup

1. Copy `.env.example` to your local environment configuration.
2. Create the PostgreSQL database.
3. Apply migrations before starting the API:

   ```sh
   cd backend-go
   go run ./cmd/migrate
   ```

4. Create the first administrator:

   ```sh
   go run ./cmd/create-admin
   ```

5. Start the API and frontend in separate terminals:

   ```sh
   cd backend-go && go run .
   cd frontend && npm ci && npm run dev
   ```

Schema changes are never applied by the API startup. A failed migration is a
deployment failure and must be investigated; production data must not be
deleted to force a migration through.

## Checks

```sh
cd backend-go
go test ./...
go vet ./...

cd ../frontend
npm run lint
npm test
npm run build
```

## Production cookies

Vercel and Render commonly run on different sites. Production must set
`SESSION_COOKIE_SECURE=true`, normally use `SESSION_COOKIE_SAME_SITE=None`, and
set `ALLOWED_ORIGINS` to the exact HTTPS frontend origin. Never use `*` with
credentialed requests.

## Deployment order

1. Back up the production database.
2. Build the migration binary from the same revision as the API.
3. Run migrations once, or let Render run them before the API process.
4. Deploy the API.
5. Deploy the frontend.
6. Verify login, pilot overview, closing preview, race payment and logout.

## Financial job availability

The API reconciles due monthly closings during startup and every hour while the
process is running. This makes a restart or an idle-platform suspension safe:
missed periods are created on the next startup and existing periods are skipped.
The PostgreSQL advisory lock prevents concurrent instances from processing the
same reconciliation simultaneously.

Operational logs containing `Reconciliação financeira falhou` must be monitored.
For lower wake-up latency on a scale-to-zero platform, an external scheduler may
wake the API periodically, but correctness does not depend on the API being
awake at midnight.

## Vercel frontend

Create a Vercel project from this repository with these settings:

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Install Command: automatically detected from `package-lock.json`
- Build Command: `npm run build`
- Output Directory: `dist`

Set `VITE_API_URL` for Production to the public HTTPS backend origin, for
example `https://api.example.com`. Do not append `/api/v1`; the API clients
already include that prefix. Variables prefixed with `VITE_` are public and
must never contain database URLs, passwords, cookies, or tokens.

After Vercel assigns the production domain, configure the backend:

```env
ALLOWED_ORIGINS=https://your-project.vercel.app
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=None
```

Use exact HTTPS origins. If Preview deployments must authenticate, add each
stable Preview origin explicitly instead of using `*`. Redeploy after changing
environment variables because Vite embeds `VITE_API_URL` during the build.

For the most reliable cookie behavior, use sibling custom domains such as
`app.example.com` and `api.example.com`.

## Render backend

The root `render.yaml` is a Render Blueprint for the Go API. In Render, create
a new Blueprint, connect this repository and select the branch to deploy. The
service uses `backend-go` as its root directory, builds both the API and the
migration command, and checks `/api/v1/health` after startup.

Render asks for these values during Blueprint creation:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
ALLOWED_ORIGINS=https://your-project.vercel.app
```

Keep `DATABASE_URL` only in Render's secret environment settings. Use the exact
Vercel production origin in `ALLOWED_ORIGINS`, without a trailing slash. The
Blueprint already enables secure cross-site session cookies with
`SESSION_COOKIE_SECURE=true` and `SESSION_COOKIE_SAME_SITE=None`.

The Blueprint selects Virginia because it is normally the nearest Render
region to Brazil. Before creating the service, change `region` if the
PostgreSQL database is hosted elsewhere; keeping the API and database near each
other has more impact than proximity to the browser.

The free Render web-service plan does not support a pre-deploy command. For
that reason `scripts/render-start.sh` runs the versioned, idempotent migrations
before starting the API. A migration failure stops startup instead of running
incompatible application code. Paid services can move this command to Render's
pre-deploy step if desired.

For a new database, create the first administrator from a trusted local
terminal because free Render services do not provide shell access:

```sh
cd backend-go
DATABASE_URL='your-production-database-url' \
ADMIN_NAME='Administrator' \
ADMIN_EMAIL='admin@example.com' \
ADMIN_PASSWORD='use-a-strong-password' \
go run ./cmd/create-admin
```

Do not use Render's free PostgreSQL for durable production data: free databases
expire after 30 days. An external persistent PostgreSQL service can be supplied
through `DATABASE_URL`.

### Connect Render and Vercel

1. Create the Render Blueprint with the production database URL and a temporary
   exact HTTPS origin in `ALLOWED_ORIGINS`.
2. Copy the resulting Render URL, such as
   `https://kart-finance-api.onrender.com`.
3. Set that origin as `VITE_API_URL` in Vercel and deploy the frontend.
4. Copy Vercel's production URL to Render's `ALLOWED_ORIGINS` and redeploy the
   API.
5. Open `/api/v1/health` on Render, then test login and an authenticated write
   from the Vercel application.

On the free plan, Render suspends the API after inactivity and the first
request may have a cold-start delay. The startup financial reconciliation
processes any monthly closings missed while the service was suspended.
