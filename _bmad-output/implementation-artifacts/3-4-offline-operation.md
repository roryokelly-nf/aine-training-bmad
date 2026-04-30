# Story 3.4: Full offline operation after first load

Status: in-progress

## Story

**As Maya,**
**I want** the app to work fully offline once the static assets have loaded,
**So that** I can run my procedures on a flight, in a basement, or any time my connection drops. (NFR8)

## Acceptance Criteria

**AC #1.** **Given** the static build is loaded once with network connectivity, **when** I subsequently disconnect, **then** I can navigate between all routes, create/edit/delete templates, and start/tick/reset runs.

**AC #2.** **Given** the v1 build via `@sveltejs/adapter-static`, **when** the app is running, **then** no `fetch()` calls are made to external services, and no third-party CDN, analytics, or font calls happen at runtime.

**AC #3.** **Given** an E2E test at `tests/e2e/offline.spec.ts`, **when** the test loads the app, sets the browser context offline, then performs a full create → run → tick → go-state → reset cycle, **then** every assertion passes.

## Tasks / Subtasks

- [x] **Task 1: Verify no external fetch calls exist.** (AC: #2)
  - [x] Grep `src/` for `fetch`, CDN URLs, external font or analytics references — none found. No code change needed.
  - [x] `app.html` has no third-party scripts or stylesheet links. Tailwind is bundled at build time.

- [x] **Task 2: Write E2E offline test.** (AC: #1, #3)
  - [x] New file `tests/e2e/offline.spec.ts`.
  - [x] `beforeEach`: go to `/`, clear localStorage, reload.
  - [x] Test: load app → go offline via `page.context().setOffline(true)` → full create → run → tick all items → verify go-state → reset → verify back on template page.

- [x] **Task 3: Verify pipeline.**
  - [x] `npm run check` / `lint` / `test` all pass.
  - [x] `npm run test:e2e` — offline test passes.

## Dev Notes

### AC #1 and #2 are already satisfied
The v1 app is a static SPA with `@sveltejs/adapter-static`. All storage goes through `LocalStorageBackend` (no network). No `fetch()` calls in app source. No external fonts, analytics, or CDN links in `app.html`. No code changes needed — this AC is proven by the E2E test.

### Playwright offline mode
`page.context().setOffline(true)` simulates full network disconnection at the browser-context level. All resource loading, fetch, and XHR are blocked. Since the SPA is already loaded, only new navigations that would fetch resources would fail — SvelteKit's client-side routing uses the already-loaded JS bundle, so all routes work.

### Files
| Path | Action |
|---|---|
| `tests/e2e/offline.spec.ts` | NEW |

## Dev Agent Record
### Agent Model Used
claude-sonnet-4-6
### Debug Log References
### Completion Notes List
### File List
### Change Log
