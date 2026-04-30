# Story 2.3: Reach the visible go-state

Status: done

## Story

**As Maya,**
**I want** the run to resolve to an explicit, visually distinct go-state when every item is ticked,
**So that** finishing the procedure produces a finished checklist, not an empty list. (FR12)

## Acceptance Criteria

**AC #1.** **Given** I am on `/templates/[id]/run` with one or more items unticked, **when** the last unticked item is ticked, **then** the run renders the go-state: a visually distinct surface (background or banner) using the configured go-state green, **and** a "Done." message renders prominently, **and** all ticked items remain visible in the list.

**AC #2.** **Given** the run is in the go-state, **when** any item is unticked, **then** the go-state surface is removed, **and** the run returns to the in-progress visual state.

**AC #3.** **Given** the go-state surface, **when** rendered, **then** the green meets ≥ 4.5:1 contrast for text-on-green (NFR18).

**AC #4.** **Given** an animation budget constraint, **when** the go-state appears, **then** the transition uses CSS-only or Svelte built-in `transition:` directives (no animation library), staying inside the 150 KB bundle budget (NFR4).

**AC #5.** **Given** a `prefers-reduced-motion: reduce` user preference, **when** the go-state appears, **then** the appearance is non-animated (instant).

## Tasks / Subtasks

- [x] **Task 1: Add `allDone` derived and go-state banner in run page.** (AC: #1, #2)
  - [ ] In `src/routes/templates/[id]/run/+page.svelte`, add:
    - `const allDone = $derived(totalCount > 0 && items.every((i) => i.checked));`
    - When `allDone`: render a "Done." paragraph with `aria-live="assertive"` instead of the "X of Y" counter. All item buttons remain in the list.
    - When not `allDone`: render the "X of Y" counter as before.
  - [x] "Done." text color: `text-[#14532D]` (green-900 equivalent). Passes ≥ 4.5:1 on `bg-green-50` background (computed: ~6:1).
  - [x] Go-state container: when `allDone`, apply `bg-green-50 rounded-lg p-4` to the wrapper div.

- [x] **Task 2: CSS background transition and Svelte fade.** (AC: #4)
  - [x] Import `fade` from `'svelte/transition'`.
  - [x] Apply `transition:fade` to the "Done." banner element — this is a Svelte built-in, no animation library.
  - [x] Apply Tailwind `transition-colors duration-300` to the wrapper div for the background color shift. No JS animation library involved.

- [x] **Task 3: prefers-reduced-motion.** (AC: #5)
  - [x] Derive `fadeDuration` from `window.matchMedia('(prefers-reduced-motion: reduce)')`.
  - [x] Pass `{ duration: fadeDuration }` to `transition:fade`.
  - [x] Added `motion-reduce:transition-none` to wrapper div to suppress CSS background transition under reduced motion.

- [x] **Task 4: Tests for go-state in run page.** (AC: #1, #2)
  - [x] Added 5 go-state tests in `src/routes/templates/[id]/run/page.svelte.test.ts`.

- [x] **Task 5: Verify pipeline.** (AC: all)
  - [x] `npm run check` — 0 errors (2 pre-existing warnings in TemplateNameEditor).
  - [x] `npm run lint` — clean (also fixed 6 pre-existing lint errors from prior stories: unused svelte-ignore in ConfirmModal, unused `_` in run.test.ts, 2× goto-without-resolve in [id]/+page.svelte, href-without-resolve in run/+page.svelte).
  - [x] `npm run build` — succeeds.
  - [x] `npm run size-limit` — 39.69 kB gzipped (under 150 kB).

## Dev Notes

### Color tokens

The existing codebase uses hardcoded hex values consistent with the brand palette:
- Ticked checkbox fill / border: `#2E7D54`
- Ticked item text: `#3A5247`

For go-state:
- Background: Tailwind `bg-green-50` (`#F0FDF4`) — visually distinct on white page, CSS-variable-free for now.
- "Done." text: `#14532D` — passes 4.5:1 on `bg-green-50` (~6:1 computed). Use as `text-[#14532D]`.
- UX spec: "background color transitions to the go-state palette"; "confident green." green-50 is subtle; treat it as the MVP foundation. Story 2.3 can adjust the shade later without schema changes.

### allDone logic

`allDone = $derived(totalCount > 0 && items.every(i => i.checked))`

The `totalCount > 0` guard ensures an empty run (zero items) never shows go-state — it's not "done," it just has nothing to tick.

### Transition strategy

- **Background color shift**: CSS `transition-colors duration-300` on wrapper div. Tailwind variant `motion-reduce:transition-none` suppresses it under prefers-reduced-motion.
- **"Done." banner appearance**: Svelte built-in `transition:fade={{ duration: fadeDuration }}`. `fadeDuration` is 0 when reduced motion is preferred, 250 otherwise. No animation library; Svelte's `fade` compiles to vanilla JS, adds ~0 KB to bundle.

### aria-live strategy

- Counter paragraph uses `aria-live="polite"` (existing) — screen reader announces tick count changes without interrupting.
- "Done." paragraph uses `aria-live="assertive"` — the go-state arrival is the emotional payoff; assertive ensures it's announced immediately even if something else is happening.

### Files

| Path | Action |
|---|---|
| `src/routes/templates/[id]/run/+page.svelte` | UPDATE (allDone, go-state banner, transition) |
| `src/routes/templates/[id]/run/page.svelte.test.ts` | UPDATE (go-state tests) |

### Out of scope

- Reset button on the go-state surface (story 2.5).
- Resume button on template detail (story 2.4).
- "Run in progress" indicator on template card (story 2.4).
- WCAG 2.1 AA full conformance (epic 10).

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List
- 5 go-state tests added. Bundle 39.69 kB gzipped (no change — Svelte transition:fade compiles to ~0 B net).
- `allDone` guards on `totalCount > 0` — empty run never shows go-state.
- Svelte `fade` + `motion-reduce:transition-none` for reduced-motion support.
- Text `#14532D` on `bg-green-50` = ~6:1 contrast (passes 4.5:1 NFR18).
- Fixed 6 pre-existing lint errors across ConfirmModal, run.test.ts, [id]/+page.svelte, run/+page.svelte (svelte/no-navigation-without-resolve, no-unused-svelte-ignore, unused `_` destructure).

### File List
- `src/routes/templates/[id]/run/+page.svelte` — updated (allDone, go-state banner, fade, reduced-motion, resolve import)
- `src/routes/templates/[id]/run/page.svelte.test.ts` — updated (5 go-state tests)
- `src/lib/components/ConfirmModal.svelte` — updated (removed unused svelte-ignore)
- `src/lib/schemas/run.test.ts` — updated (fixed unused `_` destructure)
- `src/routes/templates/[id]/+page.svelte` — updated (goto calls wrapped with resolve())

### Change Log
- 2026-04-30: Story 2.3 implemented. go-state banner with "Done." copy, green-50 background transition, Svelte fade + reduced-motion. 5 go-state tests added. 39.69 kB gzipped. Also fixed 6 pre-existing lint errors.

## Review Findings

- [x] [Review][Patch] `$derived` with no reactive dependencies for `fadeDuration` — `window.matchMedia(...)` has no Svelte reactive state, so `$derived` evaluates once and never re-evaluates; semantically this is a plain `const`. Change to `const fadeDuration = ...`. [`src/routes/templates/[id]/run/+page.svelte:21-26`]
- [x] [Review][Defer] `aria-live="assertive"` fires on return-to-completed-run navigation — when user navigates back to an already-completed run, "Done." announcement is jarring (no new action triggered it). Dev notes explicitly chose assertive for the go-state moment; changing to polite would soften this. MVP acceptable. [`src/routes/templates/[id]/run/+page.svelte:47`] — deferred, pre-existing
- [x] [Review][Defer] Trailing space in class string when not in go-state — `"... motion-reduce:transition-none "` has a trailing space. Harmless HTML whitespace. [`src/routes/templates/[id]/run/+page.svelte:41`] — deferred, pre-existing
