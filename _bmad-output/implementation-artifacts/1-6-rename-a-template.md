# Story 1.6: Rename a template

Status: done

## Story

**As Maya,**
**I want** to rename an existing template,
**So that** the label tracks how my procedure evolves. (FR5)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]` for an existing template, **when** I edit the template name field, **then** the change is debounced (≤ 500 ms) and persisted via `storage.saveTemplate()` with `updatedAt` refreshed, **and** the new name renders on the template list page on next visit.

**AC #2.** **Given** I rename to an empty string, **then** the rename is rejected via the Valibot schema, **and** an inline error renders, **and** the previous name is restored on blur.

**AC #3.** **Given** I rename to a string longer than 200 chars, **then** the rename is rejected via the Valibot schema, **and** an inline error renders.

## Tasks / Subtasks

- [x] **Task 1: `TemplateNameEditor.svelte` — inline editable name field with debounce + validation.** (AC: all)
  - [x] New file: `src/lib/features/templates/TemplateNameEditor.svelte`.
  - [x] **Props:** `{ template: Template }`. Read-only from component's perspective; mutations go through the store.
  - [x] **Local state:**
    - `localName = $state(template.name)` — tracks the input value optimistically.
    - `error = $state<string | null>(null)` — current validation error message, null when clean.
    - `savedName` — a `let` variable (NOT reactive state) initialized to `template.name` that tracks the last successfully persisted name. Used to restore on blur when invalid.
  - [x] **Validation helper** (inline, not exported):
    ```ts
    function validateName(raw: string): string | null {
        const trimmed = raw.trim();
        if (trimmed.length === 0) return 'Name is required';
        if (trimmed.length > 200) return 'Name must be 200 characters or fewer';
        return null;
    }
    ```
  - [x] **Debounced save** — 400 ms (below the 500 ms AC ceiling):
    ```ts
    const debouncedSave = debounce((raw: string) => {
        const trimmed = raw.trim();
        const err = validateName(raw);
        if (err) {
            error = err;
            return; // do NOT call store
        }
        error = null;
        savedName = trimmed;
        void updateTemplate({ ...template, name: trimmed });
    }, 400);
    ```
  - [x] **`oninput` handler:** update `localName`, call `debouncedSave(e.currentTarget.value)`. Clear `error` eagerly on each keystroke so the user sees the error disappear as they fix it.
  - [x] **`onblur` handler:**
    1. `debouncedSave.flush()` — fire any pending save immediately.
    2. After flush: if `error` is still set (means validation failed), restore `localName = savedName` and clear `error`.
  - [x] **Template:**
    ```svelte
    <div class="flex flex-col gap-1">
        <input
            type="text"
            value={localName}
            oninput={(e) => {
                localName = e.currentTarget.value;
                error = null;
                debouncedSave(localName);
            }}
            onblur={() => {
                debouncedSave.flush();
                if (error) {
                    localName = savedName;
                    error = null;
                }
            }}
            aria-label="Template name"
            aria-invalid={error !== null}
            aria-describedby={error ? 'name-error' : undefined}
            maxlength="200"
            class="text-2xl font-semibold rounded border border-transparent px-1 hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
        />
        {#if error}
            <p id="name-error" role="alert" class="text-sm text-red-600">{error}</p>
        {/if}
    </div>
    ```
  - [x] **Imports needed:** `import { updateTemplate } from '$lib/state/template-store.svelte'`, `import { debounce } from '$lib/utils/debounce'`, `import type { Template } from '$lib/schemas/template'`.
  - [x] **Do NOT re-validate on initial render** — only when the user interacts.

- [x] **Task 2: Wire `TemplateNameEditor` into `/templates/[id]/+page.svelte`.** (AC: all)
  - [x] Replace the static `<h1 class="text-2xl">{template.name}</h1>` with `<TemplateNameEditor {template} />`.
  - [x] Import `TemplateNameEditor from '$lib/features/templates/TemplateNameEditor.svelte'`.
  - [x] Keep the item-count line and `<ItemEditor>` mount unchanged.
  - [x] Updated page skeleton:
    ```svelte
    <script lang="ts">
        import { page } from '$app/state';
        import { getTemplates } from '$lib/state/template-store.svelte';
        import ItemEditor from '$lib/features/templates/ItemEditor.svelte';
        import TemplateNameEditor from '$lib/features/templates/TemplateNameEditor.svelte';

        const id = $derived(page.params.id);
        const template = $derived(getTemplates().find((t) => t.id === id));
    </script>

    {#if template}
        <TemplateNameEditor {template} />
        <p class="text-sm text-slate-600">
            {template.items.length} item{template.items.length === 1 ? '' : 's'}
        </p>
        <div class="mt-4">
            <ItemEditor {template} />
        </div>
    {/if}
    ```

- [x] **Task 3: Tests for `TemplateNameEditor.svelte`.** (AC: all)
  - [x] New file: `src/lib/features/templates/TemplateNameEditor.svelte.test.ts` (`.svelte.test.ts` suffix → client vitest project).
  - [x] **Mock pattern** — use `vi.hoisted()` (learned from 1.5):
    ```ts
    const { updateTemplate } = vi.hoisted(() => ({ updateTemplate: vi.fn() }));
    vi.mock('$lib/state/template-store.svelte', () => ({ updateTemplate }));
    ```
  - [x] **Test cases:**
    - **Renders** with the template name as the input value.
    - **Valid rename — debounce fires** — type "New name", advance fake timers 400 ms → `updateTemplate` called once with `{ ...template, name: 'New name' }` (and `updatedAt` changed).
    - **No call before debounce window** — type "X", advance 399 ms → `updateTemplate` NOT called; advance 1 more ms → called.
    - **Blur flushes debounce** — type "Flushed", blur immediately → `updateTemplate` called once.
    - **Trim on save** — type "  trimmed  ", advance 400 ms → `updateTemplate` called with `name: 'trimmed'`.
    - **Empty name — error shown** — clear input (value = ""), advance 400 ms → `updateTemplate` NOT called; error element with "Name is required" rendered.
    - **Empty name — restored on blur** — clear input, blur → `updateTemplate` NOT called; input value restored to original name; error cleared.
    - **Whitespace-only treated as empty** — type "   ", advance 400 ms → error "Name is required", `updateTemplate` not called.
    - **Error cleared on next keystroke** — set error state, then type → error disappears.
    - **`aria-invalid` true when error** — after empty submit, input has `aria-invalid="true"`.
    - **`maxlength` attribute is "200"** — input has `maxlength="200"`.
  - [x] Use `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`.
  - [x] Use `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.

- [x] **Task 4: Update `/templates/[id]/page.svelte.test.ts` for TemplateNameEditor presence.** (AC: #1)
  - [x] Update the mock for `$lib/state/template-store.svelte` to also include `updateTemplate: vi.fn()`.
  - [x] Update the test "renders the template name as h1" — now the name is an `<input>` not an `<h1>`. Change to `screen.getByLabelText('Template name')` and assert its `value` is the template name.
  - [x] Keep the item-count and ItemEditor mount assertions unchanged.

- [x] **Task 5: Verify full pipeline.** (AC: all)
  - [x] `npm run check` — 0 errors.
  - [x] `npm run lint` — clean.
  - [x] `npm test` — all pass (111 prior + new tests).
  - [x] `npm run build` — succeeds.
  - [x] `npm run size-limit` — still under 150 kB (delta expected < 2 kB).

## Dev Notes

### Architecture constraints (must follow)

- **Route ALL writes through `updateTemplate(t: Template)`** — already in the store, already refreshes `updatedAt`, already persists. Do NOT call `storage().saveTemplate()` directly from the component.
- `updateTemplate` signature: `async function updateTemplate(t: Template): Promise<void>`. It sets `updatedAt: nowIso()` internally before saving, so pass the full template with the new name; updatedAt will be overwritten.
- `debounce(fn, ms)` is at `$lib/utils/debounce` — same utility used by `ItemEditor`.
- **No new store helpers needed** — `updateTemplate` is the correct primitive.
- **No schema changes** — `TemplateSchema.name` already has `minLength(1)` and `maxLength(200)`.

### Stack (locked)

- Svelte 5 runes — `$state`, `$props`, `$derived`. No `svelte/store`.
- SvelteKit 2 + adapter-static. `ssr=false; prerender=false` for `/templates/[id]`.
- Tailwind v4 — utility classes only, match existing visual language.
- Valibot 1.x — for schema validation reference only; no new schemas.
- No new dependencies.

### Restoration semantics (AC #2)

`savedName` tracks the last successfully persisted name. On blur with error: `localName = savedName`. This means:
- If the user never successfully saved a rename in this session, `savedName = template.name` (the prop value at mount time).
- If the user successfully renamed "Alpha" → "Beta" and the store updated, then clears to "", `savedName` is "Beta" (the last good save), so blur restores "Beta".

**Important:** `savedName` must NOT be `$state` — it is an implementation detail, not UI state. Declare as `let savedName = template.name`.

### Debounce flush on blur — order of operations

1. `debouncedSave.flush()` — this synchronously invokes the debounced fn with the latest queued args (if any), which either saves or sets `error`.
2. After flush, check `error` — if set, restore and clear.

This order matters: flush first so that a valid pending save commits before blur resolves, and invalid pending saves surface their error so the blur handler can catch and restore.

### `{@const}` caveat from 1.5

`{@const debounced = debounce(...)}` inside `{#each}` is stable per keyed row in Svelte 5. For `TemplateNameEditor`, there is no `{#each}` — the debounce instance is created once at script level and is stable for the component's lifetime.

### Test file naming

- `TemplateNameEditor.svelte.test.ts` — `.svelte.test.ts` suffix → runs in the client vitest project (jsdom). No `+` prefix.
- `page.svelte.test.ts` in `src/routes/templates/[id]/` — already exists; update in-place.

### Previous story intelligence (1.5)

1. `vi.hoisted()` required for mock variable declarations in `vi.mock` factory — plain `const fn = vi.fn()` before `vi.mock()` fails with hoisting error.
2. `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` for fake-timer + userEvent compatibility.
3. `bind:this={el}` requires `let el: HTMLInputElement | null = $state(null)` in runes mode.
4. Test file naming under `src/routes/`: no `+` prefix.
5. `TemplateCard.svelte.test.ts` items fixtures need `order` — already fixed in 1.5.

### Files modified

| Path | Action | What changes |
|---|---|---|
| `src/lib/features/templates/TemplateNameEditor.svelte` | NEW | Inline editable name with debounce + validation |
| `src/lib/features/templates/TemplateNameEditor.svelte.test.ts` | NEW | Component tests (~12 cases) |
| `src/routes/templates/[id]/+page.svelte` | UPDATE | Replace `<h1>` with `<TemplateNameEditor>` |
| `src/routes/templates/[id]/page.svelte.test.ts` | UPDATE | Fix name assertion + add updateTemplate mock |

### Out of scope

- No delete button (story 1.7).
- No navigation away on rename.
- No autofocus on mount — user must click into the name.
- No "save" button — debounce + blur handles all persistence.
- No character counter UI — `maxlength` attribute is the hard cap.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Used `tick()` from `svelte` in tests after `vi.advanceTimersByTime()` — Svelte reactive state changes from synchronous timer callbacks need a microtask flush before DOM assertions.
- Two `state_referenced_locally` warnings from Svelte (advisory, not errors): `localName` and `savedName` intentionally capture initial prop value for local editing state. Check exits 0.

### Completion Notes List

- All 5 tasks complete. 12 new tests added (TemplateNameEditor: 12, page test updated). 123 total, all passing.
- Bundle delta: +0.04 kB gzipped (37.95 kB vs 37.91 kB baseline).
- `updateTemplate` already existed in the store — no new store helper needed.
- `savedName` tracks last successfully persisted name for blur restoration.

### File List

- `src/lib/features/templates/TemplateNameEditor.svelte` — new
- `src/lib/features/templates/TemplateNameEditor.svelte.test.ts` — new (12 tests)
- `src/routes/templates/[id]/+page.svelte` — updated (mounts TemplateNameEditor)
- `src/routes/templates/[id]/page.svelte.test.ts` — updated (name input assertion, updateTemplate mock)

### Review Findings

- [x] [Review][Patch] `void updateTemplate(...)` swallows `StorageError`. **Fixed.** — QUOTA_EXCEEDED / UNAVAILABLE on rename gives user no feedback; name appears saved but wasn't persisted (violates AC#2 spirit) [`src/lib/features/templates/TemplateNameEditor.svelte:debouncedSave`]
- [x] [Review][Defer] `savedName` initialised at mount only — if template prop changes externally, blur-restore uses stale name; single-user/single-tab scope; acceptable. [`src/lib/features/templates/TemplateNameEditor.svelte`] — deferred, pre-existing

### Change Log

- 2026-04-29: Story 1.6 implemented. Inline editable template name with 400ms debounce, Valibot validation (empty/>200), inline error rendering, blur restoration. All ACs satisfied; 123 tests green; build 37.95 kB gzipped.
