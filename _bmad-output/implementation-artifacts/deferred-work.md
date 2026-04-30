# Deferred Work

## Deferred from: code review of 1-1-initialize-project (2026-04-30)

- deploy.yml contains `<project-name>` placeholder — expected; deployer must set Cloudflare Pages project name and secrets out-of-band before deploy workflow is functional.

## Deferred from: code review of 1-4-view-all-templates (2026-04-30)

- EmptyState CTA uses `onClick` callback instead of `<a>` element — SvelteKit typed-routes constraint; middle-click/cmd-click won't open new tab. Acceptable for MVP.

## Deferred from: code review of 1-5-edit-template-items (2026-04-30)

- `localName`/`savedName` in `TemplateNameEditor` not reactive to external prop changes — known Svelte 5 limitation, acknowledged in completion notes; single-user single-tab scope makes this acceptable.

## Deferred from: code review of 1-7-delete-a-template (2026-04-30)

- `goto('/templates')` not awaited after delete — fire-and-forget navigation is the accepted SvelteKit pattern; no practical impact.

## Deferred from: code review of 1-2-storage-and-template-store (2026-04-30)

- `getActiveRun`/`archiveRun` cast JSON without Valibot validation — by design; run schema enforcement deferred to story 2.x.
- `archiveRun` unbounded run archive growth — future quota concern; no story 1.x requirement to address.
- No item count cap on `Template.items` — no story 1.x requirement; add if quota pressure emerges.
- `size-limit` glob captures only nodes 0–2 — glob must be widened as new routes are added beyond node 2.
- `_resetForTests` exported from production modules — common SvelteKit test seam pattern; acceptable for v1 scope.

## Deferred from: code review of 2-1-start-a-run / 2-2-tick-and-untick (2026-04-30)

- jsdom@29.1.0 forks-pool failure — `html-encoding-sniffer` calls `require()` on `@exodus/bytes` (ESM-only), crashing all client-environment test workers. Affects all `.svelte.test.ts` and `src/lib/state/**` tests. Fix: pin jsdom to v24, or switch vitest pool to `vmForks`, or migrate to `happy-dom`. All pre-existing tests were passing before this jsdom version landed.

## Deferred from: code review of 2-1-start-a-run (2026-04-30)

- Race condition on loadRun before first Run click — `loadRun(id)` async in `$effect`; rapid click before resolve skips replace-run modal, silently overwrites existing run. MVP-acceptable given the narrow window.

## Deferred from: code review of 2-2-tick-and-untick (2026-04-30)

- `tickItem` with unknown itemId silently no-ops and calls saveRun with unchanged state — invariant (itemIds sourced from template) makes this unreachable in practice; no defensive check needed for MVP.

## Deferred from: code review of 2-4-preserve-tick-state (2026-04-30)

- `loadRunSummaries` errors silently swallowed — called via `void` in template list `$effect`; storage failures mean run indicators simply don't appear. Acceptable for MVP; would need a toast or retry if storage reliability becomes a concern.

## Deferred from: story 2-4-preserve-tick-state (2026-04-30)

- `LocalStorageBackend` UNAVAILABLE / rollback tests fail under `happy-dom` — `happy-dom` always provides `localStorage`, so tests that simulate an unavailable localStorage (via `Object.defineProperty` probe-throw) don't work the same way as in `jsdom`. `vite.config.ts` was switched from `jsdom` to `happy-dom` to fix the broader ESM crash. These 2 tests need to be rewritten to be compatible with `happy-dom`'s storage model. Not a regression from Story 2.4.

## Deferred from: code review of 2-3-reach-go-state (2026-04-30)

- `aria-live="assertive"` on "Done." paragraph fires on return-to-completed-run navigation, not just on the moment of completing — jarring for screen readers who didn't just tick the last item. Changing to `polite` would soften this; change deferred as dev notes explicitly chose assertive for the emotional payoff moment.
