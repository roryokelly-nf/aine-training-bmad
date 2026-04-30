# Story 2.2: Tick and untick items in a run

Status: review

## Story

**As Maya,**
**I want** to tick items as I complete them and untick if I miscounted, with ticked items staying visible,
**So that** I can see at a glance what's done and what's still left. (FR9, FR10, FR11)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]/run`, **when** I click or tap an item row, **then** `ticked` flips to `true`, run is saved via `storage.saveRun()` optimistically (state changes before storage resolves), item remains in its position with ticked visual style.

**AC #2.** **Given** a ticked item, **when** I click it again, **then** `ticked` flips to `false` and item renders in unticked style.

**AC #3.** **Given** a ticked item, **when** the run view renders, **then** the item remains in the list — not hidden or removed.

**AC #4.** **Given** keyboard interaction, **when** an item has focus, **then** Space toggles tick, Tab/Shift-Tab move focus between items.

**AC #5.** **Given** a storage write fails after optimistic tick, **when** `saveRun()` rejects, **then** the tick is reverted and a toast error renders.

## Tasks / Subtasks

- [ ] **Task 1: Add `tickItem` to run store.** (AC: #1, #2, #5)
  - [ ] In `src/lib/state/run-store.svelte.ts`, add:
    ```ts
    export async function tickItem(itemId: string): Promise<void> {
        if (!activeRun) throw new Error('no active run');
        const prev = activeRun;
        const updated: Run = {
            ...activeRun,
            itemStates: activeRun.itemStates.map((s) =>
                s.itemId === itemId ? { ...s, checked: !s.checked } : s
            )
        };
        activeRun = updated; // optimistic
        try {
            await storage().saveRun(updated);
        } catch (err) {
            activeRun = prev; // revert on failure
            throw err;
        }
    }
    ```
  - [ ] Add to `run-store.test.ts`:
    - `tickItem` flips checked on the matching item.
    - `tickItem` twice restores original state.
    - `tickItem` persists to backend.
    - `tickItem` reverts optimistic state on storage failure.
    - `tickItem` throws if no active run.

- [ ] **Task 2: Rewrite run page with interactive tick rows.** (AC: #1–#4)
  - [ ] Replace the `<span role="checkbox">` scaffold in `+page.svelte` with a proper interactive `<button>` row:
    ```svelte
    <script lang="ts">
        import { page } from '$app/state';
        import { getTemplates } from '$lib/state/template-store.svelte';
        import { getActiveRun, tickItem } from '$lib/state/run-store.svelte';
        import { toastStore } from '$lib/state/toast-store.svelte';
        import { StorageError } from '$lib/storage';

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

        async function handleTick(itemId: string) {
            try {
                await tickItem(itemId);
            } catch (err) {
                if (err instanceof StorageError) {
                    toastStore.error('Failed to save tick state. Please try again.');
                } else {
                    throw err;
                }
            }
        }
    </script>

    {#if template && run}
        <p class="text-sm text-slate-500" aria-live="polite">{checkedCount} of {totalCount}</p>
        <ul class="mt-4 flex flex-col">
            {#each items as item (item.id)}
                <li>
                    <button
                        type="button"
                        onclick={() => void handleTick(item.id)}
                        aria-pressed={item.checked}
                        class="flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left"
                    >
                        <span
                            aria-hidden="true"
                            class="h-6 w-6 flex-shrink-0 rounded border-2 {item.checked
                                ? 'border-[#2E7D54] bg-[#2E7D54]'
                                : 'border-slate-300'}"
                        ></span>
                        <span class={item.checked ? 'text-[#3A5247]' : ''}>{item.text}</span>
                    </button>
                </li>
            {/each}
        </ul>
    {:else if template && !run}
        <p class="text-sm text-slate-500">
            No active run. <a href="/templates/{id}" class="underline">Back to template</a>
        </p>
    {/if}
    ```
  - [ ] **`aria-pressed`** on the button — semantically correct for toggle buttons. Screen readers announce "pressed" / "not pressed".
  - [ ] **`aria-live="polite"`** on the counter — announces count changes to screen readers without interrupting.
  - [ ] **Keyboard:** `<button>` elements natively handle Space to activate and Tab/Shift-Tab for navigation. No extra keydown handlers needed.
  - [ ] **Touch target:** the `<button>` is `w-full py-3` which gives ≥44px height on standard font sizes.

- [ ] **Task 3: Page-level test for run view.** (AC: #1–#5)
  - [ ] New file: `src/routes/templates/[id]/run/page.svelte.test.ts` (no `+` prefix per convention).
  - [ ] Mock `$app/state`, `$lib/state/template-store.svelte`, `$lib/state/run-store.svelte`, `$lib/state/toast-store.svelte`, `$lib/storage` (for StorageError).
  - [ ] Tests:
    - Renders "X of Y" counter.
    - Renders each item as a button.
    - Item button has `aria-pressed="false"` when unchecked.
    - Item button has `aria-pressed="true"` when checked.
    - Clicking an item calls `tickItem` with correct itemId.
    - `tickItem` throws `StorageError` → `toastStore.error` called.
    - Ticked item text renders with ticked color class.
    - Items render in template order (not reordered).
    - No active run: renders fallback text.

- [ ] **Task 4: Verify pipeline.**
  - [ ] `npm run check` — 0 errors.
  - [ ] `npm run lint` — clean.
  - [ ] `npm test` — all pass.
  - [ ] `npm run build` — succeeds.
  - [ ] `npm run size-limit` — under 150 kB.

## Dev Notes

### Optimistic UI pattern
Set `activeRun = updated` BEFORE `await storage().saveRun(updated)`. This makes the UI respond instantly. On failure, restore `activeRun = prev`. The `try/catch` in `tickItem` handles the revert. The component catches `StorageError` and surfaces a toast — other errors rethrow.

### `aria-pressed` vs `role="checkbox"`
Using `<button aria-pressed>` rather than `<input type="checkbox">` or `role="checkbox"` because:
- The whole row is the tap target (not just an icon)
- `<button>` gets keyboard focus and Space natively
- `aria-pressed` correctly describes a stateful toggle action

### Files
| Path | Action |
|---|---|
| `src/lib/state/run-store.svelte.ts` | UPDATE (add tickItem) |
| `src/lib/state/run-store.test.ts` | UPDATE (5 new tests) |
| `src/routes/templates/[id]/run/+page.svelte` | UPDATE (interactive rows) |
| `src/routes/templates/[id]/run/page.svelte.test.ts` | NEW |

## Dev Agent Record
### Agent Model Used
claude-sonnet-4-6
### Debug Log References
- None notable — `aria-pressed` on `<button>` + `vi.spyOn` for `saveRun` failure test worked cleanly.
### Completion Notes List
- 166 tests passing. 13 new: tickItem store tests (5) + run page tests (8).
- `<button aria-pressed>` pattern chosen over `role="checkbox"` — whole row is tap target, native Space + Tab handling.
- `aria-live="polite"` on counter for screen reader announcement.
### File List
- `src/lib/state/run-store.svelte.ts` — updated (tickItem)
- `src/lib/state/run-store.test.ts` — updated (5 tickItem tests)
- `src/routes/templates/[id]/run/+page.svelte` — updated (interactive buttons)
- `src/routes/templates/[id]/run/page.svelte.test.ts` — new
### Change Log
- 2026-04-30: Story 2.2 implemented. tickItem with optimistic UI + revert, StorageError toast, interactive run page. 166 tests green.
