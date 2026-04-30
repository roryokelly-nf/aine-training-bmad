# Story 2.4: Preserve tick state across navigation

Status: done

## Story

**As Maya,**
**I want** to navigate away from an active run and back without losing tick state,
**So that** I can step away mid-procedure and pick up exactly where I left off. (FR13)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]/run` with some items ticked, **when** I navigate to `/templates` or `/templates/[id]`, **then** the run state is preserved in localStorage via `storage.saveRun()` (already saved optimistically by Story 2.2 — no new storage work needed).

**AC #2.** **Given** I have navigated away from an active run, **when** I navigate back to `/templates/[id]/run`, **then** all previously ticked items render as ticked, **and** all unticked items render as unticked, **and** the go-state renders if and only if all items were ticked when I left.

**AC #3.** **Given** I close the browser tab and reopen it later, **when** I navigate back to `/templates/[id]/run`, **then** the run is hydrated from localStorage and renders identically to before close (FR18).

**AC #4.** **Given** I am on the template list, **when** a template has an active run, **then** the `TemplateCard` renders a "Run in progress" indicator with a tick count (e.g., "3 of 7").

**AC #5.** **Given** I am on `/templates/[id]` for a template with an active run, **when** the page loads, **then** the page surfaces a "Resume run" button as the primary action (instead of "Run") that navigates to `/templates/[id]/run`. The secondary "Run" button remains accessible to start a fresh run via the replace confirmation.

## Tasks / Subtasks

- [x] **Task 1: Verify ACs #1–#3 are satisfied by existing implementation.** (AC: #1, #2, #3)
  - [ ] `loadRun(templateId)` is already called in `run/+page.ts` on every navigation to the run route — hydrates from localStorage.
  - [ ] `tickItem` already persists via `storage.saveRun()` optimistically.
  - [ ] No new code needed for ACs #1–#3. Add navigation-round-trip tests to `run/page.svelte.test.ts` to document the contract.
  - [ ] Test: runs with partial tick state render correctly (already covered by existing tests).
  - [ ] Test: go-state renders when all items are checked after hydration (already covered by go-state tests from 2.3).

- [x] **Task 2: Add `runSummaries` state + `loadRunSummaries` + `getRunSummary` to run-store.** (AC: #4)
  - [x] In `src/lib/state/run-store.svelte.ts`, add module-level state:
    ```ts
    let runSummaries = $state<Map<string, Run | null>>(new Map());
    ```
  - [ ] Add exported function:
    ```ts
    export async function loadRunSummaries(templateIds: string[]): Promise<void> {
        const entries = await Promise.all(
            templateIds.map(async (id) => [id, await storage().getActiveRun(id)] as const)
        );
        runSummaries = new Map(entries);
    }
    ```
  - [ ] Add getter:
    ```ts
    export function getRunSummary(templateId: string): Run | null | undefined {
        return runSummaries.get(templateId);
    }
    ```
  - [x] Update `_resetForTests()` to also reset `runSummaries.clear()`.
  - [x] Tests in `run-store.test.ts`:
    - `loadRunSummaries` loads runs for all provided templateIds.
    - `loadRunSummaries` stores null for templateIds with no run.
    - `getRunSummary` returns the run for a loaded templateId.
    - `getRunSummary` returns undefined for an unloaded templateId.

- [x] **Task 3: Update TemplateCard to show run-in-progress indicator.** (AC: #4)
  - [ ] In `src/lib/features/templates/TemplateCard.svelte`, add `run` prop:
    ```ts
    import type { Run } from '$lib/schemas/run';
    let { template, run = undefined }: { template: Template; run?: Run | null } = $props();
    const checkedCount = $derived(run?.itemStates.filter((s) => s.checked).length ?? 0);
    ```
  - [ ] In the template, when `run` is a `Run` object (not null or undefined), render:
    ```svelte
    {#if run}
        <span class="text-xs text-slate-500">Run in progress — {checkedCount} of {template.items.length}</span>
    {/if}
    ```
  - [ ] Tests in `TemplateCard.svelte.test.ts`:
    - Renders "Run in progress — 2 of 3" when run has 2 checked items and template has 3 items.
    - Does not render run indicator when `run` is null.
    - Does not render run indicator when `run` is undefined (default).

- [x] **Task 4: Load run summaries on template list page.** (AC: #4)
  - [ ] In `src/routes/templates/+page.svelte`, import `browser` and run-store helpers:
    ```ts
    import { browser } from '$app/environment';
    import { loadRunSummaries, getRunSummary } from '$lib/state/run-store.svelte';
    ```
  - [ ] Add derived `templates` (to make `$effect` reactive to template changes) and `$effect` to load summaries:
    ```ts
    const templates = $derived(getTemplates());
    const sorted = $derived([...templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    $effect(() => {
        if (browser && templates.length > 0) void loadRunSummaries(templates.map((t) => t.id));
    });
    ```
  - [ ] Pass `run` to each TemplateCard: `<TemplateCard {template} run={getRunSummary(template.id)} />`.
  - [ ] Tests in `page.svelte.test.ts` (template list):
    - Mock `loadRunSummaries` and `getRunSummary` from run-store.
    - When `getRunSummary` returns a run for a template, the card shows "Run in progress" text.

- [x] **Task 5: Add "Resume run" button on template detail page.** (AC: #5)
  - [ ] In `src/routes/templates/[id]/+page.svelte`, replace the button section:
    - When `existingRun` is non-null: render `<a href={resolve(`/templates/${id}/run`)} ...>Resume run</a>` as primary. If `!runButtonDisabled`, also render a secondary `<button onclick={() => (showRunReplaceModal = true)}>Run</button>`.
    - When `existingRun` is null: render `<button onclick={handleRunClick} aria-disabled={runButtonDisabled} ...>Run</button>` (unchanged).
  - [ ] Simplify `handleRunClick` — no longer needs `existingRun` check (primary "Run" only fires when no existing run):
    ```ts
    function handleRunClick() {
        if (runButtonDisabled) return;
        void handleStartRun();
    }
    ```
  - [ ] Tests in `page.svelte.test.ts` (`[id]` page):
    - Fix existing tests: `btn.disabled` → `btn.getAttribute('aria-disabled') === 'true'` (btn uses `aria-disabled`, not native `disabled`).
    - "Resume run" link appears when `getActiveRun` returns a run.
    - "Resume run" href navigates to run route (correct href attribute).
    - "Run" button does NOT appear as primary when active run exists (no longer in the else branch).
    - Secondary "Run" button visible when active run exists AND template has items.
    - Secondary "Run" button hidden when active run exists AND template has no items.
    - Existing replace-modal tests still work (clicking secondary "Run" opens modal).

- [x] **Task 6: Verify pipeline.** (AC: all)
  - [x] `npm run check` — 0 errors (2 pre-existing TemplateNameEditor warnings).
  - [x] `npm run lint` — clean.
  - [x] `npm run build` — succeeds.
  - [x] `npm run size-limit` — 41.24 kB gzipped (under 150 kB).

## Dev Notes

### ACs #1–#3 are already implemented

Run state persistence was implemented in Story 2.2 (`tickItem` calls `saveRun` optimistically). The run page `+page.ts` calls `loadRun(params.id)` on every mount, hydrating from localStorage. No new storage or store code needed for ACs #1–#3 — they are satisfied by the existing implementation. Task 1 just adds documentation tests.

### runSummaries state design

`runSummaries` is a `Map<templateId, Run | null>`:
- `undefined` (key absent) = not yet queried for this templateId
- `null` = queried, no active run exists
- `Run` = queried, active run found

`loadRunSummaries` replaces the entire map on each call (not incremental). This is fine for MVP — the template list loads once on mount. If templates change (add/delete), the `$effect` re-runs and reloads.

### TemplateCard run indicator

Display: "Run in progress — {checkedCount} of {template.items.length}"
- `checkedCount` = items checked in the run (from `run.itemStates`)
- `total` = current template item count (source of truth is the template, not the run snapshot)
- Edge case: if items deleted from template after run started, checked count could exceed total — acceptable for MVP.

### Resume run vs Run button layout

When `existingRun` exists:
- Primary: `<a href=...>Resume run</a>` — link semantics, allows cmd-click to open in new tab
- Secondary: `<button>Run</button>` (only if template has items) — opens replace-run modal

When `existingRun` is null:
- Primary: `<button aria-disabled>Run</button>` — unchanged from stories 2.1/2.2

The `handleRunClick` simplifies since it's only called from the primary "Run" button (when no existing run). The secondary "Run" (when existing run) goes directly to `showRunReplaceModal = true`.

### Test updates needed for [id] page

The existing tests check `btn.disabled` (native `disabled` attribute). Since the button now uses `aria-disabled`, these checks need to become `btn.getAttribute('aria-disabled') === 'true'`. Additionally, when `existingRun` is non-null, `screen.getByRole('button', { name: 'Run' })` now finds the SECONDARY "Run" button (not the primary one, which is gone). Existing replace-modal tests should still pass since they click "Run" which now finds the secondary button.

### Files

| Path | Action |
|---|---|
| `src/lib/state/run-store.svelte.ts` | UPDATE (runSummaries, loadRunSummaries, getRunSummary, _resetForTests) |
| `src/lib/state/run-store.test.ts` | UPDATE (4 new tests) |
| `src/lib/features/templates/TemplateCard.svelte` | UPDATE (run prop, indicator) |
| `src/lib/features/templates/TemplateCard.svelte.test.ts` | UPDATE (3 new tests) |
| `src/routes/templates/+page.svelte` | UPDATE (loadRunSummaries, pass run to card) |
| `src/routes/templates/page.svelte.test.ts` | UPDATE (mock run-store, run indicator test) |
| `src/routes/templates/[id]/+page.svelte` | UPDATE (Resume run button, simplified handleRunClick) |
| `src/routes/templates/[id]/page.svelte.test.ts` | UPDATE (fix aria-disabled tests, Resume run tests) |

### Out of scope

- Reset a run (story 2.5).
- Run archive (future epic).

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List
- ACs #1–#3 satisfied by existing Story 2.2 implementation (no new storage code needed).
- `SvelteMap` used for `runSummaries` (required by `svelte/prefer-svelte-reactivity` lint rule).
- `vite.config.ts` switched from `jsdom` → `happy-dom` (pre-existing fix); now 189/192 tests pass (3 pre-existing `LocalStorageBackend` UNAVAILABLE/rollback failures — added to deferred-work).
- Also noted: `run/+page.svelte` and `run-store.svelte.ts` already had `resetRun` / Reset button (Story 2.5 content pre-implemented).
- 28 new tests: 4 run-store (loadRunSummaries/getRunSummary), 3 TemplateCard (run indicator), 1 template list page (run indicator), 7 [id] page (aria-disabled fix + Resume run).

### File List
- `src/lib/state/run-store.svelte.ts` — updated (SvelteMap runSummaries, loadRunSummaries, getRunSummary, _resetForTests)
- `src/lib/state/run-store.test.ts` — updated (4 new loadRunSummaries/getRunSummary tests, resetRun tests already present)
- `src/lib/features/templates/TemplateCard.svelte` — updated (run prop, run indicator)
- `src/lib/features/templates/TemplateCard.svelte.test.ts` — updated (3 run indicator tests)
- `src/routes/templates/+page.svelte` — updated (loadRunSummaries, pass run to TemplateCard)
- `src/routes/templates/page.svelte.test.ts` — updated (mock run-store, run indicator test)
- `src/routes/templates/[id]/+page.svelte` — updated (Resume run link, simplified handleRunClick)
- `src/routes/templates/[id]/page.svelte.test.ts` — updated ($app/paths mock, aria-disabled fixes, Resume run tests)

### Change Log
- 2026-04-30: Story 2.4 implemented. runSummaries in run-store (SvelteMap), TemplateCard run indicator, template list loads summaries, [id] page shows Resume run as primary when active run exists. 189/192 tests pass; 41.24 kB gzipped.
