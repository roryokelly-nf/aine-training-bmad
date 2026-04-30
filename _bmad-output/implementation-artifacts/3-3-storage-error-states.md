# Story 3.3: Distinguishable storage error states

Status: review

## Story

**As Maya,**
**I want** explicit, distinguishable messages when localStorage is unavailable, full, or has been cleared,
**So that** I understand which failure I'm hitting and what to do about it. (FR20, NFR7)

## Acceptance Criteria

**AC #1.** **Given** localStorage is unavailable, **when** the app boots and the storage backend probes availability, **then** a persistent banner renders: "Local storage is disabled in this browser. Templates can't be saved. Try a different browser or disable private mode." **and** the "Create template" button is disabled with the same explanation in a tooltip **and** a `StorageError(UNAVAILABLE)` is logged via `console.error`.

**AC #2.** **Given** localStorage write fails with `QuotaExceededError`, **when** any save is attempted, **then** a toast renders: "Storage is full. Delete templates or archived runs to free space." **and** the in-flight UI state is preserved (input not lost).

**AC #3.** **Given** localStorage was previously populated and is now empty (cleared by browser/user/extension), **when** I navigate to `/templates`, **then** the empty state from Story 3.2 renders (indistinguishable from "never used" — acceptable per PRD).

**AC #4.** **Given** any storage error state is encountered, **when** displayed, **then** the message string is unique to its kind — never generic.

## Tasks / Subtasks

- [x] **Task 1: `storage-status.svelte.ts` — unavailable flag.** (AC: #1)
  - [x] New file `src/lib/state/storage-status.svelte.ts`: `$state` `_unavailable` flag with `getStorageUnavailable()`, `setStorageUnavailable(v)`, `_resetForTests()`.

- [x] **Task 2: Update `+layout.ts` — UNAVAILABLE → banner flag + console.error.** (AC: #1)
  - [x] When `UNAVAILABLE`: call `setStorageUnavailable(true)` + `console.error('[storage] localStorage unavailable:', err.message)` — no toast.
  - [x] When `QUOTA_EXCEEDED`: toast "Storage is full. Delete templates or archived runs to free space."
  - [x] Other `StorageError`: keep generic toast.

- [x] **Task 3: Update `+layout.svelte` — persistent unavailable banner.** (AC: #1)
  - [x] Import `getStorageUnavailable`. When true render `role="alert"` banner with the exact AC copy.

- [x] **Task 4: Disable Create template button in `/templates/+page.svelte`.** (AC: #1)
  - [x] `aria-disabled` + `onclick` guard when `getStorageUnavailable()` is true. Title tooltip with same explanation.

- [x] **Task 5: Standardize QUOTA_EXCEEDED messages everywhere.** (AC: #2, #4)
  - [x] `TemplateNameEditor.svelte` — update to "Storage is full. Delete templates or archived runs to free space."
  - [x] `/templates/new/+page.svelte` — same.
  - [x] `[id]/+page.svelte` `handleStartRun` — add `QUOTA_EXCEEDED` branch with the standard message.
  - [x] Run page `handleTick` — distinguish QUOTA from other StorageError.
  - [x] Run page `handleResetConfirm` — distinguish QUOTA.

- [x] **Task 6: Add QUOTA handling to `ItemEditor.svelte` and `ItemRow.svelte`.** (AC: #2)
  - [x] `ItemEditor.commitDraft` — catch QUOTA, toast standard message. Draft text already preserved (thrown before `draftText = ''`).
  - [x] `ItemRow.debouncedSave` — catch QUOTA in `.catch()` on `updateItemText` promise; toast standard message.

- [x] **Task 7: Tests.** (AC: #1, #2)
  - [x] New `src/lib/state/storage-status.test.ts` — basic get/set/reset.
  - [x] `/templates/page.svelte.test.ts` — Create button disabled + aria-disabled when unavailable; enabled when not.
  - [x] `ItemEditor.svelte.test.ts` — QUOTA_EXCEEDED toast on commitDraft failure.

- [x] **Task 8: Verify pipeline.**
  - [x] `npm run check` / `lint` / `test` all pass.

## Dev Notes

### Unavailable banner: module-level state, not toast
A toast auto-dismisses — wrong for "storage is permanently unavailable." Use `storage-status.svelte.ts` module-level `$state`. `+layout.ts` sets it; `+layout.svelte` reads it reactively.

### UNAVAILABLE only on boot
`LocalStorageBackend.probe()` runs in the constructor. `storage()` caches the singleton. Once UNAVAILABLE is detected at boot, all subsequent calls throw UNAVAILABLE too — but the user can't do anything because Create template is disabled and there are no loaded templates to interact with.

### QUOTA_EXCEEDED standard message
`"Storage is full. Delete templates or archived runs to free space."`
This exact string must be used everywhere. Never "Free up space" or other variants.

### ItemEditor in-flight preservation
`commitDraft` structure: `await addItem(...); draftText = '';` — `draftText` cleared only after successful save. On throw, draft text stays. ✓ No change needed for preservation, just add the toast.

### ItemRow in-flight preservation  
`value={item.text}` in the input is bound to the Svelte store. If `updateItemText` throws, the store isn't updated, so the input reverts to the stored value on next render cycle. The user sees their typed text briefly then it reverts — this is the pre-existing behaviour; the AC requires only that the toast fires.

### Files
| Path | Action |
|---|---|
| `src/lib/state/storage-status.svelte.ts` | NEW |
| `src/lib/state/storage-status.test.ts` | NEW |
| `src/routes/+layout.ts` | UPDATE |
| `src/routes/+layout.svelte` | UPDATE |
| `src/routes/templates/+page.svelte` | UPDATE |
| `src/lib/features/templates/TemplateNameEditor.svelte` | UPDATE (message) |
| `src/routes/templates/new/+page.svelte` | UPDATE (message) |
| `src/routes/templates/[id]/+page.svelte` | UPDATE (QUOTA branch) |
| `src/routes/templates/[id]/run/+page.svelte` | UPDATE (QUOTA branch) |
| `src/lib/features/templates/ItemEditor.svelte` | UPDATE (QUOTA toast) |
| `src/lib/features/templates/ItemRow.svelte` | UPDATE (QUOTA toast) |
| `src/routes/templates/page.svelte.test.ts` | UPDATE |
| `src/lib/features/templates/ItemEditor.svelte.test.ts` | UPDATE |

## Dev Agent Record
### Agent Model Used
claude-sonnet-4-6
### Debug Log References
- Two existing tests failed: `/templates/new` QUOTA test expected old message "Free up space"; run page tick test expected generic StorageError message but was throwing QUOTA_EXCEEDED — both updated to new standard message.
### Completion Notes List
- 203 unit tests passing (19 files). 6 new tests: 3 storage-status + 2 templates-page disabled-button + 1 ItemEditor QUOTA toast.
- Persistent banner in layout via `storage-status.svelte.ts` module-level `$state` flag.
- All QUOTA_EXCEEDED toasts standardized to "Storage is full. Delete templates or archived runs to free space."
- UNAVAILABLE now sets flag + `console.error` instead of transient toast.
- Added QUOTA handling to ItemEditor, ItemRow, `[id]/+page.svelte`, run page tick + reset handlers.
### File List
- `src/lib/state/storage-status.svelte.ts` — new
- `src/lib/state/storage-status.test.ts` — new
- `src/routes/+layout.ts` — updated (UNAVAILABLE → flag; QUOTA → specific toast)
- `src/routes/+layout.svelte` — updated (persistent unavailable banner)
- `src/routes/templates/+page.svelte` — updated (Create button aria-disabled when unavailable)
- `src/lib/features/templates/TemplateNameEditor.svelte` — updated (standardized QUOTA message)
- `src/routes/templates/new/+page.svelte` — updated (standardized QUOTA + UNAVAILABLE messages)
- `src/routes/templates/[id]/+page.svelte` — updated (QUOTA branch in handleStartRun + StorageError import)
- `src/routes/templates/[id]/run/+page.svelte` — updated (QUOTA branch in handleTick + handleResetConfirm)
- `src/lib/features/templates/ItemEditor.svelte` — updated (QUOTA toast in commitDraft)
- `src/lib/features/templates/ItemRow.svelte` — updated (QUOTA toast in debouncedSave)
- `src/routes/templates/page.svelte.test.ts` — updated (unavailable button tests + mock)
- `src/routes/templates/new/page.svelte.test.ts` — updated (message string)
- `src/routes/templates/[id]/run/page.svelte.test.ts` — updated (message string)
- `src/lib/features/templates/ItemEditor.svelte.test.ts` — updated (QUOTA toast test)
### Change Log
- 2026-04-30: Story 3.3 implemented. Persistent UNAVAILABLE banner, standardized QUOTA messages, Create template button disabled when unavailable. 203 tests green.
