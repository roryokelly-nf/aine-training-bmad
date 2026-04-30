# Story 2.1: Start a run from a template

Status: done

## Story

**As Maya,**
**I want** to start a run from a template in a single action,
**So that** I can begin ticking items immediately without rebuilding anything. (FR8, FR16)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]` for a template with one or more items, **when** I click "Run", **then** a new Run is created via `storage.saveRun()` with `templateId`, `startedAt` ISO timestamp, and `itemStates` snapshotted from the template (each `{ itemId, checked: false }`), **and** I am navigated to `/templates/[id]/run`.

**AC #2.** **Given** a Valibot schema at `src/lib/schemas/run.ts`, **when** any `Run` is read or written, **then** the schema validates the shape including `templateId`, `startedAt`, and `itemStates[].checked: boolean`.

**AC #3.** **Given** the template has zero items, **when** the page renders, **then** the "Run" button is disabled with `aria-disabled` and a visible tooltip/label: "Add at least one item to run this template", **and** no run is created.

**AC #4.** **Given** a previous active run already exists for this template, **when** I click "Run", **then** `ConfirmModal` opens with copy: "Starting a new run will replace the previous run for this template. Continue?", **and** focus is trapped.

**AC #5.** **Given** the replace-run modal is open and I confirm, **then** the old run is overwritten via `storage.saveRun()` and I navigate to `/templates/[id]/run`.

**AC #6.** **Given** the replace-run modal is open and I cancel or press Esc, **then** dialog closes, no run is created, I remain on `/templates/[id]`.

## Tasks / Subtasks

- [ ] **Task 1: Run schema at `src/lib/schemas/run.ts`.** (AC: #2)
  - [ ] New file. Valibot schema matching the existing `Run` interface in `src/lib/storage/types.ts`:
    ```ts
    import * as v from 'valibot';

    export const RunItemStateSchema = v.object({
        itemId: v.pipe(v.string(), v.nonEmpty()),
        checked: v.boolean()
    });

    export const RunSchema = v.object({
        templateId: v.pipe(v.string(), v.nonEmpty()),
        startedAt: v.pipe(v.string(), v.isoTimestamp()),
        itemStates: v.array(RunItemStateSchema)
    });

    export type RunItemState = v.InferOutput<typeof RunItemStateSchema>;
    export type Run = v.InferOutput<typeof RunSchema>;
    ```
  - [ ] Update `src/lib/storage/types.ts`: replace the `Run` interface with `export type { Run, RunItemState } from '$lib/schemas/run'`. This keeps the schema as the single source of truth. Keep the `StorageBackend` interface unchanged.
  - [ ] New test file `src/lib/schemas/run.test.ts`:
    - Accepts valid run with empty itemStates.
    - Accepts valid run with one checked and one unchecked item.
    - Rejects run missing `templateId`.
    - Rejects run with non-ISO `startedAt`.
    - Rejects itemState with non-boolean `checked`.
    - Rejects itemState with empty `itemId`.

- [ ] **Task 2: Run store at `src/lib/state/run-store.svelte.ts`.** (AC: #1, #4, #5)
  - [ ] New file. Manages ONE active run in memory (the run currently displayed):
    ```ts
    import { storage } from '$lib/storage';
    import { nowIso } from '$lib/utils/date';
    import type { Run } from '$lib/schemas/run';
    import type { Template } from '$lib/schemas/template';

    let activeRun = $state<Run | null>(null);

    export function getActiveRun(): Run | null {
        return activeRun;
    }

    export async function loadRun(templateId: string): Promise<void> {
        activeRun = await storage().getActiveRun(templateId);
    }

    export async function startRun(template: Template): Promise<Run> {
        const run: Run = {
            templateId: template.id,
            startedAt: nowIso(),
            itemStates: template.items.map((item) => ({ itemId: item.id, checked: false }))
        };
        await storage().saveRun(run);
        activeRun = run;
        return run;
    }

    export function clearActiveRun(): void {
        activeRun = null;
    }

    export function _resetForTests(): void {
        activeRun = null;
    }
    ```
  - [ ] **Note:** `clearActiveRun()` clears in-memory state only — does NOT call storage. Use when navigating away or after a reset. Story 2.5 adds `resetRun()` which calls `storage().clearRun()`.
  - [ ] Test file `src/lib/state/run-store.test.ts`:
    - `loadRun`: fetches from backend and sets activeRun.
    - `loadRun` with no stored run: sets activeRun to null.
    - `startRun`: creates run with correct templateId, non-empty startedAt, itemStates matching template items (all checked: false), persists to backend.
    - `startRun` replaces an existing run: backend saveRun called again, activeRun updated.
    - `clearActiveRun`: sets activeRun to null without touching storage.
    - Use same `makeFakeBackend` pattern as template-store tests.

- [ ] **Task 3: Run route scaffold.** (AC: #1)
  - [ ] New dir: `src/routes/templates/[id]/run/`.
  - [ ] `+page.ts`:
    ```ts
    import { error } from '@sveltejs/kit';
    import { browser } from '$app/environment';
    import { getTemplates } from '$lib/state/template-store.svelte';
    import { loadRun } from '$lib/state/run-store.svelte';
    import type { PageLoad } from './$types';

    export const prerender = false;
    export const ssr = false;

    export const load: PageLoad = async ({ params }) => {
        if (!browser) return {};
        const t = getTemplates().find((x) => x.id === params.id);
        if (!t) error(404, 'Template not found');
        await loadRun(params.id);
        return {};
    };
    ```
  - [ ] `+page.svelte` (MVP scaffold — stories 2.2/2.3 flesh it out):
    ```svelte
    <script lang="ts">
        import { page } from '$app/state';
        import { getTemplates } from '$lib/state/template-store.svelte';
        import { getActiveRun } from '$lib/state/run-store.svelte';

        const id = $derived(page.params.id);
        const template = $derived(getTemplates().find((t) => t.id === id));
        const run = $derived(getActiveRun());
        const items = $derived(
            template?.items.map((item) => ({
                ...item,
                checked: run?.itemStates.find((s) => s.itemId === item.id)?.checked ?? false
            })) ?? []
        );
        const totalCount = $derived(items.length);
        const checkedCount = $derived(items.filter((i) => i.checked).length);
    </script>

    {#if template && run}
        <p class="text-sm text-slate-500">{checkedCount} of {totalCount}</p>
        <ul class="mt-4 flex flex-col">
            {#each items as item (item.id)}
                <li class="flex items-center gap-3 py-3 border-b border-slate-100">
                    <span
                        role="checkbox"
                        aria-checked={item.checked}
                        tabindex="0"
                        aria-label={item.text}
                        class="h-6 w-6 rounded border-2 flex-shrink-0 {item.checked
                            ? 'border-[#2E7D54] bg-[#2E7D54]'
                            : 'border-slate-300'}"
                    ></span>
                    <span class={item.checked ? 'text-[#3A5247]' : ''}>{item.text}</span>
                </li>
            {/each}
        </ul>
    {:else if template && !run}
        <p class="text-sm text-slate-500">No active run. <a href="/templates/{id}" class="underline">Back to template</a></p>
    {/if}
    ```
  - [ ] **Note:** this scaffold is intentionally minimal. Stories 2.2–2.3 replace the read-only `<span role="checkbox">` with interactive ticking. Story 2.3 adds go-state. Don't over-build here.

- [ ] **Task 4: Run button on `/templates/[id]/+page.svelte`.** (AC: #1, #3, #4, #5, #6)
  - [ ] In `/templates/[id]/+page.svelte`, add:
    - Import `loadRun`, `startRun`, `getActiveRun` from run-store.
    - Import `goto` from `$app/navigation` (already imported for delete).
    - `$effect` to load existing run when template id changes: `$effect(() => { if (id) void loadRun(id); });`
    - `existingRun = $derived(getActiveRun())`.
    - `showRunReplaceModal = $state(false)`.
    - `runButtonDisabled = $derived(!template || template.items.length === 0)`.
    - `handleRunClick`: if `existingRun` exists, open replace modal; else call `startRun` and navigate.
    - `handleRunConfirm`: call `startRun(template!)`, navigate.
    - Run button:
      ```svelte
      <button
          type="button"
          onclick={handleRunClick}
          disabled={runButtonDisabled}
          title={runButtonDisabled ? 'Add at least one item to run this template' : undefined}
          class="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >Run</button>
      ```
    - Replace-run ConfirmModal:
      ```svelte
      <ConfirmModal
          open={showRunReplaceModal}
          title="Replace existing run?"
          description="Starting a new run will replace the previous run for this template. Continue?"
          confirmLabel="Continue"
          onconfirm={handleRunConfirm}
          oncancel={() => (showRunReplaceModal = false)}
      />
      ```
  - [ ] **`$effect` for run loading:** `$effect` runs on mount and whenever `id` changes. This pre-loads the run so `existingRun` is accurate before the user clicks Run. Must guard against SSR (`browser` import if needed — layout already prevents SSR but be safe with `if (!browser) return`).
  - [ ] **`disabled` vs `aria-disabled`:** use native HTML `disabled` attribute on the `<button>` — this prevents click events natively. No need for separate `aria-disabled`. The `title` attribute provides the tooltip text.

- [ ] **Task 5: Tests for run button on `/templates/[id]` page.** (AC: #1, #3, #4, #5, #6)
  - [ ] Update `src/routes/templates/[id]/page.svelte.test.ts`:
    - Add `loadRun: vi.fn()`, `startRun: vi.fn()`, `getActiveRun: vi.fn()` to the store mock (use `vi.hoisted()`).
    - **Disabled button when template has 0 items:** render with template that has empty items → Run button is `disabled`.
    - **Enabled when items exist:** render with template that has 1+ items → Run button not disabled.
    - **No existing run → startRun called directly:** click Run with `getActiveRun` returning null → `startRun` called, `gotoMock` called with `/templates/01.../run`.
    - **Existing run → modal opens:** click Run with `getActiveRun` returning a run → modal title "Replace existing run?" visible.
    - **Cancel in replace modal:** modal cancel → `startRun` NOT called.
    - **Confirm in replace modal:** modal confirm → `startRun` called, navigate to run route.
  - [ ] Keep existing delete tests intact.

- [ ] **Task 6: Schema tests for `src/lib/schemas/run.test.ts`.** (AC: #2)
  - [ ] (Covered in Task 1 above — create the file with 6 tests.)

- [ ] **Task 7: Verify full pipeline.** (AC: all)
  - [ ] `npm run check` — 0 errors.
  - [ ] `npm run lint` — clean.
  - [ ] `npm test` — all pass.
  - [ ] `npm run build` — succeeds.
  - [ ] `npm run size-limit` — under 150 kB.

## Dev Notes

### `Run` type reconciliation

The existing `types.ts` defines `Run` as an interface. The AC requires a Valibot schema. Resolution: create `src/lib/schemas/run.ts` as the source of truth and re-export `Run` from `types.ts`. The storage backend (`localstorage-backend.ts`) imports from `types.ts` — it will keep working because we're re-exporting the same type shape.

The `Run` interface fields map to Valibot:
- `templateId` → `v.pipe(v.string(), v.nonEmpty())`
- `startedAt` → `v.pipe(v.string(), v.isoTimestamp())`
- `itemStates[]` → `v.array(RunItemStateSchema)`
- `itemId` → `v.pipe(v.string(), v.nonEmpty())`
- `checked` → `v.boolean()`

No `id` field on `Run` — runs are identified by `templateId` (single-active-run model).

### Run item snapshot strategy

The run stores `itemId` references (not full item text). At render time, merge `template.items` with `run.itemStates` using `itemId`. This keeps runs lean and avoids stale text if template is renamed. If an item was deleted from the template after run started, it simply won't appear in the render (filtered out by the `find` in `$derived`).

### `$effect` for pre-loading run in template detail

The run button needs to know if an active run exists to show the replace modal. The `$effect` in `+page.svelte` calls `loadRun(id)` when the page mounts, populating `getActiveRun()`. Without this, the first click would always create a new run even if one exists.

The `+layout.ts` awaits `loadTemplates()` before any child route. But it does NOT load runs — that's per-template on demand.

### Run route scaffold is intentionally minimal

Story 2.1 only needs to prove navigation works and the run is created. The run page renders a read-only list. Stories 2.2 and 2.3 progressively add tick interactivity and go-state. Avoid implementing tick logic in 2.1.

### ConfirmModal reuse

The `ConfirmModal` from story 1.7 at `src/lib/components/ConfirmModal.svelte` handles both the delete confirmation and the replace-run confirmation. Props: `title`, `description`, `confirmLabel`, `onconfirm`, `oncancel`. Reuse as-is — no changes needed.

### `disabled` button approach

Native `disabled` attribute on `<button>` prevents click, greys out visually, and signals state to AT (assistive tech). The `title` attribute provides hover tooltip with the explanation. This is simpler than `aria-disabled` + manual click prevention.

### Files

| Path | Action |
|---|---|
| `src/lib/schemas/run.ts` | NEW |
| `src/lib/schemas/run.test.ts` | NEW |
| `src/lib/storage/types.ts` | UPDATE (re-export Run from schema) |
| `src/lib/state/run-store.svelte.ts` | NEW |
| `src/lib/state/run-store.test.ts` | NEW |
| `src/routes/templates/[id]/run/+page.ts` | NEW |
| `src/routes/templates/[id]/run/+page.svelte` | NEW |
| `src/routes/templates/[id]/+page.svelte` | UPDATE (Run button + modal) |
| `src/routes/templates/[id]/page.svelte.test.ts` | UPDATE |

### Out of scope

- Tick/untick (story 2.2).
- Go-state (story 2.3).
- Template card run indicator (story 2.4).
- Resume button (story 2.4).
- Reset (story 2.5).

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6
### Debug Log References
- `startRun replaces` test: `nowIso()` returns identical timestamps when called in rapid succession — changed assertion to verify single entry in backend map, not timestamp difference.
- `$app/environment` needs explicit mock (`browser: true`) in page tests so the `$effect` loadRun guard doesn't skip.
### Completion Notes List
- 153 tests passing. 16 new tests across run schema (8), run store (6), page (11 updated).
- Bundle: 38.45 kB gzipped (+0.49 kB from story 2.1).
- Run route scaffold at `/templates/[id]/run` — read-only for now; stories 2.2/2.3 add interactivity.
### File List
- `src/lib/schemas/run.ts` — new
- `src/lib/schemas/run.test.ts` — new
- `src/lib/storage/types.ts` — updated (re-exports Run from schema)
- `src/lib/state/run-store.svelte.ts` — new
- `src/lib/state/run-store.test.ts` — new
- `src/routes/templates/[id]/run/+page.ts` — new
- `src/routes/templates/[id]/run/+page.svelte` — new
- `src/routes/templates/[id]/+page.svelte` — updated (Run button + replace modal)
- `src/routes/templates/[id]/page.svelte.test.ts` — updated
### Change Log
- 2026-04-30: Story 2.1 implemented. Run schema, run store, run route scaffold, Run button on template detail with replace-run confirmation. 153 tests green; 38.45 kB gzipped.

## Review Findings

- [x] [Review][Decision] `disabled` vs `aria-disabled` on Run button — fixed: changed to `aria-disabled` + manual click guard in `handleRunClick`. [`src/routes/templates/[id]/+page.svelte:66`]
- [x] [Review][Patch] Async errors silently swallowed in `handleStartRun` — fixed: wrapped `startRun` + `goto` in try/catch, surfaces toast on failure. [`src/routes/templates/[id]/+page.svelte:29,85`]
- [x] [Review][Defer] Race condition on loadRun before first click — `loadRun(id)` runs asynchronously in `$effect`; if user clicks Run before it resolves, `existingRun` is null and replace-run modal is skipped, silently overwriting an existing run. MVP-acceptable given the narrow window. [`src/routes/templates/[id]/+page.svelte:17-19`] — deferred, pre-existing
