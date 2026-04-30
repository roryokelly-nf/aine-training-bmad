---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# bmad - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Template Authoring (MVP):**
- FR1: Users can create a new checklist template with a name.
- FR2: Users can add items to a template.
- FR3: Users can edit any item's text in a template.
- FR4: Users can remove items from a template.
- FR5: Users can rename an existing template.
- FR6: Users can delete a template.
- FR7: Users can view a list of all templates they have authored on the current browser.

**Run Execution (MVP):**
- FR8: Users can instantiate a run from a template in a single action.
- FR9: Users can tick an item within a run to mark it complete.
- FR10: Users can untick a previously ticked item within a run.
- FR11: Ticked items remain visible within the run (completion is preserved state, not removal).
- FR12: A run reaches an explicit, visually distinct go-state when every item is ticked.
- FR13: Users can navigate between the template list and an active run without losing tick state.

**Reset & Re-Run (MVP):**
- FR14: Users can reset an active run, clearing tick state while preserving the underlying template.
- FR15: Users can re-instantiate a run from the same template at any time after reset.
- FR16: Each template has at most one active run at a time; starting a new run replaces the previous run for that template. (Resolved in architecture: schema-encoded 0..1 active run per template.)

**Local Persistence & State Recovery (MVP):**
- FR17: All template data persists across browser sessions in localStorage.
- FR18: Active run tick state persists across browser sessions in localStorage.
- FR19: The system surfaces honest empty-state messaging when localStorage is empty for the current origin/browser, including an explicit note that templates do not sync across browsers in v1.
- FR20: The system surfaces an explicit error message when localStorage is unavailable, full, or has been cleared by the browser, distinguishing these states from "no templates yet."

**Run History & Archive (Growth):**
- FR21: Users can archive a completed run as a permanent record at the moment they reach the go-state, before reset.
- FR22: Users can view a list of archived runs for a given template.
- FR23: Users can open an archived run to view its items and tick state as they were at archive time.
- FR24: Users can delete an archived run.

**Item Refinements (Growth):**
- FR25: Users can reorder items within a template.
- FR26: Users can nest an item as a sub-item beneath a parent item.
- FR27: Users can attach a note to an item; the note is visible during a run.

**Template Sharing — Publish (Growth):**
- FR28: Users can publish a template they own to the public registry.
- FR29: Users can attach a title, one-line description, and tags to a template when publishing.
- FR30: Each published template is reachable via a stable, shareable URL.
- FR31: Each published template carries an authorship attribution. (Resolved in architecture: anonymous client-generated handle `<word>-<word>-<4digit>`.)
- FR32: Users can unpublish a template they have published, removing it from the public registry.

**Template Discovery — Browse & Copy (Growth):**
- FR33: Users can browse a list of publicly published templates.
- FR34: Users can search the public registry by title, description, or tag.
- FR35: Users can preview a published template's items without copying it.
- FR36: Users can copy a published template into their own template list with a single action.
- FR37: A copied template is independent of the source: edits to the source do not propagate to the copy, and edits to the copy do not affect the source. (Fork semantics, not symlink.)
- FR38: The system surfaces featured or popular templates on the registry browse surface. (Ranking signal definition deferred until registry has content.)

**Mobile / PWA (Growth):**
- FR39: Users can install the application as a Progressive Web App on supported mobile platforms.
- FR40: The installed PWA supports the full authoring and run experience offline once installed, matching v1 in-browser behaviour.

**Identity & Moderation (Growth):**
- FR41: Each published template displays an authorship handle visible to viewers.
- FR42: Users can flag a published template for moderation review.
- FR43: Operators can remove a flagged template from the public registry.

**Accessibility (cross-cutting):**
- FR44: All interactive elements (tick, save, create, reset, navigate) are operable via keyboard alone, with a visible focus state. (MVP)
- FR45: All dynamic state changes (tick, untick, reaching go-state, reset) are announced to assistive technologies. (Growth — part of full WCAG 2.1 AA.)

**Portability & Cross-Device Sync (Vision):**
- FR46: Users can export their templates and run history as a JSON file.
- FR47: Users can import templates from a previously exported JSON file.
- FR48: Users with accounts can sync templates and run state across browsers and devices.

### NonFunctional Requirements

**Performance:**
- NFR1: First Contentful Paint ≤ 1.5s on a mid-range Android phone over 4G.
- NFR2: Time-to-Interactive ≤ 2s on the same baseline.
- NFR3: p95 UI interaction latency ≤ 100ms for tick, navigate, and save.
- NFR4: Initial JavaScript bundle ≤ 150 KB gzipped, enforced as a CI-gated hard budget.
- NFR5: Core Web Vitals (LCP, INP, CLS) within Google's "good" thresholds on the run view at the small viewport.

**Reliability & Data Durability:**
- NFR6: Zero data loss during normal localStorage operation: save → reload → state restored exactly.
- NFR7: When localStorage is unavailable, full, or cleared, the system fails safely with explicit, distinguishable messaging — never silently and never with a generic error.
- NFR8: v1 functions fully without network connectivity once static assets have loaded.
- NFR9 (Growth): Public registry availability ≥ 99.5% measured monthly. Registry downtime never blocks local authoring or run execution.

**Security & Privacy:**
- NFR10 (MVP): v1 collects no personal data and stores no user data outside the browser.
- NFR11 (Growth): Published template content is sanitized against script injection (XSS) when rendered on registry surfaces.
- NFR12 (Growth): All registry traffic is served over HTTPS.
- NFR13 (Growth): Flagged content can be reviewed and, if warranted, removed within 24 hours of being flagged.
- NFR14 (Growth): Authorship handles do not expose personally identifiable information by default.

**Scalability:**
- NFR15: v1 supports at least 100 templates per browser and 1,000 items per template without perceptible slowdown, with total app data footprint ≤ 5 MB.
- NFR16 (Growth): Public registry supports ≥ 10,000 published templates and ≥ 1,000 concurrent browse/search requests at the 12-month traffic target.

**Accessibility:**
- NFR17 (MVP): All interactive elements operable via keyboard alone, with visible focus state on every focusable element.
- NFR18 (MVP): Text and key UI elements meet ≥ 4.5:1 contrast; the go-state green meets contrast for both text-on-green and icon-on-green.
- NFR19 (Growth): Full WCAG 2.1 AA conformance, audited with axe/Lighthouse plus a manual screen-reader pass on the run view.

**Compatibility:**
- NFR20: Application functions on the latest two stable versions of Chrome, Safari, Firefox, and Edge — desktop and mobile (including Samsung Internet on Android).
- NFR21: Internet Explorer, in-app browsers below Chromium 100 / WebKit 16, and legacy embedded browsers are explicitly out of scope.

### Additional Requirements

**Starter & Project Init (per Architecture):**
- Use SvelteKit (Svelte 5, TypeScript) starter via `npx sv create checklist-app` with ESLint, Prettier, Vitest add-ons. This is the **first implementation story** of Epic 1.
- Wire Tailwind CSS v4 with Vite/Lightning CSS engine; design tokens via `@theme` in CSS.
- TypeScript strict mode; ESM-only; Node 22+.
- `@sveltejs/adapter-static` for v1; migration path to `@sveltejs/adapter-cloudflare` in Growth.

**Bundle & CI Governance:**
- `size-limit` configured in CI: 150 KB gzipped initial JS (NFR4); per-route ~80 KB budget for the run view.
- GitHub Actions on PR: typecheck (`svelte-check`), lint, unit tests (Vitest), bundle-size check, preview deploy.
- Production deploy on main; E2E (Playwright) on nightly schedule.

**Storage Abstraction (the v1↔Growth hinge):**
- `src/lib/storage/` with 8-method `StorageBackend` interface: `getTemplates`, `getTemplate`, `saveTemplate`, `deleteTemplate`, `getActiveRun`, `saveRun`, `clearRun`, `archiveRun`.
- v1 `LocalStorageBackend`; Growth `HybridBackend` (local writes + opportunistic server sync for published templates).
- ULID for IDs (client-generated, sortable, URL-safe); `nanoid` an acceptable alternative noted in arch.
- `schemaVersion` integer on every persisted blob.
- `QuotaExceededError` caught on every write and surfaced via single `StorageError` type.

**Validation:**
- Valibot schemas in `src/lib/schemas/`, shared client + server. Parse on entry at all boundaries; never trust unparsed input.

**State Management:**
- Svelte 5 runes (`$state`, `$derived`, `$effect`) only. No external state library, no `svelte/store` writable/readable for new code. Domain stores in `src/lib/state/*.svelte.ts`.

**Architectural Boundaries (ESLint-enforced):**
- No `localStorage` access outside `src/lib/storage/**`.
- No `fetch` outside `src/lib/api/**`.
- No DB queries outside `src/lib/server/db/**`.
- No imports from `src/lib/server/**` in client code.
- No cross-feature imports (`lib/features/<x>` cannot import `lib/features/<y>`).
- `lib/components/` cannot import from `lib/features/**`.
- No `any`; use `unknown` + narrow.

**Hosting & Deployment:**
- v1: Cloudflare Pages, static adapter, single-push deploy.
- Growth: Cloudflare Pages + Workers (`@sveltejs/adapter-cloudflare`) + Neon Postgres (HTTP driver).
- CSP via meta tag in `app.html` (`default-src 'self'`, no inline scripts).
- HTTPS terminated at Cloudflare (NFR12).

**Backend Stack (Growth):**
- Neon Postgres + Drizzle ORM (TypeScript-native, tree-shakable).
- REST via SvelteKit `+server.ts`. 7-endpoint surface: list/publish/get/unpublish/copy/flag/health.
- Cursor-based pagination on `(created_at, id)`.
- Error envelope: `{ error: { code, message, details? } }`.
- Cloudflare Workers KV-backed per-IP rate limits on publish/flag/copy.
- OpenAPI emitted at build via `@asteasolutions/zod-to-openapi` (Valibot adapter).

**Identity & Moderation (Growth):**
- Anonymous handle `<word>-<word>-<4digit>` generated on first publish, persisted in localStorage.
- Per-publish moderation token returned to client, persisted locally; required for unpublish (FR32).
- Hard-delete on operator removal; flagged-but-not-removed templates stay live.

**Rendering Split (Growth):**
- `/templates/**`: pure CSR via static adapter.
- `/browse`: SSG shell + client-side search hitting API.
- `/t/:id`: SSR with CDN edge caching; OpenGraph metadata; near-zero client JS beyond the Copy button.

**XSS / Content Safety:**
- Template body stored verbatim, rendered with text-only escaping client- and server-side.
- No HTML in template items in MVP or Growth v1 (rich-text deferred to Vision). NFR11 satisfied by disallowing HTML, not by sanitizing it.
- `lib/utils/escape.ts` is the single text-escape utility.

**PWA (Growth):**
- `@vite-pwa/sveltekit` with `injectManifest` mode.
- Service worker pre-caches authoring shell + static assets.
- Run-time caching: registry API responses with `staleWhileRevalidate`.
- Manifest configured for installability; icons (192, 512, maskable) in `static/icons/`.

**Naming Conventions:**
- DB: `snake_case` plural tables, `id` PK (text/ULID), `<singular>_id` FKs, `created_at`/`updated_at` (timestamptz), `idx_<table>_<col>`.
- API: plural kebab-case routes; `camelCase` JSON fields and query params; `X-Moderation-Token` header.
- Code: `PascalCase.svelte` components, `kebab-case.ts` modules, `camelCase` functions/vars, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants.

**Testing:**
- Vitest unit tests co-located with source (`*.test.ts`).
- Playwright e2e in `tests/e2e/` — at minimum: create-and-run, publish-and-copy, export-import.

**Migrations:**
- Drizzle Kit, file-based; `pnpm drizzle-kit push` is a manual deploy step (no auto-migration on push to main).

**Observability:**
- v1: Cloudflare Analytics + free RUM Web Vitals beacon (used to verify NFR1–NFR3, NFR5).
- Growth: structured JSON logs from Workers to a log drain (Axiom or CF Logpush to R2); Sentry for errors (vendor pinned at Growth launch).
- No analytics on the authoring path in v1 or Growth (NFR10).

### UX Design Requirements

No UX Design Specification document exists. UX-DR section intentionally empty. Visible go-state animation choice (FR12) is flagged in architecture as an implementation decision (CSS-only or Svelte built-in `transition:` to stay inside bundle budget).

### FR Coverage Map

- FR1: Epic 1 — Create template with name
- FR2: Epic 1 — Add items
- FR3: Epic 1 — Edit item text
- FR4: Epic 1 — Remove items
- FR5: Epic 1 — Rename template
- FR6: Epic 1 — Delete template
- FR7: Epic 1 — Template list view
- FR8: Epic 2 — Instantiate run
- FR9: Epic 2 — Tick item
- FR10: Epic 2 — Untick item
- FR11: Epic 2 — Ticked items remain visible
- FR12: Epic 2 — Visible go-state
- FR13: Epic 2 — Navigate without losing tick state
- FR14: Epic 2 — Reset run
- FR15: Epic 2 — Re-instantiate after reset
- FR16: Epic 2 — Single active run per template
- FR17: Epic 3 — Templates persist across sessions
- FR18: Epic 3 — Run state persists across sessions
- FR19: Epic 3 — Honest empty-state messaging
- FR20: Epic 3 — Storage error messaging
- FR21: Epic 4 — Archive completed run
- FR22: Epic 4 — List archived runs
- FR23: Epic 4 — View archived run
- FR24: Epic 4 — Delete archived run
- FR25: Epic 5 — Reorder items
- FR26: Epic 5 — Nest items
- FR27: Epic 5 — Item notes
- FR28: Epic 6 — Publish template
- FR29: Epic 6 — Title/description/tags on publish
- FR30: Epic 6 — Stable shareable URL
- FR31: Epic 6 — Authorship attribution (anonymous handle)
- FR32: Epic 6 — Unpublish template
- FR33: Epic 7 — Browse public templates
- FR34: Epic 7 — Search registry
- FR35: Epic 7 — Preview without copying
- FR36: Epic 7 — Copy to my templates
- FR37: Epic 7 — Fork semantics
- FR38: Epic 7 — Featured/popular surface
- FR39: Epic 9 — PWA install
- FR40: Epic 9 — PWA offline
- FR41: Epic 6 — Display authorship handle
- FR42: Epic 8 — Flag template
- FR43: Epic 8 — Operator removal
- FR44: Epic 3 — Keyboard operability + visible focus (MVP a11y floor)
- FR45: Epic 10 — Dynamic state announced to AT (WCAG 2.1 AA)
- FR46: Epic 11 — Export to JSON
- FR47: Epic 11 — Import from JSON
- FR48: Epic 11 — Cross-device sync (accounts)

## Epic List

### Epic 1: Foundation & Template Authoring (MVP)
Users can stand the app up locally and create, edit, rename, and delete checklist templates. This epic also lands all the upstream scaffolding every later epic depends on: project init, Tailwind v4, CI bundle-budget gate, deploy stub to Cloudflare Pages, the storage abstraction (`StorageBackend` interface + `LocalStorageBackend` + `StorageError`), Valibot schemas, ULID generation, and the rune-based state stores. **Standalone deliverable:** a deployed app where Maya can author her first template.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7

### Epic 2: Run Execution, Go-State & Reset (MVP — the wedge)
Users can instantiate a run from a template, tick and untick items, see ticked items stay visible (the wedge: completion is preserved state, not deletion), reach a visually distinct go-state, navigate away and back without losing tick state, reset a run in place, and re-instantiate fresh. Single-active-run-per-template is schema-encoded with a confirm dialog. **Standalone deliverable:** the full re-run loop — Maya's "aha" moment.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16

### Epic 3: Persistence Durability, Error Handling & A11y Floor (MVP ship gate)
Templates and active run state persist across browser sessions. The empty state is honest about per-browser scoping. Quota-exceeded, storage-disabled, and storage-cleared states surface distinguishable messages — never silent, never generic. All interactive elements are keyboard-operable with visible focus; key UI meets ≥ 4.5:1 contrast; the go-state green passes both text-on-green and icon-on-green. v1 functions fully offline once the static assets load. **Standalone deliverable:** MVP is shippable.
**FRs covered:** FR17, FR18, FR19, FR20, FR44 (NFRs covered in stories: NFR6, NFR7, NFR8, NFR17, NFR18)

### Epic 4: Run History & Archive (Growth — local)
Users can archive a completed run as a permanent record at the moment they hit the go-state, list archives per template, open an archive to inspect items and tick state as captured, and delete archives. No backend; everything stays local via the storage abstraction. **Standalone deliverable:** Maya gets record-keeping, not just reset.
**FRs covered:** FR21, FR22, FR23, FR24

### Epic 5: Item Refinements — Reorder, Nest, Notes (Growth — local)
Users can drag/keyboard-reorder items within a template, nest items as sub-items beneath a parent, and attach a note to an item that's visible during a run. Local only; no backend. **Standalone deliverable:** richer authoring without coupling to publish.
**FRs covered:** FR25, FR26, FR27

### Epic 6: Publish & Anonymous Identity (Growth — backend introduced here)
Users can publish a template to the public registry with title, one-line description, and tags; receive a stable shareable URL; and unpublish using a per-publish moderation token. This epic introduces the entire backend: Neon Postgres + Drizzle, adapter swap to `@sveltejs/adapter-cloudflare`, the `published_templates` schema, the publish/unpublish/get endpoints, the anonymous handle generator (`<word>-<word>-<4digit>`) persisted in localStorage, the moderation-token model, CSP, and Cloudflare Workers KV-backed rate limits. The `HybridBackend` extends the storage abstraction without breaking call sites. **Standalone deliverable:** Sam can publish his runbook and paste the link in Slack.
**FRs covered:** FR28, FR29, FR30, FR31, FR32, FR41 (NFR9, NFR11, NFR12, NFR14)

### Epic 7: Browse, Search & Copy with Fork Semantics (Growth)
Users can browse the public registry, search by title/description/tag, preview a template's items without copying, and copy a template into their own list with one action. The copy is a deep, independent fork: edits to source don't propagate, edits to copy don't reach back. The browse surface includes a featured/popular slot (ranking signal definition deferred — schema records `published_at`, `copy_count`, `flag_count`). Public template detail pages are SSR'd at `/t/:id` for SEO. **Standalone deliverable:** Pat finds and copies a 1:1 template.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38

### Epic 8: Flag & Moderation (Growth)
Users can flag a published template for moderation review. Operators can remove flagged templates from the registry within the NFR13 24-hour SLO. Hard-delete; flagged-but-not-removed templates remain live. Admin review tooling stays minimal — flag endpoint + a basic queue view; full admin UI deferred to Vision per architecture. **Standalone deliverable:** the registry has a self-policing surface.
**FRs covered:** FR42, FR43 (NFR13)

### Epic 9: PWA Install & Offline (Growth)
Users can install the app as a Progressive Web App on supported mobile platforms. Once installed, the full authoring and run experience works offline, matching v1 in-browser behaviour. Service worker pre-caches the authoring shell + static assets; registry API responses use `staleWhileRevalidate`. **Standalone deliverable:** Maya can add to home screen and use the app on a flight.
**FRs covered:** FR39, FR40

### Epic 10: Full WCAG 2.1 AA Conformance (Growth)
All dynamic state changes (tick, untick, reaching go-state, reset) are announced to assistive technologies via ARIA live regions and proper roles. The full Growth a11y target is met: axe/Lighthouse clean plus a manual screen-reader pass on the run view. Reduced-motion preference handling lands here. **Standalone deliverable:** a11y verification, not rewrite — design tokens and primitives from Epic 1/3 mean this is an audit-and-fix epic, not a new build.
**FRs covered:** FR45 (NFR19)

### Epic 11: Portability — Export, Import & Cross-Device Sync (Vision)
Users can export their templates and run history as a JSON file and import from a previously exported file (manual escape hatch + power-user feature). Users with accounts can sync templates and run state across browsers and devices. This epic introduces the optional account layer (OAuth + email magic-link per architecture's deferred plan); accounts attach to existing handles rather than replacing them. **Standalone deliverable:** Vision-tier portability.
**FRs covered:** FR46, FR47, FR48

## Epic 1: Foundation & Template Authoring (MVP)

Users can stand up the app and create, view, edit, rename, and delete templates locally. This epic also lands all upstream scaffolding — project init, CI bundle gate, deploy pipeline, storage abstraction, Valibot schemas, ULID generation, rune state stores, toast surface — that every later epic depends on. End state: a deployed app where Maya can author her first template.

### Story 1.1: Initialize project with CI bundle gate and deploy pipeline

As a developer,
I want a SvelteKit + Svelte 5 + TypeScript project scaffolded with Tailwind v4, ESLint, Prettier, Vitest, a `size-limit` CI gate at 150 KB gzipped, and a Cloudflare Pages deploy stub,
So that every subsequent feature story builds on a known-good foundation that already enforces the bundle budget (NFR4) and ships to a real URL.

**Acceptance Criteria:**

**Given** a fresh repository
**When** the project is initialized via `npx sv create checklist-app` with TypeScript, ESLint, Prettier, Vitest selected
**Then** `pnpm dev` starts the Vite dev server on `localhost:5173` with HMR working
**And** `pnpm build` produces a static build via `@sveltejs/adapter-static` to `build/`
**And** `pnpm test` runs Vitest with at least one passing smoke test
**And** `tsconfig.json` has `strict: true` and no implicit `any`

**Given** Tailwind CSS v4 is installed via `@tailwindcss/vite`
**When** a Svelte component uses a Tailwind utility class
**Then** the class is applied in dev and emitted in the built CSS
**And** `tailwind.config.ts` exists as the design-token placeholder

**Given** ESLint is configured per `architecture.md` boundaries
**When** any file outside `src/lib/storage/**` references the `localStorage` global
**Then** ESLint reports an error via `no-restricted-globals` / `no-restricted-imports`
**And** `pnpm lint` exits non-zero

**Given** `size-limit` is configured at `.size-limit.json` with a 150 KB gzipped budget on the initial JS bundle
**When** a build exceeds the budget
**Then** `pnpm size-limit` exits non-zero

**Given** a GitHub Actions workflow at `.github/workflows/ci.yml`
**When** a pull request is opened
**Then** the workflow runs `svelte-check`, `pnpm lint`, `pnpm test`, and `pnpm size-limit`
**And** all four must pass before the PR can merge

**Given** a deploy workflow at `.github/workflows/deploy.yml`
**When** a commit lands on `main`
**Then** the build is deployed to Cloudflare Pages via `wrangler pages deploy build/`
**And** the deployed URL is reachable over HTTPS
**And** the deployed page renders a minimal landing that redirects to `/templates`

### Story 1.2: Storage abstraction and template-store foundation

As a developer,
I want a single `StorageBackend` interface with a `LocalStorageBackend` implementation, ULID generation, a Valibot `Template` schema, a `StorageError` type, a `Toast` surface, and a rune-based `template-store`,
So that every feature in Epic 1 onward reads and writes through one call surface that won't need rewriting when the Growth backend lands. (Resolves architectural prerequisite for FR1–FR7, FR17–FR20.)

**Acceptance Criteria:**

**Given** the project structure from `architecture.md`
**When** `src/lib/storage/types.ts` is defined
**Then** it exports a `StorageBackend` interface with eight methods: `getTemplates`, `getTemplate`, `saveTemplate`, `deleteTemplate`, `getActiveRun`, `saveRun`, `clearRun`, `archiveRun`
**And** every return type is identical regardless of backend implementation

**Given** a `LocalStorageBackend` at `src/lib/storage/localstorage-backend.ts`
**When** `saveTemplate(t)` is called with a valid template
**Then** the template is parsed via the Valibot schema before write
**And** the template is JSON-stringified to a namespaced localStorage key
**And** the persisted blob carries a `schemaVersion: 1` integer

**Given** ULID generation at `src/lib/storage/ulid.ts`
**When** a new template is created without an `id`
**Then** the backend assigns a freshly generated ULID
**And** the ULID is URL-safe and lexicographically sortable

**Given** `getTemplates()` is called after one or more `saveTemplate` calls
**When** localStorage is available
**Then** all saved templates are parsed via the Valibot schema and returned
**And** any persisted blob that fails schema parse is logged to console and skipped

**Given** localStorage write fails with `QuotaExceededError`
**When** any `saveTemplate` / `saveRun` / `archiveRun` call is made
**Then** the call rejects with `StorageError` of kind `QUOTA_EXCEEDED`
**And** no partial write is left behind

**Given** localStorage is unavailable (private mode, disabled)
**When** any backend method is called
**Then** the call rejects with `StorageError` of kind `UNAVAILABLE`

**Given** a Valibot schema at `src/lib/schemas/template.ts`
**When** an invalid template object is passed to `saveTemplate`
**Then** the schema parse fails and the call rejects with `StorageError` of kind `INVALID`

**Given** a rune-based store at `src/lib/state/template-store.svelte.ts`
**When** `loadTemplates()` is invoked at app boot
**Then** the `templates` `$state` array is hydrated from `storage.getTemplates()`
**And** subsequent mutator functions (`addTemplate`, `updateTemplate`, `deleteTemplate`) call the corresponding storage method and update reactive state

**Given** a `Toast` component, `ToastContainer`, and `toast-store.svelte.ts`
**When** any caller invokes `toastStore.error(message)` or `toastStore.success(message)`
**Then** a toast renders in the layout's `ToastContainer` mounted in `+layout.svelte`
**And** the toast auto-dismisses after a configurable timeout
**And** can be manually dismissed via a close button reachable by keyboard

**Given** ESLint boundary rules
**When** any file outside `src/lib/storage/**` references `localStorage`
**Then** ESLint reports an error and CI fails

### Story 1.3: Create a new template

As Maya,
I want to create a new checklist template by giving it a name,
So that I can start authoring a re-runnable procedure. (FR1)

**Acceptance Criteria:**

**Given** I am on the template list at `/templates`
**When** I click the "Create template" button
**Then** I am navigated to `/templates/new`
**And** the name input receives focus

**Given** I am on `/templates/new`
**When** I enter a non-empty name and submit
**Then** a new template is saved via `storage.saveTemplate()` with a ULID `id`, the entered `name`, an empty `items` array, `schemaVersion: 1`, and ISO 8601 `createdAt` / `updatedAt` timestamps
**And** I am navigated to `/templates/[id]` for the new template

**Given** I am on `/templates/new`
**When** I submit with an empty name
**Then** the form does not submit
**And** an inline validation error renders: "Template name is required"

**Given** I am on `/templates/new`
**When** I submit a name longer than the configured limit (200 chars)
**Then** the Valibot schema rejects the input
**And** an inline validation error renders

**Given** localStorage is at quota
**When** I submit the create-template form
**Then** the save rejects with `StorageError(QUOTA_EXCEEDED)`
**And** a toast renders: "Storage is full. Free up space and try again."
**And** I remain on `/templates/new` with my input preserved

**Given** keyboard interaction on `/templates/new`
**When** I press Enter in the name field
**Then** the form submits
**And** when I press Esc I am returned to `/templates`

### Story 1.4: View all templates

As Maya,
I want to see a list of all templates I've authored on this browser,
So that I can pick one to run, edit, or rename. (FR7)

**Acceptance Criteria:**

**Given** I have one or more templates saved
**When** I navigate to `/templates`
**Then** each template renders as a `TemplateCard` showing the template name and item count
**And** the list is sorted by `updatedAt` descending (most recently edited first)

**Given** I have no templates saved
**When** I navigate to `/templates`
**Then** an `EmptyState` renders with copy: "No templates yet — create your first one."
**And** a "Create template" button is the primary CTA

**Given** a `TemplateCard` is rendered
**When** I click on it
**Then** I am navigated to `/templates/[id]` for that template

**Given** keyboard navigation on `/templates`
**When** I tab through the page
**Then** focus moves through cards in list order with a visible focus ring meeting NFR18 contrast
**And** pressing Enter on a focused card opens that template

### Story 1.5: Edit a template's items (add, edit text, remove)

As Maya,
I want to add items to a template, edit any item's text, and remove items I don't need,
So that the template reflects exactly the procedure I run. (FR2, FR3, FR4)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]` for an existing template
**When** I click "Add item" and enter item text
**Then** a new item is appended with a ULID `id`, the entered `text`, and an `order` index after the last existing item
**And** the template is saved via `storage.saveTemplate()` with `updatedAt` refreshed

**Given** an existing item in the editor
**When** I edit the item's text
**Then** the change is debounced (≤ 500 ms) and persisted
**And** the new text renders immediately in the list

**Given** an existing item in the editor
**When** I click the item's "Remove" affordance
**Then** the item is removed from the template
**And** the template is saved with `updatedAt` refreshed

**Given** I attempt to add an item with empty text
**When** the input loses focus or I press Enter
**Then** the empty item is discarded (not saved)

**Given** keyboard interaction in the editor
**When** I press Enter inside an item text field
**Then** focus moves to a new empty item input ready for typing

**Given** I navigate away from `/templates/[id]` and back
**When** the route reloads
**Then** all my item changes persist (FR17 — verified again by Epic 3)

### Story 1.6: Rename a template

As Maya,
I want to rename an existing template,
So that the label tracks how my procedure evolves. (FR5)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]` for an existing template
**When** I edit the template name field
**Then** the change is debounced (≤ 500 ms) and persisted via `storage.saveTemplate()` with `updatedAt` refreshed
**And** the new name renders on the template list page on next visit

**Given** I rename to an empty string
**Then** the rename is rejected via the Valibot schema
**And** an inline error renders
**And** the previous name is restored on blur

**Given** I rename to a string longer than 200 chars
**Then** the rename is rejected via the Valibot schema
**And** an inline error renders

### Story 1.7: Delete a template

As Maya,
I want to delete a template I no longer use,
So that my list stays uncluttered. (FR6)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]` for an existing template
**When** I click "Delete template"
**Then** a confirmation `Modal` opens with copy: "Delete '[template name]'? This cannot be undone."
**And** focus is trapped within the dialog

**Given** the confirmation dialog is open
**When** I click "Delete"
**Then** the template is removed via `storage.deleteTemplate(id)`
**And** any active run for this template is cleared via `storage.clearRun(id)` (FR16 — single active run model)
**And** I am navigated back to `/templates`
**And** a toast renders: "Template deleted."

**Given** the confirmation dialog is open
**When** I click "Cancel" or press Esc
**Then** the dialog closes
**And** the template is not deleted
**And** focus returns to the "Delete template" button

## Epic 2: Run Execution, Go-State & Reset (MVP — the wedge)

Users can instantiate a run from a template, tick and untick items, see ticked items stay visible, hit a visually distinct go-state when fully complete, navigate away and back without losing tick state, and reset to re-run from the same template. This is the wedge: completion is preserved state, not deletion. Single active run per template is schema-encoded.

### Story 2.1: Start a run from a template

As Maya,
I want to start a run from a template in a single action,
So that I can begin ticking items immediately without rebuilding anything. (FR8, FR16)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]` for a template with one or more items
**When** I click the "Run" button
**Then** a new `Run` is created via `storage.saveRun()` with a ULID `id`, a reference to the template's `id`, a `startedAt` ISO timestamp, an `items` array snapshotted from the template (each with `id`, `text`, and `ticked: false`), and `schemaVersion: 1`
**And** I am navigated to `/templates/[id]/run`

**Given** a Valibot schema at `src/lib/schemas/run.ts`
**When** any `Run` is read or written via the storage backend
**Then** the schema validates the shape, including `templateId` reference and `items[].ticked: boolean`

**Given** the template has zero items
**When** I click "Run"
**Then** the "Run" button is disabled with a tooltip: "Add at least one item to run this template"
**And** no run is created

**Given** a previous active run already exists for this template
**When** I click "Run"
**Then** a confirmation `Modal` opens with copy: "Starting a new run will replace the previous run for this template. Continue?" (FR16)
**And** focus is trapped within the dialog

**Given** the replace-run confirmation is open
**When** I confirm
**Then** the previous run is overwritten via `storage.saveRun()` with the new run for that `templateId`
**And** I am navigated to `/templates/[id]/run`

**Given** the replace-run confirmation is open
**When** I cancel or press Esc
**Then** the dialog closes
**And** no new run is created
**And** I remain on `/templates/[id]`

**Given** the storage layer enforces at most one active `Run` per `templateId`
**When** `getActiveRun(templateId)` is called
**Then** it returns the single active run or `null`

### Story 2.2: Tick and untick items in a run

As Maya,
I want to tick items as I complete them and untick if I miscounted, with ticked items staying visible in the list,
So that I can see at a glance what's done and what's still left without losing context. (FR9, FR10, FR11)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]/run` with at least one unticked item
**When** I tap or click an item's tick affordance
**Then** the item's `ticked` flips to `true`
**And** the run is saved via `storage.saveRun()` with optimistic UI (state changes before storage resolves)
**And** the item remains rendered in its current position with a ticked visual style

**Given** a previously ticked item
**When** I tap or click its tick affordance
**Then** the item's `ticked` flips to `false`
**And** the run is saved
**And** the item renders in unticked visual style

**Given** a ticked item
**When** the run view is rendered
**Then** the item remains in the list — it is NOT hidden, removed, or visually de-emphasized to the point of disappearing (FR11 — completion is preserved state)

**Given** the tick affordance on a touch device
**When** rendered
**Then** the touch target is ≥ 44 × 44 CSS pixels (per PRD touch-target requirement)

**Given** keyboard interaction
**When** an item has focus
**Then** Space toggles the tick state
**And** Tab moves focus to the next item

**Given** a storage write fails after an optimistic tick
**When** `storage.saveRun()` rejects with `StorageError`
**Then** the optimistic UI reverts the tick
**And** a toast renders explaining the failure

**Given** p95 interaction latency requirement (NFR3)
**When** a tick is invoked
**Then** the rendered tick state changes within 100 ms (verified via E2E perf trace)

### Story 2.3: Reach the visible go-state

As Maya,
I want the run to resolve to an explicit, visually distinct go-state when every item is ticked,
So that finishing the procedure produces a finished checklist, not an empty list. (FR12)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]/run` with one or more items unticked
**When** the last unticked item is ticked
**Then** the run renders the go-state: a visually distinct surface (background or banner) using the configured go-state green
**And** a "go-state" message renders prominently (e.g., "All done")
**And** all ticked items remain visible in the list (FR11)

**Given** the run is in the go-state
**When** any item is unticked
**Then** the go-state surface is removed
**And** the run returns to the in-progress visual state

**Given** the go-state surface
**When** rendered
**Then** the green meets ≥ 4.5:1 contrast for both text-on-green and icon-on-green (NFR18)

**Given** an animation budget constraint
**When** the go-state appears
**Then** the transition uses CSS-only or Svelte built-in `transition:` directives (no animation library), staying inside the 150 KB bundle budget (NFR4)

**Given** a `prefers-reduced-motion: reduce` user preference (best-effort in MVP; full support is Epic 10)
**When** the go-state appears
**Then** the appearance is non-animated (instant)

### Story 2.4: Preserve tick state across navigation

As Maya,
I want to navigate away from an active run and back without losing tick state,
So that I can step away mid-procedure and pick up exactly where I left off. (FR13)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]/run` with some items ticked
**When** I navigate to `/templates` or `/templates/[id]`
**Then** the run state is preserved in localStorage via `storage.saveRun()` (already saved by Story 2.2)

**Given** I have navigated away from an active run
**When** I navigate back to `/templates/[id]/run`
**Then** all previously ticked items render as ticked
**And** all unticked items render as unticked
**And** the go-state renders if and only if all items were ticked when I left

**Given** I close the browser tab and reopen it later
**When** I navigate back to `/templates/[id]/run`
**Then** the run is hydrated from localStorage and renders identically to before close (FR18 — verified again by Epic 3)

**Given** I am on the template list
**When** a template has an active run
**Then** the `TemplateCard` renders a "Run in progress" indicator with a tick count (e.g., "3 of 7")

**Given** I am on `/templates/[id]` for a template with an active run
**When** the page loads
**Then** the page surfaces a "Resume run" button as the primary action (instead of "Run") that navigates to `/templates/[id]/run`

### Story 2.5: Reset a run and re-instantiate

As Maya,
I want to reset an active run in place to wipe tick state, and start a fresh run from the same template,
So that I can re-use the same procedure next time without rebuilding the list. (FR14, FR15)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]/run` with an active run (any tick state)
**When** I click "Reset"
**Then** a confirmation `ResetConfirmDialog` opens with copy: "Reset this run? Tick state will be cleared."
**And** focus is trapped within the dialog

**Given** the reset confirmation is open
**When** I confirm
**Then** the run is cleared via `storage.clearRun(templateId)`
**And** I am navigated to `/templates/[id]`
**And** a toast renders: "Run reset."

**Given** the reset confirmation is open
**When** I cancel or press Esc
**Then** the dialog closes
**And** the run is not reset
**And** I remain on `/templates/[id]/run`

**Given** I have just reset a run
**When** I am back on `/templates/[id]` and click "Run"
**Then** a new fresh run is instantiated per Story 2.1 (no replace confirmation, since no active run exists)
**And** I am navigated to `/templates/[id]/run` with all items unticked

**Given** the run is in the go-state
**When** I view the run page
**Then** the "Reset" button is rendered prominently as the primary path back to a fresh run (anticipating Maya's "next month's trip" use case)

## Epic 3: Persistence Durability, Error Handling & A11y Floor (MVP ship gate)

Templates and active run state persist across browser sessions. The empty state is honest about per-browser scoping. Storage errors (quota, unavailable, cleared) surface distinguishable messages — never silent, never generic. The app functions fully offline once assets load. All interactive elements are keyboard-operable with visible focus; key UI meets ≥ 4.5:1 contrast including the go-state green. After this epic, MVP is shippable.

### Story 3.1: Persistence durability across sessions

As Maya,
I want my templates and active run state to survive browser reloads, tab closes, and overnight sleeps without loss,
So that the app is trustworthy enough to use for real procedures. (FR17, FR18, NFR6)

**Acceptance Criteria:**

**Given** I have one or more saved templates
**When** I close the browser tab and reopen it
**Then** all templates render on `/templates` with the exact `name`, `items`, and `updatedAt` they had at close

**Given** I have an active run with partial tick state
**When** I close the browser tab and reopen it
**Then** the run renders on `/templates/[id]/run` with the exact tick state it had at close (FR18)

**Given** I have multiple templates and runs
**When** I reload the page mid-edit
**Then** any change persisted before reload is recoverable
**And** any change still in the debounce window is lost (acceptable per debounce semantics — documented behaviour)

**Given** the app reads a persisted blob with `schemaVersion: 1`
**When** the current code's schema version is also `1`
**Then** the blob parses successfully via the Valibot schema

**Given** the app reads a persisted blob with an unknown future `schemaVersion` (e.g., `2`)
**When** parsing
**Then** the blob is treated as invalid, logged to console, skipped from state, and a toast renders: "Some data couldn't be loaded — it may be from a newer version of this app."
**And** the user is not blocked from creating new templates

**Given** an E2E Playwright test at `tests/e2e/persistence.spec.ts`
**When** the test creates a template, ticks half a run, reloads the page, and reads back state
**Then** the asserted state matches exactly (verifies NFR6 zero-data-loss)

### Story 3.2: Honest empty-state messaging

As Maya,
I want the empty state to tell me clearly that templates are stored per-browser and don't sync — instead of letting me think the app deleted my data,
So that I don't rage-quit when I open the app in a new browser and see nothing. (FR19 — Journey 1B)

**Acceptance Criteria:**

**Given** localStorage is available and contains zero templates for this origin
**When** I navigate to `/templates`
**Then** the `EmptyState` renders with two distinct messages:
- Primary: "No templates yet on this browser."
- Secondary (muted): "Templates are stored locally on each browser — they don't sync across browsers in this version. Sync between browsers is on the roadmap."
**And** a "Create template" button is the primary CTA

**Given** the empty state copy
**When** rendered
**Then** the copy explicitly distinguishes "no templates yet on this browser" from "your data is gone" — the user is not led to believe their other-browser data was deleted

**Given** I have at least one template saved
**When** I navigate to `/templates`
**Then** the empty-state copy does NOT render

### Story 3.3: Distinguishable storage error states

As Maya,
I want explicit, distinguishable messages when localStorage is unavailable, full, or has been cleared by the browser,
So that I understand which failure I'm hitting and what to do about it — never a silent failure or a generic error. (FR20, NFR7)

**Acceptance Criteria:**

**Given** localStorage is unavailable (private mode, disabled, blocked by browser policy)
**When** the app boots and the storage backend probes availability
**Then** a persistent banner renders: "Local storage is disabled in this browser. Templates can't be saved. Try a different browser or disable private mode."
**And** the "Create template" button is disabled with the same explanation in a tooltip
**And** a `StorageError(UNAVAILABLE)` is logged

**Given** localStorage write fails with `QuotaExceededError`
**When** any save is attempted
**Then** the call rejects with `StorageError(QUOTA_EXCEEDED)`
**And** a toast renders: "Storage is full. Delete templates or archived runs to free space."
**And** the in-flight UI state is preserved (input not lost)

**Given** localStorage was previously populated and is now empty (cleared by browser, by user, by extension)
**When** I navigate to `/templates`
**Then** the empty state from Story 3.2 renders (the system cannot distinguish "cleared" from "never used" from a single browser session — this is acceptable per PRD)

**Given** the storage error states above
**When** any of them is encountered
**Then** the message string is unique to its kind — never a generic "Something went wrong"
**And** the message identifies the kind to the user (full vs disabled)

**Given** unit tests for the storage backend
**When** each error state is simulated (mocked `QuotaExceededError`, mocked `localStorage` global removed)
**Then** the corresponding `StorageError` kind is thrown
**And** no partial write is left behind on quota failure

### Story 3.4: Full offline operation after first load

As Maya,
I want the app to work fully offline once the static assets have loaded,
So that I can run my procedures on a flight, in a basement, or any time my connection drops. (NFR8)

**Acceptance Criteria:**

**Given** the static build is loaded once with network connectivity
**When** I subsequently disconnect from the network (browser DevTools "Offline" mode)
**Then** I can still navigate between `/templates`, `/templates/new`, `/templates/[id]`, and `/templates/[id]/run`
**And** I can create, edit, rename, delete templates
**And** I can start runs, tick items, hit go-state, and reset

**Given** the v1 build via `@sveltejs/adapter-static`
**When** the app is running
**Then** no `fetch()` calls are made to external services (verified via network log)
**And** no third-party CDN, analytics, or font calls happen at runtime

**Given** an E2E test at `tests/e2e/offline.spec.ts`
**When** the test loads the app, sets the browser context offline, performs a full create → run → tick → go-state → reset cycle
**Then** every assertion passes (verifies NFR8)

### Story 3.5: MVP accessibility floor — keyboard, focus, contrast

As a keyboard-only user (and as a future WCAG 2.1 AA audit pass in Epic 10),
I want every interactive element operable via keyboard with a visible focus state, and key UI to meet ≥ 4.5:1 contrast,
So that the MVP is usable for keyboard-only users today and the Growth audit is verification, not rewrite. (FR44, NFR17, NFR18)

**Acceptance Criteria:**

**Given** every interactive element across `/templates`, `/templates/new`, `/templates/[id]`, `/templates/[id]/run`
**When** the user navigates via Tab and Shift-Tab
**Then** focus moves through elements in DOM order
**And** every focusable element has a visible focus ring meeting ≥ 3:1 contrast against its background
**And** focus is never trapped except inside intentionally modal dialogs (template delete, replace-run, reset confirmation)

**Given** any modal dialog (delete, replace-run, reset)
**When** the dialog opens
**Then** focus moves to the primary action button
**And** Tab cycles within the dialog only
**And** Esc closes the dialog and returns focus to the element that triggered it

**Given** every actionable control (tick, button, link, input)
**When** focused
**Then** Space and/or Enter activates it appropriately:
- Space toggles checkboxes/ticks
- Enter activates buttons and submits forms

**Given** the design tokens in `tailwind.config.ts` and `app.css`
**When** every text-on-background pair is measured
**Then** body text meets ≥ 4.5:1 contrast
**And** primary CTAs meet ≥ 4.5:1
**And** the go-state green meets ≥ 4.5:1 for both text-on-green and icon-on-green (NFR18)

**Given** an automated accessibility check
**When** axe-core runs against every MVP route in CI (via `@axe-core/playwright`)
**Then** zero violations of severity "serious" or "critical" are reported
**And** the CI build fails on any new violation

**Given** ESLint with `eslint-plugin-svelte` a11y rules enabled
**When** a component uses a div as a button or omits a label
**Then** ESLint flags it and CI fails

## Epic 4: Run History & Archive (Growth — local)

Users can archive a completed run as a permanent record at the moment they hit the go-state, list archives per template, open an archive to inspect items and tick state as captured, and delete archives. No backend; everything stays local via the storage abstraction. Maya gets record-keeping, not just reset.

### Story 4.1: Archive a completed run at the go-state

As Maya,
I want to archive a completed run as a permanent record at the moment I reach the go-state, before I reset for next time,
So that I have a history of "what I packed for this trip" without losing it on reset. (FR21)

**Acceptance Criteria:**

**Given** the storage backend is extended with archive support
**When** `archiveRun(run)` is called
**Then** a deep copy of the run is persisted under a separate namespaced localStorage key (e.g., `archived_runs:<templateId>:<runId>`)
**And** the archived blob carries `archivedAt` ISO timestamp, the snapshot of `items` (id, text, ticked) at archive time, and `schemaVersion: 1`
**And** the source `Run` is also cleared via `storage.clearRun(templateId)` in the same operation

**Given** a Valibot schema at `src/lib/schemas/archived-run.ts`
**When** any archived run is read or written
**Then** the schema validates the shape, including a `templateId`, `runId`, `archivedAt`, and `items[]` snapshot

**Given** I am on `/templates/[id]/run` and the run is in the go-state
**When** I click the "Archive" button (rendered alongside "Reset" in the go-state)
**Then** the run is archived per above
**And** I am navigated to `/templates/[id]/history` (the archive list)
**And** a toast renders: "Run archived."

**Given** the run is NOT in the go-state
**When** the run view is rendered
**Then** the "Archive" button is NOT rendered (FR21 — archive only at go-state)

**Given** localStorage is at quota
**When** "Archive" is clicked
**Then** the call rejects with `StorageError(QUOTA_EXCEEDED)`
**And** a toast renders the same quota-full message from Story 3.3
**And** the source run is NOT cleared (the operation is atomic — either both succeed or neither)

### Story 4.2: View archived runs for a template

As Maya,
I want to see a list of archived runs for a given template,
So that I can scan my history at a glance and find a specific past run. (FR22)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]` for an existing template
**When** the page loads
**Then** a "View history" link/button renders
**And** the link is suppressed (or shows a count of 0) if no archives exist for this template

**Given** I navigate to `/templates/[id]/history`
**When** the route loads
**Then** all archived runs for this `templateId` are fetched via `storage.getArchivedRuns(templateId)`
**And** each renders as a row showing `archivedAt` (formatted as a local date+time) and the count of ticked items (which by Epic 4's FR21 will be all of them, but the field is shown for forward-compat with future partial-archive flows)
**And** the list is sorted by `archivedAt` descending

**Given** no archived runs exist for this template
**When** I navigate to `/templates/[id]/history`
**Then** an `EmptyState` renders: "No archived runs yet for this template."
**And** a link back to `/templates/[id]` is provided

**Given** an archived run row is rendered
**When** I click on it
**Then** I am navigated to `/templates/[id]/history/[runId]` (Story 4.3)

### Story 4.3: View an archived run

As Maya,
I want to open an archived run and see its items and tick state exactly as they were when I archived it,
So that I have a faithful, read-only record. (FR23)

**Acceptance Criteria:**

**Given** I navigate to `/templates/[id]/history/[runId]` for an existing archived run
**When** the route loads
**Then** the archived run is fetched via `storage.getArchivedRun(runId)`
**And** every item from the archive renders with the exact `text` and `ticked` state captured at archive time
**And** the page renders `archivedAt` formatted as local date+time

**Given** the archived run is rendered
**When** I attempt to interact with any item
**Then** items are read-only — clicking does NOT toggle tick state
**And** no "Reset" or "Archive" buttons render (this is a record, not a run)

**Given** an archived run was created when the underlying template had different items
**When** the archive is rendered
**Then** the items shown reflect the archive snapshot, not the current template (FR23 — "as they were at archive time")

**Given** I attempt to navigate to `/templates/[id]/history/[runId]` for a runId that does not exist
**When** the route loads
**Then** a 404 / "Not found" state renders with a link back to `/templates/[id]/history`

### Story 4.4: Delete an archived run

As Maya,
I want to delete an archived run I no longer want to keep,
So that my history stays meaningful and doesn't bloat localStorage. (FR24)

**Acceptance Criteria:**

**Given** I am on `/templates/[id]/history/[runId]` viewing an archived run
**When** I click "Delete archive"
**Then** a confirmation `Modal` opens with copy: "Delete this archived run from [archivedAt date]? This cannot be undone."
**And** focus is trapped within the dialog

**Given** the delete confirmation is open
**When** I confirm
**Then** the archived run is removed via `storage.deleteArchivedRun(runId)`
**And** I am navigated back to `/templates/[id]/history`
**And** a toast renders: "Archived run deleted."

**Given** the delete confirmation is open
**When** I cancel or press Esc
**Then** the dialog closes
**And** the archive is not deleted

**Given** I am on `/templates/[id]/history` (the list view)
**When** a row has a per-row "Delete" affordance (icon button with accessible label)
**Then** clicking it opens the same confirmation
**And** confirming removes the archive in place without navigation

**Given** I delete the last archived run for a template
**When** the navigation completes
**Then** the empty state from Story 4.2 renders

## Epic 5: Item Refinements — Reorder, Nest, Notes (Growth — local)

Users can reorder items within a template, nest items as sub-items beneath a parent, and attach a note to an item that's visible during a run. Local only; no backend coupling. Richer authoring without coupling to publish.

### Story 5.1: Reorder items within a template

As Maya,
I want to reorder items in a template — by drag, by keyboard, or by move-up/move-down buttons,
So that the procedure reads in the order I actually do it. (FR25)

**Acceptance Criteria:**

**Given** the `Template` schema includes an `order` index per item (already from Story 1.5)
**When** items are rendered in the editor or run view
**Then** items render sorted by `order` ascending

**Given** I am on `/templates/[id]` with two or more items
**When** I drag an item by its drag handle to a new position
**Then** the dragged item's `order` is updated such that the new sort matches the visual position
**And** the template is saved via `storage.saveTemplate()` with `updatedAt` refreshed
**And** drag interactions are debounced/batched so a multi-step drag yields one save

**Given** keyboard interaction on an item's drag handle
**When** the handle has focus and I press Space to "pick up", then ↑/↓ to move, then Space to "drop"
**Then** the item's position updates accordingly
**And** focus remains on the drag handle after drop
**And** an aria-live announcement describes the move (e.g., "Item moved to position 3 of 7")

**Given** the run view at `/templates/[id]/run`
**When** the run was instantiated before a reorder
**Then** the run continues to render its items in the order captured at instantiation (the run is a snapshot — reorder of the template does not retro-edit an active run)

**Given** the active run model (FR16)
**When** I edit a template's item order while a run is active
**Then** the existing active run is unaffected (per snapshot semantics above)
**And** any new run instantiated after the edit reflects the new order

**Given** touch interaction on mobile
**When** I long-press an item to initiate drag
**Then** the drag handle's touch target is ≥ 44 × 44 CSS pixels
**And** the drag is cancellable by releasing outside the list

### Story 5.2: Nest items as sub-items

As Maya,
I want to nest an item as a sub-item beneath a parent item,
So that I can express two-level hierarchy in procedures that have natural sub-steps. (FR26)

**Acceptance Criteria:**

**Given** the `Template` schema is extended with an optional `parentId` field per item
**When** an item has `parentId: null` (or omitted)
**Then** it is a top-level item

**Given** an item with `parentId` set to another item's `id` in the same template
**When** the editor renders
**Then** the child renders visually indented beneath its parent
**And** the child's order is scoped within its parent's children

**Given** the editor
**When** I drag an item rightward (or use the keyboard "Indent" affordance) onto a top-level item that immediately precedes it
**Then** the dragged item's `parentId` is set to the preceding item's `id`
**And** the template is saved

**Given** a nested child item
**When** I drag it leftward (or use the "Outdent" affordance)
**Then** the child's `parentId` is cleared (becomes top-level)
**And** the template is saved

**Given** nesting depth
**When** the user attempts to nest a child beneath another child
**Then** the action is rejected (only one level of nesting in v1)
**And** an inline message renders: "Items can only be nested one level deep in this version."

**Given** a parent item is deleted
**When** the deletion is confirmed
**Then** all children of that parent are also deleted in the same save
**And** the confirmation copy explicitly notes child-item count: "Delete '[parent]' and its 3 sub-items?"

**Given** the run view
**When** a run includes nested items
**Then** children render visually indented under their parents
**And** ticking a parent does NOT automatically tick its children (no cascade in v1 — explicit per-item ticking)
**And** the go-state requires every item — parent and child — to be ticked (FR12)

### Story 5.3: Attach a note to an item, visible during a run

As Maya,
I want to attach a note to an item — like "the blue ones, not the black ones" — and see it during a run,
So that I capture the context I'd otherwise forget without cluttering the item text itself. (FR27)

**Acceptance Criteria:**

**Given** the `Template` schema is extended with an optional `note` string per item (max length, e.g., 1000 chars, enforced via Valibot)
**When** an item has no note
**Then** the `note` field is `null` or omitted

**Given** the editor at `/templates/[id]`
**When** an item has focus and I click "Add note" (or press a documented keyboard shortcut)
**Then** an expandable note input renders inline beneath the item text
**And** typing into it updates the `note` field
**And** the change is debounced (≤ 500 ms) and saved via `storage.saveTemplate()`

**Given** an item has a note
**When** the editor renders
**Then** a small "note" indicator (icon or label) renders beside the item text
**And** the note text renders inline (collapsed or expanded; consistent UI affordance)

**Given** the editor
**When** I clear a note's text completely and blur
**Then** the `note` field is set to `null` and the indicator is removed

**Given** the run view at `/templates/[id]/run`
**When** an item has a note
**Then** the note text renders beneath the item text in a visually subdued style (smaller font, lower contrast — but still meeting NFR18 ≥ 4.5:1 contrast)
**And** the note is read-only during a run (notes are template-scoped, not run-scoped)

**Given** an item with no note
**When** the run renders
**Then** no note placeholder is rendered (no dead whitespace)

**Given** notes contain plain text only (per architecture: no HTML in template items in MVP/Growth v1)
**When** a note is rendered anywhere
**Then** the text is rendered with text-only escaping via `lib/utils/escape.ts` — no HTML interpretation

## Epic 6: Publish & Anonymous Identity (Growth — backend introduced here)

Users can publish a template to the public registry with title, one-line description, and tags; receive a stable shareable URL; render it as a public SSR'd landing page with author attribution; and unpublish using a per-publish moderation token. This epic introduces the entire Growth backend: Neon Postgres + Drizzle, adapter swap to `@sveltejs/adapter-cloudflare`, the registry schema, anonymous handle generation, CSP, and Cloudflare Workers KV-backed rate limits. End state: Sam can publish his runbook and paste the link in Slack.

### Story 6.1: Backend infrastructure — Neon, Drizzle, adapter swap, rate limits, health endpoint

As a developer,
I want a Neon Postgres project, a Drizzle schema for `published_templates` (and supporting tables), the SvelteKit adapter swapped to `@sveltejs/adapter-cloudflare`, CSP headers, Cloudflare Workers KV-backed rate limit primitives, and a `GET /api/health` endpoint,
So that every subsequent story in this epic and Epics 7–8 builds on a known-good backend that already enforces NFR9, NFR11, NFR12 baselines.

**Acceptance Criteria:**

**Given** a Neon Postgres project provisioned
**When** the developer runs `pnpm drizzle-kit push` against the Neon connection
**Then** the schema at `src/lib/server/db/schema.ts` is applied
**And** the `published_templates` table exists with columns: `id` (text, PK, ULID), `author_handle` (text), `title` (text), `description` (text), `body` (jsonb — full template + items snapshot), `tags` (text[]), `moderation_token_hash` (text), `published_at` (timestamptz default now), `copy_count` (int default 0), `flag_count` (int default 0)
**And** indexes exist: `idx_published_templates_published_at`, `idx_published_templates_tags` (GIN)
**And** no other tables are created in this story — `flags` lands in Story 8.1 with the flag feature; ranking signals (`copy_count`, `flag_count`) are columns on `published_templates`, not a separate table

**Given** the Drizzle config at `drizzle.config.ts`
**When** schema migration files are generated
**Then** they live at `drizzle/migrations/` and are committed to the repo
**And** `pnpm drizzle-kit push` is documented as a manual deploy step (no auto-migration on `main` push)

**Given** the SvelteKit adapter
**When** the build target is "Growth"
**Then** `svelte.config.js` switches to `@sveltejs/adapter-cloudflare`
**And** `pnpm build` produces a Worker bundle + `_app/` static assets compatible with Cloudflare Pages + Workers
**And** the existing static-adapter MVP build remains available behind an env flag for v1-only deploys

**Given** the Cloudflare Pages + Workers deploy target
**When** a commit lands on `main`
**Then** the deploy workflow publishes both the static assets (Pages) and the Worker bundle
**And** the deployed URL is reachable over HTTPS (NFR12)

**Given** CSP headers in `app.html` and `hooks.server.ts`
**When** any registry response is served
**Then** the response includes `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-...'`
**And** no inline scripts are emitted by the SvelteKit build

**Given** a rate limiter at `src/lib/server/rate-limit.ts` backed by Cloudflare Workers KV
**When** the limiter is configured per-IP with a token bucket
**Then** the limit and refill rate are env-configurable via `RATE_LIMIT_*` env vars
**And** exceeded limits return `429` with `{ error: { code: "RATE_LIMITED", message } }`

**Given** the health endpoint at `src/routes/api/health/+server.ts`
**When** `GET /api/health` is called
**Then** it returns `200 { status: "ok", version: "<git sha>" }`
**And** the endpoint is exempt from rate limiting

**Given** the bundle budget (NFR4)
**When** the Growth build runs
**Then** the client-side bundle remains ≤ 150 KB gzipped (server-only Drizzle + Neon driver are not shipped to the client; ESLint enforces no `lib/server/**` imports from client code)

### Story 6.2: Anonymous handle generation and persistence

As Sam,
I want a unique anonymous authorship handle (e.g., `happy-otter-7821`) generated automatically on my first publish and persisted on this browser,
So that my published templates carry consistent attribution without me creating an account. (FR41 — identity infrastructure; resolves PRD open question via architecture's anonymous-handle decision)

**Acceptance Criteria:**

**Given** a handle generator at `src/lib/features/identity/handle.ts`
**When** `generateHandle()` is invoked
**Then** the handle matches the pattern `<adjective>-<noun>-<4-digit-number>` from a curated word list
**And** the curated word list excludes profanity, slurs, and trademark-likely terms (basic content safety)

**Given** the storage backend is extended with handle persistence
**When** `getHandle()` is called and no handle exists yet for this browser
**Then** `null` is returned (handles are NOT created until first publish)

**Given** a handle has been generated and persisted via `storage.saveHandle(handle)`
**When** `getHandle()` is called subsequently
**Then** the persisted handle is returned

**Given** a Settings route at `/settings`
**When** I navigate there and a handle exists
**Then** my handle renders with copy: "You publish as [handle]. This is stored only on this browser."
**And** a "Generate a new handle" button is offered with a confirmation dialog explaining: "Your existing published templates will keep the old handle. New publishes will use the new handle."

**Given** I confirm "Generate a new handle"
**When** the new handle is generated and saved
**Then** `getHandle()` returns the new handle on next call
**And** existing local moderation tokens for previously published templates remain valid (the handle change does not affect server-side rows)

**Given** a handle is generated client-side
**When** publish (Story 6.3) calls the publish endpoint
**Then** the handle is sent in the request body and persisted server-side on the row
**And** the server does not enforce uniqueness across handles (collisions are acceptable per architecture; the local handle is purely a label)

**Given** the handle persists in localStorage under a namespaced key
**When** the user clears localStorage
**Then** the handle is lost
**And** Settings copy explicitly warns: "Clearing browser data will lose your handle and your ability to unpublish your existing templates."

### Story 6.3: Publish a template to the registry

As Sam,
I want to publish a template I own with a title (defaulting to the template name), a one-line description, and tags, and receive a stable shareable URL,
So that I can paste the link into Slack and a teammate can grab the template without me being on call. (FR28, FR29, FR30, FR41)

**Acceptance Criteria:**

**Given** the API client surface at `src/lib/api/templates.ts` exists with a typed fetch wrapper
**When** `publish(templateId, metadata)` is called
**Then** it `POST`s to `/api/templates` with a Valibot-validated body containing `body` (full template snapshot — name, items, notes, structure), `title`, `description`, `tags`, `authorHandle`
**And** the response envelope matches `{ id, url, moderationToken, publishedAt, ... }` per architecture's API conventions

**Given** the publish endpoint at `src/routes/api/templates/+server.ts`
**When** a `POST /api/templates` request is received
**Then** the handler parses the body via the shared Valibot schema
**And** generates a ULID for the new row
**And** generates a per-publish moderation token (`crypto.randomUUID()` or equivalent), hashes it (SHA-256), and stores only the hash in `moderation_token_hash`
**And** inserts the row into `published_templates`
**And** rate-limits the request per IP via the limiter from Story 6.1
**And** sanitizes nothing client-text (per architecture: no HTML allowed at all; text-only escape at render — NFR11)
**And** returns `201` with `{ id, url: "/t/<id>", moderationToken, publishedAt, authorHandle }`

**Given** I am on `/templates/[id]` for a template I own that is NOT yet published
**When** I click "Publish" (rendered alongside "Run")
**Then** a `PublishDialog` opens with prefilled title (template name) and empty description and tags inputs
**And** if no handle exists yet, one is generated and persisted via Story 6.2 before submission

**Given** the `PublishDialog` is open
**When** I submit with valid title (≤ 100 chars), description (≤ 200 chars), and 0–5 tags (each ≤ 30 chars, kebab-case)
**Then** `publish()` is called
**And** on success, the dialog closes
**And** the local template is marked as published via the storage backend with the published `id`, `url`, and `moderationToken` (persisted locally for unpublish in Story 6.5)
**And** a success state in the dialog shows the shareable URL with a "Copy link" button
**And** a toast renders: "Published. Link copied to clipboard."

**Given** validation fails (empty title, too many tags, etc.)
**When** I submit
**Then** the dialog renders inline field-level errors via the same Valibot schema used server-side
**And** no API request is made

**Given** the publish request is rate-limited
**When** the server returns `429`
**Then** a toast renders: "You're publishing too quickly. Try again in a few seconds."
**And** the dialog stays open with input preserved

**Given** the publish request fails (`5xx`, network error)
**When** the failure is detected
**Then** a toast renders the failure message
**And** the local template is NOT marked as published
**And** the dialog stays open with input preserved

**Given** a template is already marked as published locally
**When** I view `/templates/[id]`
**Then** the "Publish" button is replaced with "View public page" (link to `/t/<id>`) and "Unpublish" (Story 6.5)
**And** the published URL is visible

### Story 6.4: Public landing page for a published template (SSR)

As Sam's teammate (or any link recipient),
I want to open a published template URL and see the template's title, description, items, tags, and author handle in a server-rendered page that's fast and SEO-indexable,
So that I can preview the template without copying it (preview is also Epic 7's FR35) and the link is meaningful when pasted in Slack with a preview card. (FR30 — URL is renderable; FR41 — handle displayed; NFR11 — XSS-safe)

**Acceptance Criteria:**

**Given** a published template row exists with a given `id`
**When** I navigate to `/t/<id>`
**Then** the page is server-rendered via `+page.server.ts` calling `lib/server/db/queries.ts`
**And** the row's `title`, `description`, `tags`, `authorHandle`, `publishedAt`, item count, and rendered items list are all displayed

**Given** every text field rendered server-side or client-side
**When** the body contains characters that could be interpreted as HTML (`<`, `>`, `&`, etc.)
**Then** the text is escaped via `lib/utils/escape.ts` and rendered as plain text only (NFR11 — no HTML allowed)

**Given** OpenGraph metadata in the page `<head>`
**When** the page is rendered
**Then** `og:title` is the published title, `og:description` is the description, `og:url` is the canonical URL, and `og:type` is `article`
**And** `<meta name="description">` matches the published description

**Given** CDN edge caching is configured
**When** the response is served
**Then** `Cache-Control: public, max-age=60, stale-while-revalidate=300` headers are set
**And** the cache is busted within 60 seconds of an unpublish (Story 6.5) — acceptable lag

**Given** a `<id>` that does not exist in `published_templates`
**When** I navigate to `/t/<id>`
**Then** the page renders a 404 with copy: "This template doesn't exist or has been removed."

**Given** a `<id>` that exists but has been hard-deleted by an operator (Epic 8)
**When** I navigate to `/t/<id>`
**Then** the page renders the same 404 (or `410 Gone` per architecture — operator can choose)

**Given** the public page client-JS budget
**When** the page is rendered
**Then** the client JS attached to `/t/<id>` is near-zero — only enough to wire up the "Copy to my templates" button (Epic 7 deliverable; this story renders a placeholder/disabled CTA acceptable in 6.4 if Epic 7 hasn't shipped)

**Given** the page is server-rendered
**When** Lighthouse runs against the URL
**Then** the page scores ≥ 90 on Performance, Accessibility, and SEO categories at desktop emulation

### Story 6.5: Unpublish a template using a moderation token

As Sam,
I want to unpublish a template I previously published, using the moderation token that was issued at publish time and persisted on this browser,
So that I can take back content I no longer want public — without an account. (FR32)

**Acceptance Criteria:**

**Given** the unpublish endpoint at `src/routes/api/templates/[id]/+server.ts`
**When** a `DELETE /api/templates/<id>` request is received with header `X-Moderation-Token: <raw-token>`
**Then** the handler hashes the supplied token (SHA-256) and compares it to `moderation_token_hash` on the row
**And** on match, the row is hard-deleted
**And** on mismatch, returns `403 { error: { code: "FORBIDDEN", message } }`
**And** on missing header, returns `401 { error: { code: "UNAUTHORIZED", message } }`
**And** the request is rate-limited per IP

**Given** I am on `/templates/[id]` for a template I have published
**When** I click "Unpublish"
**Then** a confirmation `Modal` opens: "Unpublish this template? It will be removed from the public registry. Anyone who already copied it keeps their copy (fork semantics)."

**Given** the unpublish confirmation is open
**When** I confirm
**Then** the locally persisted moderation token for this template is read via the storage backend
**And** `DELETE /api/templates/<id>` is called with the token in the header
**And** on `200`/`204`, the local template's published metadata (id, url, moderationToken) is cleared
**And** the page re-renders with "Publish" available again
**And** a toast renders: "Template unpublished."

**Given** I do not have a local moderation token for this template (e.g., browser data was cleared)
**When** I view `/templates/[id]`
**Then** the "Unpublish" button is disabled with a tooltip: "Can't unpublish from this browser — the moderation token was lost. Contact moderators to take it down."
**And** the architecture's accepted limit is acknowledged in the UI rather than silently broken

**Given** the unpublish API returns `403` (token mismatch)
**When** the failure is detected
**Then** a toast renders: "Couldn't unpublish — moderation token doesn't match. The template may have been republished from a different browser."
**And** the local published metadata is NOT cleared (the user can investigate)

**Given** an unpublish succeeds
**When** the public landing page `/t/<id>` is requested afterward
**Then** within the cache-control window (≤ 60 s per Story 6.4), the page returns 404

## Epic 7: Browse, Search & Copy with Fork Semantics (Growth)

Users can browse the public registry, search by title/description/tag, preview a template's items without copying, copy a template into their own list with one action (fork — no propagation), and see a featured/popular surface (ranking signal definition deferred). The browse page is SSG'd; public detail pages stay SSR. End state: Pat finds and copies a 1:1 template before her next meeting.

### Story 7.1: Browse public templates list

As Pat,
I want a Browse page that lists publicly published templates with author handle, description, item count, and tags,
So that I can scan for a template that fits my situation. (FR33)

**Acceptance Criteria:**

**Given** the list endpoint exists at `GET /api/templates`
**When** the endpoint is called without `q` or `tag` params
**Then** it returns up to `limit` (default 20) most recently published rows ordered by `published_at DESC, id DESC`
**And** the response is `{ items: [...], nextCursor: string | null }` per architecture's pagination convention
**And** each item includes `id, title, description, tags, authorHandle, itemCount, publishedAt`

**Given** cursor-based pagination
**When** the response includes a `nextCursor`
**Then** subsequent calls with `?cursor=<value>` return the next page
**And** no offset-based pagination is used

**Given** the Browse page at `/browse` configured with `prerender = true`
**When** the static build runs
**Then** the SSG shell is pre-rendered with the latest top page baked in (acceptable to be slightly stale; refresh on client mount)
**And** further pages and search are fetched client-side via `lib/api/templates.ts`

**Given** I navigate to `/browse`
**When** the page loads
**Then** templates render as cards in a responsive grid (1 col small, 2–3 col larger)
**And** each card shows title, description (truncated), tags, author handle, item count
**And** clicking a card navigates to `/t/<id>` (Story 6.4)

**Given** scrolling near the bottom of the list
**When** the user reaches a configured threshold
**Then** the next page is fetched and appended (or a "Load more" button provides equivalent without auto-scroll)

**Given** an API error (network, 5xx)
**When** I am on `/browse`
**Then** an error state renders with "Try again" affordance
**And** previously fetched cards remain visible

### Story 7.2: Search the registry by title, description, or tag

As Pat,
I want a search bar that filters the registry by title, description, or tag,
So that I can find "1:1" or "deploy" templates without scrolling. (FR34)

**Acceptance Criteria:**

**Given** the list endpoint accepts `q` (free text) and `tag` (single tag) query params
**When** `q` is supplied
**Then** the server matches against `title` and `description` using a case-insensitive `ILIKE`-or-equivalent on a trigram or simple index (start simple — a Postgres `ILIKE '%q%'` is acceptable for NFR16 scale)
**And** results are ordered by `published_at DESC` (no relevance ranking in v1)

**Given** `tag` is supplied
**When** the query runs
**Then** rows are filtered to those whose `tags` array contains the supplied tag (using the GIN index from Story 6.1)

**Given** both `q` and `tag` are supplied
**When** the query runs
**Then** the conditions combine with AND

**Given** a `SearchBar` component on `/browse`
**When** I type into it
**Then** the input is debounced (≤ 300 ms) and the URL updates to `/browse?q=<value>` (shallow routing)
**And** the API request is fired with the new params
**And** the cards re-render with new results

**Given** a tag chip on a card
**When** I click it
**Then** `/browse?tag=<value>` is navigated to and the page filters to that tag

**Given** no matches for the current `q`/`tag`
**When** the empty result returns
**Then** an empty state renders: "No templates matched your search."
**And** a "Clear filters" button restores the unfiltered list

### Story 7.3: Preview a published template without copying

As Pat,
I want to see a published template's items in full before deciding whether to copy it,
So that I can judge whether it's the right fit. (FR35)

**Acceptance Criteria:**

**Given** I am on `/t/<id>` (the SSR landing from Story 6.4)
**When** the page renders
**Then** every item from the published template body is visible — text, nesting, notes — in read-only form
**And** no tick affordance is rendered (this is a preview, not a run)

**Given** the preview page
**When** I view it
**Then** a "Copy to my templates" button is the primary CTA (delivered in Story 7.4)

**Given** all rendered text from the published body
**When** rendered
**Then** every text field is escaped via `lib/utils/escape.ts` (NFR11)

**Given** the page contains potentially long content (e.g., 1000 items per NFR15)
**When** SSR renders
**Then** the page handles the volume without violating Lighthouse Performance ≥ 90 (server-render only, minimal client hydration)

### Story 7.4: Copy a published template into my templates with fork semantics

As Pat,
I want a one-action "Copy to my templates" that creates an independent fork in my local template list,
So that I can edit it freely without affecting the source — and the source's edits never reach me. (FR36, FR37)

**Acceptance Criteria:**

**Given** the copy endpoint at `POST /api/templates/[id]/copy`
**When** the endpoint is called
**Then** the row is read from `published_templates`
**And** `copy_count` is incremented atomically (signal for future FR38 ranking)
**And** the response returns the full template `body` for client-side ingestion
**And** the request is rate-limited per IP

**Given** I am on `/t/<id>`
**When** I click "Copy to my templates"
**Then** `lib/api/templates.copy(id)` is called
**And** on success, the returned `body` is deep-cloned, assigned a new local ULID, given fresh `createdAt`/`updatedAt`, and saved via `storage.saveTemplate()`
**And** the local copy is NOT marked as published (no moderation token, no source reference) — fork semantics, not symlink
**And** I am navigated to `/templates/<newId>`
**And** a toast renders: "Template copied. Edit it however you like."

**Given** the local copy has been created
**When** the source template is later updated (republished or unpublished)
**Then** the local copy is unaffected (no foreign key, no propagation, no fetch)

**Given** the local copy
**When** I edit it
**Then** the edits are local-only and do not reach the source registry row

**Given** the registry returns `404` (source unpublished between browse and copy click)
**When** the failure is detected
**Then** a toast renders: "This template was unpublished. Try a different one."
**And** no local template is created

**Given** the registry returns `429` (rate-limited)
**When** the failure is detected
**Then** a toast renders the rate-limit message
**And** no local template is created

**Given** localStorage is at quota
**When** the local save in this story fails with `StorageError(QUOTA_EXCEEDED)`
**Then** the same quota toast from Story 3.3 renders
**And** the registry's `copy_count` increment has already been applied (acceptable: the user did initiate a copy; they just can't finish it locally — documented behaviour)

### Story 7.5: Featured/popular surface on Browse

As Pat,
I want a clearly-labelled "Featured" section at the top of Browse showing a small set of templates that the registry highlights,
So that I have a curated entry point before resorting to search. (FR38 — schema-and-surface only; ranking signal definition deferred per PRD)

**Acceptance Criteria:**

**Given** the list endpoint accepts a `featured=true` query param
**When** the param is supplied
**Then** rows are returned that match the current featured criterion
**And** the criterion is implemented as a stub: `ORDER BY copy_count DESC, published_at DESC LIMIT 10` (placeholder; explicitly documented as the v1 stub per architecture's "ranking deferred" note)

**Given** the Browse page
**When** there is no active search/filter
**Then** a "Featured" section renders above the main list with up to 10 cards from the featured endpoint
**And** the section is labelled clearly ("Featured templates" or equivalent — not silently mixed into the main list)

**Given** the featured criterion is the v1 stub
**When** the registry has very little content (< 10 templates)
**Then** the Featured section gracefully shows whatever rows exist
**And** if there are zero rows, the entire Featured section is suppressed (no empty placeholder)

**Given** schema fields `copy_count` and `flag_count` from Story 6.1
**When** the FR38 ranking is properly defined post-content
**Then** changing the ranking function is a server-side change in `+server.ts` only — no schema migration, no client change

## Epic 8: Flag & Moderation (Growth)

Users can flag a published template for moderation review. Operators can remove flagged templates from the registry within the NFR13 24-hour SLO via a minimal admin queue. Hard-delete is the removal action.

### Story 8.1: Flag a published template for moderation review

As Pat (or any registry visitor),
I want a "Flag" affordance on every public template page,
So that the registry has a self-policing surface for content that breaks the rules. (FR42)

**Acceptance Criteria:**

**Given** the Drizzle schema is extended in this story
**When** `pnpm drizzle-kit push` is run
**Then** the `flags` table is created with columns: `id` (text, PK, ULID), `template_id` (text, FK → `published_templates.id` with `ON DELETE CASCADE`), `reason` (text), `category` (text), `flagger_ip_hash` (text), `created_at` (timestamptz default now)
**And** a unique index `uniq_flags_template_ip` covers `(template_id, flagger_ip_hash)` for dedupe enforcement at the DB layer

**Given** the flag endpoint at `POST /api/templates/[id]/flag`
**When** the endpoint is called with body `{ reason: string, category: string }` (reason ≤ 500 chars, category in the configured enum, validated via Valibot)
**Then** a row is inserted into `flags` with `id` (ULID), `template_id`, `reason`, `category`, `flagger_ip_hash` (SHA-256 of IP for dedupe), `created_at`
**And** `flag_count` on the source `published_templates` row is incremented atomically
**And** the request is rate-limited per IP (stricter than browse — e.g., 5 flags / 15 min)
**And** duplicate flags from the same IP for the same template are deduped (the row is inserted but `flag_count` is not double-incremented when `flagger_ip_hash` already exists for that template)

**Given** I am on `/t/<id>`
**When** I click "Flag"
**Then** a `Modal` opens with a reason textarea and category radios (e.g., "Spam", "Abusive", "Off-topic", "Other")
**And** focus is trapped within the dialog

**Given** the flag dialog is open
**When** I submit with a reason
**Then** the API is called
**And** on success, the dialog closes and a toast renders: "Thanks — this template has been flagged for review."
**And** the flag UI on the page enters a "flagged" state for the rest of the session (basic feedback to the flagger; not authoritative server-side state)

**Given** the flag fails (rate-limited, network)
**When** the failure is detected
**Then** the failure message renders in the dialog
**And** the dialog stays open with input preserved

**Given** all flag-reason text rendered anywhere in the moderation queue
**When** rendered
**Then** the text is escaped via `lib/utils/escape.ts` (NFR11)

### Story 8.2: Operator removal of flagged templates

As an operator,
I want a minimal moderation queue listing flagged templates with their flag counts and reasons, plus a one-click Remove action,
So that I can hit the NFR13 24-hour-from-flag SLO. (FR43, NFR13)

**Acceptance Criteria:**

**Given** an operator route at `/admin/moderation`
**When** an unauthenticated user navigates to it
**Then** a basic auth challenge or env-keyed token check rejects access (operator auth is intentionally minimal in Growth v1; per architecture, full admin tooling is Vision-era)

**Given** the operator has authenticated via the env-token mechanism
**When** the page loads
**Then** flagged templates are listed with `template_id`, `title`, `author_handle`, `flag_count`, latest 3 flag `reason`s, and `published_at`
**And** the list is sorted by `flag_count DESC, latest_flag_at DESC`

**Given** the operator clicks "Remove" on a flagged row
**When** confirmed via a `Modal`
**Then** the row is hard-deleted from `published_templates` via `DELETE /api/admin/templates/<id>` (operator-auth required)
**And** flags for that template are also deleted (cascade)
**And** within the cache-control window (≤ 60 s), `/t/<id>` returns 404

**Given** an operator chooses to clear flags without removing
**When** they click "Dismiss flags" on a row
**Then** the flags are deleted but the template remains live
**And** `flag_count` resets to 0

**Given** the moderation surface
**When** rendered
**Then** all user-supplied text (titles, descriptions, reasons) is escaped via `lib/utils/escape.ts`
**And** no inline HTML can render under any path (NFR11)

**Given** the NFR13 SLO requirement
**When** measured operationally
**Then** dashboards/queries on `flags` table report time-from-flag-to-remove
**And** the SLO is monitored (mechanism out of scope for the story; the queryable data must exist)

## Epic 9: PWA Install & Offline (Growth)

Users can install the app as a Progressive Web App on supported mobile platforms. Once installed, the full authoring and run experience works offline, matching v1 in-browser behaviour. Service worker pre-caches the authoring shell + static assets; registry API responses use `staleWhileRevalidate`.

### Story 9.1: PWA manifest and install affordance

As Maya,
I want to add the app to my phone's home screen so it opens as a standalone app,
So that I can launch it like any other app on my phone. (FR39)

**Acceptance Criteria:**

**Given** `static/manifest.webmanifest` exists with required PWA fields
**When** the file is served
**Then** it specifies `name`, `short_name`, `start_url: "/templates"`, `display: "standalone"`, `theme_color`, `background_color`, and `icons` array (192, 512, plus a maskable variant)

**Given** PWA icons are emitted to `static/icons/`
**When** the manifest is read
**Then** all referenced icon paths return 200

**Given** `@vite-pwa/sveltekit` is installed and configured
**When** the build runs
**Then** the manifest link is injected into `<head>` automatically
**And** a service worker is generated per Story 9.2

**Given** I open the deployed app on a Chromium-based mobile browser
**When** the install criteria are met
**Then** the browser surfaces an install prompt
**And** an in-app "Install" button (rendered conditionally via `beforeinstallprompt`) offers a manual install path

**Given** I install the PWA
**When** I open it from the home screen
**Then** it opens in standalone mode (no browser chrome)
**And** the start URL is `/templates`

**Given** the bundle budget (NFR4)
**When** PWA assets are added
**Then** the client-side initial JS remains ≤ 150 KB gzipped (the service worker itself is not counted against the initial bundle)

### Story 9.2: Service worker for full offline operation

As Maya,
I want the installed PWA to work fully offline — create templates, run them, hit go-state, archive, reset — matching the v1 in-browser behaviour,
So that I can use the app without a connection. (FR40, NFR8)

**Acceptance Criteria:**

**Given** `@vite-pwa/sveltekit` configured in `injectManifest` mode
**When** the build runs
**Then** the service worker at `src/service-worker.ts` is emitted
**And** the worker pre-caches the authoring shell (`/`, `/templates`, `/templates/new`, `/templates/[id]`, `/templates/[id]/run`, `/templates/[id]/history`, `/settings`, `/browse`, `+layout` chunks, fonts, icons, CSS)

**Given** the user is offline
**When** they navigate to any pre-cached authoring route
**Then** the page loads from the service worker cache
**And** all storage-backed actions (create, edit, tick, archive, reset) work as in MVP

**Given** registry API calls (`/api/templates*`)
**When** the user is online
**Then** the service worker uses `staleWhileRevalidate` — serves the cached response if available, refreshes in the background

**Given** registry API calls when offline
**When** the user is offline and the cache has a prior response
**Then** the cached response is returned with a banner indicating "Offline — showing cached results" (where rendered, e.g., on `/browse`)

**Given** registry API calls when offline with no prior cache
**When** the request fails
**Then** the error is surfaced gracefully (toast + retry affordance), and authoring remains fully functional

**Given** a service worker update
**When** a new version of the app is deployed
**Then** the worker activates with `skipWaiting` + `clientsClaim` patterns (or a user-prompted "Update available" toast — pick one and implement consistently)

**Given** an E2E Playwright test at `tests/e2e/offline-pwa.spec.ts`
**When** the test installs the worker, sets the browser context offline, and walks the full create→run→archive cycle
**Then** every assertion passes

## Epic 10: Full WCAG 2.1 AA Conformance (Growth)

All dynamic state changes (tick, untick, reaching go-state, reset) are announced to assistive technologies. axe/Lighthouse clean plus a manual screen-reader pass on the run view. Reduced-motion preferences respected throughout.

### Story 10.1: ARIA live regions for dynamic state changes

As a screen-reader user,
I want every meaningful dynamic state change — tick, untick, reaching the go-state, reset, archive — announced via ARIA live regions,
So that I have feedback equivalent to the visible state. (FR45)

**Acceptance Criteria:**

**Given** an `aria-live="polite"` region on the run view (`/templates/[id]/run`)
**When** an item is ticked
**Then** the region announces e.g. "Item 3 of 7 complete: '<item text>'"
**And** when unticked, it announces e.g. "Item 3 marked incomplete"

**Given** the same live region
**When** the run reaches the go-state
**Then** the region announces e.g. "All 7 items complete. Run finished."
**And** the announcement uses `aria-live="assertive"` for the go-state (it's the wedge moment; interrupt is appropriate)

**Given** reset
**When** I confirm reset
**Then** the region announces "Run reset. All items unchecked."

**Given** archive
**When** I confirm archive on go-state
**Then** the region announces "Run archived. <archivedAt> in your history."

**Given** the editor view
**When** an item is added, edited, or removed
**Then** the region announces the action (debounced to avoid noise — only on confirmed save)

**Given** standard ARIA roles and labels
**When** every interactive element renders
**Then** it has either an explicit `aria-label` or visible text serving as label
**And** native semantic HTML is preferred over ARIA where equivalent (button > div with role=button)

### Story 10.2: Reduced-motion preference handling

As a user with motion sensitivity,
I want every animated transition to honor `prefers-reduced-motion: reduce`,
So that the app doesn't trigger discomfort.

**Acceptance Criteria:**

**Given** the user OS-level preference `prefers-reduced-motion: reduce`
**When** any animated transition fires (go-state appearance, modal open/close, toast slide-in, drag preview)
**Then** the transition resolves instantly with no animated motion

**Given** Tailwind v4 `@media (prefers-reduced-motion: reduce)` queries in the design tokens
**When** a CSS animation/transition is defined
**Then** a reduced-motion variant is also defined (instant or near-instant)

**Given** an automated check via Lighthouse / axe
**When** the audit runs against MVP and Growth routes
**Then** no motion-related warnings are reported

### Story 10.3: WCAG 2.1 AA audit pass

As the team,
I want axe-core, Lighthouse, and a manual screen-reader pass on the run view to confirm WCAG 2.1 AA conformance,
So that the Growth a11y commitment is verified, not assumed. (NFR19)

**Acceptance Criteria:**

**Given** axe-core configured in CI via `@axe-core/playwright`
**When** the suite runs against every Growth route
**Then** zero violations of severity "minor", "moderate", "serious", or "critical" are reported (full AA threshold, stricter than the MVP gate from Story 3.5)

**Given** Lighthouse Accessibility category configured in CI
**When** the audit runs against every Growth route
**Then** every route scores ≥ 95
**And** a regression below the threshold fails the build

**Given** a manual screen-reader pass on the run view
**When** the operator drives the page with VoiceOver (Safari) and NVDA (Firefox/Chrome)
**Then** every action (tick, untick, navigate, reset, archive, go-state) produces a coherent announcement
**And** there are no orphaned focus states or unreachable controls
**And** issues found are filed and fixed, then re-tested

**Given** color contrast audit beyond MVP key surfaces
**When** every UI surface (cards, badges, tags, inputs, disabled states, tag chips, hover/focus states) is measured
**Then** every text-on-background pair meets ≥ 4.5:1 (or ≥ 3:1 for large text per WCAG)
**And** non-text interactive indicators (focus rings, borders) meet ≥ 3:1

**Given** language declaration
**When** any page loads
**Then** `<html lang="en">` (or appropriate locale) is set on the document root

**Given** the audit completes
**When** results are summarized
**Then** the team has a documented baseline (axe + Lighthouse scores, screen-reader notes) to regress against in future stories

## Epic 11: Portability — Export, Import & Cross-Device Sync (Vision)

Users can export their templates and run history as JSON and import from a previously exported file. Users with accounts can sync templates and run state across browsers and devices. The optional account layer attaches to existing handles rather than replacing them.

### Story 11.1: Export templates and history to a JSON file

As Maya,
I want to export all my templates and archived runs as a single JSON file,
So that I have a manual backup and an escape hatch when localStorage is at risk. (FR46)

**Acceptance Criteria:**

**Given** an export utility at `src/lib/utils/export.ts`
**When** `exportAll()` is called
**Then** it returns a JSON-serializable object: `{ schemaVersion: 1, exportedAt: <ISO>, templates: [...], archivedRuns: [...], handle: <string|null> }`
**And** every template and archived run is the full snapshot (including items, notes, parentId, etc.)

**Given** the Settings page at `/settings`
**When** I click "Export to JSON"
**Then** the browser triggers a download of `bmad-export-<YYYYMMDD>.json` with content from `exportAll()`
**And** a toast renders: "Exported <N> templates and <M> archived runs."

**Given** the export contains the user's anonymous handle (Story 6.2)
**When** the file is generated
**Then** the handle is included
**And** the Settings copy explicitly notes: "Your handle is included in the export. You can use it to keep attribution consistent if you import on another browser."

**Given** the file is generated client-side
**When** export is invoked
**Then** no network request is made (works fully offline per NFR8)

### Story 11.2: Import templates and history from a JSON file

As Maya,
I want to import a previously exported JSON file and see my templates and archived runs restored,
So that I can recover after a localStorage clear or move to a new browser. (FR47)

**Acceptance Criteria:**

**Given** the Settings page
**When** I click "Import from JSON" and pick a file
**Then** the file is parsed via `JSON.parse` inside a try/catch
**And** the parsed object is validated against the export Valibot schema (matching Story 11.1's shape, including `schemaVersion`)
**And** invalid files surface a clear error toast: "This file isn't a valid bmad export."

**Given** a valid export with `schemaVersion: 1`
**When** I confirm import in the import dialog
**Then** every template is saved via `storage.saveTemplate()` and every archived run via `storage.archiveRun()`
**And** ID collisions with existing local data are handled by the chosen strategy (e.g., the dialog offers "Replace" vs "Duplicate" — picked at import time and applied consistently)
**And** a toast confirms: "Imported <N> templates and <M> archived runs."

**Given** the export's `handle` differs from the local handle
**When** I confirm import
**Then** the import dialog offers "Adopt the handle from this file" (replaces local handle) vs "Keep my current handle"
**And** the choice is applied consistently

**Given** the import would exceed localStorage quota
**When** the write fails partway with `StorageError(QUOTA_EXCEEDED)`
**Then** any successfully saved items remain (partial import is acceptable per Vision phase)
**And** the toast surfaces: "Storage full. Imported <N> of <M> items. Free up space and re-import to finish."

**Given** an export from a future `schemaVersion`
**When** import is attempted
**Then** the import is rejected with: "This file is from a newer version of the app. Update your app and try again."

### Story 11.3: Accounts and cross-device sync

As Maya (or any user with multiple devices),
I want to sign in with an account and have my templates and run state sync across browsers and devices,
So that I'm not bound to a single browser's localStorage. (FR48 — Vision-tier; introduces the optional account layer per architecture)

**Acceptance Criteria:**

**Given** a Vision-era schema extension in Drizzle
**When** the migration runs
**Then** an `accounts` table is added with `id` (ULID), `email` (unique, nullable for OAuth-only), `oauth_provider`, `oauth_subject`, `created_at`
**And** a `user_data` table mirrors the local storage shape: `account_id`, `templates` (jsonb), `archived_runs` (jsonb), `handle`, `updated_at`

**Given** an authentication surface
**When** the user clicks "Sign in" on Settings
**Then** OAuth flow (GitHub) and email magic-link options are offered
**And** on success, the account row is created or matched
**And** a session cookie is set (HttpOnly, Secure, SameSite=Lax)

**Given** an account is signed in for the first time on a browser with existing local data
**When** the sign-in completes
**Then** a "Merge or replace" dialog offers: "Use my local data" (push to server) vs "Use my account data" (pull from server) vs "Merge" (last-write-wins per item)
**And** the chosen action is applied
**And** the local handle is attached to the account if it was anonymous

**Given** an account is signed in
**When** I create or edit a template, archive a run, or generate a handle
**Then** the change is written through `HybridBackend` to both localStorage AND the server (last-write-wins via `updated_at` per item)
**And** writes are debounced and retried on failure

**Given** an account is signed in on a second browser
**When** I open the app there
**Then** the server's `user_data` is fetched and hydrated into local state
**And** subsequent edits sync bidirectionally

**Given** a sync conflict (two devices edit the same item offline, then reconnect)
**When** the conflict is resolved
**Then** last-write-wins by `updated_at` is applied (acceptable for Vision; CRDTs explicitly out of scope)
**And** a non-blocking notice mentions sync conflicts when they occur

**Given** I sign out
**When** the sign-out completes
**Then** the session cookie is cleared
**And** local data remains (logout does not destroy local state — the user can sign in again or continue anonymously)

**Given** sync introduces network calls on the authoring path
**When** the user is offline
**Then** writes still succeed locally and are queued for sync on reconnect (NFR8 preserved for the offline experience)

**Given** the account layer is optional
**When** a user never signs in
**Then** the entire MVP/Growth experience continues to work without it (no functional regression)

