---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
workflowType: 'architecture'
lastStep: 8
status: 'complete'
project_name: 'bmad'
user_name: 'guy'
date: '2026-04-29'
completedAt: '2026-04-29'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (48 FRs across 12 capability areas):**

The FR contract splits cleanly along the phase boundary:
- **MVP (FR1–FR20, FR44):** purely client-side. Template authoring, run execution, reset/re-run, localStorage persistence with explicit empty-state and error messaging, and keyboard-operable accessibility floor.
- **Growth (FR21–FR43, FR45):** introduces a backend. Run history/archive (still local), item refinements (local), and four backend-dependent capability areas — Publish, Browse/Copy, PWA install, and Identity/Moderation.
- **Vision (FR46–FR48):** portability and cross-device sync.

The architecturally significant FRs are:
- **FR12 (visible go-state):** the wedge moment; animation and rendered state, not just data state.
- **FR16 (single active run per template):** open question — concurrency model for runs.
- **FR17–FR20 (localStorage as source of truth):** v1 has no backend at all; the storage interface must abstract this so Growth can swap without rewriting call sites.
- **FR31 (authorship attribution):** open question — anonymous client-generated handle vs authenticated account. This is the single biggest deferred decision; it shapes schema, auth surface, moderation tooling, and rate-limit posture.
- **FR37 (fork semantics):** a copied template is a deep, independent snapshot — no foreign key to source, no propagation.
- **FR38 (featured/popular ranking):** open question — ranking signal definition deferred until registry has content.

**Non-Functional Requirements (21 NFRs across 6 categories):**

NFRs that materially constrain the architecture:
- **NFR4 (≤ 150 KB gzipped initial bundle, CI-gated):** hard budget. Eliminates several framework-and-tooling combos. React + heavy state library is borderline; Preact/Solid/Svelte/vanilla pass comfortably.
- **NFR1–NFR3 (FCP ≤ 1.5s, TTI ≤ 2s, p95 interaction ≤ 100ms on mid-range mobile / 4G):** demands code splitting, lean runtime, no main-thread blocking on tick.
- **NFR6–NFR8 (data durability, fail-safe localStorage error handling, full offline operation):** v1 is offline-by-default; the architecture must treat the network as absent.
- **NFR9 (Growth registry ≥ 99.5%):** modest availability target — single-region with backups and CDN front is enough; no multi-region complexity needed.
- **NFR11 (XSS sanitization on rendered registry content):** user-generated checklist items are rendered both client-side (in the browser app) and server-side (on SSR/SSG registry pages). Sanitization must happen at both render points or at write-time.
- **NFR15 (≤ 5 MB total app data per browser):** localStorage sizing budget. Defines schema compactness and where archival data has to migrate when limits are hit.
- **NFR17–NFR19 (a11y floor in MVP, WCAG 2.1 AA in Growth):** keyboard + contrast must land at MVP so the Growth AA pass isn't a rewrite. Design tokens and focus management belong to MVP scaffolding even though the formal audit is Growth.

**Scale & Complexity:**

- **Primary domain:** web. v1 is a browser SPA. Growth adds a backend service for the public registry plus an SSR/SSG-rendered registry surface. The authoring app remains client-rendered throughout.
- **Complexity level:** medium. The MVP slice is genuinely simple (localStorage CRUD with throwaway data). The Growth slice introduces five concerns simultaneously — public storage, identity, moderation, content lifecycle, and SEO-grade SSR — which is what pulls the whole project to medium per the PRD classification.
- **Estimated architectural components (Growth-era end state):** ~7. Authoring SPA, storage abstraction, registry API service, registry persistence, SSR/SSG registry surface, moderation queue, identity layer (form TBD per FR31).

### Technical Constraints & Dependencies

**From the PRD, already decided:**
- v1 is a static-deployable SPA with no backend dependency at runtime.
- v1 data is intentionally throwaway when the Growth backend lands; no v1→v2 migration burden.
- localStorage is the v1 source of truth, accessed via a storage abstraction so the call surface survives the Growth migration.
- Browser support: latest two stable Chrome / Safari / Firefox / Edge, desktop and mobile (incl. Samsung Internet on Android). IE and pre-Chromium-100 / pre-WebKit-16 in-app browsers are explicitly out of scope.
- Mobile-web-first for the run view; one-thumb interaction at small viewport is the design baseline.
- 150 KB gzipped initial JS bundle is a hard CI-gated budget.
- Framework choice is open; the product has no framework-specific needs.
- SSR or SSG required for Growth-era public registry pages (SEO is a primary acquisition channel per Pat's journey). The authoring app stays CSR.
- Fork semantics for copied templates — no live link to source, no propagation.

**Open and deferred to architecture:**
- Authorship/identity model for publishing (FR31). Anonymous client-generated handle vs authenticated account. Affects schema, abuse posture, moderation surface.
- Concurrency model for runs per template (FR16) — confirm "single active run replaces previous" or revisit.
- Ranking/featuring signal for registry browse surface (FR38) — defer until content exists, but architecture should not foreclose options.

### Cross-Cutting Concerns Identified

- **Storage abstraction layer.** v1 source of truth is localStorage; Growth introduces remote persistence for *some* data (published templates, registry metadata) while local storage continues to host private templates and run state. The abstraction must support a hybrid local+remote model in Growth, not just a swap.
- **Hybrid rendering model.** CSR for the authoring app, SSR/SSG for the registry surface. Likely two build outputs sharing a component library, or a meta-framework that handles both modes (Next/Nuxt/SvelteKit/SolidStart). Bundle budget pressure pushes toward the lighter end of that list.
- **Content sanitization.** User-authored item text is rendered in the run view (client), the template editor (client), the browse surface (SSR/SSG), and the template detail page (SSR/SSG). XSS surface is non-trivial. Sanitize at write-time to the registry plus defense-in-depth at render.
- **Accessibility scaffolding.** The Growth WCAG 2.1 AA target is achievable cheaply only if the MVP component primitives (focus trap, aria, semantic roles) are right from day one. Avoid baking in divs-as-buttons.
- **Fork-time data semantics.** A copied template must be self-contained — no references back to the source row, no propagation of edits, no shared state. Schema design must encode this: templates are value-typed, not reference-typed, in the registry.
- **Identity bootstrapping discontinuity.** v1 has no notion of users. Growth needs *some* authorship attribution per FR31. Whatever model is chosen, the introduction must not break the no-friction zero-signup posture of MVP for users who don't publish.
- **Bundle budget governance.** 150 KB gzipped is a hard CI gate. Every dependency added to MVP must clear that gate. This is a recurring architectural concern, not a one-time decision.
- **Throwaway-data discipline.** Designing the v2 (Growth) schema cleanly requires *not* trying to forward-port the v1 localStorage shape. Architecture should treat them as independent designs that share an interface, not a lineage.

## Starter Template Evaluation

### Primary Technology Domain

Web application — browser SPA in MVP, evolving to SPA + SSR/SSG public registry surface in Growth, with PWA install in Growth. The whole project lives in a single TypeScript codebase deployed behind a CDN.

### Starter Options Considered

**SvelteKit (Svelte 5 / TypeScript)** — chosen. Single meta-framework covering CSR (authoring app), SSR/SSG (Growth registry pages), and PWA (Growth install) without a second tool. Svelte 5 + runes cuts client bundle ~42% vs Svelte 4. Built-in TypeScript, ESLint, Prettier, Vitest. Compile-time a11y warnings push the keyboard + contrast floor closer to free. `static` adapter ships v1 as a pure CDN-hostable bundle; swap to a Node or edge adapter in Growth without rewriting routes. Currently at v2.20.4, stable, actively maintained.

**SolidStart (v2.0.0-alpha.2)** — rejected. Compelling on bundle size and SSR performance (TTFB ~42ms p50) and the fine-grained reactivity model is a strong fit for the per-item tick UI. But v2 is alpha as of Feb 2026 with the DeVinxi architectural rewrite still landing. Too much foundation churn for a project that wants momentum.

**Astro 6 (with islands)** — rejected as the *primary* tool, kept as an option for the registry surface in Growth if SvelteKit's SSR proves insufficient. Astro is excellent for content-shaped pages but the authoring app is highly interactive (template editor, run view with live tick state) — that's the case islands architecture is *not* trying to optimize for.

**Next.js + Preact compat** — rejected. The React + Next baseline (~80–90 KB gzipped before app code) leaves only ~60–70 KB inside the budget for the entire MVP, and Preact compat trades native React tooling fidelity for size. Fighting the framework rather than working with it.

### Selected Starter: SvelteKit (Svelte 5, TypeScript)

**Rationale for Selection:**

- One framework covers the entire MVP → Growth arc — no second framework decision later when the registry surface lands.
- Smallest runtime in the meta-framework category; comfortably inside the 150 KB gzip hard budget with room for app code.
- TypeScript-native; first-class a11y story via compile-time warnings, which derisks the Growth WCAG 2.1 AA target.
- Built-in PWA support via `@vite-pwa/sveltekit` (well-maintained Vite PWA plugin).
- Adapter model means v1 ships as static assets (`@sveltejs/adapter-static`) and Growth swaps to Node/edge without rewriting application code.

**Initialization Command:**

```bash
npx sv create checklist-app
# Selections (interactive prompts):
#   Template: SvelteKit minimal
#   TypeScript syntax: Yes
#   Add-ons: ESLint, Prettier, Vitest
#   Package manager: pnpm (or npm)
cd checklist-app && pnpm install
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript with strict mode; tsconfig generated.
- Node.js 22+ for local dev and build.
- ESM-only.

**Styling Solution:**
- *Not chosen by the starter.* Decided in the next step (likely Tailwind for utility-first + small runtime, or vanilla CSS with custom properties — to be confirmed).

**Build Tooling:**
- Vite as the underlying build tool.
- `@sveltejs/adapter-static` for v1 (CDN-hostable static output, no server needed).
- Migration path to `@sveltejs/adapter-node` or edge adapter for Growth registry surface.

**Testing Framework:**
- Vitest for unit tests.
- Playwright recommended for e2e (added separately in a later decision).

**Code Organization:**
- File-system routing under `src/routes/`.
- `src/lib/` for shared modules — including the storage abstraction layer (the call-surface boundary the PRD requires).
- Component primitives co-located by feature (template editor, run view, etc.).

**Development Experience:**
- Vite HMR.
- ESLint + Prettier preconfigured.
- TypeScript checking via `svelte-check`.

**Deferred from this step (to step 4 — architectural decisions):**
- Styling solution (Tailwind vs vanilla CSS vs other).
- State management approach (Svelte stores vs runes-based pattern).
- Storage interface design (localStorage v1, hybrid local+remote in Growth).
- PWA manifest and service-worker strategy (Growth-era).
- Backend stack for the Growth registry (Node + framework choice + DB choice).
- SSR/SSG split for registry pages.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block MVP implementation):** styling solution, state management pattern, storage abstraction interface, hosting/deployment target, CI bundle-budget enforcement.

**Important (shape architecture, decided now to avoid Growth-era rewrites):** Growth backend stack (API surface, persistence, ORM), authorship/identity model (resolves PRD open question FR31), API design pattern, registry rendering split (SSG vs SSR vs hybrid).

**Deferred (insufficient information to commit):** registry ranking signal (PRD FR38, defer until content exists); reduced-motion + preference handling (Vision-tier accessibility); analytics/telemetry stack (operational concern, decide at launch time); error-monitoring vendor (Sentry vs alternatives — can be added without disruption).

### Data Architecture

**v1 (MVP) — localStorage as source of truth.**
- **Schema:** three top-level entities — `Template`, `Run` (0..1 active per template per FR16), `Settings` (handle, preferences). Stored as JSON under namespaced localStorage keys.
- **Validation:** [Valibot](https://valibot.dev) at the storage boundary (read + write). Chosen over Zod because it tree-shakes far smaller — material to NFR4.
- **ID generation:** [`nanoid`](https://github.com/ai/nanoid) for template and run IDs (compact, URL-safe, ~120 bytes minified).
- **Schema versioning:** every persisted blob carries a `schemaVersion` integer. v1 ships at `1`. The PRD declares v1 data throwaway when Growth lands; the field exists for *intra-v1* migrations only (e.g., adding a field to templates within MVP).
- **Caching:** none in v1 — localStorage is the cache. Run state is in-memory hydrated from localStorage on app boot.

**v2 (Growth) — registry persistence layer added.**
- **Database:** [Neon Postgres](https://neon.tech) (managed, serverless, branching for env separation, generous free tier). Properly relational; supports the moderation queue + future ranking signals without rewrite. Rejected: Cloudflare D1 (SQLite at edge — appealing latency story but query/size limits are real and the FR38 ranking decision could push past them); Supabase (good but bundles auth + RLS + storage which we don't need; more vendor surface).
- **ORM:** [Drizzle ORM](https://orm.drizzle.team) — TypeScript-native, tree-shakable, SQL-shaped (not Active Record). Schema lives in TS, types flow to API layer for free.
- **Schema:** registry tables — `published_templates`, `flags`, future `featured_signals`. Templates stored value-typed (per FR37 fork semantics): each row contains the full template body plus authorship handle + moderation token.
- **Migrations:** Drizzle Kit, file-based, run on deploy.

### Authentication & Security

**Resolves PRD open question FR31: anonymous client-generated handle for Growth; authenticated accounts deferred to Vision (matches PRD scope binning).**

**v1 (MVP):** no auth. App stores no PII. Nothing to secure beyond localStorage hygiene.

**v2 (Growth) — anonymous handle model:**
- **Handle:** generated client-side on first publish using a word-pair + 4-digit suffix scheme (e.g., `happy-otter-7821`). Persisted in localStorage. User can rename on first publish (uniqueness checked server-side; collisions get a numeric suffix bump).
- **Moderation token:** generated per-publish, returned to client, persisted in localStorage. Required for unpublish (FR32) and any future template edits. Lost token = lost ability to unpublish; this is an explicit accepted limit of the anonymous model and is surfaced in publish UI copy.
- **Abuse posture:** edge-layer per-IP rate limits on publish, flag, and copy endpoints (Cloudflare WAF / Workers rate limit primitives). No CAPTCHA in Growth v1 — add only if abuse materializes.
- **Moderation:** flagged content surfaces in an internal moderation queue (FR42, FR43). Operator removal is hard-delete; flagged-but-not-removed templates remain published.

**Cross-cutting security:**
- All registry traffic over HTTPS (NFR12) — terminated at Cloudflare.
- **XSS sanitization:** template body stored verbatim; rendered with text-only escaping client- and server-side. No HTML in template items in MVP or Growth v1 (rich-text deferred to Vision). NFR11 satisfied by *not allowing HTML* rather than by sanitization.
- **CSP headers** on the registry surface: `default-src 'self'`, no inline scripts (SvelteKit supports nonce-based CSP).
- **No third-party tracking** in v1 or Growth v1 — supports the privacy posture in NFR10.

**Vision (deferred):** OAuth provider (likely GitHub for the dev-leaning early audience, plus email magic-link) for users who want persistent accounts, sync (FR48), and reputation. Architecturally additive — accounts attach to existing handles rather than replacing them.

### API & Communication Patterns

**Pattern:** REST, exposed via SvelteKit `+server.ts` route handlers. Rejected tRPC (extra dependency for a small surface; types already cross client/server cleanly because both sides are TS in the same repo) and GraphQL (overkill for ~8 endpoints).

**Endpoint surface (Growth v1):**
- `POST /api/templates` — publish
- `DELETE /api/templates/:id` — unpublish (mod token required)
- `GET /api/templates` — list/search (query params: `q`, `tag`, `cursor`, `limit`)
- `GET /api/templates/:id` — fetch one (with full body)
- `POST /api/templates/:id/copy` — record a copy event (for ranking signal); returns the template body
- `POST /api/templates/:id/flag` — moderation flag
- `GET /api/health` — liveness

**Conventions:**
- JSON in / JSON out. Validated on entry with Valibot schemas shared with the client.
- **Error format:** `{ error: { code: string, message: string, details?: unknown } }` with appropriate HTTP status. Codes are stable; messages are human-readable.
- **Pagination:** cursor-based on `(created_at, id)` for browse/search. No offset pagination (avoids hot-path OFFSET cost).
- **Rate limits:** Cloudflare Workers KV-backed counters, per-IP. Numbers tunable at deploy time; start conservative.
- **API versioning:** none in URL. If a breaking change is ever needed, introduce `/api/v2/`. Until then, URLs are stable.
- **Documentation:** OpenAPI emitted from route handlers via [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) (works with Valibot via converter); generated at build time. Lightweight, no runtime dependency.

### Frontend Architecture

**State management:** Svelte 5 **runes** (`$state`, `$derived`, `$effect`). No external state library. Per-domain stores under `src/lib/state/` — `templates.svelte.ts`, `activeRun.svelte.ts`, `settings.svelte.ts`. Each exports a singleton state object backed by the storage abstraction. No Redux, no Zustand — runes plus localStorage are sufficient and bundle-cheap.

**Component architecture:** feature-folder organization.

```
src/lib/
  features/
    templates/      # editor, list, item authoring
    runs/           # active run view, tick UI, go-state
    archive/        # run history (Growth)
    registry/       # browse, detail, publish, copy (Growth)
  components/       # design-system primitives: Button, Checkbox, Input, etc.
  state/            # rune-based stores (one file per domain)
  storage/          # storage abstraction (the v1→v2 hinge)
  api/              # registry client (Growth) — uses fetch, typed via shared schemas
```

**Storage abstraction (the PRD-mandated hinge):**
- Interface lives at `src/lib/storage/index.ts`.
- Methods: `getTemplates()`, `getTemplate(id)`, `saveTemplate(t)`, `deleteTemplate(id)`, `getActiveRun(templateId)`, `saveRun(r)`, `clearRun(templateId)`, `archiveRun(r)`.
- v1 implementation: `LocalStorageBackend`. v2 will introduce `HybridBackend` that fronts a remote store for *published* template bodies fetched from the registry, while *private* templates and run state remain local. **Critical:** the abstraction returns the same TS types regardless of backend — call sites do not branch on storage source.
- **Quota detection:** on every write, catch `QuotaExceededError` and surface to the UI via a single `StorageError` type (FR20, NFR7).

**Routing strategy:** SvelteKit file-system routing. Routes:
- `/` — template list (home)
- `/templates/new` — new template editor
- `/templates/:id` — edit template
- `/templates/:id/run` — run view (the hot path; designed for small-viewport one-thumb)
- `/browse` — registry browse (Growth, SSG-rendered shell + client search)
- `/t/:id` — public template detail page (Growth, SSR for SEO; FR30 stable URLs)

**Rendering split (Growth):**
- Authoring app routes (everything under `/templates`): pure CSR via static adapter.
- `/browse`: SSG shell (top featured templates pre-rendered) + client-side search hitting the API.
- `/t/:id`: SSR with cache headers tuned for CDN edge caching. Each page has full OpenGraph metadata + structured data (deferred to Vision for `HowTo` markup per PRD).

**Performance optimization:**
- **Bundle budget enforcement:** [`size-limit`](https://github.com/ai/size-limit) configured in CI to fail builds over 150 KB gzipped initial JS. Per-route budgets configured for the run view (the hot path) — stricter, ~80 KB.
- **Code splitting:** registry features (`/browse`, `/t/:id`) ship in their own chunks, not loaded on the authoring path.
- **No client-side hydration on `/t/:id`** beyond the "Copy to my templates" button — keeps the SEO landing pages near-zero JS.

**Styling solution:** [Tailwind CSS v4](https://tailwindcss.com) with the new Vite/Lightning CSS engine.
- Rationale: utility-first means zero unused CSS in the production bundle (purges to nothing). Design tokens via `@theme` in CSS — supports the design-token discipline that the WCAG 2.1 AA Growth target needs.
- Rejected vanilla CSS (more discipline cost; we'd recreate Tailwind's primitives by hand) and CSS-in-JS (runtime cost, fights the bundle budget).

**PWA strategy (Growth):** [`@vite-pwa/sveltekit`](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html) with `injectManifest` mode.
- Service worker pre-caches the authoring app shell + static assets.
- Run-time caching: registry API responses cached with `staleWhileRevalidate`.
- Authoring + run paths work offline (FR40, NFR8).
- Manifest configured for installability (FR39).

### Infrastructure & Deployment

**Hosting:**
- **v1 (MVP):** [Cloudflare Pages](https://pages.cloudflare.com) — `@sveltejs/adapter-static` build, CDN edge, free tier covers expected v1 traffic. Single git push → deploy.
- **Growth:** Cloudflare Pages + Cloudflare Workers (via [`@sveltejs/adapter-cloudflare`](https://kit.svelte.dev/docs/adapter-cloudflare)) for the API surface. Neon Postgres for persistence (separate provider; Neon connection from Workers via [HTTP driver](https://neon.tech/docs/serverless/serverless-driver)). One provider for hosting + serverless edge runtime + WAF/rate limits; one provider for DB.
- **Why Cloudflare over Vercel:** comparable DX, more aggressive free tier, better edge primitives (KV for rate limits, Workers Analytics Engine for ranking signal data when FR38 is decided). Vercel is acceptable; not chosen because the cost gradient is worse at modest scale and the edge primitives are weaker for this workload.

**CI/CD:** GitHub Actions.
- On PR: typecheck (`svelte-check`), lint, unit tests (Vitest), bundle-size check (`size-limit`), preview deploy (CF Pages previews).
- On main: full pipeline + production deploy.
- E2E (Playwright) on a nightly schedule once added; not blocking PRs initially to keep the loop fast.

**Environment configuration:** standard `.env` per environment, secrets in CF Pages env vars + GitHub Actions secrets. No secrets in repo.

**Monitoring & logging:**
- v1: Cloudflare Analytics (traffic, Web Vitals via the free RUM beacon — directly usable for NFR1–NFR3 / NFR5 verification).
- Growth: add structured logging from Workers to a log drain (e.g., [Axiom](https://axiom.co) free tier or CF Logpush to R2). Add Sentry for client + server errors; defer the exact vendor to launch time.
- **No analytics on the authoring path in v1 or Growth** — supports NFR10.

**Scaling strategy:** the registry's NFR16 target (10K templates, 1K concurrent browse) is comfortably inside CF Workers + Neon at the lowest paid tier. Vertical scaling is via Neon compute size; horizontal for read load is via CF edge caching of GET endpoints with short TTLs and stale-while-revalidate.

### Decision Impact Analysis

**Implementation sequence (informs epic ordering):**
1. Project init (`npx sv create`), Tailwind v4 wired up, CI with bundle-budget gate, deploy stub to CF Pages — proves the pipeline before any feature work.
2. Storage abstraction + Valibot schemas + state stores. The hinge — must land before any UI binds to a concrete storage.
3. Template authoring (FR1–FR7) against the abstraction.
4. Run execution + go-state + reset (FR8–FR16). The wedge moment lives here.
5. Local persistence error handling (FR17–FR20) + a11y floor (FR44, NFR17–NFR18).
6. **MVP ship gate.**
7. Backend project (Neon DB, Drizzle schema, SvelteKit API routes, CF Workers adapter swap).
8. Publish + handle generation (FR28–FR32, FR41).
9. Browse + search + copy + fork (FR33–FR38).
10. Moderation surface (FR42–FR43).
11. Archive (FR21–FR24), item refinements (FR25–FR27).
12. PWA install + offline (FR39–FR40).
13. WCAG 2.1 AA audit + fixes (FR45, NFR19).

**Cross-component dependencies:**
- Storage abstraction is upstream of every feature — must land first.
- Handle generation (anonymous identity) blocks publish (FR28) and is a prerequisite for moderation (FR42).
- The CSR ↔ SSR adapter swap (Cloudflare adapter) gates the entire registry surface.
- Design tokens established at MVP time gate the Growth-era WCAG audit's cost — late tokens = expensive audit.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 11 areas where AI agents could diverge — naming, file layout, API shape, state, validation, errors, loading, logging, testing, imports, and access boundaries.

### Naming Patterns

**Database Naming (Growth):**
- Tables: `snake_case`, plural — `templates`, `template_items`, `flags`
- Columns: `snake_case` — `created_at`, `author_handle`, `source_template_id`
- PK: `id` (text, ULID-generated client-side for portability between local + server)
- FK: `<singular>_id` — `template_id`, `source_template_id`
- Timestamps: `created_at`, `updated_at` (UTC, `timestamptz`)
- Indexes: `idx_<table>_<col>` — `idx_templates_published_at`

**API Naming:**
- Routes: plural resources, kebab-case if multi-word — `/api/templates`, `/api/templates/:id/copy`
- Route params: SvelteKit `[id]` in folder names, `:id` in docs
- JSON fields: `camelCase` — `createdAt`, `authorHandle`, `sourceTemplateId` (mapped from snake_case at the Drizzle layer)
- Query params: `camelCase` — `?cursor=...&limit=20&q=...`
- Headers: `X-Moderation-Token` for the per-publish token

**Code Naming:**
- Components: `PascalCase.svelte` — `TemplateCard.svelte`, `RunChecklist.svelte`
- Route files: SvelteKit standard — `+page.svelte`, `+page.ts`, `+server.ts`, `+layout.svelte`
- Route directories: kebab-case — `src/routes/templates/[id]/run/`
- TS modules: `kebab-case.ts` — `storage-backend.ts`, `template-store.svelte.ts`
- Functions/vars: `camelCase` — `getActiveRun()`, `templateId`
- Types/interfaces: `PascalCase` — `Template`, `RunItem`, `StorageBackend`
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_TEMPLATE_ITEMS`, `BUNDLE_BUDGET_KB`

### Structure Patterns

**Project Organization:** (locked in Step 4)
```
src/
  routes/                    SvelteKit routing only — no business logic
  lib/
    features/<feature>/      Feature-scoped components + logic (templates, runs, browse, share)
    components/              Cross-feature primitives (Button, Modal, Toast)
    state/                   Runes-based stores (*.svelte.ts)
    storage/                 StorageBackend interface + LocalStorage / Hybrid impls
    api/                     fetch wrappers, one file per resource
    schemas/                 Valibot schemas shared client+server
    server/                  Server-only — db/, auth/, never imported from client code
    utils/                   Pure helpers, no side effects
```

**Tests:** Co-located — `template-store.svelte.ts` + `template-store.test.ts` next to it. E2E in `tests/e2e/` (Playwright).

**Static assets:** `static/` for icons, `src/lib/assets/` for imported SVGs.

### Format Patterns

**API Response Formats:**
- Success (single): resource object directly — `{ id, name, items, ... }`
- Success (list): `{ items: [...], nextCursor: string | null }`
- Error: `{ error: { code: "VALIDATION_ERROR" | "NOT_FOUND" | ..., message: string, details?: object } }`
- Status codes: 200 OK, 201 Created, 204 No Content, 400 validation, 404 not found, 409 conflict (slug collision), 410 gone (flagged/removed), 429 rate limit, 500 server

**Data Formats:**
- Dates: ISO 8601 strings in JSON (`"2026-04-29T10:30:00.000Z"`), `Date` objects in TS at boundaries
- Booleans: `true`/`false`, never `1`/`0`
- IDs: ULID strings everywhere (client-generated, sortable, URL-safe)
- Nullability: prefer `null` over `undefined` in API payloads; `undefined` only for optional TS fields

### Communication Patterns

**State Management (Svelte 5 runes):**
- Stores live in `src/lib/state/*.svelte.ts`, export factory function or singleton getter
- All mutable state declared with `$state(...)`; derivations with `$derived(...)`; side effects with `$effect(...)`
- No external state library. No `writable`/`readable` from `svelte/store` for new code.
- Mutations: assign to `$state` directly. Encapsulate behind module functions — no component reaches into another feature's store.

**Action/Event Naming:**
- Custom DOM events from components: `kebab-case` — `on:item-toggled`, `on:run-archived`
- Internal store methods: imperative `camelCase` — `addItem()`, `archiveRun()`, `publishTemplate()`

### Process Patterns

**Validation:**
- Single Valibot schema per resource in `src/lib/schemas/`, imported by both client form and server `+server.ts`
- Server: parse on entry, return 400 with details on failure
- Client: parse before submit; UI surfaces field-level errors

**Error Handling:**
- Server: throw via SvelteKit `error(status, body)` helper; never raw `throw new Error()` in route handlers
- Client load failures: caught by `+error.svelte`
- User-triggered failures (publish, copy): handled in component, surfaced via `Toast` component
- Storage failures (quota exceeded): surfaced via dedicated `StorageError` toast with action link

**Loading States:**
- Route data: SvelteKit `load` + `+page.ts` — uses native `await`
- Inline async in templates: Svelte `{#await}` blocks with skeleton fallbacks
- Component-local fetches: `$state` flag `isLoading` + skeleton; no global spinner
- Optimistic UI for tick/uncheck (FR8) — revert on storage error

**Logging:**
- Dev: `console.log/warn/error` allowed
- Prod (Workers): structured JSON — `console.log(JSON.stringify({ level, msg, ...ctx }))`
- No third-party logger v1. Revisit when Growth metrics need it.

### Enforcement Guidelines

**All AI Agents MUST:**
- Never import from `src/lib/server/**` in client code (enforce via ESLint `no-restricted-imports`)
- Never access `localStorage` outside `src/lib/storage/**`
- Never `fetch()` outside `src/lib/api/**`
- Never query the database outside `src/lib/server/db/**`
- Never use `any` — use `unknown` + narrow, or define the type
- Always validate external input with a Valibot schema before use
- Always run through the `StorageBackend` interface — never branch on `if (online)` outside the backend factory

**Pattern Enforcement:**
- ESLint config encodes import boundaries and naming
- `tsc --noEmit` in pre-commit + CI
- size-limit gate enforces bundle budget (NFR1, NFR2)
- Pattern violations documented in `docs/patterns.md` (deferred until first violation)

### Pattern Examples

**Good — store module:**
```ts
// src/lib/state/template-store.svelte.ts
import { storage } from '$lib/storage';
let templates = $state<Template[]>([]);
export function getTemplates() { return templates; }
export async function loadTemplates() { templates = await storage.getTemplates(); }
export async function addTemplate(t: Template) { await storage.saveTemplate(t); templates = [...templates, t]; }
```

**Anti-pattern — direct localStorage in component:**
```svelte
<!-- NEVER -->
<script>const t = JSON.parse(localStorage.getItem('templates') ?? '[]');</script>
```

**Good — API error:**
```ts
// src/routes/api/templates/[id]/copy/+server.ts
import { error, json } from '@sveltejs/kit';
if (!source) throw error(404, { code: 'NOT_FOUND', message: 'Template not found' });
return json(forked, { status: 201 });
```

**Anti-pattern — generic `any`:**
```ts
// NEVER
function handle(payload: any) { ... }
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
checklist-app/
├── README.md
├── package.json
├── pnpm-lock.yaml
├── svelte.config.js                  Adapter swap point: static (v1) → cloudflare (Growth)
├── vite.config.ts                    PWA plugin, size-limit hooks, alias setup
├── tsconfig.json                     strict: true, no implicit any
├── tailwind.config.ts                Design tokens — locked early per Step 4
├── postcss.config.cjs
├── eslint.config.js                  Boundaries: no localStorage outside lib/storage, etc.
├── .prettierrc
├── .size-limit.json                  150 KB gzip total, 80 KB run view
├── .env.example
├── .env.local                        gitignored
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                    typecheck + lint + test + size-limit
│       └── deploy.yml                Cloudflare Pages deploy
├── docs/
│   ├── architecture.md               Symlink/copy of planning artifact
│   ├── prd.md                        Symlink/copy of planning artifact
│   └── patterns.md                   Pattern violations log (created on first violation)
├── src/
│   ├── app.html                      Root HTML shell — minimal, CSP meta
│   ├── app.css                       Tailwind directives + design tokens
│   ├── app.d.ts                      Global types, App.Locals, App.PageData
│   ├── service-worker.ts             @vite-pwa injectManifest entry (Growth phase)
│   ├── hooks.client.ts               Client-side error reporter (no-op v1)
│   ├── hooks.server.ts               Growth: rate-limit, structured logging
│   ├── routes/
│   │   ├── +layout.svelte            App shell, toast container, nav
│   │   ├── +layout.ts                csr=true; ssr per-route
│   │   ├── +page.svelte              Landing → redirects to /templates
│   │   ├── +error.svelte             Global error boundary
│   │   ├── templates/
│   │   │   ├── +page.svelte          Template list (FR1, FR4, FR5)
│   │   │   ├── +page.ts              load: storage.getTemplates()
│   │   │   ├── new/
│   │   │   │   └── +page.svelte      Create template (FR2, FR3, FR25, FR26)
│   │   │   └── [id]/
│   │   │       ├── +page.svelte      Template detail / edit (FR6, FR7)
│   │   │       ├── +page.ts
│   │   │       ├── run/
│   │   │       │   ├── +page.svelte  Active run view (FR8–FR13, FR16)
│   │   │       │   └── +page.ts
│   │   │       └── history/
│   │   │           └── +page.svelte  Archived runs (FR21–FR24)
│   │   ├── browse/
│   │   │   ├── +page.svelte          Public template registry (FR33–FR38) — SSG shell + client search
│   │   │   ├── +page.ts              prerender = true
│   │   │   └── +page.server.ts       Growth only: server-side fetch fallback
│   │   ├── t/
│   │   │   └── [id]/
│   │   │       ├── +page.svelte      Public landing for a published template — SSR for SEO
│   │   │       ├── +page.server.ts   load via DB
│   │   │       └── +page.ts
│   │   ├── settings/
│   │   │   └── +page.svelte          Export/import (FR46–FR48), handle display
│   │   └── api/                      Growth phase only — adapter-cloudflare emits Workers
│   │       ├── templates/
│   │       │   ├── +server.ts        GET list (FR33), POST publish (FR28)
│   │       │   └── [id]/
│   │       │       ├── +server.ts    GET, DELETE (FR32)
│   │       │       ├── copy/
│   │       │       │   └── +server.ts  POST copy → fork (FR30, FR37)
│   │       │       └── flag/
│   │       │           └── +server.ts  POST flag (FR42)
│   │       └── health/
│   │           └── +server.ts
│   └── lib/
│       ├── features/
│       │   ├── templates/            FR1–FR7, FR25–FR27 (authoring)
│       │   │   ├── TemplateCard.svelte
│       │   │   ├── TemplateForm.svelte
│       │   │   ├── ItemEditor.svelte
│       │   │   └── template-store.svelte.ts
│       │   ├── runs/                 FR8–FR16 (run execution + reset)
│       │   │   ├── RunChecklist.svelte
│       │   │   ├── RunItem.svelte
│       │   │   ├── ResetConfirmDialog.svelte
│       │   │   └── run-store.svelte.ts
│       │   ├── history/              FR21–FR24
│       │   │   ├── HistoryList.svelte
│       │   │   └── history-store.svelte.ts
│       │   ├── browse/               FR33–FR38 (registry consumer)
│       │   │   ├── BrowseGrid.svelte
│       │   │   ├── SearchBar.svelte
│       │   │   └── browse-store.svelte.ts
│       │   ├── share/                FR28–FR32 (publish + copy)
│       │   │   ├── PublishDialog.svelte
│       │   │   ├── CopyButton.svelte
│       │   │   └── share-actions.ts
│       │   ├── identity/             FR41 (anonymous handle)
│       │   │   └── handle.ts
│       │   └── moderation/           FR42–FR43
│       │       └── flag-actions.ts
│       ├── components/               Cross-feature primitives
│       │   ├── Button.svelte
│       │   ├── Modal.svelte
│       │   ├── Toast.svelte
│       │   ├── ToastContainer.svelte
│       │   ├── Skeleton.svelte
│       │   ├── EmptyState.svelte
│       │   └── Icon.svelte
│       ├── state/
│       │   ├── toast-store.svelte.ts
│       │   └── theme-store.svelte.ts
│       ├── storage/                  FR17–FR20 — the v1↔v2 hinge
│       │   ├── index.ts              Backend factory: returns LocalStorage or Hybrid
│       │   ├── types.ts              StorageBackend interface (8 methods, locked Step 4)
│       │   ├── localstorage-backend.ts
│       │   ├── hybrid-backend.ts     Growth phase
│       │   ├── ulid.ts               ID generation
│       │   └── storage-error.ts
│       ├── api/                      Client-side fetch wrappers (Growth)
│       │   ├── client.ts             fetch wrapper with error envelope handling
│       │   ├── templates.ts
│       │   └── moderation.ts
│       ├── schemas/                  Valibot — shared client + server
│       │   ├── template.ts
│       │   ├── run.ts
│       │   ├── publish.ts
│       │   └── flag.ts
│       ├── server/                   Server-only — never imported from client
│       │   ├── db/
│       │   │   ├── client.ts         Drizzle + Neon HTTP driver
│       │   │   ├── schema.ts         Tables: templates, template_items, flags
│       │   │   └── queries.ts
│       │   ├── moderation/
│       │   │   └── token.ts          Per-publish moderation token logic (FR41)
│       │   └── rate-limit.ts         CF Workers rate limiter
│       ├── utils/
│       │   ├── slug.ts
│       │   ├── date.ts
│       │   ├── escape.ts             Text-only XSS strategy (FR45 disallow HTML)
│       │   └── export.ts             JSON export/import (FR46–FR48)
│       ├── assets/                   Imported SVGs/icons
│       └── types.ts                  Cross-feature types (Template, Run, RunItem, etc.)
├── static/
│   ├── favicon.svg
│   ├── robots.txt
│   ├── manifest.webmanifest          PWA manifest (FR39)
│   └── icons/                        PWA install icons (192, 512, maskable)
├── tests/
│   ├── e2e/                          Playwright (FR8 happy path, FR16 confirm, FR46 export)
│   │   ├── create-and-run.spec.ts
│   │   ├── publish-and-copy.spec.ts
│   │   └── export-import.spec.ts
│   ├── fixtures/
│   │   └── templates.ts
│   └── setup.ts
└── drizzle/                          Growth phase
    ├── schema.ts                     Source of truth for migrations
    └── migrations/
        └── 0000_init.sql
```

### Architectural Boundaries

**API Boundaries (Growth):**
- All `/api/**` routes are SvelteKit `+server.ts` handlers compiled to CF Workers
- Each handler: parse Valibot schema → call `src/lib/server/db/queries.ts` → return `json()` or `error()`
- No business logic in handlers — query functions are the unit of reuse
- Public surface fixed at 7 endpoints (locked Step 4); any new endpoint requires architecture amendment

**Component Boundaries:**
- `lib/features/<x>/` may import from `lib/components/`, `lib/state/`, `lib/utils/`, `lib/schemas/`, `lib/storage/`
- `lib/features/<x>/` MUST NOT import from `lib/features/<y>/` — cross-feature coordination goes via `lib/state/` or routes
- `lib/components/` MUST NOT import from `lib/features/**` (primitives are leaf nodes)
- `lib/server/**` is firewalled from client code via ESLint + SvelteKit's automatic server boundary

**Data Boundaries:**
- All persistence flows through `lib/storage/index.ts` factory — no component touches `localStorage` or `fetch` directly
- v1: factory returns `LocalStorageBackend`; Growth: returns `HybridBackend` (local writes + opportunistic server sync for published templates only)
- Drizzle schema in `lib/server/db/schema.ts` is the single source of truth for the Postgres side; client never imports it

### Requirements to Structure Mapping

| FR Capability Area | Location |
|---|---|
| Template Authoring (FR1–FR7) | `lib/features/templates/`, `routes/templates/new`, `routes/templates/[id]` |
| Run Execution (FR8–FR13) | `lib/features/runs/`, `routes/templates/[id]/run` |
| Reset & Re-Run (FR14–FR16) | `lib/features/runs/ResetConfirmDialog.svelte`, `run-store.svelte.ts` |
| Local Persistence (FR17–FR20) | `lib/storage/localstorage-backend.ts`, `lib/storage/storage-error.ts` |
| Run History (FR21–FR24) | `lib/features/history/`, `routes/templates/[id]/history` |
| Item Refinements (FR25–FR27) | `lib/features/templates/ItemEditor.svelte` |
| Template Sharing (FR28–FR32) | `lib/features/share/`, `routes/api/templates/+server.ts`, `lib/storage/hybrid-backend.ts` |
| Template Discovery (FR33–FR38) | `lib/features/browse/`, `routes/browse`, `routes/t/[id]` |
| Mobile/PWA (FR39–FR40) | `service-worker.ts`, `static/manifest.webmanifest`, `vite.config.ts` |
| Identity & Moderation (FR41–FR43) | `lib/features/identity/`, `lib/features/moderation/`, `lib/server/moderation/` |
| Accessibility (FR44–FR45) | Cross-cutting — `lib/components/` primitives, `lib/utils/escape.ts` |
| Portability (FR46–FR48) | `lib/utils/export.ts`, `routes/settings` |

**Cross-Cutting Concerns:**
- **Toasts (errors, storage failures):** `lib/state/toast-store.svelte.ts` + `lib/components/ToastContainer.svelte` mounted in `+layout.svelte`
- **Theme/design tokens:** `tailwind.config.ts` + `app.css`; consumed everywhere via Tailwind classes
- **Anonymous handle:** `lib/features/identity/handle.ts` generates and persists once via storage backend; consumed by share + moderation features
- **Error boundary:** `routes/+error.svelte` for route load failures; component-level errors caught and surfaced via toast

### Integration Points

**Internal Communication:**
- Components → store: import store function, call mutator
- Store → storage: store calls `storage.X()`; storage backend resolved at app boot via factory
- Routes → features: route loads call store init; UI imports feature components
- Server handler → DB: handler imports `lib/server/db/queries.ts`

**External Integrations:**
- Neon Postgres via Drizzle HTTP driver (Growth) — single connection point in `lib/server/db/client.ts`
- Cloudflare Pages/Workers — adapter handles deployment; no direct CF API usage in app code
- No third-party JS libraries beyond stack core (Tailwind, Valibot, Drizzle, @vite-pwa) — bundle budget enforced

**Data Flow:**
- **v1 write:** Component → feature store → `storage.saveTemplate()` → `localStorage`
- **v1 read:** Route load → store init → `storage.getTemplates()` → `localStorage` → reactive `$state`
- **Growth publish:** Component → `share-actions.publish()` → `api/templates.ts POST` → `+server.ts` → Valibot parse → Drizzle insert → response → local mark as published
- **Growth copy:** Browse page → `api/templates.ts POST /:id/copy` → `+server.ts` → fork in DB + return forked template → local `storage.saveTemplate()` → navigate to it

### File Organization Patterns

**Configuration:** Root-level only — no nested `config/` directory. Adapter swap is the single hinge: `svelte.config.js` env-conditional adapter.

**Source:** Feature folders inside `lib/features/`. Route shells inside `routes/`. Reused leaf primitives in `lib/components/`.

**Tests:** Co-located unit tests next to source (`*.test.ts`). E2E tests in `tests/e2e/`. No separate `__tests__/` folder.

**Assets:** Public/PWA assets in `static/`. Imported assets (treeshaken) in `src/lib/assets/`.

### Development Workflow Integration

**Dev server:** `pnpm dev` → Vite dev server on `localhost:5173` with HMR. SvelteKit's adapter-static is bypassed in dev — full SSR available locally for previewing Growth-mode rendering.

**Build:** `pnpm build` → adapter emits to `.svelte-kit/output/` → adapter-static (v1) writes to `build/`; adapter-cloudflare (Growth) writes Worker bundle + `_app/` static assets. Both run `size-limit` post-build as CI gate.

**Deploy:** GitHub Actions `deploy.yml` → on `main` push → build → `wrangler pages deploy build/` (v1) or wrangler with Workers (Growth). Neon migrations run via `pnpm drizzle-kit push` in a separate manual step (no auto-migration on deploy).

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
SvelteKit 2.20.4 + Svelte 5 (runes) + TS 5.x + Tailwind v4 + Valibot + Drizzle + Neon + adapter-static (v1) → adapter-cloudflare (Growth) form a coherent stack with no version conflicts. The adapter swap is the single deployment-shape hinge — no other module needs to know about it, because the storage abstraction firewalls v1 from Growth-specific concerns. Anonymous handle (FR41 resolution) is independent of all other decisions and adds zero coupling.

**Pattern Consistency:**
Patterns reinforce decisions: feature folders match the storage abstraction's "no cross-feature reach," `lib/server/**` firewall enforces the CSR-vs-SSR boundary, Valibot schemas in `lib/schemas/` deliver the "validate at boundaries" rule from Step 4. Naming (snake_case DB, camelCase JSON, kebab-case routes) is internally consistent and matches Postgres + SvelteKit conventions.

**Structure Alignment:**
The directory tree maps 1:1 to the architectural decisions: `lib/storage/` is the single hinge, `lib/server/` is the single firewall, `lib/features/<x>/` is the single coordination unit. Every FR capability area has a home. Routes are thin shells; logic is in features and stores.

### Requirements Coverage Validation

**FR Coverage (48/48):**

| FR Capability Area | Architectural Support | Status |
|---|---|---|
| Template Authoring (FR1–FR7) | `lib/features/templates/` + storage abstraction | OK |
| Run Execution (FR8–FR13) | `lib/features/runs/` + run-store with optimistic UI | OK |
| Reset & Re-Run (FR14–FR16) | `ResetConfirmDialog` + schema-encoded 0..1 active run per template (resolves FR16 open question) | OK |
| Local Persistence (FR17–FR20) | `LocalStorageBackend` + `StorageError` toast pathway | OK |
| Run History (FR21–FR24) | `lib/features/history/` consumes archived runs from storage backend | OK |
| Item Refinements (FR25–FR27) | `ItemEditor.svelte` | OK |
| Template Sharing (FR28–FR32) | `lib/features/share/` + 3 publish/copy/delete endpoints + `HybridBackend` | OK |
| Template Discovery (FR33–FR38) | `lib/features/browse/` + `/browse` (SSG+client search) + `/t/:id` (SSR for SEO); FR38 ranking deferred but schema accommodates (`published_at`, `copy_count`, `flag_count`) | OK (FR38 deferred by intent) |
| Mobile/PWA (FR39–FR40) | `@vite-pwa/sveltekit` injectManifest + manifest.webmanifest | OK |
| Identity & Moderation (FR41–FR43) | `lib/features/identity/handle.ts` (anonymous handle resolves FR31) + `lib/server/moderation/token.ts` + flag endpoint | OK |
| Accessibility (FR44–FR45) | `lib/components/` primitives + `lib/utils/escape.ts` (text-only HTML strategy) | OK |
| Portability (FR46–FR48) | `lib/utils/export.ts` + `/settings` route | OK |

**Open questions resolved during architecture:**
- **FR31 (authorship):** Anonymous client-generated handle (`<word>-<word>-<4digit>`) + per-publish moderation token. No accounts in Growth.
- **FR16 (single active run):** Schema-encoded — at most one active run row per `template_id`. Confirmation dialog enforces UX.
- **FR38 (ranking):** Deferred until registry has content. Schema records `published_at`, `copy_count`, `flag_count` so any future ranking function has signals to operate on.

**NFR Coverage (21/21):**

| NFR Category | Architectural Mechanism | Status |
|---|---|---|
| Performance (NFR1–NFR5) | SvelteKit + Svelte 5 runes (-42% bundle vs Svelte 4) + size-limit CI gate (150 KB total, 80 KB run view) + optimistic UI on tick | OK |
| Reliability (NFR6–NFR9) | Storage abstraction with `StorageError` surface + offline-by-default v1 (no network calls) + Neon backups + CF Pages CDN for Growth | OK |
| Security & Privacy (NFR10–NFR14) | Text-only HTML escape (NFR11), Valibot validation at API boundary (NFR12), moderation token gate on flag/delete (NFR13), no PII collected — anonymous handle only (NFR14), CSP via meta tag in `app.html` (NFR10) | OK |
| Scalability (NFR15–NFR16) | localStorage 5 MB budget enforced via storage backend size check (NFR15) + Neon HTTP driver scales horizontally (NFR16) | OK |
| Accessibility (NFR17–NFR19) | Primitives built keyboard-first, design tokens in `tailwind.config.ts` from day one — Growth WCAG 2.1 AA audit becomes verification, not rewrite | OK |
| Compatibility (NFR20–NFR21) | Modern-browsers-only target locked in PRD; SvelteKit + Svelte 5 require ES2022+, which matches PRD's "latest 2 stable" baseline | OK |

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions have explicit versions and rationale. No "TBD"s remain in the critical path.

**Structure Completeness:** Every FR capability area has a directory home. Every architectural concern (storage, validation, errors, state) has exactly one canonical location. New AI agents can locate where to add code unambiguously.

**Pattern Completeness:** 11 conflict categories addressed. Concrete good/anti-pattern examples for state, errors, naming. Enforcement mechanisms specified (ESLint, tsc, size-limit) — not hopeful.

### Gap Analysis Results

**Critical gaps:** None. The architecture can guide implementation start without further decisions.

**Important gaps (deferred by design, flagged for downstream phases):**
- **FR12 visible go-state animation choice.** Animation library vs CSS-only is a UX/implementation decision, not architectural. Bundle budget pushes toward CSS-only or zero-runtime tweens (e.g., Svelte's built-in `transition:`). Punted to implementation.
- **FR38 ranking algorithm.** Explicitly deferred per PRD. Schema retains the signals; ranking function lives in `+server.ts` when content exists.
- **Rate limiting tier/algorithm for Growth API.** `lib/server/rate-limit.ts` is named but the algorithm (token bucket vs sliding window) and tier (per-IP vs per-handle) are not pinned. Pin during epic for FR28/FR42.
- **Moderation admin tooling (FR43 admin side).** Flag *endpoint* exists; flag *review queue UI* is out of scope for v1 of Growth. PRD already classifies admin tooling as Vision-era.

**Nice-to-have gaps:**
- No metrics/observability stack chosen. Acceptable for v1 (no backend) and minimal-Growth (CF Workers logs are sufficient). Revisit if traffic warrants.
- No A/B framework. Out of scope until product hypothesis demands it.
- No design tokens file scaffolded yet — `tailwind.config.ts` is the placeholder. First implementation story should populate it.

### Validation Issues Addressed

No blocking issues found. Three open PRD questions (FR16, FR31, FR38) resolved or formally deferred during Step 4. Two important gaps (rate-limit specifics, moderation admin tooling) intentionally pushed to story-level decisions where they belong.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (Step 2)
- [x] Scale and complexity assessed (medium / web_app / phased MVP→Growth→Vision)
- [x] Technical constraints identified (150 KB bundle, offline v1, modern browsers)
- [x] Cross-cutting concerns mapped (storage abstraction, hybrid rendering, sanitization, a11y, fork semantics, identity bootstrapping, bundle governance)

**Architectural Decisions**
- [x] Critical decisions documented with versions (SvelteKit 2.20.4, Svelte 5, Valibot, Drizzle, Neon, Tailwind v4, @vite-pwa)
- [x] Technology stack fully specified
- [x] Integration patterns defined (REST + Valibot + JSON envelopes)
- [x] Performance considerations addressed (size-limit gate, runes, optimistic UI)

**Implementation Patterns**
- [x] Naming conventions established (DB, API, code)
- [x] Structure patterns defined (feature folders + firewall)
- [x] Communication patterns specified (runes-only, kebab-case events)
- [x] Process patterns documented (errors, loading, validation, logging)

**Project Structure**
- [x] Complete directory structure defined (~70+ files/directories)
- [x] Component boundaries established (no cross-feature imports, no `lib/server/**` from client)
- [x] Integration points mapped (7 endpoints, hybrid storage, adapter swap)
- [x] Requirements to structure mapping complete (12 FR areas → directories)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — stack is mature, bundle budget is achievable with margin, and the v1↔Growth hinge (storage abstraction + adapter swap) is small and well-defined.

**Key Strengths:**
- Bundle budget headroom: SvelteKit + Svelte 5 + minimal deps comfortably inside 150 KB.
- v1 is shippable without the Growth backend ever existing — the architecture doesn't depend on it.
- Storage abstraction is small (8 methods) and the only thing that has to change at the v1→Growth boundary.
- Zero-PII identity model sidesteps the entire auth/data-protection complexity surface for Growth.
- Routes are thin; testability is high because logic concentrates in stores + utils.

**Areas for Future Enhancement:**
- Rate-limit specifics (algorithm + tier) when first publish endpoint goes live.
- Moderation review tooling when flag volume warrants (Vision phase).
- Observability (logs/metrics/traces) when Growth traffic warrants.
- Ranking function for FR38 once registry content exists.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow architectural decisions exactly as documented; deviations require updating this doc, not bypassing it.
- Use implementation patterns consistently — naming, errors, state, validation.
- Respect boundaries: no cross-feature imports, no `localStorage` outside `lib/storage/**`, no `fetch` outside `lib/api/**`, no DB outside `lib/server/db/**`.
- Validate at boundaries with Valibot; never trust unparsed input.
- Refer to this document as the source of truth for architectural questions.

**First Implementation Priority:**
```bash
pnpm create svelte@latest checklist-app
# select: Skeleton project, TypeScript, ESLint, Prettier, Playwright, Vitest
cd checklist-app
pnpm add -D tailwindcss@next @tailwindcss/vite size-limit
pnpm add valibot
pnpm dlx svelte-add@latest tailwindcss
```

Then: scaffold `lib/storage/` (interface + LocalStorageBackend) and `lib/state/` toast-store as the first story — both are upstream of every feature.
