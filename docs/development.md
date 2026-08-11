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
3. Run migrations once.
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
