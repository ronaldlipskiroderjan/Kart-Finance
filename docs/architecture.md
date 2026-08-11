# Kart Finance architecture

## Direction

Kart Finance is a modular monolith. Business capabilities own their HTTP
contracts, application rules and persistence operations. Infrastructure is
shared only through small platform packages.

The public HTTP contract is versioned under `/api/v1`. Legacy, unversioned
routes remain available only during the frontend migration and must not receive
new features.

## Invariants

- Money is represented as integer cents in Go and `NUMERIC(14,2)` in PostgreSQL.
- Accounting periods are explicit data and are not inferred by rewriting
  `created_at`.
- A closing is unique by pilot and accounting period.
- Exactly one of `pilot_id` and `guest_pilot_id` is present in a race entry.
- State-changing financial operations are transactional and idempotent.
- HTTP handlers never expose GORM entities as an implicit API contract.
- GET and HEAD requests never create or mutate persistent data.
- All business endpoints require an authenticated server-side session.

## Migration strategy

1. Add characterization tests and the `/api/v1` contract.
2. Apply versioned database migrations before deploying the new binary.
3. Run legacy routes and `/api/v1` in parallel.
4. Move one frontend feature at a time to `/api/v1`.
5. Remove legacy routes only after contract and end-to-end tests pass.

