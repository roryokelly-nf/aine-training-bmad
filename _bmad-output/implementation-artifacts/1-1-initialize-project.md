# Story 1.1: Initialize project with CI bundle gate and deploy pipeline

Status: done

## Story

As a developer,
I want a SvelteKit + Svelte 5 + TypeScript project scaffolded with Tailwind v4, ESLint, Prettier, Vitest, a `size-limit` CI gate at 150 KB gzipped, and a Cloudflare Pages deploy stub,
so that every subsequent feature story builds on a known-good foundation that already enforces the bundle budget (NFR4) and ships to a real URL.

## Acceptance Criteria

1. **Project scaffold**
   - **Given** a fresh repository
   - **When** the project is initialized via `npx sv create checklist-app` with TypeScript, ESLint, Prettier, Vitest selected
   - **Then** `pnpm dev` starts the Vite dev server on `localhost:5173` with HMR working
   - **And** `pnpm build` produces a static build via `@sveltejs/adapter-static` to `build/`
   - **And** `pnpm test` runs Vitest with at least one passing smoke test
   - **And** `tsconfig.json` has `strict: true` and no implicit `any`

2. **Tailwind v4**
   - **Given** Tailwind CSS v4 is installed via `@tailwindcss/vite`
   - **When** a Svelte component uses a Tailwind utility class
   - **Then** the class is applied in dev and emitted in the built CSS
   - **And** `tailwind.config.ts` exists as the design-token placeholder

3. **ESLint storage boundary**
   - **Given** ESLint is configured per `architecture.md` boundaries
   - **When** any file outside `src/lib/storage/**` references the `localStorage` global
   - **Then** ESLint reports an error via `no-restricted-globals` / `no-restricted-imports`
   - **And** `pnpm lint` exits non-zero

4. **Bundle budget gate**
   - **Given** `size-limit` is configured at `.size-limit.json` with a 150 KB gzipped budget on the initial JS bundle
   - **When** a build exceeds the budget
   - **Then** `pnpm size-limit` exits non-zero

5. **CI workflow**
   - **Given** a GitHub Actions workflow at `.github/workflows/ci.yml`
   - **When** a pull request is opened
   - **Then** the workflow runs `svelte-check`, `pnpm lint`, `pnpm test`, and `pnpm size-limit`
   - **And** all four must pass before the PR can merge

6. **Deploy workflow**
   - **Given** a deploy workflow at `.github/workflows/deploy.yml`
   - **When** a commit lands on `main`
   - **Then** the build is deployed to Cloudflare Pages via `wrangler pages deploy build/`
   - **And** the deployed URL is reachable over HTTPS
   - **And** the deployed page renders a minimal landing that redirects to `/templates`

## Tasks / Subtasks

- [x] **Task 1: Initialize SvelteKit project at repo root.** (AC: #1)
  - [x] Run `npx sv create checklist-app` from a temp directory or directly at repo root; selections: **SvelteKit minimal** template, **TypeScript syntax: Yes**, add-ons: **ESLint, Prettier, Vitest**, package manager: **pnpm**.
  - [x] If the scaffold lands in a `checklist-app/` subdirectory, move its contents up to the repo root so `package.json` sits at `/Users/Rory_O-Kelly/Desktop/bmad/package.json`. Do NOT clobber the existing `_bmad/`, `_bmad-output/`, `.claude/`, or `docs/` directories.
  - [x] Verify `node_modules/` is installed via `pnpm install`.
  - [x] Confirm `pnpm dev` boots Vite on `localhost:5173` and HMR fires on a Svelte component edit.
  - [x] Open `tsconfig.json`; confirm `strict: true` and `noImplicitAny: true` (or that `strict` covers it). Add explicitly if missing.
  - [x] Confirm `vitest` is installed; the scaffold creates a `src/lib/index.test.ts` or similar — ensure at least one test passes via `pnpm test`. If none exists, add `src/smoke.test.ts` with a single trivial assertion.

- [x] **Task 2: Install and configure adapter-static.** (AC: #1)
  - [x] `pnpm add -D @sveltejs/adapter-static`
  - [x] Edit `svelte.config.js` to import and use `adapter-static` with `pages: 'build'`, `assets: 'build'`, `fallback: 'index.html'` (SPA mode — required because there is no SSR in v1 and routes resolve client-side).
  - [x] Add `export const prerender = true;` and `export const ssr = false;` to `src/routes/+layout.ts` (creating the file if absent) — locks the v1 client-only posture.
  - [x] Confirm `pnpm build` produces a `build/` directory containing `index.html` and assets.

- [x] **Task 3: Install and wire Tailwind CSS v4.** (AC: #2)
  - [x] `pnpm add -D tailwindcss@^4 @tailwindcss/vite`
  - [x] Add the Tailwind plugin to `vite.config.ts`: `import tailwindcss from '@tailwindcss/vite'` and include `tailwindcss()` in the `plugins` array (alongside `sveltekit()`).
  - [x] Create `src/app.css` containing `@import "tailwindcss";` (Tailwind v4 single-import syntax — do NOT use the legacy `@tailwind base/components/utilities` directives).
  - [x] Import `app.css` once in `src/routes/+layout.svelte` (`<script>import '../app.css';</script>`).
  - [x] Create `tailwind.config.ts` as a placeholder with `export default { content: ['./src/**/*.{html,js,svelte,ts}'] } satisfies import('tailwindcss').Config;`. **Do not populate design tokens yet** — that lands in a later story.
  - [x] Smoke-test: add `class="text-red-500"` to a heading on the landing page; verify the color renders in dev and appears in built CSS at `build/_app/immutable/assets/*.css`.

- [x] **Task 4: Configure ESLint storage boundary.** (AC: #3)
  - [x] The scaffolded `eslint.config.js` (flat config) exists. Add a rule object that applies globally with:
    - `no-restricted-globals` set to error on `localStorage`, `sessionStorage`.
    - `no-restricted-imports` is not strictly needed since localStorage is a global, but include it as a safety net for any future direct module imports.
  - [x] Add an override that **disables** `no-restricted-globals` for `localStorage` inside `src/lib/storage/**/*.ts` so the (future) backend implementation can call it.
  - [x] Create a placeholder file `src/lib/storage/.gitkeep` so the directory exists for the override pattern to match cleanly. (No code here yet — story 1.2 lands the implementation.)
  - [x] Verify: temporarily add `console.log(localStorage)` in `src/routes/+page.svelte`, run `pnpm lint`, confirm it errors with the no-restricted-globals message; remove the line.

- [x] **Task 5: Configure size-limit at 150 KB gzipped.** (AC: #4)
  - [x] `pnpm add -D size-limit @size-limit/preset-app`
  - [x] Create `.size-limit.json` at repo root:
    ```json
    [
      {
        "name": "initial JS bundle",
        "path": "build/_app/immutable/entry/start.*.js",
        "limit": "150 KB",
        "gzip": true
      }
    ]
    ```
    Note: the exact emitted entry filename is hashed; use the glob pattern shown. If `start.*.js` is not the entry filename produced by adapter-static, inspect `build/_app/immutable/entry/` after a build and adjust the `path` glob to match what SvelteKit emits in the current version. The intent is to gate the **initial JS bundle** the user pays for on first paint.
  - [x] Add `"size-limit": "size-limit"` to `package.json` scripts so `pnpm size-limit` works.
  - [x] Verify: run `pnpm build && pnpm size-limit`; expect a passing report well under 150 KB for an empty app.

- [x] **Task 6: Author the landing redirect.** (AC: #6)
  - [x] Replace `src/routes/+page.svelte` content with a minimal client-side redirect to `/templates`:
    ```svelte
    <script>
      import { goto } from '$app/navigation';
      import { onMount } from 'svelte';
      onMount(() => goto('/templates', { replaceState: true }));
    </script>
    ```
  - [x] Create `src/routes/templates/+page.svelte` with a placeholder heading like `<h1>Templates</h1>` so the redirect target exists. (Story 1.4 replaces this with the real template list — this is a stub only.)

- [x] **Task 7: CI workflow.** (AC: #5)
  - [x] Create `.github/workflows/ci.yml` running on `pull_request`:
    - Use `actions/checkout@v4`, `pnpm/action-setup@v4` with the version pinned to whatever `packageManager` field in `package.json` declares (the scaffold sets this).
    - `actions/setup-node@v4` with `node-version: 22` (architecture-mandated; matches NFR4 build environment).
    - Cache via `cache: 'pnpm'` on setup-node.
    - Steps in order: `pnpm install --frozen-lockfile`, `pnpm exec svelte-check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm size-limit`.
    - All steps must run for every PR and a single failure must fail the job.
  - [x] Note for the dev agent: do not configure branch protection rules in this story (that's a manual GitHub-side action the user must take after the workflow exists); just ensure the workflow itself is correct.

- [x] **Task 8: Deploy workflow.** (AC: #6)
  - [x] Create `.github/workflows/deploy.yml` running on `push` to `main`:
    - Same setup as CI through the build step.
    - Final step uses `cloudflare/wrangler-action@v3` with `command: pages deploy build/ --project-name=<TBD>`.
    - **`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`** must be referenced from `secrets` — leave them as `${{ secrets.CLOUDFLARE_API_TOKEN }}` / `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`. The user will set these secrets and the Pages project name out-of-band.
  - [x] Add a `README.md` block in the repo (or a `docs/deploy.md`) noting the secrets the user must set and the Pages project name they need to choose. **Do not invent or commit any token values.**
  - [x] If this story is being implemented before the user has set up the Cloudflare Pages project, the workflow can ship in a non-blocking state (it will fail until secrets are present); flag this in completion notes.

- [x] **Task 9: Verify the full pipeline locally.** (AC: all)
  - [x] Run, in order, and confirm each passes: `pnpm exec svelte-check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm size-limit`.
  - [x] Open `build/index.html` (or `pnpm preview`) and confirm the redirect lands at `/templates` with the placeholder heading.

### Review Findings

- [x] [Review][Decision] CI workflow also triggers on `push: branches: [main]` — AC #5 specifies PR trigger only; push-to-main trigger causes CI to run twice on every mainline commit (once via ci.yml push, once implicitly during deploy). **Decision: keep** — intentional safety net. [`.github/workflows/ci.yml`]
- [x] [Review][Defer] deploy.yml contains `<project-name>` placeholder — explicitly documented in completion notes as expected; deploys will fail until secrets/project configured out-of-band. [`.github/workflows/deploy.yml`] — deferred, pre-existing

## Dev Notes

### Critical context for the dev agent

This is the **scaffolding story**. No app feature code yet — only the foundation that every later story relies on. The scope is tightly bounded; resist any temptation to start authoring the design token system, the storage abstraction, or the actual template list. Those land in stories 1.2 through 1.4.

### Stack versions and library choices (locked by architecture)

- **Node.js:** 22+ (LTS as of architecture authoring). Use `engines.node: ">=22"` in `package.json` if the scaffold doesn't add it.
- **Package manager:** **pnpm** (not npm or yarn). The scaffold's `packageManager` field locks the version.
- **Framework:** SvelteKit, **Svelte 5 (runes)**. Confirm `package.json` shows `svelte: ^5.x` after scaffold; if the scaffold installed Svelte 4, abort and re-run `npx sv create` (`sv` is the v5-era CLI).
- **TypeScript:** scaffold-default version with `strict: true`.
- **Build tool:** Vite (provided by SvelteKit).
- **Adapter:** `@sveltejs/adapter-static` for v1. (Growth swaps to `@sveltejs/adapter-cloudflare` — out of scope here.)
- **Tailwind:** **v4** via `@tailwindcss/vite`. The configuration mechanism in v4 is different from v3 — single `@import "tailwindcss";` in CSS, no `tailwind.config.js` content array required at runtime (we still keep the file for token placeholder convention, but Tailwind v4 reads CSS-first). Do **not** install `postcss` or `autoprefixer` — Tailwind v4's Vite plugin handles both.
- **Testing:** Vitest (unit). Playwright is **not** installed in this story (deferred to a later story when there's something to e2e-test).
- **Bundle gate:** `size-limit` + `@size-limit/preset-app` (provides Webpack-style bundle analysis suitable for SvelteKit's emitted output).
- **CI runner:** GitHub Actions, `ubuntu-latest`.
- **Deploy target:** Cloudflare Pages via `cloudflare/wrangler-action@v3`.

### File structure produced by this story

After completion, the repo root must contain at least:

```
<repo-root>/
├── .github/workflows/ci.yml
├── .github/workflows/deploy.yml
├── .gitignore                       (scaffold provides; ensure build/ and .svelte-kit/ are listed)
├── .prettierrc                      (scaffold provides)
├── .size-limit.json                 (NEW — task 5)
├── eslint.config.js                 (scaffold provides; modify in task 4)
├── package.json
├── pnpm-lock.yaml
├── postcss.config.cjs               (NOT created — Tailwind v4 doesn't need it)
├── svelte.config.js                 (scaffold provides; edit for adapter-static in task 2)
├── tailwind.config.ts               (NEW — task 3, placeholder only)
├── tsconfig.json
├── vite.config.ts                   (scaffold provides; add tailwindcss plugin in task 3)
├── src/
│   ├── app.css                      (NEW — task 3)
│   ├── app.html                     (scaffold provides)
│   ├── lib/
│   │   └── storage/.gitkeep         (NEW — task 4)
│   └── routes/
│       ├── +layout.svelte           (scaffold provides; import app.css here)
│       ├── +layout.ts               (NEW or edit — prerender + ssr settings)
│       ├── +page.svelte             (overwrite with redirect — task 6)
│       └── templates/+page.svelte   (NEW — placeholder for redirect target)
└── (preserve: _bmad/, _bmad-output/, .claude/, docs/)
```

The architecture's full target structure (`src/lib/features/...`, `src/lib/state/...`, etc.) lands incrementally across later stories. **Do not pre-create empty feature folders in this story** — they exist only to host code, and creating them empty bloats the diff.

### Repo layout note (this is a "BMad-init repo", not a SvelteKit repo)

The current repo root is a BMad workspace, not a fresh-scaffold target. `_bmad/`, `_bmad-output/`, `.claude/`, and `docs/` already exist and must be preserved. When `npx sv create checklist-app` produces a `checklist-app/` subfolder, move its contents into the repo root rather than nesting the SvelteKit project. After the move, the SvelteKit project IS the repo, and `package.json` lives at the same level as `_bmad/`.

If `npx sv create .` (current directory) is offered as an option by the CLI, prefer that over the subfolder approach to avoid the move step entirely. Verify the destination is empty enough for the CLI's safety checks; if it refuses due to existing files, scaffold to a sibling and move contents.

### Architecture references

- **Stack and adapter choices:** [architecture.md#Selected Starter: SvelteKit (Svelte 5, TypeScript)](../planning-artifacts/architecture.md) (lines 98–157)
- **Implementation sequence and ordering rationale:** architecture.md, "Decision Impact Analysis" (lines 299–320). This story is item 1 of the implementation sequence; do not advance past it.
- **Project directory structure (full target, post-MVP):** architecture.md, "Complete Project Directory Structure" (lines 478–635). Use this only as a *future* reference — do not pre-create folders.
- **CI/CD spec:** architecture.md, "Infrastructure & Deployment" (lines 278–298).
- **Architectural boundaries (storage isolation):** architecture.md, "Architectural Boundaries → Data Boundaries" (lines 651–654). The ESLint rule in task 4 enforces this — without it, every later story is at risk of leaky imports.
- **NFR4 bundle budget:** prd.md, NFR4 (150 KB gzipped, CI-gated). **This is the hardest binding constraint on the project**; the gate landing in this story is what protects it.

### Tailwind v4 specifics — common mistakes to avoid

- **No PostCSS config.** The `@tailwindcss/vite` plugin replaces PostCSS for this stack. Do not create `postcss.config.cjs`. If a tutorial or LLM completion suggests it, that tutorial is for v3.
- **No `@tailwind base/components/utilities` directives.** Use `@import "tailwindcss";` instead.
- **`tailwind.config.ts` is optional in v4** but we keep it because: (a) we want a stable file path for the token system that lands later, (b) the `content` array provides explicit scanning roots that improve build determinism. Do not put theme tokens here yet.

### ESLint storage boundary — exact rule shape

In `eslint.config.js`, add the global rule and the storage-folder override. Skeleton (adapt to the scaffold's actual flat-config structure):

```js
// global block
{
  rules: {
    'no-restricted-globals': ['error',
      { name: 'localStorage', message: 'Access localStorage only via src/lib/storage backends.' },
      { name: 'sessionStorage', message: 'Access sessionStorage only via src/lib/storage backends.' }
    ]
  }
},
// override block
{
  files: ['src/lib/storage/**/*.ts'],
  rules: { 'no-restricted-globals': 'off' }
}
```

The override file pattern must match `src/lib/storage/**/*.ts` (and `.svelte.ts` if used). Adjust if storage lives elsewhere — but it should not.

### What is explicitly OUT of scope for this story

- Design token definition (colors, typography, spacing). The UX spec defines them; they land in a dedicated tokens story before story 1.3 starts shipping UI.
- The `StorageBackend` interface, `LocalStorageBackend`, ULID/nanoid generation, `Toast` component, rune-based stores. These all belong to story 1.2.
- Any `lib/features/**` content. No feature code in this story.
- Playwright. Added later when there's a flow to test end-to-end.
- PWA manifest, service worker. Growth-tier (Epic 9).
- Sentry / error monitoring. Deferred per architecture.

### Discrepancy flag (informational — not for this story)

The architecture document (line 174) specifies **`nanoid`** for ID generation, while the epics file (story 1.2 ACs) and the architecture's project structure (line 592) reference **ULID** at `src/lib/storage/ulid.ts`. This needs reconciliation **in story 1.2's planning**, not here. No code in this story touches ID generation. Surface it in the dev agent record if you happen to be the one who picks up 1.2.

### Testing standards

- Unit smoke test in `src/smoke.test.ts` (or rely on the scaffold's example): a single trivial assertion is enough; the test exists to keep `pnpm test` exit-zero so the CI step doesn't fail on "no tests found."
- No coverage thresholds in this story. Coverage gates can be added later when there's meaningful code to cover.
- `svelte-check` runs the TypeScript / Svelte type-checker; it must exit zero.

### Deployment notes

- The deploy workflow assumes a Cloudflare account, a Pages project, and two repository secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). These are out-of-band for the dev agent. If the user has not yet provisioned them, the workflow file still ships — it will sit ready and run on first push to `main` after secrets are added.
- Document the required secrets clearly in the completion notes so the user knows what manual setup is needed.

### Project Structure Notes

The architecture defines a comprehensive `src/lib/features/{templates,runs,history,browse,share,identity,moderation}/` layout. **None of those folders are created in this story.** They are the destination structure for story 1.3 onward; pre-creating them now produces dead-folder noise in the diff and confuses the dev agent on later stories about whether the directories already contain anything.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Selected Starter: SvelteKit (Svelte 5, TypeScript)] — stack rationale and init command
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — CI/CD and Cloudflare Pages target
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — full target file layout (most of which lands in later stories)
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries] — the ESLint storage boundary rule's reason for existing
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4] — 150 KB gzipped bundle budget
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — original story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — design token system referenced for context only; not implemented in this story

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

### Completion Notes List

- **Deviation: npm instead of pnpm** — pnpm was not installed on the dev machine; user opted for npm rather than activating pnpm via corepack. All commands and scripts use `npm` / `npx` accordingly. The architecture spec (`pnpm`) is preserved in the story text for fidelity; this dev-agent record is the canonical note that the actual implementation uses npm.
- **Scaffold target: repo root** — SvelteKit scaffolded into a temp subfolder (`/tmp/checklist-app`) via `npx sv@latest create --no-install --no-download-check` with `--add eslint,prettier,vitest,tailwindcss`, then contents merged into `/Users/Rory_O-Kelly/Desktop/bmad/` to preserve the existing `_bmad/`, `_bmad-output/`, `.claude/`, and `docs/` directories.
- **size-limit glob widened** — the story's example glob (`build/_app/immutable/entry/start.*.js`) only measured a 92 B entry stub. Widened to cover `entry/`, `chunks/`, and `nodes/0|1|2.*.js` so the gate measures what the browser actually downloads on first paint. Current measured size: **28.59 KB gzipped** against the 150 KB budget.
- **Verified gates locally:** `npx svelte-check` (0 errors, 330 files), `npm run lint` (clean), `npm test` (1 passed), `npm run build` (adapter-static wrote `build/`), `npm run size-limit` (28.59 kB / 150 kB).
- **Storage boundary verified live:** introduced a temporary `localStorage` reference in `src/routes/` and confirmed ESLint errored with the custom message; same code under `src/lib/storage/` linted clean. Test files removed.
- **Lint scope:** added `ignores` block to `eslint.config.js` and BMad workspace dirs to `.prettierignore` so the formatter/linter stays out of `_bmad/`, `_bmad-output/`, `.claude/`, `docs/`, `build/`, `.svelte-kit/`.
- **Tailwind v4 entry CSS at `src/app.css`** (not `src/routes/layout.css`); `.prettierrc` `tailwindStylesheet` updated to match.
- **Landing redirect uses Svelte 5 `resolve()`** — bare-string `goto('/templates')` triggered the `svelte/no-navigation-without-resolve` ESLint rule. Fixed by importing `resolve` from `$app/paths` and wrapping the path.
- **Deploy workflow ships in non-blocking state.** It will fail until `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are set in repo settings AND the `<project-name>` placeholder in `.github/workflows/deploy.yml` is replaced with the real Cloudflare Pages project name. CI is unaffected. Setup steps documented in `docs/deploy.md`.
- **Out-of-scope items deliberately untouched:** no `src/lib/features/**` folders, no design tokens, no `StorageBackend` interface, no Playwright, no PWA. Those land in stories 1.2+.
- **ULID/nanoid discrepancy** between `architecture.md` (line 174: nanoid) and `epics.md` story 1.2 ACs (ULID): flagged here for the dev agent picking up story 1.2; no code in this story touches ID generation.

### Change Log

- npm substituted for pnpm (per dev-machine constraint and user preference). All `package.json` scripts and CI commands use npm.
- size-limit glob widened from `entry/start.*.js` only to also cover `entry/*.js`, `chunks/*.js`, and `nodes/0|1|2.*.js` so the gate measures the actual initial JS payload (not the entry stub alone).
- Tailwind entry CSS path: `src/routes/layout.css` → `src/app.css` (also updated in `.prettierrc` and `+layout.svelte` import).
- Landing redirect: `goto('/templates')` → `goto(resolve('/templates'))` to satisfy `svelte/no-navigation-without-resolve` under SvelteKit 2 / Svelte 5.

### File List

**New (created in this story):**

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.size-limit.json`
- `docs/deploy.md`
- `src/app.css`
- `src/lib/storage/.gitkeep`
- `src/routes/+layout.ts`
- `src/routes/templates/+page.svelte`
- `tailwind.config.ts`

**Modified (scaffold-provided, edited in this story):**

- `.prettierignore` (added BMad workspace dirs)
- `.prettierrc` (set `tailwindStylesheet` to `./src/app.css`)
- `eslint.config.js` (added `ignores` block, `no-restricted-globals` rule, storage-folder override)
- `package.json` (replaced `adapter-auto` with `adapter-static`, added `size-limit` + `@size-limit/preset-app`, added `size-limit` script)
- `package-lock.json` (lockfile from `npm install`)
- `src/routes/+layout.svelte` (changed CSS import to `../app.css`)
- `src/routes/+page.svelte` (replaced scaffold welcome with redirect to `/templates`)
- `svelte.config.js` (switched to `adapter-static` with `fallback: 'index.html'`)

**Scaffold-generated (not authored, but part of the file set this story produces):**

- `.editorconfig`, `.gitignore`, `.npmrc`
- `README.md`
- `tsconfig.json`, `vite.config.ts`
- `src/app.d.ts`, `src/app.html`, `src/demo.spec.ts`
- `vitest-setup-client.ts`
- `e2e/demo.test.ts` (Playwright placeholder from scaffold; no Playwright runtime installed)
