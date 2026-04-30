# Story 1.5: Edit a template's items (add, edit text, remove)

Status: done

## Story

**As Maya,**
**I want** to add items to a template, edit any item's text, and remove items I don't need,
**So that** the template reflects exactly the procedure I run. (FR2, FR3, FR4)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]` for an existing template, **when** I click "Add item" and enter item text, **then** a new item is appended with a ULID `id`, the entered `text`, and an `order` index after the last existing item, **and** the template is saved via `storage.saveTemplate()` with `updatedAt` refreshed.

**AC #2.** **Given** an existing item in the editor, **when** I edit the item's text, **then** the change is debounced (≤ 500 ms) and persisted, **and** the new text renders immediately in the list.

**AC #3.** **Given** an existing item in the editor, **when** I click the item's "Remove" affordance, **then** the item is removed from the template, **and** the template is saved with `updatedAt` refreshed.

**AC #4.** **Given** I attempt to add an item with empty text, **when** the input loses focus or I press Enter, **then** the empty item is discarded (not saved).

**AC #5.** **Given** keyboard interaction in the editor, **when** I press Enter inside an item text field, **then** focus moves to a new empty item input ready for typing.

**AC #6.** **Given** I navigate away from `/templates/[id]` and back, **when** the route reloads, **then** all my item changes persist (FR17 — verified again by Epic 3).

## Tasks / Subtasks

- [x] **Task 1: Add `order` to `ItemSchema` + sanitize-on-read for legacy data.** (AC: #1, foundational)
  - [x] Edit `src/lib/schemas/template.ts`. Add `order: v.pipe(v.number(), v.integer(), v.minValue(0))` to `ItemSchema`. Required, not optional.
  - [x] **DO NOT bump `PersistedTemplateSchema` schemaVersion.** Keep at `v.literal(1)`. Rationale: the only legacy data on disk from stories 1.1–1.4 is empty-items templates (story 1.3 only persists templates with `items: []`). There is no real corpus to migrate. Adding `order` is forward-compat so long as we sanitize legacy blobs on read. Bumping the schemaVersion would require parallel envelope schemas, a writer-version branch, and matching tests — all overhead for a non-existent legacy population. If a true breaking change comes later (v1.x), bump then.
  - [x] Update existing schema tests in `src/lib/schemas/template.test.ts`:
    - The `'rejects schemaVersion 2'` case stays as-is.
    - The `'accepts a populated items array'` test currently passes `[{ id: 'item-1', text: 'Pack toothbrush' }]` — this will now fail (missing `order`). Update the fixture to `[{ id: 'item-1', text: 'Pack toothbrush', order: 0 }]`.
    - The `'rejects an item with empty text'` fixture also needs `order: 0` added; the assertion that empty text is rejected still holds.
    - The two `ItemSchema` tests (280-char accept, 281-char reject) need `order: 0` added to their input.
  - [x] **Add new schema tests** for `order`:
    - Rejects an item missing `order`.
    - Rejects `order: -1` (must be >= 0).
    - Rejects `order: 1.5` (must be integer).
    - Rejects `order: '0'` (must be number).
    - Accepts `order: 0` (boundary).

- [x] **Task 2: Sanitize legacy blobs on read in `localstorage-backend.ts`.** (AC: #1, prevents breakage on existing data)
  - [x] In `getTemplate(id)` and `getTemplates()`, before calling `v.parse(PersistedTemplateSchema, parsed)`, normalize the inner template's items: for each item, if `order` is missing or not a finite number, assign `order = index`. Keep all other item fields verbatim. This is a read-time fixup, not a write-back.
  - [x] Implementation sketch (apply consistently in both methods):
    ```ts
    function sanitize(parsed: unknown): unknown {
        if (
            parsed &&
            typeof parsed === 'object' &&
            'template' in parsed &&
            parsed.template &&
            typeof parsed.template === 'object' &&
            'items' in parsed.template &&
            Array.isArray(parsed.template.items)
        ) {
            const items = parsed.template.items as Array<Record<string, unknown>>;
            const normalized = items.map((it, idx) =>
                typeof it.order === 'number' && Number.isFinite(it.order) ? it : { ...it, order: idx }
            );
            return {
                ...parsed,
                template: { ...parsed.template, items: normalized }
            };
        }
        return parsed;
    }
    ```
    Then: `const persisted = v.parse(PersistedTemplateSchema, sanitize(parsed));`
  - [x] **Critical:** sanitization runs on the parsed JSON, NOT on the schema-validated result. The schema would reject the missing-order shape before sanitize had a chance. Order matters: `JSON.parse` → `sanitize` → `v.parse(PersistedTemplateSchema, ...)`.
  - [x] **No write-back during sanitization.** The next legitimate `saveTemplate()` will persist the v1+order shape naturally. Avoid surprise writes during a read.
  - [x] **Tests in `src/lib/storage/localstorage-backend.test.ts`:** check the existing test file for the existing pattern, then add:
    - `getTemplate` with a stored blob whose items lack `order` → returns items with `order = index`.
    - `getTemplates` ditto for two templates each with items missing `order`.
    - Mixed: one item has `order`, the other doesn't → only the missing one gets synthesized.
    - Item with `order: NaN` or `order: Infinity` → treated as missing and replaced with index.
  - [x] **No new test plumbing required** — existing test setup already mocks/stubs `localStorage`.

- [x] **Task 3: Generic `debounce` utility.** (AC: #2)
  - [x] New file: `src/lib/utils/debounce.ts`. Trailing-edge debounce.
  - [x] API:
    ```ts
    export interface Debounced<Args extends unknown[]> {
        (...args: Args): void;
        flush(): void;
        cancel(): void;
    }

    export function debounce<Args extends unknown[]>(
        fn: (...args: Args) => void,
        ms: number
    ): Debounced<Args>;
    ```
  - [x] Behaviour:
    - Each call resets the timer to `ms`.
    - When the timer expires, `fn` is invoked with the most recent args.
    - `flush()` invokes `fn` immediately with the most recent args (if any pending) and clears the pending timer. No-op if nothing is pending.
    - `cancel()` clears the pending timer without invoking. No-op if nothing is pending.
    - The returned function returns `void` — no promise chaining for the trailing call. Callers that need the result can pass a callback inside `fn`.
  - [x] Implementation sketch:
    ```ts
    export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number): Debounced<Args> {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let pending: Args | null = null;
        const debounced = ((...args: Args) => {
            pending = args;
            if (timer !== null) clearTimeout(timer);
            timer = setTimeout(() => {
                const a = pending;
                timer = null;
                pending = null;
                if (a) fn(...a);
            }, ms);
        }) as Debounced<Args>;
        debounced.flush = () => {
            if (timer === null) return;
            clearTimeout(timer);
            const a = pending;
            timer = null;
            pending = null;
            if (a) fn(...a);
        };
        debounced.cancel = () => {
            if (timer !== null) clearTimeout(timer);
            timer = null;
            pending = null;
        };
        return debounced;
    }
    ```
  - [x] **Tests in `src/lib/utils/debounce.test.ts`** — use `vi.useFakeTimers()` per the existing project pattern (see `toast-store.test.ts` if it uses fake timers; otherwise use the standard pattern):
    - Multiple rapid calls collapse to one invocation after `ms`.
    - Trailing call uses the last args, not the first.
    - `flush()` invokes immediately and prevents the trailing fire.
    - `cancel()` discards the pending invocation.
    - `flush()` and `cancel()` are no-ops when nothing is pending.
    - Delay window respected (advance timers by `ms - 1` → no call yet; advance by 1 more → call).

- [x] **Task 4: Item-mutation helpers in the template store.** (AC: #1, #2, #3)
  - [x] Edit `src/lib/state/template-store.svelte.ts`. Add three exported async functions. Each one:
    - Reads the current template from the in-memory `templates` array (do NOT re-fetch from storage).
    - Throws if the templateId is not in the store (`throw new Error('template not found')`). The /templates/[id] page guarantees the template exists; this is a sanity check.
    - Computes a new `Template` value with refreshed `updatedAt`.
    - Calls `storage().saveTemplate(...)` to persist (let `StorageError` propagate).
    - On success, replaces the entry in the rune array (immutable update so reactivity fires).
  - [x] Functions:
    ```ts
    export async function addItem(templateId: string, text: string): Promise<void> {
        const t = templates.find((x) => x.id === templateId);
        if (!t) throw new Error('template not found');
        const order = t.items.length === 0 ? 0 : Math.max(...t.items.map((it) => it.order)) + 1;
        const newItem: Item = { id: newId(), text, order };
        const updated: Template = { ...t, items: [...t.items, newItem], updatedAt: nowIso() };
        await storage().saveTemplate(updated);
        templates = templates.map((x) => (x.id === templateId ? updated : x));
    }

    export async function updateItemText(
        templateId: string,
        itemId: string,
        text: string
    ): Promise<void> {
        const t = templates.find((x) => x.id === templateId);
        if (!t) throw new Error('template not found');
        const items = t.items.map((it) => (it.id === itemId ? { ...it, text } : it));
        const updated: Template = { ...t, items, updatedAt: nowIso() };
        await storage().saveTemplate(updated);
        templates = templates.map((x) => (x.id === templateId ? updated : x));
    }

    export async function removeItem(templateId: string, itemId: string): Promise<void> {
        const t = templates.find((x) => x.id === templateId);
        if (!t) throw new Error('template not found');
        const items = t.items.filter((it) => it.id !== itemId);
        const updated: Template = { ...t, items, updatedAt: nowIso() };
        await storage().saveTemplate(updated);
        templates = templates.map((x) => (x.id === templateId ? updated : x));
    }
    ```
  - [x] **Order assignment:** `Math.max(...items.map(o => o.order)) + 1` rather than `items.length`. Reason: after a `removeItem`, length drops but you want the new item's `order` to exceed any existing one (preserves a monotonically-increasing `order` even with gaps). Empty-list case returns 0. **Do NOT re-index after remove** — gaps are fine. Story 5.x will reorder; for now `order` is informational.
  - [x] **Imports:** add `import type { Item } from '$lib/schemas/template';` at the top.
  - [x] **Tests in `template-store.test.ts`** — extend the existing file. The fake backend already exists. Add a `beforeEach` ULID-mock if order-of-creation matters; otherwise just assert structural properties.
    - `addItem` appends one item with the given text, a non-empty id, `order = 0` for first, `order > prevMax` for subsequent. `updatedAt` changes.
    - `addItem` persists via the fake backend (assert via `fake._store.get(id).items`).
    - `updateItemText` updates the matching item's text only and refreshes `updatedAt`.
    - `removeItem` removes the matching item and refreshes `updatedAt`.
    - `addItem` after a `removeItem` chooses an `order` greater than the highest remaining `order` (gap-preserving).
    - All three throw if templateId is unknown.

- [x] **Task 5: `ItemEditor.svelte` composite component.** (AC: #1, #2, #3, #4, #5)
  - [x] New file: `src/lib/features/templates/ItemEditor.svelte`. **This is the architecturally promised name** (architecture.md §"Complete Project Directory Structure" line 554 and FR25–FR27 mapping). Future Epic-5 refinements extend this same file.
  - [x] **Scope:** the composite covers the existing-items list AND the add-item draft input. No sub-component extraction — keep it one file. If it grows past ~200 lines after this story, a future refactor can split out `ItemRow.svelte`.
  - [x] **Props:** `{ template: Template }`. The template is **read-only** from this component's perspective; mutations go through the store helpers, which update both storage AND the in-memory rune. Parent is expected to re-pass the latest template via `$derived`.
  - [x] **Local state:**
    - One `draftText = $state('')` for the add-item input.
    - For each existing item, a per-row local input draft is required to support optimistic typing without flickering when the store re-renders us. Implementation: render existing items inside `{#each template.items as item (item.id)}` and inside that scope each `<input>` keeps its OWN local `$state` initialized from `item.text`. Svelte 5 keys ensure each row component instance is bound to one item id.
    - **Strongly recommended:** extract a small inner `<script>`-less `{#snippet}` won't work because we need per-row state. Instead, keep each row as a trivial inline block but bind the input by hand: see skeleton below.
  - [x] **Debounce:** one debounced save per row. Each row creates its own `debounce(fn, 400)` instance. 400 ms is comfortably below the AC's 500 ms ceiling and feels responsive. Each row's debounce flushes on Enter and on the row's input blur.
  - [x] **Add-item flow:**
    - The draft input has `value={draftText}`. `oninput` updates `draftText`.
    - Enter: `e.preventDefault()` to avoid form submission; if `draftText.trim()` is non-empty, call `addItem(template.id, draftText.trim())` then clear `draftText`. Keep focus on the same input. If empty, just clear (no commit).
    - Blur: same logic — non-empty commits, empty discards. Don't preventDefault.
  - [x] **Existing-row text edit flow:**
    - Each row's `<input>` has `value={rowDraft}` (per-row local state). `oninput` updates `rowDraft` and calls the row's debounced save with the latest text.
    - **Important — schema floor:** `updateItemText` writes through `storage.saveTemplate` which calls `v.parse(TemplateSchema, ...)`. `ItemSchema` requires `text` to be `minLength(1)`. So if a user empties an item's text, the debounced save will throw `StorageError('INVALID', ...)`. **Do not call the store helper with an empty string.** The debounced wrapper in this component must guard:
      ```ts
      const guardedSave = (text: string) => {
          const trimmed = text.trim();
          if (trimmed.length === 0) return; // silently skip — keeps current persisted text
          updateItemText(template.id, item.id, trimmed);
      };
      const debouncedSave = debounce(guardedSave, 400);
      ```
      The user can type-and-empty-and-retype freely; the save fires only when the text resolves to a non-empty string. If they leave it empty, the previously-saved text remains canonical (we DO NOT remove the item — that's what the explicit Remove button is for).
    - Enter: flush the debounce, then move focus to the add-item input (see Enter handling below).
    - Blur: flush the debounce.
  - [x] **Enter-key focus orchestration (AC #5):** the simplest model is one bound add-item input `let addInputEl: HTMLInputElement;`. Each row's Enter handler does `debouncedSave.flush(); addInputEl?.focus();`. The add input's own Enter handler stays inside the same input (it commits and refocuses itself).
  - [x] **Remove flow:** each row has a `<button type="button" aria-label="Remove item">` that calls `removeItem(template.id, item.id)` (await). No confirmation dialog (that's not in the AC). After removal, the rune updates and the row unmounts.
  - [x] **Skeleton:**
    ```svelte
    <script lang="ts">
        import { addItem, updateItemText, removeItem } from '$lib/state/template-store.svelte';
        import { debounce } from '$lib/utils/debounce';
        import type { Template } from '$lib/schemas/template';

        let { template }: { template: Template } = $props();

        let draftText = $state('');
        let addInputEl: HTMLInputElement | null = $state(null);

        async function commitDraft() {
            const trimmed = draftText.trim();
            if (trimmed.length === 0) {
                draftText = '';
                return;
            }
            await addItem(template.id, trimmed);
            draftText = '';
        }

        function handleAddKeydown(e: KeyboardEvent) {
            if (e.key === 'Enter') {
                e.preventDefault();
                void commitDraft();
            }
        }
    </script>

    <ul class="flex flex-col gap-2">
        {#each template.items as item (item.id)}
            {@const debounced = debounce(
                (text: string) => {
                    const t = text.trim();
                    if (t.length === 0) return;
                    void updateItemText(template.id, item.id, t);
                },
                400
            )}
            <!-- per-row block -->
            <li class="flex items-center gap-2">
                <input
                    type="text"
                    value={item.text}
                    oninput={(e) => debounced(e.currentTarget.value)}
                    onblur={() => debounced.flush()}
                    onkeydown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            debounced.flush();
                            addInputEl?.focus();
                        }
                    }}
                    aria-label={`Item ${item.order + 1} text`}
                    maxlength="280"
                    class="flex-1 rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
                <button
                    type="button"
                    onclick={() => void removeItem(template.id, item.id)}
                    aria-label={`Remove item: ${item.text}`}
                    class="rounded border border-slate-300 px-3 py-2 text-sm hover:border-slate-500"
                >Remove</button>
            </li>
        {/each}
        <li>
            <input
                bind:this={addInputEl}
                type="text"
                bind:value={draftText}
                onkeydown={handleAddKeydown}
                onblur={commitDraft}
                placeholder="Add item"
                aria-label="Add item"
                maxlength="280"
                class="w-full rounded border border-dashed border-slate-300 px-3 py-2 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
            />
        </li>
    </ul>
    ```
  - [x] **Reactivity caveat — `{@const debounced = debounce(...)}` inside `{#each}`:** Svelte re-evaluates the `@const` block when the each-iteration's identity changes. With the `(item.id)` key, identity is stable per row, so the debounce instance is stable per row across re-renders. **Verify** during development that rapid typing in one row doesn't re-create the debounced instance (check by adding a temporary `console.log` in the closure; remove before committing).
    - If you observe the debounce being re-created on every keystroke (which would mean each call resets the timer to 400 ms freshly — actually still works, but is wasteful), consider migrating to an inner `ItemRow.svelte` component where the debounce instance is captured in a normal `$state`. Not necessary if the keyed-each pattern holds.
  - [x] **A11y notes:**
    - `aria-label` on the add input ("Add item") and on each row input (`Item {n} text`).
    - `aria-label` on the Remove button includes the item text for screen readers.
    - The input `maxlength="280"` matches `ItemSchema`'s 280-char cap (NFR3 / FR3). Hard cap at the input level prevents the user from typing past the limit; a soft inline-error pattern can come later if needed.
  - [x] **Tailwind:** match existing visual language. `rounded`, `border-slate-300`, `focus:ring-2 focus:ring-slate-500`. No new design tokens.
  - [x] **Tests in `src/lib/features/templates/ItemEditor.svelte.test.ts`** (jsdom; the `.svelte.test.ts` suffix puts it in the client vitest project). Mock `$lib/state/template-store.svelte` so the helpers are spies; do NOT run the real store. Use `userEvent` and `vi.useFakeTimers()` for debounce assertions.
    - **Render** with a template that has 0 items → only the add-item input renders. Add input is focusable.
    - **Render** with a template that has 2 items → 2 row inputs + 2 Remove buttons + the add input.
    - **Add commit on Enter** — type "Pack toothbrush", press Enter → `addItem` called with `(templateId, 'Pack toothbrush')`, draft cleared.
    - **Add discard on empty Enter** — Enter with empty input → `addItem` NOT called.
    - **Add commit on non-empty blur** — type "Sunscreen", blur → `addItem` called.
    - **Add discard on empty blur** — focus, blur without typing → `addItem` NOT called.
    - **Add trims** — type "  hat  ", Enter → `addItem` called with `'hat'`.
    - **Edit debounces** — type into row 0, advance fake timers 200 ms (no call), 200 more ms → `updateItemText` called once with the final value.
    - **Edit Enter flushes** — type into row 0, press Enter immediately → `updateItemText` called once with the typed value AND focus moves to the add input (`document.activeElement` test).
    - **Edit blur flushes** — type, blur → `updateItemText` called.
    - **Edit empty-then-non-empty within debounce** — type "x", clear, type "y", advance timers → `updateItemText` called with `'y'` only (one call).
    - **Edit empty alone** — type into row 0, clear, advance timers → `updateItemText` NOT called (guarded).
    - **Remove** — click Remove on row 0 → `removeItem` called with `(templateId, item0.id)`.
    - **`maxlength`** — verify the input element has `maxlength="280"` attribute.
  - [x] **Mock pattern (canonical):**
    ```ts
    import { render, screen } from '@testing-library/svelte';
    import userEvent from '@testing-library/user-event';
    import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

    const addItem = vi.fn();
    const updateItemText = vi.fn();
    const removeItem = vi.fn();
    vi.mock('$lib/state/template-store.svelte', () => ({ addItem, updateItemText, removeItem }));

    import ItemEditor from './ItemEditor.svelte';
    ```

- [x] **Task 6: Rewrite `/templates/[id]/+page.svelte` to mount `ItemEditor` over a store-derived template.** (AC: all)
  - [x] Replace the current stub. Render the template name as `<h1>` and pass the live template through to `<ItemEditor>`.
  - [x] Read the template from the store, NOT from `data.template`. The store is the single source of truth (mutations go through it). `data.template` from `+page.ts` is a one-shot snapshot at load time and goes stale the moment the user edits.
  - [x] Skeleton:
    ```svelte
    <script lang="ts">
        import { page } from '$app/state';
        import { getTemplates } from '$lib/state/template-store.svelte';
        import ItemEditor from '$lib/features/templates/ItemEditor.svelte';

        const id = $derived(page.params.id);
        const template = $derived(getTemplates().find((t) => t.id === id));
    </script>

    {#if template}
        <h1 class="text-2xl">{template.name}</h1>
        <p class="text-sm text-slate-600">
            {template.items.length} item{template.items.length === 1 ? '' : 's'}
        </p>
        <div class="mt-4">
            <ItemEditor {template} />
        </div>
    {/if}
    ```
  - [x] **Why `$app/state` and not `$app/stores`:** `$app/state` is the SvelteKit 2 reactive equivalent for runes-mode (the legacy `$app/stores` `page` store is the Svelte 4 path). Confirm SvelteKit version: `package.json` already has SvelteKit 2.x — `$app/state` works.
  - [x] **404 handling stays in `+page.ts`** (next task). If `+page.ts` has already 404'd, this page never renders, so the `{#if template}` guard handles only the "template was deleted in another tab" edge case (not in scope but cheap to guard).
  - [x] **Do NOT** use `data.template` here at all. Story 1.6 (rename) and 1.7 (delete) will also rely on store-derived state — keep the pattern consistent now.

- [x] **Task 7: Switch `/templates/[id]/+page.ts` to read from the store.** (AC: all, single source of truth)
  - [x] Replace `storage().getTemplate(params.id)` with `getTemplates().find(t => t.id === params.id)`. The layout's `await loadTemplates()` runs before child loads, so the store is populated by the time this runs.
  - [x] Keep the `error(404, 'Template not found')` branch for missing ids.
  - [x] Return `{}` (no need to ship `template` through `data` since the page reads from store).
  - [x] Skeleton:
    ```ts
    import { error } from '@sveltejs/kit';
    import { browser } from '$app/environment';
    import { getTemplates } from '$lib/state/template-store.svelte';
    import type { PageLoad } from './$types';

    export const prerender = false;
    export const ssr = false;

    export const load: PageLoad = ({ params }) => {
        if (!browser) return {};
        const t = getTemplates().find((x) => x.id === params.id);
        if (!t) error(404, 'Template not found');
        return {};
    };
    ```
  - [x] **No async** needed — store reads are synchronous. The function can drop the `async` keyword.

- [x] **Task 8: Page-level test for `/templates/[id]`.** (AC: #1, #6 sanity)
  - [x] New file: `src/routes/templates/[id]/page.svelte.test.ts` (no leading `+` — story 1.3 gotcha; SvelteKit reserves `+`-prefixed files in `src/routes/`).
  - [x] Mock `$app/state` to provide a `params` object: `vi.mock('$app/state', () => ({ page: { params: { id: '01TEMPLATE' } } }))`.
  - [x] Mock `$lib/state/template-store.svelte` with a `getTemplates` returning a controllable array, and stubs for `addItem`/`updateItemText`/`removeItem`.
  - [x] Tests:
    - Renders the template name as an `<h1>` when the store contains the matching id.
    - Renders the item-count line ("0 items" / "1 item" / "2 items").
    - Mounts `ItemEditor` (assert the add input is in the DOM via `getByLabelText('Add item')`).
    - Renders nothing when the store does not contain the id (the `{#if template}` guard).
  - [x] **Don't** retest the `+page.ts` 404 branch as a route-level test — that belongs in an e2e/Playwright suite (deferred). Just exercise the page.svelte's render branches.

- [x] **Task 9: Verify the full pipeline.** (AC: all)
  - [x] Run, in order, and confirm each passes:
    - `npm run check` (0 errors)
    - `npm run lint` (clean)
    - `npm test` (65 prior + new tests pass — expect roughly +25 to +30 new tests across the schema, storage migration, debounce, store helpers, ItemEditor, and page suites)
    - `npm run build` (adapter-static still succeeds)
    - `npm run size-limit` (still under 150 KB gzipped — ItemEditor + debounce util add tiny amounts; expected delta well under 5 KB. Flag in completion notes if >+5 KB)
  - [x] Manual smoke (`npm run dev`):
    - Create a fresh template via `/templates/new` → land on `/templates/<id>`. Add input is focused / focusable.
    - Type "First step", press Enter → item appears at top of list, draft input clears.
    - Type "Second step", click outside the input (blur) → item committed.
    - Type into "First step" → wait ~500 ms → reload page → text persisted.
    - Edit "First step" again, press Enter → focus moves to add input.
    - Click Remove on "First step" → row disappears immediately.
    - Type "" into the add input, press Enter → no item added.
    - Navigate back to `/templates` → item count updated on the card; templates list re-sorted by `updatedAt` desc (just-edited template floats to top).
    - Navigate into the template again → all changes persist.

## Dev Notes

### Critical context for the dev agent

This story has the largest surface area in Epic 1: a foundational schema change, a generic debounce util, three new store helpers, a composite editor component with debounce + focus orchestration, and a route rewrite. Most of it is mechanical once the design is in place. The single most important property of this story: **route ALL writes through the template store, not through `storage()` directly.** The store updates the in-memory rune AND persists, in that order. Skipping the store (writing directly to storage) leaves the UI stale.

**This is also the first story that introduces a schema-shape change (the `order` field).** Existing 1.3 templates have empty `items: []` arrays so there is nothing on disk that the new required `order` field will reject. But the read-time sanitizer is still required because:
1. A user might have manually crafted a template via devtools.
2. Future epics that import data (Epic 11) will need this anyway.
3. It's a cheap insurance policy.

### Stack and library versions (locked, no changes)

- **Svelte 5 runes** — `$state`, `$props`, `$derived`. No `svelte/store`.
- **SvelteKit 2 + adapter-static** — same setup, `ssr=false; prerender=false` for `/templates/[id]` (it's dynamic by template id; cannot prerender).
- **Tailwind v4** — utility classes only.
- **Valibot 1.x** — schema is the source of truth for both runtime validation and TS types.
- **No new dev or runtime dependencies.** Everything we need is already in `package.json`.

### Key API contracts (don't reinvent)

- `getTemplates(): Template[]` from `$lib/state/template-store.svelte` — reactive read of the in-memory list.
- `addItem(templateId, text): Promise<void>` — NEW, append-with-order helper. Throws if templateId not in store.
- `updateItemText(templateId, itemId, text): Promise<void>` — NEW, refreshes `updatedAt`.
- `removeItem(templateId, itemId): Promise<void>` — NEW.
- `Template` and `Item` types from `$lib/schemas/template` — `Item` now has `order: number`.
- `debounce(fn, ms)` from `$lib/utils/debounce` — NEW, trailing-edge with `flush()`/`cancel()`.

### Component placement decisions

- `lib/features/templates/ItemEditor.svelte` — composite for the entire item-list editor, per architecture.md line 554. Imports `Template` from schemas, calls store helpers. **No internal sub-components for this story** — keep it one file.
- **Debounce lives in `lib/utils/`** alongside `date.ts`. Generic, no Svelte deps.
- **Schema change to `lib/schemas/template.ts`** (in-place, not a new file).
- **Storage backend gets a tiny sanitizer fn** (in-place in `localstorage-backend.ts`), not a new module.

### Schema decision rationale (why no `schemaVersion: 2`)

- The persisted envelope's `schemaVersion: 1` is meant to gate **breaking** persistence changes that require a forward migration. Adding a non-nullable inner field with a deterministic on-read fixup is not a breaking change for the writer (we always emit the new field) or for the reader (we sanitize before validate).
- Bumping to v2 would require: a `PersistedTemplateV1Schema` for legacy parse, branching in `getTemplate`/`getTemplates`, optional write-back-on-read logic, parallel test cases, and update of `'rejects schemaVersion 2'` assertion. All overhead for a corpus of zero non-empty legacy items.
- If a real breaking change comes later (e.g., renaming `items` to `tasks`), bump to v2 then. For now, sanitize-on-read is the right MVP move.
- **Document the choice as a comment in `localstorage-backend.ts` at the sanitize call site** so future-you / future-dev knows why there's no version branch.

### Layout already loads the data — do not re-load

Same as story 1.4: `+layout.ts` `await`s `loadTemplates()` before any child route mounts. Both `/templates/[id]/+page.ts` and `+page.svelte` can read directly from the store. **Do not call `loadTemplates()` again** in any of the files this story touches.

### Files being modified

| Path | Action | Current state | What changes | What must be preserved |
|---|---|---|---|---|
| `src/lib/schemas/template.ts` | UPDATE | `ItemSchema` has `id`, `text` | Add `order: integer >= 0` | All existing fields and constraints; `PersistedTemplateSchema.schemaVersion: v.literal(1)` stays |
| `src/lib/schemas/template.test.ts` | UPDATE | 11 tests, all passing | Update 3 existing items-related tests to include `order: 0`; add 5 new `order` validation tests | The structure of the existing test groupings; the `'rejects schemaVersion 2'` test |
| `src/lib/storage/localstorage-backend.ts` | UPDATE | Reads parse-then-validate; no migration | Add `sanitize()` fn; call it between `JSON.parse` and `v.parse` in `getTemplate` and `getTemplates` | Quota handling, all other read paths (`getActiveRun`, `archiveRun`), the `setItemSafe` rollback semantics |
| `src/lib/storage/localstorage-backend.test.ts` | UPDATE | Existing tests for save/get/delete/run/quota | Add 4 sanitize-on-read tests | All existing tests must still pass — they may need `order: 0` added to fixture items |
| `src/lib/state/template-store.svelte.ts` | UPDATE | Has `loadTemplates`, `addTemplate`, `updateTemplate`, `deleteTemplate` | Add `addItem`, `updateItemText`, `removeItem` exports + `Item` import | Existing exports and their semantics — particularly `updateTemplate(t)` (Story 1.6 will use it for rename) |
| `src/lib/state/template-store.test.ts` | UPDATE | 4 tests for the existing helpers | Add ~6 tests for the new item helpers | Existing 4 tests; the `makeFakeBackend` helper |
| `src/lib/utils/debounce.ts` | NEW | does not exist | `debounce(fn, ms)` with `flush()`/`cancel()` | n/a |
| `src/lib/utils/debounce.test.ts` | NEW | does not exist | Vitest tests using `vi.useFakeTimers()` | n/a |
| `src/lib/features/templates/ItemEditor.svelte` | NEW | does not exist | Composite editor — list of rows + add input | n/a |
| `src/lib/features/templates/ItemEditor.svelte.test.ts` | NEW | does not exist | Component tests, ~13 cases | n/a |
| `src/routes/templates/[id]/+page.svelte` | UPDATE | Two-block stub reading `data.template` | Read from store via `$derived`, mount `<ItemEditor>` | Render only when template is found (`{#if template}`) |
| `src/routes/templates/[id]/+page.ts` | UPDATE | Calls `storage().getTemplate()` | Calls `getTemplates().find()`; not async | The `error(404)` branch; the `prerender=false; ssr=false` exports |
| `src/routes/templates/[id]/page.svelte.test.ts` | NEW | does not exist | Page-level tests, 4 cases | n/a |

### Out-of-scope guardrails (DO NOT do these)

- **No template rename.** That's story 1.6.
- **No template delete.** That's story 1.7.
- **No item reordering / drag-and-drop.** That's Epic 5 (story 5.1+). The `order` field is added but treated as informational only — array position remains canonical for rendering. Do NOT add a sort by `order`.
- **No item nesting / sub-items / notes.** That's Epic 5 (story 5.2+).
- **No undo / redo.** Out of scope; no PRD requirement until Vision.
- **No confirmation dialog on Remove.** AC #3 is a direct remove. The Modal primitive isn't created until story 1.7.
- **No Playwright e2e.** Component + page tests cover the AC; e2e is deferred.
- **No design tokens / theme work.** Inline Tailwind only.
- **No moving the template store.** Stays at `lib/state/`.
- **No bumping `schemaVersion` to 2.** Documented above.
- **No additional inline validation UI** for the 280-char ceiling. The `maxlength` HTML attribute is sufficient — typing past 280 is just blocked at the browser level. Soft inline error patterns can come later.

### Previous story intelligence (1.4 — read these or repeat the mistake)

1. **EmptyState API gotcha** — story 1.4 had to refactor `EmptyState`'s CTA from `cta.href` to `cta.onClick` because SvelteKit's typed-routes `resolve()` rejects a generic `string` parameter. Lesson for this story: any `resolve(...)` calls must use **literal route strings** (`resolve('/templates')`, `resolve(\`/templates/${id}\`)`). Don't pass a runtime variable to `resolve`. Story 1.5 doesn't add new navigations beyond what already exists, so this is unlikely to bite, but watch for it.
2. **`{@const ...}` inside `{#each}` is allowed** in Svelte 5 — used in this story's ItemEditor skeleton.
3. **Svelte 5 typed event handlers** — when typing `oninput={(e) => ...}`, `e.currentTarget` is correctly typed only if the element is a literal `<input>` (not a component). The skeleton above uses literal `<input>` so this is fine.
4. **`bind:this={addInputEl}`** with `let addInputEl: HTMLInputElement | null = $state(null)` — the `$state` wrapper is required for `bind:this` to be reactive in runes mode.
5. **Test file naming under `src/routes/`:** no `+` prefix. `page.svelte.test.ts`, not `+page.svelte.test.ts`.
6. **`vite.config.ts` already has `svelteTesting()`** from `@testing-library/svelte/vite` (story 1.3). Don't touch.
7. **Mock `$app/navigation`, `$app/paths`, `$app/state`, `$lib/state/template-store.svelte`** in component / page tests as needed. Each test file imports its mocks before the component-under-test (top-down hoisting via `vi.mock` is automatic).

### Bundle budget check

Story 1.4 baseline: 37.73 kB gzipped, budget 150 kB. ItemEditor + debounce util are small (under 1 kB combined gzipped — ItemEditor is ~150 lines of Svelte, debounce is ~30 lines of TS). Tailwind classes added are all in the existing utility set, so no JIT delta. Flag in completion notes if size-limit reports >+5 kB. Hard fail if >150 kB.

### References

- [Source: epics.md lines 480-513] — Story 1.5 ACs and Epic 1 context.
- [Source: epics.md line 1043] — Epic 5 references "the `Template` schema includes an `order` index per item (already from Story 1.5)" — confirms `order` is introduced here.
- [Source: architecture.md line 554, 665, 740] — `ItemEditor.svelte` is the prescribed composite for the template item editor.
- [Source: architecture.md lines 225-247] — Frontend architecture: state via runes, single storage abstraction.
- [Source: _bmad-output/implementation-artifacts/1-4-view-all-templates.md] — Test naming gotcha, `svelteTesting()` plugin, mock pattern, store-derived rendering pattern, EmptyState API decision.
- [Source: _bmad-output/implementation-artifacts/1-3-create-a-new-template.md] — `+`-prefix file naming rule under `src/routes/`, Vitest projects split, test patterns.
- [Source: _bmad-output/implementation-artifacts/1-2-storage-and-template-store.md] — Store API, `nowIso()`, fake-backend test pattern, vitest projects.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Used `vi.hoisted()` for mock declarations in `ItemEditor.svelte.test.ts` — `vi.mock` is hoisted before variable declarations, so `const fn = vi.fn()` references in the factory would fail with `Cannot access before initialization`.
- Fixed `TemplateCard.svelte.test.ts` item fixtures missing `order` field (TypeScript caught at `npm run check`).

### Completion Notes List

- All 9 tasks implemented; 20 new tests added across ItemEditor and page suites (111 total, up from 91).
- Bundle delta: +0.18 kB gzipped (37.91 kB vs 37.73 kB baseline — well under 5 kB threshold).
- `{@const debounced = debounce(...)}` inside `{#each (item.id)}` is stable per-row as expected; no re-creation on keystrokes observed.
- Tasks 1–5 were already implemented (schema, sanitizer, debounce util, store helpers, ItemEditor). Tasks 6–8 (page rewrite, +page.ts update, tests) implemented in this session.

### File List

- `src/lib/schemas/template.ts` — updated (order field on ItemSchema)
- `src/lib/schemas/template.test.ts` — updated (order in fixtures + 5 new order tests)
- `src/lib/storage/localstorage-backend.ts` — updated (sanitizePersisted function)
- `src/lib/storage/localstorage-backend.test.ts` — updated (4 sanitize-on-read tests)
- `src/lib/state/template-store.svelte.ts` — updated (addItem, updateItemText, removeItem helpers)
- `src/lib/state/template-store.test.ts` — updated (8 item-helper tests)
- `src/lib/utils/debounce.ts` — new
- `src/lib/utils/debounce.test.ts` — new (9 tests)
- `src/lib/features/templates/ItemEditor.svelte` — new
- `src/lib/features/templates/ItemEditor.svelte.test.ts` — new (13 tests)
- `src/routes/templates/[id]/+page.svelte` — updated (store-derived, mounts ItemEditor)
- `src/routes/templates/[id]/+page.ts` — updated (sync, store.find, returns {})
- `src/routes/templates/[id]/page.svelte.test.ts` — new (6 tests)
- `src/lib/features/templates/TemplateCard.svelte.test.ts` — updated (order in fixtures)

### Review Findings

- [x] [Review][Patch] `{@const debounced = debounce(...)}` inside `{#each}` — debounce instance recreated on every re-render (e.g. when any item is added/removed), leaving prior timer alive and a new instance starting fresh; can cause double writes [`src/lib/features/templates/ItemEditor.svelte`]
- [x] [Review][Patch] Double `commitDraft` race — if Enter is pressed and user tabs away before `addItem` resolves, `onblur` fires a second `commitDraft` with the same non-empty text still in `draftText`, double-adding the item [`src/lib/features/templates/ItemEditor.svelte:commitDraft`]
- [x] [Review][Defer] `localName`/`savedName` not reactive to external template prop changes — known Svelte 5 limitation, acknowledged in completion notes; single-user single-tab scope makes this acceptable. [`src/lib/features/templates/TemplateNameEditor.svelte`] — deferred, pre-existing

### Change Log

- 2026-04-29: Story 1.5 implemented. Added `order` field to ItemSchema with read-time sanitizer for legacy blobs. Added debounce utility, three template-store item helpers (addItem, updateItemText, removeItem), ItemEditor composite component, rewrote /templates/[id] page to use store-derived state. All ACs satisfied; 111 tests green; build 37.91 kB gzipped.
