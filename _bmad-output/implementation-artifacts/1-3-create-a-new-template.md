# Story 1.3: Create a new template

Status: review

## Story

As Maya,
I want to create a new checklist template by giving it a name,
so that I can start authoring a re-runnable procedure. (FR1)

## Acceptance Criteria

1. **Entry point on the template list**
   - **Given** I am on the template list at `/templates`
   - **When** I click the "Create template" button
   - **Then** I am navigated to `/templates/new`
   - **And** the name input receives focus

2. **Successful create**
   - **Given** I am on `/templates/new`
   - **When** I enter a non-empty name and submit
   - **Then** a new template is saved via `storage.saveTemplate()` with a ULID `id`, the entered `name`, an empty `items` array, `schemaVersion: 1`, and ISO 8601 `createdAt` / `updatedAt` timestamps
   - **And** I am navigated to `/templates/[id]` for the new template

3. **Empty-name validation**
   - **Given** I am on `/templates/new`
   - **When** I submit with an empty (or whitespace-only) name
   - **Then** the form does not submit
   - **And** an inline validation error renders: "Template name is required"

4. **Length validation**
   - **Given** I am on `/templates/new`
   - **When** I submit a name longer than the configured limit (200 chars)
   - **Then** the Valibot schema rejects the input
   - **And** an inline validation error renders

5. **Quota error path**
   - **Given** localStorage is at quota
   - **When** I submit the create-template form
   - **Then** the save rejects with `StorageError(QUOTA_EXCEEDED)`
   - **And** a toast renders: "Storage is full. Free up space and try again."
   - **And** I remain on `/templates/new` with my input preserved

6. **Keyboard interaction**
   - **Given** I am on `/templates/new`
   - **When** I press Enter in the name field
   - **Then** the form submits
   - **And** when I press Esc I am returned to `/templates`

## Tasks / Subtasks

- [x] **Task 1: Bump template-name schema limit from 120 → 200.** (AC: #4)
  - [x] In `src/lib/schemas/template.ts`, change `name: v.pipe(v.string(), v.minLength(1), v.maxLength(120))` to `v.maxLength(200)` so the schema matches AC #4. The schema is the single source of truth — both client form validation and storage-layer parse use it. Do NOT keep two limits.
  - [x] Update / add a unit test in `src/lib/schemas/template.test.ts` (create the file if it doesn't exist) covering: 0-char rejected, 1-char accepted, 200-char accepted, 201-char rejected. Vitest already has the `client` (jsdom) project configured for `src/lib/**` schemas.
  - [x] Verify story 1.2's existing tests still pass — `src/lib/storage/localstorage-backend.test.ts` constructs templates with short names so the limit change is non-breaking.

- [x] **Task 2: Scaffold `/templates/[id]` detail stub.** (AC: #2 — the redirect target must exist)
  - [x] Create `src/routes/templates/[id]/+page.ts`:
    ```ts
    import { error } from '@sveltejs/kit';
    import { storage } from '$lib/storage';
    import type { PageLoad } from './$types';
    import { browser } from '$app/environment';

    export const prerender = false; // dynamic route — cannot be prerendered without a list of IDs
    export const ssr = false;       // inherits from layout; restated here for clarity

    export const load: PageLoad = async ({ params }) => {
      if (!browser) return { template: null };
      const t = await storage().getTemplate(params.id);
      if (!t) error(404, 'Template not found');
      return { template: t };
    };
    ```
    The `prerender = false` flag is required: adapter-static will refuse to prerender a `[id]` route unless we either provide an `entries()` list or opt out. Opt out — there's no static list of templates at build time.
  - [x] Create `src/routes/templates/[id]/+page.svelte` as a **minimal stub**:
    ```svelte
    <script lang="ts">
      let { data } = $props();
    </script>
    {#if data.template}
      <h1 class="text-2xl">{data.template.name}</h1>
      <p class="text-sm text-slate-600">{data.template.items.length} items</p>
      <p class="mt-4 text-sm">Item editing lands in story 1.5.</p>
    {/if}
    ```
    No edit affordances, no item rendering beyond a count, no rename/delete. Story 1.5 owns item editing; 1.6 owns rename; 1.7 owns delete. **This stub is the redirect target only.**

- [x] **Task 3: Build `/templates/new` create-template page.** (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `src/routes/templates/new/+page.svelte` containing the form. Inline (no separate `CreateForm.svelte` component) — the form is a single field plus submit; extracting a component is premature. Story 1.6 (rename) will write its own form; if a real shared shape emerges then, refactor.
  - [x] Form structure (Svelte 5 runes — `$state`, `$props`, no svelte/store):
    ```svelte
    <script lang="ts">
      import { goto } from '$app/navigation';
      import { resolve } from '$app/paths';
      import * as v from 'valibot';
      import { TemplateSchema } from '$lib/schemas/template';
      import { addTemplate } from '$lib/state/template-store.svelte';
      import { toastStore } from '$lib/state/toast-store.svelte';
      import { StorageError } from '$lib/storage/storage-error';

      let name = $state('');
      let error = $state<string | null>(null);
      let submitting = $state(false);

      // Pick just the `name` field from TemplateSchema for client-side validation.
      const NameSchema = v.pipe(v.string(), v.minLength(1, 'Template name is required'), v.maxLength(200, 'Template name must be 200 characters or fewer'));

      let inputEl: HTMLInputElement | undefined = $state();

      async function submit() {
        if (submitting) return;
        const trimmed = name.trim();
        const result = v.safeParse(NameSchema, trimmed);
        if (!result.success) {
          error = result.issues[0]?.message ?? 'Template name is required';
          // UX spec: on validation error, focus returns to field.
          inputEl?.focus();
          return;
        }
        error = null;
        submitting = true;
        try {
          const t = await addTemplate({ name: trimmed, items: [] });
          await goto(resolve(`/templates/${t.id}`));
        } catch (err) {
          if (err instanceof StorageError && err.kind === 'QUOTA_EXCEEDED') {
            toastStore.error('Storage is full. Free up space and try again.');
          } else if (err instanceof StorageError && err.kind === 'UNAVAILABLE') {
            toastStore.error('Storage is unavailable. Try a different browser or turn off private browsing.');
          } else {
            toastStore.error('Could not create template. Please try again.');
          }
        } finally {
          submitting = false;
        }
      }

      function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          goto(resolve('/templates'));
        }
      }
    </script>

    <h1 class="text-2xl">New template</h1>

    <form onsubmit={(e) => { e.preventDefault(); submit(); }} class="mt-4 max-w-md">
      <label for="template-name" class="block text-sm font-medium">Template name</label>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        id="template-name"
        type="text"
        bind:value={name}
        bind:this={inputEl}
        onkeydown={onKeydown}
        autofocus
        autocomplete="off"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'template-name-error' : undefined}
        class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        disabled={submitting}
      />
      {#if error}
        <p id="template-name-error" class="mt-1 text-sm text-red-600" role="alert">{error}</p>
      {/if}
      <div class="mt-4 flex gap-2">
        <button type="submit" disabled={submitting} class="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
          {submitting ? 'Creating…' : 'Create'}
        </button>
        <button type="button" onclick={() => goto(resolve('/templates'))} class="rounded border border-slate-300 px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
    ```
  - [x] Notes baked into the snippet above:
    - `NameSchema` is built from primitives, NOT `v.pick(TemplateSchema, ['name'])`. Reason: at create time we don't have an `id`/`createdAt`/`updatedAt` yet; running `v.parse(TemplateSchema, ...)` would fail before we can call `addTemplate`. The store's call to `storage().saveTemplate()` re-parses with the full schema — so we still get whole-record validation at the boundary. The form-side schema is just for the user-facing `name` error.
    - `name.trim()` is applied before parse and before `addTemplate` so leading/trailing whitespace can't smuggle past `minLength(1)`. AC #3 says "empty name" — interpret whitespace-only as empty for UX consistency.
    - `submitting` flag prevents double-submit (clicking Create twice or Enter while the storage `await` is in flight).
    - On QUOTA_EXCEEDED, the form does NOT navigate and does NOT clear `name`, so AC #5 ("I remain on /templates/new with my input preserved") holds.
    - Esc in the cancel button or input both go back to `/templates` via `resolve()` — required by story 1.1's `svelte/no-navigation-without-resolve` ESLint rule (do not regress this).

- [x] **Task 4: Wire the "Create template" button on `/templates`.** (AC: #1)
  - [x] Modify `src/routes/templates/+page.svelte` — add a "Create template" button below the existing `<h1>`. **Do not** add the full TemplateCard list rendering or EmptyState here — that lands in story 1.4. This story only adds the entry-point button so AC #1 holds.
  - [x] Skeleton:
    ```svelte
    <script lang="ts">
      import { goto } from '$app/navigation';
      import { resolve } from '$app/paths';
    </script>
    <h1 class="text-2xl">Templates</h1>
    <button
      type="button"
      onclick={() => goto(resolve('/templates/new'))}
      class="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
    >
      Create template
    </button>
    ```
  - [x] **Critical scope guard:** if you're tempted to add list rendering, an empty state, or `TemplateCard` here, STOP. Story 1.4 owns that. The button is the entire delta.

- [x] **Task 5: Tests.** (AC: all)
  - [x] Schema test (`src/lib/schemas/template.test.ts`, jsdom or node — node fine since no DOM needed):
    - `v.safeParse(TemplateSchema, { ...valid, name: '' })` → fails
    - `v.safeParse(TemplateSchema, { ...valid, name: 'a'.repeat(200) })` → succeeds
    - `v.safeParse(TemplateSchema, { ...valid, name: 'a'.repeat(201) })` → fails
  - [x] Form behavior test at **`src/routes/templates/new/+page.svelte.test.ts`** (NOT `+page.test.ts`). The `.svelte.test.ts` suffix is mandatory — the `client` (jsdom) vitest project's include glob is `src/**/*.svelte.{test,spec}.{js,ts}`. A plain `.test.ts` filename will land in the `server` (node) project where there is no DOM, and the test will fail with `localStorage is not defined` or "document is not defined" depending on what it touches.
  - [x] **New dev dependencies required** (sanctioned — these are the canonical Svelte component testing libs and are expected to be added in this story; the HALT-on-new-deps rule does not apply here):
    - `@testing-library/svelte@^5` — Svelte 5 component rendering. Version 5+ is required for Svelte 5 / runes support; earlier versions are Svelte 4 only.
    - `@testing-library/user-event@^14` — keyboard / pointer interaction simulation.
    - `@testing-library/jest-dom@^6` — optional but ergonomic matchers (`toBeInTheDocument`, `toHaveFocus`). If you skip it, use plain assertions.
  - [x] Install with: `npm install -D @testing-library/svelte @testing-library/user-event @testing-library/jest-dom`. Verify the install lands in `devDependencies`, not `dependencies` — these must NOT ship in the production bundle.
  - [x] Mock the store and navigation:
    ```ts
    import { render, screen } from '@testing-library/svelte';
    import userEvent from '@testing-library/user-event';
    import { vi, describe, it, expect, beforeEach } from 'vitest';

    const gotoMock = vi.fn();
    const addTemplateMock = vi.fn();
    const toastErrorMock = vi.fn();

    vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => gotoMock(...args) }));
    vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));
    vi.mock('$lib/state/template-store.svelte', () => ({ addTemplate: (...args: unknown[]) => addTemplateMock(...args) }));
    vi.mock('$lib/state/toast-store.svelte', () => ({ toastStore: { error: (m: string) => toastErrorMock(m), success: vi.fn(), info: vi.fn() } }));

    import Page from './+page.svelte';
    ```
    Tests to write:
    - autofocus: input has focus on render (use `document.activeElement`)
    - empty submit shows "Template name is required" and does not call `addTemplate`
    - whitespace-only submit shows the same error (trim coverage)
    - 201-char submit shows the maxLength error
    - happy path: type valid name, submit, `addTemplate` called with `{ name, items: [] }`, `goto` called with `/templates/<id>`
    - Enter key submits; Esc key navigates to `/templates`
    - QUOTA_EXCEEDED: mock `addTemplate` to reject with `new StorageError('QUOTA_EXCEEDED', 'full')`, assert `toastStore.error` called with the exact AC #5 message AND `goto` was NOT called AND the name field still contains the typed value
    - submitting flag: while the `addTemplate` promise is pending, the submit button is disabled (use a deferred promise to assert this)
    - **on validation error, focus returns to the name input** (UX spec line 824: "Empty template name on save → error message + focus returns to field")
  - [x] Skip a Playwright e2e for this story — no Playwright runtime is installed (story 1.1 deferred it). Component tests + manual smoke cover AC.

- [x] **Task 6: Verify the full pipeline.** (AC: all)
  - [x] Run, in order, and confirm each passes:
    - `npm run check` → 0 errors, 0 warnings, 461 files
    - `npm run lint` → clean (prettier + eslint, after `npm run format` normalized one file)
    - `npm test` → 49 tests across 7 files, all passing (24 prior + 15 schema + 10 form)
    - `npm run build` → adapter-static succeeds; `/templates/[id]` ships as the fallback page (hydrates client-side)
    - `npm run size-limit` → 37.55 kB gzipped (budget 150 kB; well under)
  - [x] Manual smoke deferred to component tests + dev-server reachability check (curl returned 200 on `/templates/new`). Component tests assert: autofocus, empty-submit error, whitespace trim, 201-char error, happy-path navigation to `/templates/<id>`, Enter submit, Esc cancel, QUOTA_EXCEEDED toast + state preservation, submitting-flag disable, focus-returns-on-error. Together with the green pipeline this covers AC #1–#6.

## Dev Notes

### Critical context for the dev agent

This is the **first feature story**. Stories 1.1 and 1.2 built the foundation (project, storage abstraction, schemas, template-store, toast surface). Everything you need is already wired — `addTemplate()`, `storage()`, `toastStore.error()`, `ToastContainer` in the layout. Your job is to build the create-template flow on top, NOT to refactor or extend the foundation.

The single most important property of this story: **stay tightly inside the AC fence.** Do not add list rendering on `/templates` (that's 1.4). Do not add item editing on `/templates/[id]` (that's 1.5). Do not add rename/delete affordances. The story is small on purpose; story 1.4 onward fills in adjacent surfaces.

### Stack and library versions (already locked)

- **Svelte 5 runes** — use `$state`, `$props`, `$derived`. No `writable`/`readable` from `svelte/store`. The `.svelte.ts` extension is required only for stores; route `+page.svelte` files have rune access by default.
- **SvelteKit 2 + adapter-static** — `ssr = false` and `prerender = true` are set in `src/routes/+layout.ts`. The `[id]` dynamic route MUST opt out of prerender via `prerender = false` in its `+page.ts` (otherwise the build fails because adapter-static can't enumerate IDs).
- **Valibot 1.x** — already installed. Use `v.safeParse` for form validation (returns `{ success, issues }`); use `v.parse` only at storage boundaries (throws on failure — story 1.2's `LocalStorageBackend.saveTemplate` already does this).
- **Tailwind v4** — utility classes only; no design tokens yet (those land in a future story before 1.5+ ship visual polish). Keep styling minimal and functional.
- **ulidx** via `$lib/storage/ulid` — `addTemplate` already calls `newId()` internally; you do NOT generate IDs in the form.

### Key API contracts (don't reinvent)

- `addTemplate(input: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template>` from `$lib/state/template-store.svelte`. **Call this — never call `storage().saveTemplate()` directly from a route.** The store is the canonical mutator surface; it owns the reactive update of the template list.
- `storage().getTemplate(id): Promise<Template | null>` from `$lib/storage`. Returns `null` for unknown IDs (per the interface contract from story 1.2). The `[id]` route's `load` function uses this and translates `null` → SvelteKit `error(404, ...)`.
- `toastStore.error(message: string)` from `$lib/state/toast-store.svelte`. Renders into the already-mounted `ToastContainer`.
- `StorageError` from `$lib/storage/storage-error`. Discriminate on `.kind === 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'INVALID' | 'NOT_FOUND' | 'UNKNOWN'`.

### Schema discrepancy resolution (CRITICAL — read before coding)

Story 1.3 AC #4 specifies a **200-char** name limit. Story 1.2 set `TemplateSchema.name` to `maxLength(120)`. The AC is canonical because:

1. The PRD/epics file is the authoritative spec for AC text.
2. 120 was chosen in 1.2 without reference to a specific spec; 1.3's AC pin is the first place a real number was committed.
3. 200 chars accommodates real-world template names ("Deploy production with blue-green swap and post-swap health checks") without forcing abbreviation.

**Action:** Task 1 bumps the schema to 200. Do NOT keep two limits (one in the form, one in the schema). The schema is the single source of truth; both the form's `safeParse` call and the storage-layer `parse` call read the same `TemplateSchema`.

If a future spec revision (or the user) prefers 120, change one line in `template.ts` and one assertion in the schema test — the form code reads from the schema's error messages so it auto-adapts.

### Persisted blob shape (already locked by 1.2)

The created template will land in localStorage at `cl:tpl:<ULID>` as:
```json
{ "schemaVersion": 1, "template": { "id": "01H...", "name": "...", "items": [], "createdAt": "2026-04-29T...", "updatedAt": "2026-04-29T..." } }
```
And the ID will be appended to `cl:tpl:index`. **You don't write this shape — `LocalStorageBackend.saveTemplate` does. Story 1.2 already handled atomicity and rollback.** This note is here so you recognize what's in localStorage when smoke-testing.

### File structure produced by this story

```
src/
├── lib/
│   └── schemas/
│       ├── template.ts                       (modified — maxLength 120 → 200)
│       └── template.test.ts                  (NEW — schema tests)
└── routes/
    ├── templates/
    │   ├── +page.svelte                      (modified — add "Create template" button)
    │   ├── new/
    │   │   ├── +page.svelte                  (NEW — create form)
    │   │   └── +page.test.ts                 (NEW — form tests)
    │   └── [id]/
    │       ├── +page.svelte                  (NEW — detail stub)
    │       └── +page.ts                      (NEW — load template by id)
    └── (existing: +layout.svelte, +layout.ts, +page.svelte, etc.)
```

**Do NOT create:** `src/lib/features/templates/` directory, `TemplateCard.svelte`, `EmptyState.svelte`, `Button.svelte`, `TextInput.svelte`. The first two are story 1.4. The last two are premature abstraction — there's exactly one form and one button surface in this story.

### Routing specifics (SvelteKit 2 + adapter-static)

- The repo's `+layout.ts` already sets `prerender = true` and `ssr = false`. Most routes inherit and don't need to restate.
- **The `[id]` dynamic route is the exception.** adapter-static's prerender pass needs either an `entries()` function returning known IDs OR an explicit opt-out. Set `export const prerender = false;` in `src/routes/templates/[id]/+page.ts`. Without this, `npm run build` will fail with "The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app".
- adapter-static's `fallback: 'index.html'` (set in 1.1's `svelte.config.js`) handles unknown URLs by serving the SPA shell, so `/templates/<some-ulid>` works in production via client-side routing.
- The `browser` guard in the `+page.ts` `load` (mirroring `+layout.ts`'s pattern from 1.2) keeps the build green: during prerender of static routes (not `[id]` itself, but neighbors), load functions can run in Node where `localStorage` is undefined.

### Form validation pattern (the canonical shape for future stories)

This story establishes the form-validation pattern the repo will repeat in 1.5 (item editing) and 1.6 (rename):

1. **Define a field-level Valibot schema in the route file** built from primitives (`v.pipe(v.string(), v.minLength, v.maxLength)`). Don't use `v.pick(TemplateSchema, ...)` because the full record schema includes server-derived fields (`id`, timestamps) that the form doesn't have at submit time.
2. **`safeParse` on submit** — never `parse`. Surface the first issue's `.message` as the inline error.
3. **Trim user input before parse and before persist.** Whitespace-only is treated as empty for UX consistency.
4. **Whole-record validation happens at the storage boundary** (`LocalStorageBackend.saveTemplate` calls `v.parse(TemplateSchema, t)` and throws `StorageError('INVALID', ...)` on failure). The form's safeParse is for user-facing errors; the storage parse is the defensive boundary.
5. **Handle `StorageError` kinds explicitly.** QUOTA_EXCEEDED, UNAVAILABLE, and a generic catch-all — don't dump raw error messages to the toast.

### UX spec rules (locked) for the create form

- **16px font-size minimum on the input** to suppress iOS auto-zoom-on-focus. Tailwind `text-base` (16px) satisfies this; do NOT use `text-sm` on the input. (Source: ux-design-specification.md line 696 — TextInput component spec.)
- **Validation on submit, not keystroke.** Don't render an error while the user is typing; show it only after a submit attempt. After the first failed submit, you may opt-in to live-validation as the user types — but the AC only requires submit-time validation, so keep it simple. (Source: ux-design-specification.md line 824.)
- **No required-field marker (no `*` next to "Template name").** Emptiness becomes a focused error on submit, not a pre-emptive asterisk. (Source: ux-design-specification.md line 827.)
- **Focus returns to the field on validation error.** Implemented via `bind:this={inputEl}` + `inputEl?.focus()` in the submit handler — see Task 3 snippet. (Source: ux-design-specification.md line 824.)
- **Honest error narration.** "Storage is full. Free up space and try again." is the AC-mandated copy for QUOTA_EXCEEDED. Don't soften it to "Something went wrong"; the UX spec line 120 explicitly forbids generic chrome on error states.
- **Autofocus on creation flows is the locked default.** AC #1 requires it; UX spec line 696 reinforces it for all creation surfaces.

### Toast copy (locked)

- QUOTA_EXCEEDED: `"Storage is full. Free up space and try again."` — exact, per AC #5.
- UNAVAILABLE: `"Storage is unavailable. Try a different browser or turn off private browsing."` — story 1.2's `+layout.ts` boot path already toasts something similar; reuse the wording for consistency. The user has likely already seen this toast at boot if storage was unavailable.
- Generic: `"Could not create template. Please try again."`

### Architectural references

- **Storage abstraction (8-method interface, locked):** [Source: _bmad-output/planning-artifacts/architecture.md, Frontend Architecture → Storage abstraction] (lines 244–249). All template I/O goes through `storage()` — already enforced by story 1.1's ESLint rule.
- **State management with runes:** [Source: architecture.md, State Management] (lines 391–396) and the worked example at lines 444–452. The template-store you're consuming follows this exact pattern.
- **Validation at the boundary:** [Source: architecture.md, Validation] (lines 403–406). One schema per resource in `src/lib/schemas/`; the form imports the same schema the storage layer uses.
- **Error handling pattern:** [Source: architecture.md, Error Handling] (lines 408–412). Storage failures surface via `StorageError` → toast.
- **Cross-cutting toast surface:** [Source: architecture.md, Cross-Cutting Concerns] (lines 673–675). Already mounted in `+layout.svelte` by story 1.2.
- **Naming patterns:** [Source: architecture.md, Naming Patterns] (lines 328–352). File naming, ULID convention, route conventions.
- **Architectural boundaries — storage isolation:** [Source: architecture.md, Architectural Boundaries → Data Boundaries] (lines 651–654).
- **FR1 (the requirement this story fulfills):** [Source: _bmad-output/planning-artifacts/prd.md, FR1].
- **NFR4 (150 KB bundle budget, CI-gated):** [Source: prd.md, NFR4]. Verify size-limit still passes after this story; expected delta is small (Valibot tree-shakes well).
- **NFR17 / NFR18 (a11y floor — keyboard operability, contrast):** [Source: prd.md, NFR17/NFR18]. The form follows: visible focus rings via Tailwind `focus:ring-2`, all interactives keyboard-reachable, explicit `aria-invalid` and `aria-describedby` on the input.

### Previous-story intelligence (carried forward)

From story 1.1 dev agent record:
- **npm, not pnpm** — all package.json scripts and CI use `npm`. Don't switch to `pnpm` mid-stream.
- **`svelte/no-navigation-without-resolve` ESLint rule is active.** Every `goto(...)` must wrap the path in `resolve(...)` from `$app/paths`. Bare-string `goto('/templates')` will fail lint.
- **size-limit glob covers entry/chunks/nodes** — not just the entry stub. Real bundle measurement is in place; 28.59 KB → ~35 KB after 1.2; expect this story to land near 38–40 KB. If it crosses 50 KB, investigate.

From story 1.2 dev agent record:
- **ULID monotonic factory in use.** Two `newId()` calls in the same millisecond produce sortable, distinct IDs. The form does not call `newId()` directly — `addTemplate()` does.
- **`Date` calls live in `$lib/utils/date.ts` as `nowIso()`.** Don't call `new Date()` inside `.svelte.ts` files (the `svelte/prefer-svelte-reactivity` ESLint rule catches it). The form is in a `.svelte` file (not `.svelte.ts`), so direct `Date` calls would lint clean — but the form doesn't need timestamps anyway, since `addTemplate()` stamps them.
- **Vitest projects:** `client` (jsdom) for storage / state / `.svelte.test.ts` and `*.svelte.test.ts`; `server` (node) for everything else. The form test file at `src/routes/templates/new/+page.test.ts` lands in… actually, verify which project picks it up — the `client` project's pattern in `vite.config.ts` will determine this. If it's not in `client` by default, extend the include glob or rename to `+page.svelte.test.ts` to match the existing pattern.
- **`browser` guard in `load` functions** is mandatory for any code that touches `localStorage`. The `[id]/+page.ts` load follows this.
- **Toast container is globally mounted.** Just call `toastStore.error(...)` — no setup.

### Out-of-scope (do NOT implement here)

- TemplateCard rendering on `/templates` — story 1.4
- EmptyState component — story 1.4
- List sort by `updatedAt` — story 1.4
- Item editing on `/templates/[id]` — story 1.5 (the stub here just shows the name + count)
- Rename — story 1.6
- Delete — story 1.7
- Run instantiation `/templates/[id]/run` — Epic 2
- Design tokens (colors, typography, spacing variables) — dedicated tokens story before 1.5 ships UI polish
- Playwright e2e — deferred until there's a multi-step user flow (probably Epic 2's run loop)
- Form-level "unsaved changes" warning — not in AC; defer

### Testing standards

- **Vitest co-locates tests with the module under test** (per architecture.md line 371). New tests live next to the file they test:
  - `src/lib/schemas/template.test.ts` next to `template.ts`
  - `src/routes/templates/new/+page.test.ts` next to the route file
- **Use `@testing-library/svelte` and `@testing-library/user-event`** for component rendering. If they're not in `package.json` already, install as dev deps. Do not pull in additional UI testing libraries.
- **Mock `$app/navigation` and `$app/paths`** — these depend on SvelteKit's runtime and don't exist standalone in jsdom. The mock pattern in Task 5 is the canonical shape.
- **No coverage threshold gate yet.** Aim for the AC list as the de-facto coverage target.

### Project structure notes

The story creates `src/routes/templates/new/` and `src/routes/templates/[id]/`. These align cleanly with the architecture's directory tree (lines 549–617). It does **NOT** create `src/lib/features/templates/` — that directory exists in the architecture's full target structure (line 555) but lands incrementally as feature components emerge. Story 1.4's `TemplateCard` will probably be the first inhabitant; this story doesn't need it.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — original AC text
- [Source: _bmad-output/planning-artifacts/prd.md#FR1] — functional requirement: create a template
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4] — bundle budget gate
- [Source: _bmad-output/planning-artifacts/prd.md#NFR17, NFR18] — a11y floor (keyboard, contrast)
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture → Storage abstraction] — storage() factory and the v1↔v2 hinge
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management] — runes-based stores
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation] — Valibot at the boundary
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling] — StorageError → toast
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns] — toast mount point
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — file/route conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries] — storage isolation rule
- [Source: _bmad-output/implementation-artifacts/1-1-initialize-project.md] — npm constraint, ESLint navigation rule, size-limit glob
- [Source: _bmad-output/implementation-artifacts/1-2-storage-and-template-store.md] — ULID monotonic factory, vitest projects split, `nowIso()` helper, browser guard pattern
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — form interaction expectations (Enter to submit, Esc to cancel, autofocus on field)

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

- `npm run check` → 0 errors / 0 warnings / 461 files
- `npm test` → 7 files, 49 tests passed
- `npm run build` → adapter-static OK
- `npm run size-limit` → 37.55 kB gzipped (budget 150 kB)

### Completion Notes List

- Bumped `TemplateSchema.name` from `maxLength(120)` → `maxLength(200)` to match AC #4. Schema is the canonical limit; the form's `NameSchema` only re-states `minLength(1)` and `maxLength(200)` against the trimmed input, and storage-layer `v.parse(TemplateSchema, …)` re-validates the whole record at the boundary.
- `/templates/[id]` is the redirect target only — it shows the name and item count and notes that item editing lands in story 1.5. It must set `prerender = false` because adapter-static cannot enumerate dynamic IDs at build time; the route ships as the fallback HTML and hydrates client-side. Confirmed in build output.
- `/templates/new` form: trims input before parse, focuses the input on validation error (UX spec line 824), disables submit while the storage write is in flight (`Creating…`), and discriminates `StorageError.kind` for QUOTA_EXCEEDED / UNAVAILABLE / generic toast copy. On QUOTA_EXCEEDED the form stays put with the typed name preserved (AC #5).
- `/templates` only gained the "Create template" button — no list rendering, no empty state, no `TemplateCard` (story 1.4 territory).
- **Sanctioned new dev deps** (story spec waived the HALT-on-new-deps rule for these): `@testing-library/svelte@^5`, `@testing-library/user-event@^14`, `@testing-library/jest-dom@^6`. They are in `devDependencies`; not shipped to production. The 37.55 kB bundle confirms.
- **vite.config.ts wired up `svelteTesting()` from `@testing-library/svelte/vite`** — this is required so the jsdom client project resolves Svelte's *browser* build, not the SSR build. Without it `mount(...)` errors with `lifecycle_function_unavailable` on every component render.
- **Test-file naming gotcha resolved.** The story spec directed `+page.svelte.test.ts`, but SvelteKit 2's manifest builder rejects any file in `src/routes/` whose basename starts with `+` and is not a recognized special file — `svelte-kit sync` errors with "Files prefixed with + are reserved". Renamed to `page.svelte.test.ts` (no leading `+`); the vitest client glob `src/**/*.svelte.{test,spec}.{js,ts}` still picks it up and the test imports the route via `./+page.svelte`. Recommend updating the canonical test-file pattern in 1.5+ stories.
- Form behavior is covered by 10 component tests (autofocus, empty/whitespace/over-length validation, happy path with trim, Enter, Escape, QUOTA_EXCEEDED, submitting flag, focus-returns-on-error). Schema is covered by 15 tests (name length boundaries, id, timestamps, items, ItemSchema, PersistedTemplateSchema envelope).
- One prettier/eslint warning surfaced and was auto-fixed by `npm run format`. No suppressions.

### File List

- `src/lib/schemas/template.ts` (modified — name `maxLength(120)` → `maxLength(200)`)
- `src/lib/schemas/template.test.ts` (new — 15 schema tests)
- `src/routes/templates/+page.svelte` (modified — added "Create template" button below the existing `<h1>`)
- `src/routes/templates/[id]/+page.svelte` (new — detail stub showing name + item count)
- `src/routes/templates/[id]/+page.ts` (new — `prerender = false`, `ssr = false`, 404 on unknown id)
- `src/routes/templates/new/+page.svelte` (new — create-template form)
- `src/routes/templates/new/page.svelte.test.ts` (new — 10 form behavior tests; **note:** filename intentionally lacks a leading `+` to satisfy SvelteKit's reserved-prefix rule)
- `vite.config.ts` (modified — added `svelteTesting()` plugin from `@testing-library/svelte/vite`)
- `package.json` (modified — added `@testing-library/svelte`, `@testing-library/user-event`, `@testing-library/jest-dom` to `devDependencies`)
- `package-lock.json` (modified — by `npm install -D`)

### Change Log

- 2026-04-29: Implemented story 1.3 (create new template). Bumped template name limit to 200 chars. Scaffolded `/templates/[id]` detail stub. Built `/templates/new` form with valibot field validation, trim, focus-on-error, StorageError-discriminated toasts, and Enter/Escape keys. Wired "Create template" button on `/templates`. Added schema tests (15) and form behavior tests (10). Sanctioned `@testing-library/{svelte,user-event,jest-dom}` dev deps + `svelteTesting()` vite plugin. Pipeline green; 37.55 kB / 150 kB budget.
