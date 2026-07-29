# Uniblox Store

A minimal ecommerce store with an **nth-order discount system**: clients add items to a cart and check out; every *n*th order store-wide unlocks a single-use discount code that an admin can generate and any customer can redeem at checkout.

The design is documented in [`DECISIONS.md`](./DECISIONS.md) (key trade-offs) and [`v1-build-plan.md`](./v1-build-plan.md) (the locked build plan this was implemented against).

## Stack

| Piece | Choice |
|---|---|
| `apps/api` | Node.js + TypeScript, Express 5, Zod validation, in-memory store |
| `apps/web` | React 19 SPA — Vite, Tailwind CSS v4, TanStack Query |
| `packages/shared` | Zod schemas + `z.infer` types shared by both apps (single source of truth for API contracts) |
| Tests | Vitest + Supertest (31 tests: unit tests on services, one end-to-end integration flow) |

## Getting started

Prerequisites: **Node.js ≥ 22** and **pnpm** (`corepack enable` or `npm i -g pnpm`).

```bash
pnpm install
pnpm dev          # starts API (http://localhost:3001) and web (http://localhost:5173) together
```

Open http://localhost:5173 — the Vite dev server proxies `/api/*` to the Express API, so there's no CORS setup. The **Admin** tab in the nav is the admin dashboard.

Other scripts (run from the repo root):

```bash
pnpm test         # all tests (API unit + integration)
pnpm typecheck    # strict TypeScript across all packages
pnpm dev:api      # API only
pnpm dev:web      # web only
pnpm build        # production build of the web app
```

### Discount configuration

Every **5th** order unlocks a **10%** code by default. Both values are config, not constants:

```bash
DISCOUNT_N=3 DISCOUNT_PERCENT=20 pnpm dev:api
```

## How the discount system works

- Orders are counted **globally** (order #n, #2n, … across all customers), like a "1000th customer" promotion.
- Completing the *n*th order opens an **eligibility window**. Each window entitles the admin to generate **exactly one** code; windows queue up if the admin generates late, but you can never generate more codes than windows completed.
- Codes are **store-wide and single-use**: any customer can redeem an active code; redemption consumes it.
- Checkout **validates the code first** — an invalid/used code rejects the whole checkout with a clear error and changes nothing (no order, cart intact).
- All money is **integer cents**; the discount is `round(subtotal × x / 100)`.

## API reference

Base URL: `http://localhost:3001`. Customer endpoints identify the caller via an `x-user-id` header (any non-empty string — auth is out of scope; the frontend mints a UUID per browser). Errors always come back as:

```json
{ "error": { "code": "INVALID_DISCOUNT_CODE", "message": "…", "details": {} } }
```

### Customer endpoints

**`GET /api/products`** — list the catalog.

```bash
curl http://localhost:3001/api/products
```

**`GET /api/cart`** — the caller's cart, priced against the current catalog.

```bash
curl http://localhost:3001/api/cart -H 'x-user-id: demo'
```

**`POST /api/cart/items`** — add a product (same product merges into one line). `quantity` defaults to 1. Returns the updated cart.

```bash
curl -X POST http://localhost:3001/api/cart/items \
  -H 'content-type: application/json' -H 'x-user-id: demo' \
  -d '{"productId": "p-mug", "quantity": 2}'
```

**`POST /api/checkout`** — place an order from the cart, optionally with a discount code. Returns `201` with the order and an `unlockedDiscountEligibility` flag (true exactly on every nth order). `400` on empty cart or invalid/used code.

```bash
curl -X POST http://localhost:3001/api/checkout \
  -H 'content-type: application/json' -H 'x-user-id: demo' \
  -d '{"discountCode": "SAVE10-ABC123"}'   # or '{}' for no discount
```

### Admin endpoints (unauthenticated by scope, namespaced under `/api/admin`)

**`POST /api/admin/discount-codes`** — generate a code if an eligibility window is open. `201` with the code, or `409` with an explanation of how many orders remain.

```bash
curl -X POST http://localhost:3001/api/admin/discount-codes
```

**`GET /api/admin/stats`** — items purchased, revenue (post-discount money actually collected), every discount code with status, and total discounts given. All amounts in cents.

```bash
curl http://localhost:3001/api/admin/stats
```

### Trying the full flow in 60 seconds

```bash
DISCOUNT_N=2 pnpm dev:api   # small n so the demo is quick
# in another terminal:
curl -X POST localhost:3001/api/cart/items -H 'content-type: application/json' -H 'x-user-id: a' -d '{"productId":"p-pen"}'
curl -X POST localhost:3001/api/checkout   -H 'content-type: application/json' -H 'x-user-id: a' -d '{}'
curl -X POST localhost:3001/api/cart/items -H 'content-type: application/json' -H 'x-user-id: b' -d '{"productId":"p-mug"}'
curl -X POST localhost:3001/api/checkout   -H 'content-type: application/json' -H 'x-user-id: b' -d '{}'   # → "unlockedDiscountEligibility": true
curl -X POST localhost:3001/api/admin/discount-codes                                                        # → { "discountCode": { "code": "SAVE10-…" } }
curl -X POST localhost:3001/api/cart/items -H 'content-type: application/json' -H 'x-user-id: a' -d '{"productId":"p-bottle"}'
curl -X POST localhost:3001/api/checkout   -H 'content-type: application/json' -H 'x-user-id: a' -d '{"discountCode":"<paste code>"}'
curl localhost:3001/api/admin/stats
```

## Tests

```bash
pnpm test
```

- **Unit tests** target the services (all business logic lives there, behind thin HTTP routes): discount eligibility boundaries (n−1/n/n+1, window queuing at 2n), code lifecycle (generate → validate → consume → reject reuse), checkout totals and rounding, atomicity of failed checkouts, cart merging/isolation, and stats aggregation.
- **Integration test** drives the real Express app with Supertest through the whole journey: browse → cart → orders → code generation → discounted checkout → reuse rejection → stats, plus the key error paths.

Config (`n`, `x`) is injected into services and the app factory, so tests run with small `n` and a fresh in-memory store each.

## Project layout

```
apps/api            Express API (routes → services → store)
apps/web            React SPA (pages → hooks → typed API client)
packages/shared     Zod schemas + inferred types used by both
DECISIONS.md        Design decisions with options & trade-offs
v1-build-plan.md    The locked plan this was built against
```

## Assumptions

- No auth: customers are identified by an `x-user-id` header; admin routes are namespaced but open (documented scope cut).
- Global (not per-customer) nth-order counting; one code per window; codes are store-wide and single-use.
- "Revenue" in stats = money actually collected (after discounts), with discounts reported separately.
- Cart line removal/quantity editing and frontend tests were consciously left out of v1 scope.
