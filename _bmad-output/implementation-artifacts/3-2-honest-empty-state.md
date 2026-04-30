# Story 3.2: Honest empty-state messaging

Status: review

## Story

**As Maya,**
**I want** the empty state to tell me clearly that templates are stored per-browser and don't sync,
**So that** I don't rage-quit when I open the app in a new browser and see nothing. (FR19 — Journey 1B)

## Acceptance Criteria

**AC #1.** **Given** localStorage is available and contains zero templates, **when** I navigate to `/templates`, **then** the `EmptyState` renders with:
- Primary: "No templates yet on this browser."
- Secondary (muted): "Templates are stored locally on each browser — they don't sync across browsers in this version. Sync between browsers is on the roadmap."
- A "Create template" button as the primary CTA.

**AC #2.** **Given** the empty state copy, **when** rendered, **then** the copy explicitly distinguishes "no templates yet on this browser" from "your data is gone."

**AC #3.** **Given** at least one template is saved, **when** I navigate to `/templates`, **then** the empty-state copy does NOT render.

## Tasks / Subtasks

- [x] **Task 1: Add `secondary` prop to `EmptyState.svelte`.** (AC: #1)
  - [x] Add optional `secondary?: string` prop.
  - [x] Render below primary `<p>` when provided: `<p class="text-sm text-slate-500">{secondary}</p>`.

- [x] **Task 2: Update `/templates/+page.svelte` with new copy.** (AC: #1, #2, #3)
  - [x] Pass `message="No templates yet on this browser."` to EmptyState.
  - [x] Pass `secondary="Templates are stored locally on each browser — they don't sync across browsers in this version. Sync between browsers is on the roadmap."`.

- [x] **Task 3: Update tests.** (AC: #1, #2, #3)
  - [x] `EmptyState.svelte.test.ts` — add test for secondary message rendering.
  - [x] `page.svelte.test.ts` — update "exact copy" test to new primary copy; add test for secondary message.

- [x] **Task 4: Verify pipeline.**
  - [x] `npm run check` — 0 errors.
  - [x] `npm run lint` — clean.
  - [x] `npm test` — all pass.

## Dev Notes

### EmptyState is a leaf primitive — only add `secondary`
`EmptyState.svelte` is in `lib/components/` (cross-feature primitives). It doesn't import from features. Adding `secondary?: string` is the minimum change — no redesign.

### Files
| Path | Action |
|---|---|
| `src/lib/components/EmptyState.svelte` | UPDATE (add secondary prop) |
| `src/routes/templates/+page.svelte` | UPDATE (new copy) |
| `src/lib/components/EmptyState.svelte.test.ts` | UPDATE (secondary test) |
| `src/routes/templates/page.svelte.test.ts` | UPDATE (copy + secondary tests) |

## Dev Agent Record
### Agent Model Used
claude-sonnet-4-6
### Debug Log References
- Prettier flagged `test-results/.last-run.json` (Playwright artifact) — added `/test-results/` and `/playwright-report/` to `.prettierignore`.
### Completion Notes List
- 197 unit tests passing (3 new: 2 EmptyState secondary + 1 page secondary copy). 0 type errors. Lint clean.
- `EmptyState.svelte` gained `secondary?: string` prop rendered in muted `text-slate-500` below primary.
- Template list empty state updated to per-browser-honest copy.
### File List
- `src/lib/components/EmptyState.svelte` — updated (secondary prop)
- `src/routes/templates/+page.svelte` — updated (new primary + secondary copy)
- `src/lib/components/EmptyState.svelte.test.ts` — updated (2 new secondary tests)
- `src/routes/templates/page.svelte.test.ts` — updated (copy tests + secondary test)
- `.prettierignore` — updated (Playwright artifacts)
### Change Log
- 2026-04-30: Story 3.2 implemented. Honest empty-state copy with per-browser secondary message. 197 tests green.
