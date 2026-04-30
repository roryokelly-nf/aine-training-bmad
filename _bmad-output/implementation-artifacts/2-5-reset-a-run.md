# Story 2.5: Reset a run and re-instantiate

Status: done

## Story

**As Maya,**
**I want** to reset an active run to wipe tick state and start fresh from the same template,
**So that** I can re-use the same procedure next time without rebuilding the list. (FR14, FR15)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]/run` with an active run (any tick state), **when** I click "Reset", **then** a `ConfirmModal` opens with copy: "Reset this run? Tick state will be cleared." **and** focus is trapped within the dialog.

**AC #2.** **Given** the reset confirmation is open, **when** I confirm, **then** the run is cleared via `storage.clearRun(templateId)`, I am navigated to `/templates/[id]`, **and** a toast renders: "Run reset."

**AC #3.** **Given** the reset confirmation is open, **when** I cancel or press Esc, **then** the dialog closes, the run is not reset, **and** I remain on `/templates/[id]/run`.

**AC #4.** **Given** I have just reset a run, **when** I click "Run" on `/templates/[id]`, **then** a fresh run is instantiated (no replace-run confirmation) **and** I am navigated to `/templates/[id]/run` with all items unticked.

**AC #5.** **Given** the run is in the go-state, **when** I view the run page, **then** the "Reset" button is rendered prominently as the primary path back to a fresh run.

## Tasks / Subtasks

- [x] **Task 1: Add `resetRun` to run store.** (AC: #2, #4)
  - [x] In `src/lib/state/run-store.svelte.ts`, add `resetRun(templateId)`.
  - [x] Add to `run-store.test.ts`: 2 tests (clears from storage backend, sets activeRun to null).

- [x] **Task 2: Add Reset button and ConfirmModal to run page.** (AC: #1, #2, #3, #5)
  - [x] Import `resetRun`, `goto`, `ConfirmModal` in `+page.svelte`.
  - [x] `showResetModal` state + `handleResetConfirm` with error handling.
  - [x] Reset button below checklist — primary style in go-state, ghost in-progress.
  - [x] `ConfirmModal` wired to `showResetModal`.

- [x] **Task 3: Tests for reset on run page.** (AC: #1, #2, #3, #5)
  - [x] `resetRunMock`, `gotoMock`, `toastSuccessMock` added to mocks.
  - [x] 5 reset tests: renders, opens modal, confirm calls resetRun+toast+goto, cancel no-op, primary style in go-state.
  - [x] Fixed `within(dialog)` to distinguish page Reset from modal Reset button.

- [x] **Task 4: Verify pipeline.**
  - [x] `npm run check` — 0 errors (2 pre-existing TemplateNameEditor warnings).
  - [x] `npm run lint` — clean.
  - [x] `npm test` — 192/192 passing (fixed jsdom→happy-dom migration: `localStorage` spy, 3 pre-existing backend tests updated).
  - [x] `npm run build` — succeeds.
  - [x] `npm run size-limit` — 41.26 kB gzipped (under 150 kB).

## Dev Notes

### `resetRun` vs `clearActiveRun`
- `clearActiveRun()` (existing): clears in-memory `activeRun` only — does NOT touch storage. Used when navigating away normally.
- `resetRun(templateId)` (new): calls `storage().clearRun(templateId)` to remove the run from localStorage, THEN sets `activeRun = null`. This is the destructive action Maya confirms.

### AC #4 is automatic
After `storage.clearRun(templateId)`, `getActiveRun(templateId)` returns `null`. The template detail page `$effect` re-runs `loadRun(id)` on mount, setting `existingRun = null`, so the Run button shows without a replace-run modal. No extra code needed.

### ConfirmModal reuse
The existing `src/lib/components/ConfirmModal.svelte` handles focus trapping and Esc key. Props: `open`, `title`, `description`, `confirmLabel`, `onconfirm`, `oncancel`. Reuse as-is.

### Test environment fix
Switched from `jsdom` (broken: `html-encoding-sniffer@6` + `@exodus/bytes@1.15` ESM conflict under Node 20.15) to `happy-dom`. Fixed 3 `LocalStorageBackend` tests that used `Storage.prototype.setItem` spy — happy-dom's localStorage doesn't inherit from `Storage.prototype`, so spy was changed to target `localStorage.setItem` directly.

### Files
| Path | Action |
|---|---|
| `src/lib/state/run-store.svelte.ts` | UPDATE (add resetRun) |
| `src/lib/state/run-store.test.ts` | UPDATE (2 new tests) |
| `src/routes/templates/[id]/run/+page.svelte` | UPDATE (Reset button + ConfirmModal) |
| `src/routes/templates/[id]/run/page.svelte.test.ts` | UPDATE (5 new tests + within fix) |
| `src/lib/storage/localstorage-backend.test.ts` | UPDATE (3 spy fixes for happy-dom) |
| `vite.config.ts` | UPDATE (jsdom → happy-dom) |
| `package.json` | UPDATE (add happy-dom, overrides stub) |

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- `within(dialog)` needed in confirm test because both the page Reset button and the modal confirm button have name "Reset" — scoped query resolves the ambiguity.
- happy-dom `localStorage` doesn't use `Storage.prototype` as prototype — `vi.spyOn(Storage.prototype, 'setItem')` doesn't intercept calls. Changed to `vi.spyOn(localStorage, 'setItem')`.

### Completion Notes List
- 192 tests passing (18 test files). 7 new tests: 2 `resetRun` store + 5 run page reset.
- Fixed jsdom→happy-dom migration: 3 LocalStorageBackend spy tests updated.
- `resetRun` calls `storage().clearRun(templateId)` + sets `activeRun = null`.
- Reset button: ghost style in-progress, `bg-slate-900` primary in go-state.
- 41.26 kB gzipped (under 150 kB budget).

### File List
- `src/lib/state/run-store.svelte.ts` — updated (resetRun)
- `src/lib/state/run-store.test.ts` — updated (2 resetRun tests)
- `src/routes/templates/[id]/run/+page.svelte` — updated (Reset button, ConfirmModal, handleResetConfirm)
- `src/routes/templates/[id]/run/page.svelte.test.ts` — updated (5 reset tests + within fix)
- `src/lib/storage/localstorage-backend.test.ts` — updated (3 spy fixes)
- `vite.config.ts` — updated (jsdom → happy-dom)
- `package.json` — updated (happy-dom devDep, overrides stub)

### Change Log
- 2026-04-30: Story 2.5 implemented. resetRun + Reset button with ConfirmModal on run page. 192 tests green; 41.26 kB gzipped. Also fixed jsdom→happy-dom migration (3 LocalStorageBackend spy tests).

## Review Findings

- [x] [Review][Patch] `handleResetConfirm` `!run` guard doesn't close modal — if `run` is null at confirm time (edge case: another tab cleared the run mid-interaction), the modal stays open with no programmatic close. Fix: `if (!run) { showResetModal = false; return; }` [`src/routes/templates/[id]/run/+page.svelte:43`]
