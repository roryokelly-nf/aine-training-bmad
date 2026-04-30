# Story 3.1: Persistence durability across sessions

Status: review

## Story

**As Maya,**
**I want** my templates and active run state to survive browser reloads, tab closes, and overnight sleeps without loss,
**So that** the app is trustworthy enough to use for real procedures. (FR17, FR18, NFR6)

## Acceptance Criteria

**AC #1.** **Given** I have one or more saved templates, **when** I close the browser tab and reopen it, **then** all templates render on `/templates` with the exact `name`, `items`, and `updatedAt` they had at close.

**AC #2.** **Given** I have an active run with partial tick state, **when** I close the browser tab and reopen it, **then** the run renders on `/templates/[id]/run` with the exact tick state it had at close.

**AC #3.** **Given** I reload the page mid-edit, **then** any change persisted before reload is recoverable; any change still in the debounce window is lost (accepted, documented behavior).

**AC #4.** **Given** the app reads a persisted blob with `schemaVersion: 1`, **when** the current code's schema version is also `1`, **then** the blob parses successfully.

**AC #5.** **Given** the app reads a persisted blob with an unknown future `schemaVersion` (e.g., `2`), **when** parsing, **then** the blob is treated as invalid, logged to console, skipped from state, **and** a toast renders: "Some data couldn't be loaded — it may be from a newer version of this app." **and** the user is not blocked from creating new templates.

**AC #6.** **Given** an E2E Playwright test at `tests/e2e/persistence.spec.ts`, **when** the test creates a template, ticks half a run, reloads the page, and reads back state, **then** the asserted state matches exactly (verifies NFR6 zero-data-loss).

## Tasks / Subtasks

- [x] **Task 1: Add `storage-events.ts` module for future-schema signalling.** (AC: #5)
  - [x] New file `src/lib/storage/storage-events.ts` with `signalFutureSchema`, `consumeFutureSchemaWarning`, `_resetFutureSchemaForTests`.
  - [x] Export `consumeFutureSchemaWarning` from `src/lib/storage/index.ts`.

- [x] **Task 2: Detect future schemaVersion in LocalStorageBackend.** (AC: #5)
  - [x] Import `signalFutureSchema` in `localstorage-backend.ts`.
  - [x] In `getTemplates()`, pre-check `schemaVersion > 1` before Valibot parse; call `signalFutureSchema()` and `continue`.

- [x] **Task 3: Surface future-schema toast in layout.** (AC: #5)
  - [x] In `+layout.ts`, call `consumeFutureSchemaWarning()` after `loadTemplates()` and show `toastStore.info(...)` if true.
  - [x] `toastStore.info()` already exists — no changes needed to toast store.

- [x] **Task 4: Unit tests for future-schema detection.** (AC: #5)
  - [x] Added `_resetFutureSchemaForTests()` to all `beforeEach` blocks in `localstorage-backend.test.ts`.
  - [x] New describe "LocalStorageBackend (future schema version)": 2 tests (skips v2 blob + signals warning; loads v1 normally + no warning).

- [x] **Task 5: Install Playwright and configure.** (AC: #6)
  - [x] Installed `@playwright/test` devDependency.
  - [x] Created `playwright.config.ts` with chromium project + webServer.
  - [x] Added `"test:e2e": "playwright test"` to `package.json` scripts.
  - [x] Created `tests/e2e/` directory.
  - [x] Added ESLint override for `tests/e2e/**` to allow direct `localStorage` access (runs in browser via `page.evaluate`).

- [x] **Task 6: Write E2E persistence test.** (AC: #1, #2, #6)
  - [x] `tests/e2e/persistence.spec.ts`: 2 tests.
  - [x] "template name and items persist across page reload" — create template + item, reload, verify.
  - [x] "run tick state persists across page reload" — create template + 2 items, start run, tick step 1, reload, verify tick state preserved. Uses `expect(page.getByText('1 of 2')).toBeVisible()` as stability anchor before asserting aria-pressed.

- [x] **Task 7: Verify pipeline.**
  - [x] `npm run check` — 0 errors (2 pre-existing TemplateNameEditor warnings).
  - [x] `npm run lint` — clean.
  - [x] `npm test` — 194/194 unit tests passing.
  - [x] `npm run build` — succeeds.
  - [x] `npm run size-limit` — 41.41 kB gzipped (under 150 kB).
  - [x] `npm run test:e2e` — 2/2 E2E tests passing.

## Dev Notes

### AC #1–#4 already satisfied
The existing `+layout.ts` calls `loadTemplates()` on every boot. `/run/+page.ts` calls `loadRun(params.id)`. Templates and runs already persist — no new code needed.

### Future-schema detection design
`storage-events.ts` is a module-level flag store to avoid changing the `StorageBackend` interface. `localstorage-backend.ts` imports `signalFutureSchema` from it; `+layout.ts` imports `consumeFutureSchemaWarning` (re-exported via `index.ts`). The pre-check (`schemaVersion > 1` before Valibot parse) gives clean logging rather than relying on Valibot's error message.

### E2E stability anchor
After `page.reload()`, the run page hydrates async. Asserting `aria-pressed="true"` on an item immediately may catch the pre-hydration render (when `run` is still being loaded). Waiting for `'1 of 2'` text (the "X of Y" counter) confirms the run is fully loaded before asserting tick state.

### Files
| Path | Action |
|---|---|
| `src/lib/storage/storage-events.ts` | NEW |
| `src/lib/storage/localstorage-backend.ts` | UPDATE (future-schema detection + signalFutureSchema) |
| `src/lib/storage/index.ts` | UPDATE (re-export consumeFutureSchemaWarning) |
| `src/routes/+layout.ts` | UPDATE (consume future-schema warning + toast) |
| `src/lib/storage/localstorage-backend.test.ts` | UPDATE (2 new tests + resetFutureSchema in beforeEach) |
| `playwright.config.ts` | NEW |
| `package.json` | UPDATE (@playwright/test devDep + test:e2e script) |
| `eslint.config.js` | UPDATE (no-restricted-globals off for tests/e2e/**) |
| `tests/e2e/persistence.spec.ts` | NEW |

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- E2E tick-state test initially failed after `page.reload()` — run page hydrates async, `aria-pressed` checked before run loaded. Fixed by waiting for `'1 of 2'` counter text before asserting.
- ESLint `no-restricted-globals` error on `localStorage` inside `page.evaluate()` callback — added ESLint override for `tests/e2e/**` (correct: runs in browser context, not app code).

### Completion Notes List
- 194 unit tests passing (18 files). 2 new: future-schema backend tests.
- 2 E2E tests passing (Playwright + Chromium). Template and run tick state persistence verified.
- Future-schema toast: `consumeFutureSchemaWarning()` called in layout after `loadTemplates()`. Uses module-level flag to avoid StorageBackend interface change.
- 41.41 kB gzipped (under 150 kB budget).

### File List
- `src/lib/storage/storage-events.ts` — new
- `src/lib/storage/localstorage-backend.ts` — updated (future-schema pre-check + signalFutureSchema import)
- `src/lib/storage/index.ts` — updated (re-export consumeFutureSchemaWarning)
- `src/routes/+layout.ts` — updated (consumeFutureSchemaWarning + toastStore.info)
- `src/lib/storage/localstorage-backend.test.ts` — updated (2 new tests + _resetFutureSchemaForTests in beforeEach)
- `playwright.config.ts` — new
- `package.json` — updated (@playwright/test + test:e2e script)
- `eslint.config.js` — updated (E2E tests localStorage override)
- `tests/e2e/persistence.spec.ts` — new

### Change Log
- 2026-04-30: Story 3.1 implemented. Future-schema toast detection + Playwright E2E setup + persistence tests. 194 unit + 2 E2E tests green. 41.41 kB gzipped.
