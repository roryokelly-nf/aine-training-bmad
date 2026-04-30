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
