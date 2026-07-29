# Design Decisions

## Decision: Node.js + TypeScript for the stack

**Context:** An API-first store MVP that needs to ship fast without sacrificing correctness in the money-handling and discount logic at its core.

**Options Considered:**
- Option A: Node.js + TypeScript — strong typing for domain logic (cart, orders, discounts), one language across backend and frontend, huge ecosystem for testing and tooling.
- Option B: Node.js + plain JavaScript — slightly faster to start, but loses compile-time safety on exactly the business logic this project centers on.
- Option C: Python/Go backend — viable, but splits the codebase across two languages once the frontend exists and rules out sharing contract definitions.

**Choice:** Node.js + TypeScript.

**Why:** TypeScript's type system makes the core business logic (discount eligibility, order counting, checkout validation) self-documenting and safer to refactor, and one language end-to-end is what makes shared API contracts (see the Zod decision) possible at all. The compile step is a minor cost for a project this size.

## Decision: Monorepo layout (backend + optional frontend in one repo)

**Context:** The product is an API plus a web storefront. Both should live together without mixing concerns — a clean separation between frontend and backend code, but one place to clone, install, and review.

**Options Considered:**
- Option A: Monorepo with workspaces (e.g. `apps/api`, `apps/web`, shared types in `packages/`) — one repo, one setup command, shared TypeScript types between API and UI.
- Option B: Single-package repo (backend only, frontend bolted in later) — simplest now, but adding a frontend later means either restructuring or mixing concerns in one `src/`.
- Option C: Separate repos for frontend and backend — clean separation, but doubles setup and review friction and splits the project's history in two.

**Choice:** Monorepo with workspaces.

**Why:** It keeps frontend/backend code separated at the directory level while sharing one toolchain, one lockfile, and one commit history that tells a coherent story. API request/response types live in a shared package so both sides stay in sync. The overhead is minimal since modern package managers support workspaces natively.

## Decision: Zod schemas in `packages/shared` as the single source of truth

**Context:** The API must validate incoming requests (cart items, checkout payloads, discount codes), and the frontend builds those same payloads. Defining types and validation separately means two definitions of every contract that can silently drift apart.

**Options Considered:**
- Option A: Zod schemas in `packages/shared`, TypeScript types derived via `z.infer` — one definition per contract; the API validates with the exact schema the frontend imports.
- Option B: Plain TypeScript interfaces in shared + hand-written validation in the API — types erase at runtime, so validation logic duplicates the interface and drifts when it changes.
- Option C: JSON Schema / OpenAPI-first with codegen — the most "enterprise" option, but codegen pipelines are heavy machinery for a five-endpoint MVP.

**Choice:** Zod schemas in `packages/shared` with `z.infer` derived types.

**Why:** Every request/response contract is defined exactly once. The API gets runtime validation with descriptive errors, the frontend gets compile-time types, and both are guaranteed identical because they're the same object. Changing a contract is one edit that both sides pick up immediately — the strongest safety property available at this project size, with almost no ceremony.

## Decision: Frontend stack — Vite + React SPA, Tailwind CSS, TanStack Query

**Context:** The storefront needs a product grid, cart, checkout with discount-code entry, and an admin stats view — all backed by the Express API — without ballooning the scope of a v1.

**Options Considered:**
- Option A: Vite + React SPA — instant setup, dev-server proxy to the API, shares Vitest with the rest of the repo; no server-rendering machinery to maintain.
- Option B: Next.js — powerful, but SSR/App Router solve SEO and routing problems this app doesn't have, and its API routes duplicate what Express already does.
- Option C: Server-rendered templates from Express (EJS/Handlebars) — fewest moving parts, but poor fit for the interactive cart/checkout flows and can't reuse shared types as naturally.

**Choice:** Vite + React + TypeScript, styled with Tailwind CSS, server state via TanStack Query.

**Why:** A SPA is the honest architecture for an API-driven store — no SEO requirement means SSR is pure overhead. Vite keeps the toolchain consistent (Vitest, TS config inheritance). Tailwind gets a presentable UI fast without CSS files to maintain. TanStack Query handles caching, loading/error states, and refetch-after-mutation for cart and stats — and since all meaningful state lives on the server, no Redux or other client-state library is needed. React for its ecosystem maturity and how naturally it pairs with the shared TypeScript contracts.

## Decision: Global nth-order counting, with codes generated by the admin API

**Context:** The discount requirement — "every nth order gets a coupon code" — can be read two ways on two axes: counted per-customer or store-wide, and issued automatically at checkout or on demand through the admin API.

**Options Considered:**
- Option A: Global counting + admin-triggered generation — the nth order store-wide opens an "eligibility window"; each window entitles the admin to generate exactly one store-wide, single-use code.
- Option B: Per-customer counting — every customer's own nth order earns them a personal code; more like a loyalty program, but requires per-customer order history and code ownership, and makes an admin "generate" endpoint redundant.
- Option C: Auto-issue at checkout — the nth order response carries a code directly; simplest UX, but leaves the admin generation endpoint with nothing to do.

**Choice:** Global counting with admin-triggered generation (Option A). Windows queue if the admin generates late — 2n orders with no codes yet means two codes can be generated, but never more codes than windows.

**Why:** Global counting matches the real-world pattern ("our 1000th customer gets a discount") for a store-wide promotion. Making the admin API the issuer is the only reading in which both behaviors — checkout *validating* a code and the admin *generating* one when the condition is satisfied — have a real job. The checkout response still carries an `unlockedDiscountEligibility` flag so the storefront can celebrate the nth order without owning issuance.

## Decision: All money as integer cents

**Context:** Checkout applies a percentage discount to a cart subtotal, and stats sum revenue and discounts across orders — classic territory for floating-point drift (`0.1 + 0.2 !== 0.3`).

**Options Considered:**
- Option A: Integer cents everywhere (`priceCents: 1299`), rounding applied once at the single point a percentage is taken.
- Option B: Floats for dollars (`price: 12.99`) — reads naturally but accumulates representation error across sums, and "how do you round?" becomes an answer per call site.
- Option C: A decimal library (decimal.js / dinero.js) — correct but a dependency this MVP doesn't need when cents-as-integers already gives exact arithmetic.

**Choice:** Integer cents in every schema, store, and API response; `Math.round((subtotal × percentOff) / 100)` at the one place a fraction can appear; the frontend formats cents for display.

**Why:** Integer arithmetic is exact — sums in stats can never drift, and equality in tests is trivial. Confining rounding to a single expression makes the rounding policy auditable and testable (a 555-cent cart at 10% is asserted to discount 56, not 55.5). The naming convention (`*Cents`) makes the unit impossible to misread at any call site.

## Decision: In-memory store as an injectable class, with all logic in services

**Context:** v1 deliberately runs on an in-memory store (no database), but "in-memory" done as module-level singletons makes tests order-dependent and leaves no seam for ever swapping in a database.

**Options Considered:**
- Option A: An `InMemoryStore` class holding plain state (Maps + an orders array), injected into service classes; the Express app is built by a `createApp(store, config)` factory.
- Option B: Module-scope singleton Maps imported wherever needed — least code, but tests share mutable global state and the HTTP layer can't be instantiated fresh per test.
- Option C: A repository-interface layer per entity — the "proper" enterprise shape, but five interfaces deep for an MVP whose store is a handful of Maps.

**Choice:** Injectable `InMemoryStore` + service classes (`CartService`, `DiscountService`, `CheckoutService`, `StatsService`) + an app factory; routes stay thin (HTTP + validation only).

**Why:** Every test gets a fresh, isolated world — unit tests instantiate services directly with a small catalog and fast discount config (n=2/3), and the integration test boots a real app the same way. Business rules live in exactly one layer, which is the layer the unit tests target. And the store's surface is small enough that replacing it with a database-backed implementation later is a contained change rather than a rewrite.
