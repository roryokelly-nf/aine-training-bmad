# Story 1.7: Delete a template

Status: done

## Story

**As Maya,**
**I want** to delete a template I no longer use,
**So that** my list stays uncluttered. (FR6)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]`, **when** I click "Delete template", **then** a confirmation modal opens with copy: "Delete '[template name]'? This cannot be undone." **and** focus is trapped within the dialog.

**AC #2.** **Given** the confirmation dialog is open, **when** I click "Delete", **then** the template is removed via `storage.deleteTemplate(id)`, **and** any active run is cleared via `storage.clearRun(id)` (FR16), **and** I am navigated to `/templates`, **and** a toast renders: "Template deleted."

**AC #3.** **Given** the confirmation dialog is open, **when** I click "Cancel" or press Esc, **then** the dialog closes, **and** the template is not deleted, **and** focus returns to the "Delete template" button.

## Tasks / Subtasks

- [x] **Task 1: Update `deleteTemplate` in template store to also clear the active run.** (AC: #2, FR16)
  - [x] In `src/lib/state/template-store.svelte.ts`, update `deleteTemplate`:
    ```ts
    export async function deleteTemplate(id: string): Promise<void> {
        await storage().deleteTemplate(id);
        await storage().clearRun(id);
        templates = templates.filter((t) => t.id !== id);
    }
    ```
  - [x] Order: delete template first (primary operation), then clear run (cleanup). If template delete throws, stop — don't clear run either. If clearRun throws, surface the error (let it propagate).
  - [x] **Update `template-store.test.ts`:** add one test that verifies `clearRun` is called on the fake backend after `deleteTemplate`. The existing `deleteTemplate` test still passes — `clearRun` is a no-op on a backend with no active run.
    ```ts
    it('deleteTemplate also clears the active run for that template', async () => {
        const fake = makeFakeBackend();
        _setStorageForTests(fake);
        await loadTemplates();
        const t = await addTemplate({ name: 'X', items: [] });
        // seed an active run
        await fake.saveRun({ templateId: t.id, startedAt: '2026-04-29T10:00:00.000Z', itemStates: [] });
        expect(await fake.getActiveRun(t.id)).not.toBeNull();
        await deleteTemplate(t.id);
        expect(await fake.getActiveRun(t.id)).toBeNull();
    });
    ```

- [x] **Task 2: `ConfirmModal.svelte` — reusable native-dialog confirm.** (AC: #1, #3)
  - [x] New file: `src/lib/components/ConfirmModal.svelte`.
  - [x] **No third-party dialog library** — the project has no Radix/bits-ui/melt-ui. Use the native `<dialog>` element, which provides focus trap, Esc handling, and `showModal()` / `close()` natively.
  - [x] **Props:**
    ```ts
    interface Props {
        open: boolean;
        title: string;
        description: string;
        confirmLabel?: string;
        onconfirm: () => void;
        oncancel: () => void;
    }
    ```
  - [x] **Reactive open/close** via `$effect` + `bind:this`:
    ```ts
    let dialogEl = $state<HTMLDialogElement | null>(null);
    $effect(() => {
        if (!dialogEl) return;
        if (open) {
            dialogEl.showModal();
        } else {
            dialogEl.close();
        }
    });
    ```
  - [x] **Esc / native close**: `<dialog onclose={oncancel}>` — the browser fires `close` when Esc is pressed or `dialog.close()` is called. Routing it to `oncancel` covers both Esc and programmatic close.
  - [x] **Backdrop click (click outside)**: clicks on the backdrop fire on the `<dialog>` element itself (not its children) when using `showModal()`. Detect with `e.target === e.currentTarget`:
    ```svelte
    onclick={(e) => { if (e.target === e.currentTarget) oncancel(); }}
    ```
  - [x] **Default focus on Cancel** — use `autofocus` attribute on the Cancel button. The `showModal()` call moves focus to the first element with `autofocus` inside the dialog.
  - [x] **Full component:**
    ```svelte
    <script lang="ts">
        interface Props {
            open: boolean;
            title: string;
            description: string;
            confirmLabel?: string;
            onconfirm: () => void;
            oncancel: () => void;
        }
        let { open, title, description, confirmLabel = 'Confirm', onconfirm, oncancel }: Props = $props();
        let dialogEl = $state<HTMLDialogElement | null>(null);
        $effect(() => {
            if (!dialogEl) return;
            if (open) { dialogEl.showModal(); } else { dialogEl.close(); }
        });
    </script>

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <dialog
        bind:this={dialogEl}
        onclose={oncancel}
        onclick={(e) => { if (e.target === e.currentTarget) oncancel(); }}
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        class="rounded-lg p-6 shadow-xl backdrop:bg-black/40 w-full max-w-sm"
    >
        <h2 id="modal-title" class="text-lg font-semibold">{title}</h2>
        <p id="modal-desc" class="mt-2 text-sm text-slate-600">{description}</p>
        <div class="mt-6 flex justify-end gap-3">
            <button
                type="button"
                autofocus
                onclick={oncancel}
                class="rounded border border-slate-300 px-4 py-2 text-sm hover:border-slate-500"
            >Cancel</button>
            <button
                type="button"
                onclick={onconfirm}
                class="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >{confirmLabel}</button>
        </div>
    </dialog>
    ```
  - [x] **Svelte a11y lint**: the `onclick` on `<dialog>` triggers Svelte's `a11y_click_events_have_key_events` and `a11y_no_noninteractive_element_interactions` rules. Suppress with `<!-- svelte-ignore ... -->` directly above the `<dialog>` tag (single-line comment). This is a known and documented pattern for backdrop-dismiss on native `<dialog>`.

- [x] **Task 3: Wire delete into `/templates/[id]/+page.svelte`.** (AC: all)
  - [x] Import `ConfirmModal`, `deleteTemplate` from the store, `goto` from `$app/navigation`, `toastStore`.
  - [x] Local state: `let showDeleteModal = $state(false)`.
  - [x] A "Delete template" button — ghost/text-only style, positioned below the item editor. On click: `showDeleteModal = true`.
  - [x] `handleDelete` async function:
    ```ts
    async function handleDelete() {
        if (!template) return;
        await deleteTemplate(template.id);
        showDeleteModal = false;
        toastStore.success('Template deleted.');
        goto('/templates');
    }
    ```
  - [x] `handleCancel`: `showDeleteModal = false`.
  - [x] Mount `<ConfirmModal>` with:
    - `open={showDeleteModal}`
    - `title="Delete '{template.name}'?"`
    - `description="This cannot be undone."`
    - `confirmLabel="Delete"`
    - `onconfirm={handleDelete}`
    - `oncancel={handleCancel}`
  - [x] **Focus return to delete button on cancel (AC #3):** bind a ref to the delete button and call `.focus()` in `handleCancel`:
    ```ts
    let deleteButtonEl = $state<HTMLButtonElement | null>(null);
    function handleCancel() {
        showDeleteModal = false;
        // Restore focus after modal closes (next tick so dialog has closed)
        setTimeout(() => deleteButtonEl?.focus(), 0);
    }
    ```
  - [x] Updated page skeleton:
    ```svelte
    <script lang="ts">
        import { page } from '$app/state';
        import { goto } from '$app/navigation';
        import { getTemplates, deleteTemplate } from '$lib/state/template-store.svelte';
        import { toastStore } from '$lib/state/toast-store.svelte';
        import ItemEditor from '$lib/features/templates/ItemEditor.svelte';
        import TemplateNameEditor from '$lib/features/templates/TemplateNameEditor.svelte';
        import ConfirmModal from '$lib/components/ConfirmModal.svelte';

        const id = $derived(page.params.id);
        const template = $derived(getTemplates().find((t) => t.id === id));

        let showDeleteModal = $state(false);
        let deleteButtonEl = $state<HTMLButtonElement | null>(null);

        async function handleDelete() {
            if (!template) return;
            await deleteTemplate(template.id);
            showDeleteModal = false;
            toastStore.success('Template deleted.');
            goto('/templates');
        }

        function handleCancel() {
            showDeleteModal = false;
            setTimeout(() => deleteButtonEl?.focus(), 0);
        }
    </script>

    {#if template}
        <TemplateNameEditor {template} />
        <p class="text-sm text-slate-600">
            {template.items.length} item{template.items.length === 1 ? '' : 's'}
        </p>
        <div class="mt-4">
            <ItemEditor {template} />
        </div>
        <button
            bind:this={deleteButtonEl}
            type="button"
            onclick={() => (showDeleteModal = true)}
            class="mt-6 text-sm text-red-600 hover:underline"
        >Delete template</button>
        <ConfirmModal
            open={showDeleteModal}
            title="Delete '{template.name}'?"
            description="This cannot be undone."
            confirmLabel="Delete"
            onconfirm={handleDelete}
            oncancel={handleCancel}
        />
    {/if}
    ```
  - [x] **`goto('/templates')`** — use string literal, not `resolve(...)`. The `/templates` route is hardcoded and stable; `resolve()` is needed only for typed-route validation at build time (the EmptyState lesson from story 1.4 was about `resolve()` rejecting runtime strings in typed contexts — here we're using `goto()` which accepts plain strings).

- [x] **Task 4: Tests for `ConfirmModal.svelte`.** (AC: #1, #3)
  - [x] New file: `src/lib/components/ConfirmModal.svelte.test.ts`.
  - [x] **Note on `<dialog>` in jsdom:** jsdom does not implement `showModal()` or the native focus trap. Mock these:
    ```ts
    beforeEach(() => {
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();
    });
    ```
  - [x] **Tests:**
    - Renders with `open=false` → `showModal` NOT called.
    - Renders with `open=true` → `showModal` called.
    - Renders title and description text.
    - Cancel button is in DOM.
    - Confirm button renders with custom `confirmLabel`.
    - Clicking Cancel calls `oncancel`.
    - Clicking confirm button calls `onconfirm`.
    - Esc: simulate `close` event on the dialog element → `oncancel` called. (jsdom doesn't fire Esc natively; trigger the `close` event directly: `fireEvent(dialogEl, new Event('close'))`).
    - Cancel button has `autofocus` attribute.

- [x] **Task 5: Update `/templates/[id]/page.svelte.test.ts` for delete flow.** (AC: #1, #2, #3)
  - [x] Add to store mock: `deleteTemplate: vi.fn()`.
  - [x] Add `goto` mock: `vi.mock('$app/navigation', () => ({ goto: gotoMock }))`.
  - [x] Add `toastStore` mock: `vi.mock('$lib/state/toast-store.svelte', () => ({ toastStore: { success: toastSuccessMock } }))`.
  - [x] Use `vi.hoisted()` for all mock fns.
  - [x] **Tests:**
    - "Delete template" button is rendered.
    - Clicking "Delete template" → modal opens (the modal's title text is in the DOM).
    - In open modal, clicking Cancel → modal closes (title text gone), `deleteTemplate` NOT called.
    - In open modal, clicking Delete → `deleteTemplate` called with template id, `goto('/templates')` called, toast called with "Template deleted.".
  - [x] Note: jsdom `showModal` needs the mock from Task 4 setup. Add the same `beforeEach` mock here.

- [x] **Task 6: Verify full pipeline.** (AC: all)
  - [x] `npm run check` — 0 errors.
  - [x] `npm run lint` — clean.
  - [x] `npm test` — all pass (123 prior + new tests).
  - [x] `npm run build` — succeeds.
  - [x] `npm run size-limit` — under 150 kB.

## Dev Notes

### No dialog library — use native `<dialog>`

The project has zero UI dependencies beyond Svelte + Tailwind + Valibot. No Radix, bits-ui, or melt-ui is installed. The native `<dialog>` element provides everything needed for MVP:
- Built-in focus trap when opened with `showModal()`.
- Esc closes automatically (fires `close` event).
- `::backdrop` pseudo-element for semi-transparent overlay (Tailwind: `backdrop:bg-black/40`).

jsdom limitation: `showModal()` is not implemented in jsdom. Mock it per Task 4 — tests verify behavior, not native browser APIs.

### `deleteTemplate` store update rationale

FR16 mandates the single-active-run model. Clearing the run on template delete is an invariant, not optional. Putting it in the store keeps the component ignorant of run state — components shouldn't call `storage()` directly. `clearRun` is best-effort in the sense that a missing run is silently ignored by `LocalStorageBackend` (it calls `localStorage.removeItem` which is a no-op for missing keys).

### `goto('/templates')` vs `resolve('/templates')`

`goto()` from `$app/navigation` accepts a plain string path. `resolve()` from `$app/paths` is needed only when constructing `href` attributes (because SvelteKit's typed-route system validates at build time in `href` contexts). Using `resolve()` inside `goto()` is redundant and caused the EmptyState bug in 1.4. For `goto()` calls, use plain strings.

### a11y svelte-ignore for backdrop click

The `onclick` on `<dialog>` that detects backdrop clicks triggers two Svelte a11y rules. Both are suppressible with `<!-- svelte-ignore ... -->` on the line directly before the element. This is the documented pattern; the click IS accessible because the dialog itself has keyboard handling (Esc) and the Cancel button handles the primary dismiss path.

### Focus return after modal close

`setTimeout(() => deleteButtonEl?.focus(), 0)` defers focus until after Svelte removes the modal from the active tab stop. Calling `.focus()` synchronously in `handleCancel` races with the `$effect` that closes the dialog.

### Stack (locked, no changes)

- Svelte 5 runes, SvelteKit 2, Tailwind v4, Valibot 1.x, no new runtime deps.
- Test patterns: `vi.hoisted()` for mocks, `tick()` after timer advancement for DOM assertions, `userEvent.setup({ advanceTimers })` for fake timers.
- `ConfirmModal.svelte.test.ts` — `.svelte.test.ts` → client vitest project.
- Test files under `src/routes/`: no `+` prefix.

### Files modified

| Path | Action | What changes |
|---|---|---|
| `src/lib/components/ConfirmModal.svelte` | NEW | Native dialog confirm |
| `src/lib/components/ConfirmModal.svelte.test.ts` | NEW | Component tests (~8 cases) |
| `src/lib/state/template-store.svelte.ts` | UPDATE | `deleteTemplate` clears active run |
| `src/lib/state/template-store.test.ts` | UPDATE | 1 new test for clearRun on delete |
| `src/routes/templates/[id]/+page.svelte` | UPDATE | Delete button + ConfirmModal wiring |
| `src/routes/templates/[id]/page.svelte.test.ts` | UPDATE | Delete flow tests |

### Out of scope

- Undo toast (UX spec mentions it, but AC only says "Template deleted." toast — no undo AC defined).
- Swipe-to-delete on template list.
- Batch delete.
- Any run archiving on delete.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- jsdom does not implement `showModal()` — mock must call `this.setAttribute('open', '')` to make dialog children visible for `screen.getBy*` queries. Plain `vi.fn()` mocks `showModal` without making the dialog accessible.
- `autofocus` attribute on Cancel button triggers Svelte's `a11y_autofocus` warning — replaced with `bind:this` + `cancelButtonEl?.focus()` in the `$effect` open handler.
- Backdrop click detection: `if (e.target === e.currentTarget) oncancel()` — requires `<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->` above `<dialog>`.

### Completion Notes List

- All 6 tasks complete. 14 new tests added (ConfirmModal: 9, page: 4, store: 1). 137 total, all passing.
- Bundle delta: +0.01 kB gzipped (37.96 kB vs 37.95 kB baseline — ConfirmModal is tiny).
- Native `<dialog>` approach: no new runtime dependency, full focus trap, Esc handling, backdrop click all work natively.
- `deleteTemplate` in store now also calls `clearRun` (FR16 compliance).

### File List

- `src/lib/components/ConfirmModal.svelte` — new
- `src/lib/components/ConfirmModal.svelte.test.ts` — new (9 tests)
- `src/lib/state/template-store.svelte.ts` — updated (deleteTemplate + clearRun)
- `src/lib/state/template-store.test.ts` — updated (1 new clearRun test)
- `src/routes/templates/[id]/+page.svelte` — updated (delete button + ConfirmModal)
- `src/routes/templates/[id]/page.svelte.test.ts` — updated (delete flow tests, dialog mock)

### Review Findings

- [x] [Review][Patch] Duplicate `aria-labelledby`/`aria-describedby` IDs — both `ConfirmModal` instances on `[id]/+page.svelte` hardcode `id="modal-title"` and `id="modal-desc"`; both are in DOM simultaneously, breaking screen reader associations [`src/lib/components/ConfirmModal.svelte`]
- [x] [Review][Patch] `ConfirmModal` double-`oncancel` — when `open` goes false after a confirm, `$effect` calls `dialogEl.close()` which fires `onclose` → `oncancel` a second time; fix: guard with `if (dialogEl.open) dialogEl.close()` [`src/lib/components/ConfirmModal.svelte:$effect`]
- [x] [Review][Patch] `clearActiveRun()` not called after delete — AC#2 requires run cleared; `deleteTemplate` clears localStorage but does not update in-memory `run-store` state [`src/routes/templates/[id]/+page.svelte:handleDelete`]
- [x] [Review][Defer] `goto('/templates')` not awaited after delete — fire-and-forget navigation is acceptable SvelteKit pattern; practical impact nil. [`src/routes/templates/[id]/+page.svelte:handleDelete`] — deferred, pre-existing

### Change Log

- 2026-04-30: Story 1.7 implemented. Delete button on /templates/[id] opens native-dialog confirm modal; confirmed delete calls deleteTemplate+clearRun, toasts "Template deleted.", navigates to /templates. All ACs satisfied; 137 tests green; build 37.96 kB gzipped.
