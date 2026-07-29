# Design Decisions

## Decision: Node.js + TypeScript for the stack

**Context:** The assignment allows any stack, but the client primarily works with TypeScript/Node.js. I need a stack that lets me move fast on an MVP while demonstrating skills relevant to how the client actually works.

**Options Considered:**
- Option A: Node.js + TypeScript — matches the client's stack, strong typing for domain logic (cart, orders, discounts), huge ecosystem for testing and scaffolding.
- Option B: Node.js + plain JavaScript — slightly faster to start, but loses compile-time safety on business logic the assessment is graded on.
- Option C: Another stack I know (e.g. Python/Go) — viable, but signals less alignment with the client's day-to-day work.

**Choice:** Node.js + TypeScript.

**Why:** TypeScript's type system makes the core business logic (discount eligibility, order counting, checkout validation) self-documenting and safer to refactor, and it mirrors the client's production stack — so the code I'm assessed on looks like the code I'd actually write for them. The compile step is a minor cost for a project this size.

## Decision: Monorepo layout (backend + optional frontend in one repo)

**Context:** Backend APIs are required; a frontend is a bonus that I intend to ship from the start. I want both in one repo without mixing concerns, keeping a clean separation between frontend and backend code. The submission is a single GitHub repo link, and commit history across the whole project should tell one coherent story.

**Options Considered:**
- Option A: Monorepo with workspaces (e.g. `apps/api`, `apps/web`, shared types in `packages/`) — one repo, one setup command, shared TypeScript types between API and UI.
- Option B: Single-package repo (backend only, frontend bolted in later) — simplest now, but adding a frontend later means either restructuring or mixing concerns in one `src/`.
- Option C: Separate repos for frontend and backend — clean separation, but the assignment asks for one repo link, and it doubles setup/review friction.

**Choice:** Monorepo with workspaces.

**Why:** It keeps frontend/backend code separated at the directory level while sharing one toolchain, one lockfile, and one commit history — which suits the "show your progression" requirement. API request/response types live in a shared package so both sides stay in sync. The overhead is minimal since modern package managers support workspaces natively.

## Decision: Zod schemas in `packages/shared` as the single source of truth

**Context:** The API must validate incoming requests (cart items, checkout payloads, discount codes), and the frontend builds those same payloads. Defining types and validation separately means two definitions of every contract that can silently drift apart.

**Options Considered:**
- Option A: Zod schemas in `packages/shared`, TypeScript types derived via `z.infer` — one definition per contract; the API validates with the exact schema the frontend imports.
- Option B: Plain TypeScript interfaces in shared + hand-written validation in the API — types erase at runtime, so validation logic duplicates the interface and drifts when it changes.
- Option C: JSON Schema / OpenAPI-first with codegen — the most "enterprise" option, but codegen pipelines are heavy machinery for a five-endpoint MVP.

**Choice:** Zod schemas in `packages/shared` with `z.infer` derived types.

**Why:** Every request/response contract is defined exactly once. The API gets runtime validation with descriptive errors, the frontend gets compile-time types, and both are guaranteed identical because they're the same object. Changing a contract is one edit that both sides pick up immediately — the strongest safety property available at this project size, with almost no ceremony.

## Decision: Frontend stack — Vite + React SPA, Tailwind CSS, TanStack Query

**Context:** The frontend is a bonus deliverable that should demonstrate competence without ballooning scope. It needs a store view, cart, checkout with discount code entry, and an admin stats view — all backed by the Express API.

**Options Considered:**
- Option A: Vite + React SPA — instant setup, dev-server proxy to the API, shares Vitest with the rest of the repo; no server-rendering machinery to maintain or explain.
- Option B: Next.js — powerful, but SSR/App Router solve SEO and routing problems this app doesn't have, and its API routes duplicate what Express already does.
- Option C: Server-rendered templates from Express (EJS/Handlebars) — fewest moving parts, but demonstrates far less frontend skill and can't reuse shared types as naturally.

**Choice:** Vite + React + TypeScript, styled with Tailwind CSS, server state via TanStack Query.

**Why:** A SPA is the honest architecture for an API-driven store demo — no SEO requirement means SSR is pure overhead. Vite keeps the toolchain consistent (Vitest, TS config inheritance). Tailwind gets a presentable UI fast without CSS files to maintain. TanStack Query handles caching, loading/error states, and refetch-after-mutation for cart and stats — and since all meaningful state lives on the server, no Redux or other client-state library is needed. React specifically because it's the likeliest match for the client's own stack.
