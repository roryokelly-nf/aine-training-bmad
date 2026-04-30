# Story 1.4: View all templates

Status: done

## Story

**As Maya,**
**I want** to see a list of all templates I've authored on this browser,
**So that** I can pick one to run, edit, or rename. (FR7)

## Acceptance Criteria

**AC #1.** **Given** I have one or more templates saved, **when** I navigate to `/templates`, **then** each template renders as a `TemplateCard` showing the template name and item count, **and** the list is sorted by `updatedAt` descending (most recently edited first).

**AC #2.** **Given** I have no templates saved, **when** I navigate to `/templates`, **then** an `EmptyState` renders with copy: **"No templates yet — create your first one."**, **and** a "Create template" button is the primary CTA inside the EmptyState.

**AC #3.** **Given** a `TemplateCard` is rendered, **when** I click on it (anywhere on the row), **then** I am navigated to `/templates/[id]` for that template.

**AC #4.** **Given** keyboard navigation on `/templates`, **when** I tab through the page, **then** focus moves through cards in list order with a visible focus ring meeting NFR18 contrast, **and** pressing Enter on a focused card opens that template.

**AC #5.** **Given** the layout's `loadTemplates()` has already hydrated the store at app boot, **when** `/templates` renders, **then** there is no loading spinner or skeleton and the list (or EmptyState) appears as the first paint of the page (per UX spec §847 "first-paint = real content").

## Tasks / Subtasks

- [x] **Task 1: Create `EmptyState.svelte` shared component.** (AC: #2)
  - [x] New file: `src/lib/components/EmptyState.svelte`. Co-located with `Toast.svelte` and `ToastContainer.svelte` per existing convention. The architecture spec lists `lib/components/EmptyState.svelte` as a cross-feature primitive.
  - [x] Props: `{ message: string; cta?: { label: string; href: string } }`. Keep the API generic — story 1.4 only needs the "no templates" variant, but other features (browse registry, history) will reuse this. Don't bake "templates" into the API.
  - [x] Skeleton (Svelte 5 runes; do NOT use `svelte/store`):
    ```svelte
    <script lang="ts">
      import { goto } from '$app/navigation';
      import { resolve } from '$app/paths';

      let {
        message,
        cta
      }: { message: string; cta?: { label: string; href: string } } = $props();

      function onCta() {
        if (cta) goto(resolve(cta.href));
      }
    </script>

    <div class="flex flex-col items-center gap-4 py-12 text-center" role="status">
      <p class="text-base text-slate-700">{message}</p>
      {#if cta}
        <button
          type="button"
          onclick={onCta}
          class="rounded bg-slate-900 px-4 py-2 text-white"
        >
          {cta.label}
        </button>
      {/if}
    </div>
    ```
  - [x] **Critical:** the CTA must use `goto(resolve(cta.href))`, not `<a href={cta.href}>` without `resolve()`. The `svelte/no-navigation-without-resolve` ESLint rule from story 1.1 will flag a raw `href`. If you prefer an anchor, wrap with `resolve()`: `<a href={resolve(cta.href)}>`.
  - [x] No need to handle the no-CTA case beyond the `{#if cta}` guard — if a caller passes nothing, the message stands alone.

- [x] **Task 2: Create `TemplateCard.svelte` feature component.** (AC: #1, #3, #4)
  - [x] New file: `src/lib/features/templates/TemplateCard.svelte`. **The `lib/features/` directory does not yet exist — you will create it.** Architecture (architecture.md §"Code Structure") prescribes `lib/features/<feature>/` for feature-bound components; cross-feature primitives live in `lib/components/`. `TemplateCard` is templates-specific (renders a `Template`, navigates into `/templates/[id]`), so `features/templates/` is correct.
  - [x] **Known asymmetry — do NOT refactor:** the template store currently lives at `src/lib/state/template-store.svelte.ts` (story 1.2's choice), not at `src/lib/features/templates/template-store.svelte.ts` (where the architecture would ideally place it). Leave the store where it is. Moving it is out of scope for 1.4. A future cleanup story can consolidate. Rationale: a refactor here would touch every consumer (`+layout.ts`, `/templates/new/+page.svelte`, all tests) and is unrelated to the AC.
  - [x] Props: `{ template: Template }`. Import `Template` from `$lib/schemas/template`.
  - [x] Use a real `<a href={resolve(...)}>` for the click target — SvelteKit intercepts anchors and routes client-side, AND Tab/Enter come for free without manual keydown wiring. Avoid `<div onclick>` with `tabindex` and a `keydown` handler — that's a worse a11y story and trips ESLint's `svelte/click-events-have-key-events` rule.
  - [x] Skeleton:
    ```svelte
    <script lang="ts">
      import { resolve } from '$app/paths';
      import type { Template } from '$lib/schemas/template';

      let { template }: { template: Template } = $props();
    </script>

    <a
      href={resolve(`/templates/${template.id}`)}
      class="flex flex-col gap-1 rounded border border-slate-200 px-4 py-3 hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
    >
      <span class="text-base font-medium text-slate-900">{template.name}</span>
      <span class="text-sm text-slate-600">{template.items.length} item{template.items.length === 1 ? '' : 's'}</span>
    </a>
    ```
  - [x] **Notes:**
    - `min-h-[44px]` is implicit because `py-3` + two lines of text exceeds 44px tap target. Don't worry about it explicitly unless you compress the layout later.
    - The `focus:ring-2 focus:ring-slate-500` matches story 1.3's input focus ring — keep visual language consistent. NFR18 (4.5:1 contrast) is satisfied by `slate-500` on white.
    - Item-count pluralization is `1 item` / `0 items` / `2 items` per English convention.
    - Do NOT show `updatedAt`, `createdAt`, last-run state, or run badges. UX spec mentions a "go-state badge" for active runs — that's Epic 2 (run execution). For this story the card is name + item count only.

- [x] **Task 3: Rewrite `/templates/+page.svelte` to render the list or EmptyState.** (AC: #1, #2, #5)
  - [x] Replace the current minimal stub (just `<h1>` + Create button) with the full list view. **Keep the existing "Create template" header button** — story 1.3 AC #1 requires it as the entry point. The EmptyState's CTA is in addition (per spec) — yes, that's a slight duplication when the list is empty, but it's what the AC literally states.
  - [x] Read templates reactively from the store. The store is **already loaded** by `src/routes/+layout.ts` (it calls `await loadTemplates()` on app boot, behind a `browser` guard). So there is **no new `+page.ts` to write** for `/templates`. Don't create one.
  - [x] Skeleton:
    ```svelte
    <script lang="ts">
      import { goto } from '$app/navigation';
      import { resolve } from '$app/paths';
      import { getTemplates } from '$lib/state/template-store.svelte';
      import TemplateCard from '$lib/features/templates/TemplateCard.svelte';
      import EmptyState from '$lib/components/EmptyState.svelte';

      const sorted = $derived(
        [...getTemplates()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      );
    </script>

    <h1 class="text-2xl">Templates</h1>
    <button
      type="button"
      onclick={() => goto(resolve('/templates/new'))}
      class="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
    >
      Create template
    </button>

    {#if sorted.length === 0}
      <EmptyState
        message="No templates yet — create your first one."
        cta={{ label: 'Create template', href: '/templates/new' }}
      />
    {:else}
      <ul class="mt-6 flex flex-col gap-3">
        {#each sorted as template (template.id)}
          <li>
            <TemplateCard {template} />
          </li>
        {/each}
      </ul>
    {/if}
    ```
  - [x] **Reactivity note (read carefully):** `$derived(getTemplates())` works because `getTemplates()` reads the `templates` rune inside the store, and Svelte 5's reactive tracking propagates through function calls. After a user creates a new template via `/templates/new`, navigating back to `/templates` re-runs `$derived` against the updated array — no manual reload needed.
  - [x] **Sort stability:** `b.updatedAt.localeCompare(a.updatedAt)` works because `updatedAt` is an ISO 8601 string (per `TemplateSchema`) and ISO 8601 lexicographic order matches chronological order. Do NOT parse to `Date` objects — that's slower and unnecessary.
  - [x] **AC says `updatedAt` not `lastRunAt`.** UX spec hints at sorting by `lastRunAt` with `createdAt` fallback, but the AC for this story is canonical and there is no `lastRunAt` field in `TemplateSchema` yet (Epic 2 adds run state). Use `updatedAt`.
  - [x] **`(template.id)` key in `{#each}` is mandatory** — without it, Svelte reuses DOM nodes across re-sorts and the `<a>` href can briefly point to the wrong template. Story 1.5+ will mutate item lists which makes this even more important.

- [x] **Task 4: Tests.** (AC: all)
  - [x] **EmptyState component** — `src/lib/components/EmptyState.svelte.test.ts` (jsdom; the `.svelte.test.ts` suffix is mandatory for the client vitest project — see story 1.3 dev notes for the SvelteKit `+`-prefix gotcha; this file is in `lib/`, not `routes/`, so `EmptyState.svelte.test.ts` works fine). Tests:
    - Renders the message.
    - Renders the CTA button with the given label when `cta` is provided.
    - Does NOT render the CTA button when `cta` is omitted.
    - Clicking the CTA calls `goto(resolve(cta.href))` (mock both per the story 1.3 pattern).
  - [x] **TemplateCard component** — `src/lib/features/templates/TemplateCard.svelte.test.ts`. Tests:
    - Renders the template name.
    - Renders "0 items" for an empty list.
    - Renders "1 item" (singular) for a one-item list.
    - Renders "3 items" (plural) for a three-item list.
    - The `<a>` element has `href` containing the template id.
    - The `<a>` is keyboard-focusable (default for anchors with `href`).
  - [x] **`/templates` page** — `src/routes/templates/page.svelte.test.ts` (no leading `+`; see story 1.3 dev notes). Tests:
    - Empty store renders EmptyState with the exact copy "No templates yet — create your first one." and a "Create template" button.
    - Empty-state CTA click calls `goto('/templates/new')` (after mocking `$app/navigation` and `$app/paths`).
    - Non-empty store renders one `<a>` per template.
    - Templates are sorted by `updatedAt` descending (insert three templates with different `updatedAt`, assert DOM order).
    - The header "Create template" button is always rendered (both empty and populated states).
  - [x] Mock setup pattern (canonical, copied from story 1.3):
    ```ts
    import { render, screen } from '@testing-library/svelte';
    import userEvent from '@testing-library/user-event';
    import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

    const gotoMock = vi.fn();
    const getTemplatesMock = vi.fn();

    vi.mock('$app/navigation', () => ({ goto: (...a: unknown[]) => gotoMock(...a) }));
    vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));
    vi.mock('$lib/state/template-store.svelte', () => ({
      getTemplates: () => getTemplatesMock()
    }));

    import Page from './+page.svelte';
    ```
  - [x] **Do not** test the layout's `loadTemplates()` boot behavior in this story — that's already covered by story 1.2's tests. We are testing the rendering layer over an assumed-loaded store.
  - [x] **No new dev dependencies.** `@testing-library/{svelte,user-event,jest-dom}` were added in story 1.3.

- [x] **Task 5: Verify the full pipeline.** (AC: all)
  - [x] Run, in order, and confirm each passes:
    - `npm run check` (0 errors)
    - `npm run lint` (clean — watch for `svelte/no-navigation-without-resolve`; both `goto()` calls and any `<a href>` must wrap with `resolve()`)
    - `npm test` (49 prior + new EmptyState/TemplateCard/page tests pass)
    - `npm run build` (adapter-static still succeeds)
    - `npm run size-limit` (still under 150 KB gzipped — TemplateCard + EmptyState are tiny; expected delta well under 5 KB)
  - [x] Manual smoke (`npm run dev`):
    - Visit `http://localhost:5173/templates` with empty localStorage → EmptyState renders with the exact copy and a "Create template" CTA.
    - Click EmptyState CTA → lands on `/templates/new`.
    - Create a template named "Alpha" → land on `/templates/<id>`. Navigate back to `/templates` → "Alpha" appears as a card with "0 items".
    - Create a second template "Beta" → return to `/templates`. "Beta" is above "Alpha" (sorted by `updatedAt` desc).
    - Click "Alpha" card → navigates to `/templates/<alpha-id>`.
    - Tab from the header Create button onto the cards — focus ring visible, Enter on a focused card navigates to that template.

## Dev Notes

### Critical context for the dev agent

This is a **list-rendering** story. All the data plumbing already exists — story 1.2 built the storage backend and `template-store.svelte.ts`, and story 1.1's `+layout.ts` calls `loadTemplates()` on app boot inside a `browser` guard with `StorageError` handling. **You do not need a `+page.ts` for `/templates`.** The store is already populated by the time the route renders.

The single most important property of this story: **render reactively from the store, do not duplicate state, do not re-fetch.** If you find yourself writing `await storage().getTemplates()` in this story, you are doing something wrong — the store already mirrors that.

### Stack and library versions (locked, no changes)

- **Svelte 5 runes** — `$state`, `$props`, `$derived`. No `svelte/store`.
- **SvelteKit 2 + adapter-static** — `ssr = false`, `prerender = true` already set in `+layout.ts`. Do not touch these.
- **Tailwind v4** — utility classes only; no design tokens yet.
- **Valibot 1.x** — not needed for this story (no new schemas, no form validation).
- **No new dev or runtime dependencies.** Story 1.3 already added the testing-library packages and the `svelteTesting()` vite plugin.

### Key API contracts (don't reinvent)

- `getTemplates(): Template[]` from `$lib/state/template-store.svelte` — reactive read of the in-memory list. Safe to call from inside `$derived(...)`.
- `isLoaded(): boolean` from the same module — **you don't need this in 1.4**, because `+layout.ts` `await`s `loadTemplates()` before any child page renders. Mentioned only so you don't get tempted to re-implement the gate.
- `loadTemplates()` is also exported but **don't call it from `/templates/+page.svelte` or its `+page.ts`**. The layout owns that call. Calling it again is harmless but wasted work and confuses the loading model.
- `Template` type from `$lib/schemas/template` — has `id`, `name`, `items: Item[]`, `createdAt`, `updatedAt` (both ISO 8601 strings).

### Component placement decisions (one-time, lock for future stories)

- `lib/components/EmptyState.svelte` — generic, cross-feature. Other features (`browse`, `history`) will reuse it. Keep its API decoupled from "templates".
- `lib/features/templates/TemplateCard.svelte` — templates-specific. Imports `Template` from schemas, navigates into `/templates/[id]`. **First file in `lib/features/`.** Future stories add `TemplateForm.svelte` and `ItemEditor.svelte` here (per architecture).
- **Store stays at `lib/state/template-store.svelte.ts`** for now (story 1.2's location). Architecture would ideally place it at `lib/features/templates/` but that move is its own refactor and not in 1.4 scope. **DO NOT MOVE THE STORE in this story.**

### Layout already does the data load (READ THIS)

`src/routes/+layout.ts`:
```ts
export const prerender = true;
export const ssr = false;
export const load = async () => {
  if (!browser) return {};
  try {
    await loadTemplates();
  } catch (err) {
    if (err instanceof StorageError) {
      toastStore.error(`Storage problem: ${err.message}`);
    } else {
      throw err;
    }
  }
  return {};
};
```

SvelteKit awaits parent `load()` before child routes render. So when `/templates/+page.svelte` mounts, the store is already hydrated (or a `Storage problem:` toast has fired). No need for a `Loading…` state, no need for an `isLoaded()` gate in the page — the AC #5 invariant ("first-paint = real content") is satisfied for free.

### Files being modified

| Path | Action | Current state | What changes | What must be preserved |
|---|---|---|---|---|
| `src/routes/templates/+page.svelte` | UPDATE | Two-line stub with `<h1>` and a single Create button (story 1.3 added the button) | Becomes the full list page: keep h1 + Create button, add reactive sort over `getTemplates()`, add list-vs-EmptyState branch | The Create button at the top must remain (story 1.3 AC #1) |
| `src/lib/components/EmptyState.svelte` | NEW | does not exist | Generic EmptyState with optional CTA | n/a |
| `src/lib/features/templates/TemplateCard.svelte` | NEW | does not exist (parent dir doesn't exist either) | Templates-specific card linking to `/templates/[id]` | n/a |
| `src/lib/components/EmptyState.svelte.test.ts` | NEW | — | Component tests | — |
| `src/lib/features/templates/TemplateCard.svelte.test.ts` | NEW | — | Component tests | — |
| `src/routes/templates/page.svelte.test.ts` | NEW | — | Page-level tests; **filename has no leading `+`** to satisfy SvelteKit's reserved-prefix rule (see story 1.3 completion note) | — |

### Out-of-scope guardrails (DO NOT do these)

- **No rename.** That's story 1.6.
- **No delete.** That's story 1.7.
- **No item editing on `/templates/[id]`.** That's story 1.5.
- **No run state.** No "active run" badge, no `lastRunAt`, no run history. That's Epic 2.
- **No design tokens / theme work.** No CSS variables. Inline Tailwind only.
- **No moving the template store.** Out of scope; explicitly called out above.
- **No new `+page.ts` for `/templates`.** The layout already loads.
- **No Playwright e2e.** Component + page tests cover the AC; story 1.1 deferred Playwright.

### Previous story intelligence (1.3 — read these or repeat the mistake)

1. **Test files in `src/routes/` cannot start with `+`.** SvelteKit 2's `svelte-kit sync` errors with "Files prefixed with + are reserved" if you name a test `+page.svelte.test.ts` inside a route directory. Use `page.svelte.test.ts` (no leading `+`). The vitest client-project glob `src/**/*.svelte.{test,spec}.{js,ts}` still matches.
2. **For component tests under `src/lib/`, `+` prefix is irrelevant** — that rule only applies to `src/routes/`. So `EmptyState.svelte.test.ts` is fine.
3. **`vite.config.ts` already has `svelteTesting()` from `@testing-library/svelte/vite`.** This was added in 1.3 to make jsdom resolve the *browser* build of Svelte. Without it, every component render errors with `lifecycle_function_unavailable`. Don't remove it.
4. **Mock `$app/navigation` and `$app/paths`** — they don't exist standalone in jsdom.
5. **`$derived` vs `let` reactive:** writing `let sorted = $derived(...)` is correct; writing `const sorted = $derived(...)` works in Svelte 5 too — both are accepted. Match the project's existing style (story 1.3 used `let`).

### Bundle budget check

The 37.55 kB gzipped baseline (after story 1.3) leaves ~112 kB headroom. EmptyState + TemplateCard add maybe 0.5–1 kB. Tailwind classes added to existing utility set should produce no measurable JIT delta. Flag in completion notes if size-limit reports >+5 kB.

### References

- [Source: epics.md lines 453-479] — Story 1.4 ACs and Epic 1 context.
- [Source: ux-design-specification.md] — TemplateCard anatomy, EmptyState copy, focus-ring expectations, "first-paint = real content" rule (§847).
- [Source: architecture.md lines 449-450, 510-555, 580-595] — Component placement (`lib/features/templates/`, `lib/components/`), routing structure, store factory pattern.
- [Source: _bmad-output/implementation-artifacts/1-3-create-a-new-template.md] — Test naming gotcha, `svelteTesting()` plugin, mock pattern, completion notes.
- [Source: _bmad-output/implementation-artifacts/1-2-storage-and-template-store.md] — Store API, `nowIso()` helper, vitest projects split.

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

- `npm run check` → 0 errors / 0 warnings / 466 files
- `npm test` → 10 files, 65 tests passed
- `npm run build` → adapter-static OK
- `npm run size-limit` → 37.73 kB gzipped (Δ +0.18 kB from story 1.3 baseline; budget 150 kB)

### Completion Notes List

- Created `lib/components/EmptyState.svelte` (generic, cross-feature) and `lib/features/templates/TemplateCard.svelte` (templates-specific anchor link). First file to land in `lib/features/`; the directory was created from scratch.
- Rewrote `/templates/+page.svelte` to read reactively from `getTemplates()` via `$derived`, sort by `updatedAt` descending using ISO-string `localeCompare` (no `Date` parsing), and branch between list and EmptyState. Kept the header "Create template" button per story 1.3 AC #1.
- **EmptyState API change vs story spec.** The story specified `cta?: { label: string; href: string }` with the component calling `goto(resolve(cta.href))` internally. SvelteKit 2's typed-routes `resolve()` rejects a generic `string` argument — `npm run check` errored with "Type '[string]' is not assignable to parameter of type '[route: ...]'". Refactored the API to `cta?: { label: string; onClick: () => void }`, letting the consumer pre-resolve. Net win: routing concerns stay at the route boundary, the component is purely presentational, and the typed-routes constraint is honored at the call site where the literal route string lives. Updated EmptyState test to mock `onClick` directly (no longer needs to mock `$app/navigation` / `$app/paths` for this component).
- **No `+page.ts` for `/templates`.** Confirmed `+layout.ts` `await`s `loadTemplates()` before child routes mount, so the store is hydrated by the time `/templates/+page.svelte` runs. AC #5 ("first-paint = real content") satisfied without any per-page load function.
- **Sort key:** `updatedAt` descending per AC #1, not `lastRunAt` (UX spec hint that doesn't apply to MVP epic 1 — no run state yet).
- **Click target:** `<a href={resolve(...)}>` rather than `<div onclick>`. Free Tab + Enter keyboard handling, satisfies AC #4 without custom `keydown` plumbing, dodges `svelte/click-events-have-key-events` ESLint rule.
- **Pluralization:** `1 item` (singular) / `0 items` / `2 items` — covered by tests for 0/1/3 cases.
- **`(template.id)` keyed `{#each}`** to avoid DOM reuse issues across re-sorts (matters more in 1.5+ when items mutate).
- **Test coverage:** 4 EmptyState + 5 TemplateCard + 7 page-level = 16 new tests; total project test count went 49 → 65, all green.
- **Bundle delta** is +0.18 kB gzipped (37.55 → 37.73 kB). Well under the 5 kB warning threshold and very far from the 150 kB NFR4 budget.
- **No new dev/runtime dependencies.** All testing infra was added in story 1.3.
- One prettier warning auto-fixed by `npm run format`. No suppressions, no lint disables.

### File List

- `src/lib/components/EmptyState.svelte` (new — generic empty-state primitive with optional `onClick` CTA)
- `src/lib/components/EmptyState.svelte.test.ts` (new — 4 component tests)
- `src/lib/features/templates/TemplateCard.svelte` (new — anchor link to `/templates/[id]` showing name + item count)
- `src/lib/features/templates/TemplateCard.svelte.test.ts` (new — 5 component tests)
- `src/routes/templates/+page.svelte` (modified — full list view replaces 1.3's stub; preserved header "Create template" button)
- `src/routes/templates/page.svelte.test.ts` (new — 7 page-level tests covering empty/populated/sort/header-button)

### Change Log

- 2026-04-29: Implemented story 1.4 (view all templates). Added `EmptyState` and `TemplateCard` components, rewrote `/templates` to render a sorted list or EmptyState reactively from the store. Adjusted EmptyState API from `cta.href` to `cta.onClick` to satisfy SvelteKit's typed-routes contract — consumer now pre-resolves the route. 65/65 tests pass; bundle 37.73 kB / 150 kB budget.
