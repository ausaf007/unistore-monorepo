# v1 Build Plan — Ecommerce Store Assessment

Status: **DONE — completed 2026-07-29 (locked same day, all phases delivered)**

This is the single source of truth for the v1 build. Nothing gets implemented that isn't in this doc; if scope changes, this doc changes first.

---

## 1. Scope

**In scope (v1):**
- Cart APIs: add items to a cart, view cart
- Checkout API with discount-code validation
- Discount system: every *n*th order earns a coupon for *x*% off
- Admin APIs: generate discount code (when eligible), stats report
- In-memory store (no database)
- Unit tests for core business logic + API-level integration tests
- React frontend: store, cart, checkout, admin dashboard
- `README.md`, `DECISIONS.md` (≥5 decisions)

**Out of scope (v1):**
- Authentication/authorization (users identified by a plain ID; admin routes unprotected but namespaced)
- Persistence, payments, inventory/stock tracking, product management CRUD
- Removing/updating cart line items (add + checkout is what's assessed) — *flag if you want this*

## 2. Business Rules (proposed — confirm before lock)

These interpret the assignment's ambiguities. Each is a defensible default; flag any you'd change.

| # | Rule | Proposal |
|---|------|----------|
| R1 | "Every nth order" counts | **Globally across the store** (order #n, #2n, #3n...), not per-customer. Simpler, matches "the store has a discount system" phrasing. |
| R2 | n and x values | `n = 5`, `x = 10` (%). Defined in one config module, injectable in tests so `n = 2` etc. is trivially testable. |
| R3 | When is a code generated | Completing the *n*th order makes the store eligible; the **admin API generates the code** (per the assignment: "generate a discount code if the condition above is satisfied"). One code per eligibility window — no stockpiling multiple codes from one nth order. |
| R4 | Who can use a generated code | Any customer (codes are store-wide, not customer-bound) — consistent with R1. |
| R5 | Code lifecycle | Single-use. Valid → applied at checkout → consumed. Invalid/used/nonexistent codes → checkout rejected with a clear error (assignment says checkout *validates* the code). |
| R6 | Discount math | x% off the cart subtotal, applied to the whole order. Money handled in **integer cents** to avoid float errors. |

## 3. Architecture

```
uniblox/
├── package.json               # root: workspaces, shared scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── DECISIONS.md
├── v1-build-plan.md
├── README.md
├── apps/
│   ├── api/                   # Express + Zod (validation) + tsx (dev)
│   │   └── src/
│   │       ├── index.ts       # bootstrap (listen) — kept apart from app.ts for testability
│   │       ├── app.ts         # express app factory
│   │       ├── config.ts      # DISCOUNT_N, DISCOUNT_PERCENT
│   │       ├── store/         # in-memory store (Maps), reset() for tests
│   │       ├── services/      # cart.service, checkout.service, discount.service, stats.service
│   │       ├── routes/        # cart.routes, checkout.routes, admin.routes, products.routes
│   │       └── middleware/    # zod validation, error handler
│   └── web/                   # Vite + React + TS + Tailwind + TanStack Query
│       └── src/
│           ├── api/           # typed fetch client using shared schemas
│           ├── pages/         # Store, Cart, Checkout, Admin
│           └── components/
└── packages/
    └── shared/                # zod schemas + z.infer types (single source of truth)
        └── src/
            ├── product.ts, cart.ts, order.ts, discount.ts, stats.ts
            └── index.ts
```

**Layering rule (api):** routes → services → store. Routes do HTTP + validation only; services hold all business logic (this is what unit tests target); store is dumb Maps behind a small interface.

**Products:** hardcoded seed catalog (~6 items) in the store, exposed via `GET /api/products` so the frontend has something to render.

## 4. API Surface

Base path `/api`. Customer identified via `x-user-id` header (no auth in scope). All bodies validated with shared Zod schemas; validation failures → `400` with field-level details; unknown routes → `404`; everything else → structured error via the error middleware.

### Customer

| Method & Path | Purpose | Request | Response |
|---|---|---|---|
| `GET /api/products` | List catalog | — | `Product[]` |
| `GET /api/cart` | View my cart | header `x-user-id` | `Cart` (items + subtotal) |
| `POST /api/cart/items` | Add item to cart | `{ productId, quantity }` | updated `Cart` |
| `POST /api/checkout` | Place order | `{ discountCode? }` | `Order` (items, subtotal, discount applied, total, orderNumber) |

Checkout behavior: empty cart → `400`. Invalid/used/unknown discount code → `400` with reason (order NOT placed). Valid code → discount applied, code marked used, order placed, cart cleared. Response includes whether this order made the store eligible for a new discount code (nice frontend touch).

### Admin (namespaced `/api/admin`)

| Method & Path | Purpose | Behavior |
|---|---|---|
| `POST /api/admin/discount-codes` | Generate code if condition satisfied | Eligible (nth order reached, no unclaimed code for that window) → `201` with code. Not eligible → `409` with explanation. |
| `GET /api/admin/stats` | Purchasing report | `{ itemsPurchasedCount, totalRevenueCents, discountCodes: [{code, percentOff, status}], totalDiscountGivenCents }` |

## 5. Frontend (apps/web)

Four views, React Router, all data via TanStack Query hooks wrapping a typed fetch client:

1. **Store** — product grid, "Add to cart" buttons (mutation → invalidate cart query)
2. **Cart** — line items, subtotal, "Proceed to checkout"
3. **Checkout** — order summary, optional discount-code input, place order; success state shows order + savings; invalid code shows the API's error inline
4. **Admin** — stats dashboard + "Generate discount code" button (shows generated code, or the not-eligible message)

User identity: a `userId` generated on first visit, kept in `localStorage`, sent as `x-user-id`. Dev proxy: Vite proxies `/api` → Express (no CORS config needed).

Polish level: Tailwind, clean and legible, no component library. Not pixel-perfect — it's a bonus deliverable.

## 6. Testing Strategy

All Vitest.

**Unit tests (the graded core — `services/`):**
- `discount.service`: nth-order eligibility (boundaries: order n−1, n, n+1, 2n), code generation uniqueness, one-code-per-window, validate/consume lifecycle (valid, already-used, unknown)
- `checkout.service`: totals with/without discount, integer-cents rounding, cart cleared after order, empty-cart rejection, order counter increments
- `cart.service`: add new item, add same item again (quantity merge), unknown product rejection
- `stats.service`: aggregates correct across a scripted sequence of orders (with and without discounts)

**Integration tests (supertest against the app factory):** happy-path flow — add to cart → checkout without code → repeat to nth order → admin generates code → checkout with code → stats reflect everything. Plus key error paths (bad code, empty cart, invalid body).

Config injection (`n`, `x`) keeps tests fast and deterministic. `store.reset()` between tests.

Frontend tests: **not in v1 scope** (backend tests are the graded requirement) — *flag if you disagree*.

## 7. Build Phases & Commit Points

Each phase ends at a suggested commit (you run git). Messages follow conventional commits.

| Phase | Work | Suggested commit |
|---|---|---|
| 0 | Docs first: this plan + DECISIONS.md *(already written)* | `docs: add v1 build plan and initial design decisions` |
| 1 | Workspace scaffold: root package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore | `chore: scaffold pnpm workspace` |
| 2 | `packages/shared`: all Zod schemas + inferred types | `feat(shared): add zod schemas for products, cart, orders, discounts, stats` |
| 3 | `apps/api` skeleton: express app factory, config, error middleware, health route, in-memory store + product seed | `feat(api): scaffold express app with in-memory store` |
| 4 | Cart: service + routes + unit tests | `feat(api): cart service and routes with tests` |
| 5 | Discounts + checkout: services + routes + unit tests (the core logic commit) | `feat(api): checkout with nth-order discount system` |
| 6 | Admin: code generation + stats, unit tests; supertest integration flow | `feat(api): admin discount generation and stats endpoints` |
| 7 | `apps/web` scaffold: Vite, Tailwind, TanStack Query, router, typed API client | `feat(web): scaffold react app with api client` |
| 8 | Store + Cart + Checkout pages wired to API | `feat(web): store, cart and checkout flow` |
| 9 | Admin dashboard page | `feat(web): admin stats and discount generation` |
| 10 | README (setup, run, test, API reference), final DECISIONS.md pass (≥5 check), polish | `docs: readme and final design decisions` |

Phases 4–6 are where "show your thinking" lives — small commits, tests land with the code they test.

## 8. Definition of Done (v1)

- [x] `pnpm install && pnpm dev` runs API + web together; `pnpm test` green from root
- [x] All endpoints in §4 implemented and validated with shared schemas
- [x] Business rules R1–R6 implemented exactly as locked
- [x] Unit + integration tests per §6 passing (31 tests: 25 unit + 6 integration)
- [x] Frontend covers all four views in §5
- [x] README: setup, scripts, API reference (serves as the Postman-alternative), assumptions
- [x] DECISIONS.md has ≥5 decisions (7: stack, monorepo, shared zod schemas, frontend stack, global nth-order + admin generation, integer cents, injectable in-memory store)

---

**Open items — resolved at lock (owner decisions, 2026-07-29):**
1. R1 — **Global** nth-order counting confirmed (mirrors real stores: "our 1000th customer gets a discount").
2. R2 — n=5, x=10 confirmed; stored as config (`config.ts`), injectable in tests. Not hardcoded at call sites.
3. Cart item removal/quantity update — **out of scope** for v1.
4. Frontend tests — **out of scope** for v1.
