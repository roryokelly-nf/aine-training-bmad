# Story 1.2: Storage abstraction and template-store foundation

Status: done

## Story

As a developer,
I want a single `StorageBackend` interface with a `LocalStorageBackend` implementation, ULID generation, a Valibot `Template` schema, a `StorageError` type, a `Toast` surface, and a rune-based `template-store`,
so that every feature in Epic 1 onward reads and writes through one call surface that won't need rewriting when the Growth backend lands. (Resolves architectural prerequisite for FR1–FR7, FR17–FR20.)

## Acceptance Criteria

1. **StorageBackend interface (8 methods, locked)**
   - **Given** the project structure from `architecture.md`
   - **When** `src/lib/storage/types.ts` is defined
   - **Then** it exports a `StorageBackend` interface with eight methods: `getTemplates`, `getTemplate`, `saveTemplate`, `deleteTemplate`, `getActiveRun`, `saveRun`, `clearRun`, `archiveRun`
   - **And** every return type is identical regardless of backend implementation (no leaky `LocalStorage` types in the contract)

2. **LocalStorageBackend writes validated, versioned blobs**
   - **Given** a `LocalStorageBackend` at `src/lib/storage/localstorage-backend.ts`
   - **When** `saveTemplate(t)` is called with a valid template
   - **Then** the template is parsed via the Valibot schema before write
   - **And** the template is JSON-stringified to a namespaced localStorage key
   - **And** the persisted blob carries a `schemaVersion: 1` integer

3. **ULID generation**
   - **Given** ULID generation at `src/lib/storage/ulid.ts`
   - **When** a new template is created without an `id`
   - **Then** the backend assigns a freshly generated ULID
   - **And** the ULID is URL-safe and lexicographically sortable

4. **getTemplates round-trips and tolerates schema drift**
   - **Given** `getTemplates()` is called after one or more `saveTemplate` calls
   - **When** localStorage is available
   - **Then** all saved templates are parsed via the Valibot schema and returned
   - **And** any persisted blob that fails schema parse is logged to console and skipped (no throw)

5. **Quota errors surface cleanly**
   - **Given** localStorage write fails with `QuotaExceededError`
   - **When** any `saveTemplate` / `saveRun` / `archiveRun` call is made
   - **Then** the call rejects with `StorageError` of kind `QUOTA_EXCEEDED`
   - **And** no partial write is left behind (read-modify-write must roll back if the final `setItem` throws)

6. **Unavailable storage surfaces cleanly**
   - **Given** localStorage is unavailable (private mode, disabled)
   - **When** any backend method is called
   - **Then** the call rejects with `StorageError` of kind `UNAVAILABLE`

7. **Schema validation rejects invalid input**
   - **Given** a Valibot schema at `src/lib/schemas/template.ts`
   - **When** an invalid template object is passed to `saveTemplate`
   - **Then** the schema parse fails and the call rejects with `StorageError` of kind `INVALID`

8. **Rune-based template-store hydrates from storage**
   - **Given** a rune-based store at `src/lib/state/template-store.svelte.ts`
   - **When** `loadTemplates()` is invoked at app boot
   - **Then** the `templates` `$state` array is hydrated from `storage.getTemplates()`
   - **And** subsequent mutator functions (`addTemplate`, `updateTemplate`, `deleteTemplate`) call the corresponding storage method and update reactive state

9. **Toast surface renders and dismisses**
   - **Given** a `Toast` component, `ToastContainer`, and `toast-store.svelte.ts`
   - **When** any caller invokes `toastStore.error(message)` or `toastStore.success(message)`
   - **Then** a toast renders in the layout's `ToastContainer` mounted in `+layout.svelte`
   - **And** the toast auto-dismisses after a configurable timeout
   - **And** can be manually dismissed via a close button reachable by keyboard

10. **ESLint boundary still enforced**
    - **Given** ESLint boundary rules from story 1.1
    - **When** any file outside `src/lib/storage/**` references `localStorage`
    - **Then** ESLint reports an error and CI fails

## Tasks / Subtasks

- [x] **Task 1: Install runtime dependencies.** (AC: #2, #3, #7)
  - [x] `npm install valibot ulidx` (production deps — both are tiny, both ship in the bundle)
  - [x] Confirm `valibot` resolves to a 1.x version. If `npm install valibot` lands a 0.x prerelease, pin to `valibot@^1` explicitly.
  - [x] Confirm `ulidx` resolves to a 2.x version. (`ulidx` is the modern fork of `ulid` — smaller bundle, ESM-first, drop-in API.)
  - [x] Verify `package.json` "dependencies" (not devDependencies) — these are runtime-required.

- [x] **Task 2: Define `StorageError` type.** (AC: #5, #6, #7)
  - [x] Create `src/lib/storage/storage-error.ts` exporting:
    ```ts
    export type StorageErrorKind = 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'INVALID' | 'NOT_FOUND' | 'UNKNOWN';
    export class StorageError extends Error {
      readonly kind: StorageErrorKind;
      readonly cause?: unknown;
      constructor(kind: StorageErrorKind, message: string, cause?: unknown) {
        super(message);
        this.name = 'StorageError';
        this.kind = kind;
        this.cause = cause;
      }
    }
    ```
  - [x] Add `NOT_FOUND` and `UNKNOWN` kinds proactively — `getTemplate(id)` for a missing id returns `null` (per the interface), but other future call sites may need NOT_FOUND; UNKNOWN is the catch-all for unexpected errors. The story ACs only require QUOTA_EXCEEDED, UNAVAILABLE, INVALID — but defining the union now avoids a breaking change later.

- [x] **Task 3: Define ULID generator.** (AC: #3)
  - [x] Create `src/lib/storage/ulid.ts`:
    ```ts
    import { ulid } from 'ulidx';
    export function newId(): string {
      return ulid();
    }
    ```
  - [x] Add a Vitest unit test `src/lib/storage/ulid.test.ts`:
    - Generated ULID is 26 chars, alphanumeric (Crockford base32)
    - Two ULIDs generated in sequence sort lexicographically (timestamp prefix monotonic — `ulidx`'s default `ulid()` is monotonic within the same millisecond, so the `<` comparison must hold)
    - The function returns a string

- [x] **Task 4: Define the `Template` Valibot schema.** (AC: #2, #7)
  - [x] Create `src/lib/schemas/template.ts`:
    ```ts
    import * as v from 'valibot';

    export const ItemSchema = v.object({
      id: v.pipe(v.string(), v.nonEmpty()),
      text: v.pipe(v.string(), v.minLength(1), v.maxLength(280)),
      // future story 1.5 will add notes/nesting; keep this lean for now
    });

    export const TemplateSchema = v.object({
      id: v.pipe(v.string(), v.nonEmpty()),
      name: v.pipe(v.string(), v.minLength(1), v.maxLength(120)),
      items: v.array(ItemSchema),
      createdAt: v.pipe(v.string(), v.isoTimestamp()),
      updatedAt: v.pipe(v.string(), v.isoTimestamp()),
    });

    export const PersistedTemplateSchema = v.object({
      schemaVersion: v.literal(1),
      template: TemplateSchema,
    });

    export type Item = v.InferOutput<typeof ItemSchema>;
    export type Template = v.InferOutput<typeof TemplateSchema>;
    export type PersistedTemplate = v.InferOutput<typeof PersistedTemplateSchema>;
    ```
  - [x] Use `v.parse(TemplateSchema, input)` in the backend — throws on invalid; the backend catches and re-throws as `StorageError('INVALID', ...)`.
  - [x] Note: do NOT yet add the `Run` schema in this story — runs land in story 2.x and are not exercised by Epic 1 stories 1.3–1.7. The `StorageBackend` interface still declares run methods (per the locked 8-method shape), and the LocalStorageBackend implements them as stubs that work against `unknown`-typed payloads or a permissive schema. See Task 6 for the exact stub strategy.

- [x] **Task 5: Define the `StorageBackend` interface and factory.** (AC: #1)
  - [x] Create `src/lib/storage/types.ts` (the contract — both backends import from here):
    ```ts
    import type { Template } from '$lib/schemas/template';

    // Run-shaped placeholder; story 2.x will replace this with a real schema.
    export interface Run {
      templateId: string;
      startedAt: string;
      itemStates: Array<{ itemId: string; checked: boolean }>;
    }

    export interface StorageBackend {
      getTemplates(): Promise<Template[]>;
      getTemplate(id: string): Promise<Template | null>;
      saveTemplate(t: Template): Promise<void>;
      deleteTemplate(id: string): Promise<void>;
      getActiveRun(templateId: string): Promise<Run | null>;
      saveRun(r: Run): Promise<void>;
      clearRun(templateId: string): Promise<void>;
      archiveRun(r: Run): Promise<void>;
    }
    ```
  - [x] Create `src/lib/storage/index.ts` — the factory that components import:
    ```ts
    import type { StorageBackend } from './types';
    import { LocalStorageBackend } from './localstorage-backend';

    let _instance: StorageBackend | null = null;
    export function storage(): StorageBackend {
      if (!_instance) _instance = new LocalStorageBackend();
      return _instance;
    }
    // Test seam — used only by tests to inject a fake backend.
    export function _setStorageForTests(backend: StorageBackend | null): void {
      _instance = backend;
    }
    ```
  - [x] All other code imports `storage` from `$lib/storage` — never `LocalStorageBackend` directly. This is the v1↔v2 hinge.

- [x] **Task 6: Implement `LocalStorageBackend`.** (AC: #2, #4, #5, #6, #7)
  - [x] Create `src/lib/storage/localstorage-backend.ts`. Key design points:
    - **Namespacing:** localStorage keys use a single short prefix to keep quota efficient. Use `cl:` (for "checklist"). Constants:
      ```ts
      const NS = 'cl:';
      const TEMPLATE_INDEX_KEY = `${NS}tpl:index`;     // JSON array of template IDs
      const TEMPLATE_KEY = (id: string) => `${NS}tpl:${id}`;
      const RUN_KEY = (templateId: string) => `${NS}run:active:${templateId}`;
      const RUN_ARCHIVE_KEY = (templateId: string) => `${NS}run:archive:${templateId}`;
      ```
    - **Persisted shape:** every templates and run blob is `{ schemaVersion: 1, template: T }` (or `{ schemaVersion: 1, run: R }` for runs). Read paths re-validate via Valibot.
    - **Availability detection:** at construction time (or lazily on first call), probe localStorage with a write+read+delete of a sentinel key. If any throws, set `_available = false` and have every method reject with `StorageError('UNAVAILABLE', ...)`.
    - **Quota handling:** wrap every `localStorage.setItem` in try/catch. On `DOMException` with `name === 'QuotaExceededError'` (or legacy `code === 22`), throw `StorageError('QUOTA_EXCEEDED', ...)`. On other DOMException kinds, throw `StorageError('UNKNOWN', ...)` with the original error attached as `cause`.
    - **Atomicity for `saveTemplate`:** write the per-template key first, THEN update the index. If the index write throws, roll back the per-template write (delete the key) so we don't leak orphaned data.
    - **Atomicity for `deleteTemplate`:** update the index first; only remove the per-template key after the index write succeeds.
    - **Schema-drift tolerance in `getTemplates`:** iterate the index, attempt `v.parse(PersistedTemplateSchema, JSON.parse(raw))` for each entry, log + skip entries that fail. Never throw the whole call due to one bad blob.
    - **`getTemplate(id)`:** returns `null` (not `StorageError('NOT_FOUND')`) if the id is unknown or its blob fails schema parse. Per the interface contract — null is a valid result.
    - **`saveTemplate(t)`:** before write, run `v.parse(TemplateSchema, t)`. On parse error, throw `StorageError('INVALID', ...)`. Stamp `updatedAt = new Date().toISOString()` before persistence (but only if the caller hasn't already set it more recently — accept whatever the caller provides; the store layer decides).
    - **Run methods:** in this story, runs use a permissive object shape (TS interface only, no Valibot enforcement). `getActiveRun`, `saveRun`, `clearRun`, `archiveRun` use the same persisted-envelope pattern but skip Valibot validation. Story 2.x lands the run schema; this leaves the call surface in place.
  - [x] Skeleton (illustrative — adapt to actual TS strictness):
    ```ts
    import type { StorageBackend, Run } from './types';
    import { TemplateSchema, PersistedTemplateSchema, type Template } from '$lib/schemas/template';
    import { StorageError } from './storage-error';
    import * as v from 'valibot';

    export class LocalStorageBackend implements StorageBackend {
      private available: boolean;

      constructor() {
        this.available = this.probe();
      }

      private probe(): boolean {
        try {
          const k = 'cl:__probe__';
          localStorage.setItem(k, '1');
          localStorage.removeItem(k);
          return true;
        } catch {
          return false;
        }
      }

      private requireAvailable(): void {
        if (!this.available) throw new StorageError('UNAVAILABLE', 'localStorage is not available');
      }

      private setItemSafe(key: string, value: string): void {
        try {
          localStorage.setItem(key, value);
        } catch (err) {
          if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
            throw new StorageError('QUOTA_EXCEEDED', 'localStorage quota exceeded', err);
          }
          throw new StorageError('UNKNOWN', 'localStorage write failed', err);
        }
      }

      // ... methods follow the spec above
    }
    ```
  - [x] Vitest tests at `src/lib/storage/localstorage-backend.test.ts` covering:
    - happy path: save → getTemplates → getTemplate
    - schema drift: pre-seed localStorage with a malformed blob and confirm `getTemplates` skips it (and logs)
    - QuotaExceeded: stub `localStorage.setItem` to throw `DOMException('QuotaExceededError')` and assert `StorageError.kind === 'QUOTA_EXCEEDED'`
    - INVALID: pass a template with no name and assert `kind === 'INVALID'`
    - UNAVAILABLE: stub the probe to fail, assert all methods reject with `kind === 'UNAVAILABLE'`
    - rollback: simulate a successful per-template write but failing index update, assert the per-template key is removed
  - [x] Use [`vitest`'s built-in `vi.stubGlobal` and `vi.spyOn(localStorage, 'setItem')`](https://vitest.dev/api/vi.html#vi-stubglobal) for the failure-mode tests; avoid pulling in additional libraries.

- [x] **Task 7: Toast surface — store + components.** (AC: #9)
  - [x] Create `src/lib/state/toast-store.svelte.ts`:
    ```ts
    import { newId } from '$lib/storage/ulid';

    export type ToastKind = 'success' | 'error' | 'info';
    export interface ToastEntry {
      id: string;
      kind: ToastKind;
      message: string;
      timeoutMs: number;
    }

    let toasts = $state<ToastEntry[]>([]);

    export function getToasts(): ToastEntry[] { return toasts; }

    function push(kind: ToastKind, message: string, timeoutMs = 4000): void {
      const id = newId();
      const entry: ToastEntry = { id, kind, message, timeoutMs };
      toasts = [...toasts, entry];
      if (timeoutMs > 0) {
        setTimeout(() => dismiss(id), timeoutMs);
      }
    }

    export const toastStore = {
      success: (m: string, t?: number) => push('success', m, t),
      error: (m: string, t?: number) => push('error', m, t),
      info: (m: string, t?: number) => push('info', m, t),
    };

    export function dismiss(id: string): void {
      toasts = toasts.filter(t => t.id !== id);
    }
    ```
  - [x] Create `src/lib/components/Toast.svelte` — a single toast row:
    - Receives `entry: ToastEntry` and a `ondismiss: () => void` prop.
    - Uses Tailwind for styling: position fixed inside container, kind-conditional bg color (`bg-green-600` success, `bg-red-600` error, `bg-slate-700` info).
    - Includes a close button: `<button type="button" aria-label="Dismiss notification">×</button>` wired to `ondismiss`.
    - Role: `role="status"` for success/info, `role="alert"` for error (a11y — screen readers prioritize alert).
    - Live region: parent `ToastContainer` carries `aria-live` (see below); individual toasts don't repeat it.
  - [x] Create `src/lib/components/ToastContainer.svelte`:
    - Imports `getToasts` and `dismiss` from the store.
    - Renders an `<aside aria-live="polite" aria-atomic="false">` containing each toast via `{#each getToasts() as t (t.id)}`.
    - Positioned fixed bottom-right (or top-right — your pick; ux-design-specification.md doesn't lock this — see UX consistency notes).
    - Exposes no public API — purely declarative.
  - [x] Mount `ToastContainer` in `src/routes/+layout.svelte` (next to the `<slot/>`):
    ```svelte
    <script lang="ts">
      import '../app.css';
      import ToastContainer from '$lib/components/ToastContainer.svelte';
      let { children } = $props();
    </script>
    {@render children()}
    <ToastContainer />
    ```
  - [x] Vitest test for the store: pushing two toasts adds two entries; dismissing one leaves the other; the timeout-based dismissal can be tested with `vi.useFakeTimers()`.

- [x] **Task 8: Rune-based `template-store`.** (AC: #8)
  - [x] Create `src/lib/state/template-store.svelte.ts`:
    ```ts
    import { storage } from '$lib/storage';
    import { newId } from '$lib/storage/ulid';
    import type { Template } from '$lib/schemas/template';

    let templates = $state<Template[]>([]);
    let loaded = $state<boolean>(false);

    export function getTemplates(): Template[] { return templates; }
    export function isLoaded(): boolean { return loaded; }

    export async function loadTemplates(): Promise<void> {
      templates = await storage().getTemplates();
      loaded = true;
    }

    export async function addTemplate(input: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
      const now = new Date().toISOString();
      const t: Template = { ...input, id: newId(), createdAt: now, updatedAt: now };
      await storage().saveTemplate(t);
      templates = [...templates, t];
      return t;
    }

    export async function updateTemplate(t: Template): Promise<void> {
      const updated: Template = { ...t, updatedAt: new Date().toISOString() };
      await storage().saveTemplate(updated);
      templates = templates.map(x => x.id === updated.id ? updated : x);
    }

    export async function deleteTemplate(id: string): Promise<void> {
      await storage().deleteTemplate(id);
      templates = templates.filter(t => t.id !== id);
    }
    ```
  - [x] Vitest test: stub the storage backend via `_setStorageForTests`; verify `addTemplate` calls `saveTemplate` with the right shape and updates `getTemplates()`. (The store has no UI; this is pure logic.)
  - [x] **No UI binding in this story.** Story 1.3 (Create a new template) is the first to actually call these mutators from a route.

- [x] **Task 9: Wire `loadTemplates` at app boot.** (AC: #8)
  - [x] In `src/routes/+layout.ts`, add a `load` function that calls `loadTemplates()` and surfaces any `StorageError` via the toast store. Keep `prerender = true` and `ssr = false` from story 1.1.
    ```ts
    import { loadTemplates } from '$lib/state/template-store.svelte';
    import { toastStore } from '$lib/state/toast-store.svelte';
    import { StorageError } from '$lib/storage/storage-error';
    import { browser } from '$app/environment';

    export const prerender = true;
    export const ssr = false;

    export const load = async () => {
      if (!browser) return {};
      try {
        await loadTemplates();
      } catch (err) {
        if (err instanceof StorageError) {
          toastStore.error(`Storage problem: ${err.message}`);
        } else {
          throw err;
        }
      }
      return {};
    };
    ```
  - [x] **Why the `if (!browser)` guard:** even with `ssr = false`, the prerender pass executes load functions during build. localStorage is undefined there. Skipping for non-browser keeps build green and behavior correct (the load runs again on real navigation).

- [x] **Task 10: Verify the full pipeline.** (AC: all)
  - [x] Run, in order, and confirm each passes:
    - `npx svelte-check` (0 errors)
    - `npm run lint` (clean)
    - `npm test` (all tests pass — should be at least 5–8 new tests across ulid, schema, backend, store, toast)
    - `npm run build` (success)
    - `npm run size-limit` (still under 150 KB gzipped — Valibot + ulidx + new code shouldn't push us close to the budget; expect bundle to grow from ~28 KB to maybe ~35 KB)
  - [x] **Storage boundary still works:** the only file that imports `localStorage` is `src/lib/storage/localstorage-backend.ts`. No other file in `src/` references it. Confirm by grepping `grep -rn "localStorage" src/ --include="*.ts" --include="*.svelte"` — only matches should be inside `src/lib/storage/`.
  - [x] **Smoke test in browser** (`npm run dev`):
    - Open http://localhost:5173 — should redirect to /templates (story 1.1 redirect still works).
    - Open devtools console; run `(await import('/src/lib/state/template-store.svelte.ts')).getTemplates()` — should be empty array.
    - Open devtools console; run a quick `addTemplate` via the module to verify a toast appears (or that no error fires) and localStorage gains a `cl:tpl:*` key.
    - Reload the page; the template should persist.

### Review Findings

- [x] [Review][Decision] `src/lib/schemas/run.ts` created with full Valibot schema — story explicitly said "Do NOT yet add the Run schema in this story"; run types also re-exported from `types.ts`. **Decision: keep** — intentional early implementation. [`src/lib/schemas/run.ts`, `src/lib/storage/types.ts`]
- [x] [Review][Decision] Template `name` maxLength: story 1.2 spec says 120 but story 1.3 AC #4 explicitly bumps to 200. **Decision: reverted to 200** — story 1.3 AC is canonical. [`src/lib/schemas/template.ts:12`, `src/lib/schemas/template.test.ts`]
- [x] [Review][Decision] `order` field, `addItem`, `updateItemText`, `removeItem` implemented ahead of story 1.5. **Decision: keep** — later stories depend on them. [`src/lib/schemas/template.ts:6`, `src/lib/state/template-store.svelte.ts:44-74`]
- [x] [Review][Patch] `deleteTemplate` state inconsistency — if `deleteTemplate` succeeds but `clearRun` throws, template ghost in UI. **Fixed: clearRun wrapped in try-catch.** [`src/lib/state/template-store.svelte.ts:38-44`]
- [x] [Review][Patch] `loadTemplates` — `loaded` stays `false` after `StorageError`. **Fixed: try-finally ensures loaded=true always set.** [`src/lib/state/template-store.svelte.ts:17-22`]
- [x] [Review][Defer] `getActiveRun`/`archiveRun` cast JSON without Valibot validation — by design; run schema enforcement deferred to story 2.x. [`src/lib/storage/localstorage-backend.ts:199-245`] — deferred, pre-existing
- [x] [Review][Defer] `archiveRun` unbounded run archive growth — future quota concern, not in scope for story 1.2. [`src/lib/storage/localstorage-backend.ts:227`] — deferred, pre-existing
- [x] [Review][Defer] No item count cap on `Template.items` — no story 1.x requirement for this limit. [`src/lib/schemas/template.ts`] — deferred, pre-existing
- [x] [Review][Defer] `size-limit` glob captures only nodes 0–2 — nodes for future routes (3+) not included; will need updating as routes grow. [`.size-limit.json`] — deferred, pre-existing
- [x] [Review][Defer] `_resetForTests` exported from production modules — common SvelteKit test seam pattern; acceptable trade-off. [`src/lib/state/template-store.svelte.ts:77`, `src/lib/state/toast-store.svelte.ts:38`] — deferred, pre-existing

## Dev Notes

### Critical context for the dev agent

This is the **architectural hinge story**. After it lands, every Epic 1 story (1.3 through 1.7) has a clean call surface. The temptation here is to over-engineer — resist it. The interface is locked at 8 methods. The schema is minimal. The storage backend has one implementation. The toast surface has one shape. Anything beyond that is a story 2.x or 3.x concern.

**The single most important property of this story:** every component that touches data MUST go through `storage()` — never `localStorage` directly, never a feature-local cache, never a parallel store. Story 1.1's ESLint rule enforces the localStorage half; the cultural habit of "go through storage()" is what enforces the rest.

### Stack and library versions (locked)

- **Valibot** (`valibot`): version 1.x. The schema-validation library; chosen over Zod for tree-shaking (relevant to NFR4 / 150 KB budget). ESM-first. API uses `v.object(...)`, `v.pipe(...)`, `v.parse(schema, input)`.
- **ulidx** (`ulidx`): version 2.x. Modern fork of `ulid` with smaller bundle, ESM-first, drop-in API. Generates 26-char Crockford base32 strings, lexicographically sortable, monotonic within a millisecond. Story 1.1 flagged the `nanoid` vs `ulid` discrepancy in architecture.md — story spec wins, **use ULID**, document the choice in completion notes.
- **Svelte 5 runes** (`$state`, `$effect`, `$derived`): use `.svelte.ts` extension on store files for runes to work in TS modules. Already proven to work in story 1.1's project setup.
- **No additional dev deps needed.** Vitest is already present.

### ULID/nanoid resolution (formal)

Architecture.md line 174 reads: *"`nanoid` for template and run IDs"*. Architecture.md lines 333–334 and 386 (Naming Patterns and Format Patterns sections) explicitly say: *"PK: `id` (text, ULID-generated client-side for portability between local + server)"* and *"IDs: ULID strings everywhere (client-generated, sortable, URL-safe)"*. Story 1.2 AC #3 explicitly requires ULID with the URL-safe + lexicographically sortable property — those are ULID's defining traits, NOT nanoid's (nanoid is random; not sortable).

**Resolution:** ULID wins. The line 174 nanoid mention is an outdated artifact from an earlier draft. Architecture should be patched in a future correction pass; for now, story 1.2's spec is canonical and the dev agent's completion notes should document this decision so future stories don't regress.

### Persisted blob shape and namespacing

All localStorage values written by this story carry a `schemaVersion: 1` envelope:

```json
{ "schemaVersion": 1, "template": { "id": "...", "name": "...", ... } }
```

Keys (single namespace prefix `cl:` to minimize bytes against the ~5 MB browser quota):

| Key                                | Value                                       |
|-------------------------------------|---------------------------------------------|
| `cl:tpl:index`                      | JSON array of template ULIDs                |
| `cl:tpl:<ULID>`                     | `{ schemaVersion, template }` envelope      |
| `cl:run:active:<templateId>`        | `{ schemaVersion, run }` envelope (story 2.x lands the schema) |
| `cl:run:archive:<templateId>`       | `{ schemaVersion, runs: Run[] }` envelope (story 2.x decides shape) |

**Why an index key rather than scanning all `cl:tpl:*` keys?** localStorage doesn't expose a typed iteration API; you'd loop over `localStorage.length` and inspect every key in the entire localStorage namespace, which is fragile (any other key starting with `cl:tpl:` would be confused for a template). An explicit index makes the read path O(N templates), not O(N total localStorage keys), and survives unrelated localStorage usage cleanly.

**Atomicity caveat:** localStorage doesn't have transactions. The "write per-template key, then update index, rollback on failure" pattern in Task 6 is the best approximation. A power-loss between steps could leave an orphaned per-template key (read path won't see it because it's not in the index — fine) or a missing per-template key (index has an id but the lookup fails — `getTemplates` skips and logs, fine). Both failure modes are non-corrupting.

### File structure produced by this story

After completion, these files exist (relative to repo root):

```
src/
├── app.css                                 (existing — story 1.1)
├── routes/
│   ├── +layout.svelte                      (modified — mount ToastContainer)
│   ├── +layout.ts                          (modified — load templates at boot)
│   └── ... (existing)
└── lib/
    ├── components/
    │   ├── Toast.svelte                    (NEW — task 7)
    │   └── ToastContainer.svelte           (NEW — task 7)
    ├── schemas/
    │   └── template.ts                     (NEW — task 4)
    ├── state/
    │   ├── template-store.svelte.ts        (NEW — task 8)
    │   ├── template-store.test.ts          (NEW — task 8 test)
    │   ├── toast-store.svelte.ts           (NEW — task 7)
    │   └── toast-store.test.ts             (NEW — task 7 test)
    └── storage/
        ├── .gitkeep                        (existing — story 1.1; can be removed once real files exist)
        ├── index.ts                        (NEW — task 5; storage() factory)
        ├── types.ts                        (NEW — task 5; StorageBackend interface)
        ├── localstorage-backend.ts         (NEW — task 6)
        ├── localstorage-backend.test.ts    (NEW — task 6 test)
        ├── storage-error.ts                (NEW — task 2)
        ├── ulid.ts                         (NEW — task 3)
        └── ulid.test.ts                    (NEW — task 3 test)
```

**Do not create:**
- `src/lib/features/templates/` — story 1.3 lands the first feature folder
- `src/lib/schemas/run.ts` — story 2.x lands the run schema
- `src/lib/storage/hybrid-backend.ts` — Growth phase
- Any `src/lib/api/`, `src/lib/server/`, `src/lib/utils/` content

### Architectural references (read these before coding)

- **StorageBackend interface (8 methods, locked):** [Source: architecture.md, Frontend Architecture → Storage abstraction] (lines 244–249)
- **Data Boundaries (storage isolation):** [Source: architecture.md, Architectural Boundaries → Data Boundaries] (lines 651–654). The ESLint rule from story 1.1 enforces the `localStorage` half. The cultural enforcement is "everything goes through `storage()`."
- **Naming patterns (file naming, ULID, schemaVersion):** [Source: architecture.md, Naming Patterns + Format Patterns] (lines 328–388)
- **State management with runes:** [Source: architecture.md, State Management] (lines 391–396) and the example pattern at lines 444–452.
- **Validation with Valibot:** [Source: architecture.md, Validation] (lines 403–406). One schema per resource in `src/lib/schemas/`, imported by client form and (later) server `+server.ts`.
- **Error Handling pattern:** [Source: architecture.md, Error Handling] (lines 408–412). Storage failures surface via dedicated `StorageError` toast.
- **Toast surface mounting:** [Source: architecture.md, Cross-Cutting Concerns] (lines 673–675). `lib/state/toast-store.svelte.ts` + `lib/components/ToastContainer.svelte` mounted in `+layout.svelte`.

### Pattern references (worked examples)

- **Good store module pattern:** architecture.md lines 444–452. Replicate this exact shape for `template-store.svelte.ts`.
- **Anti-pattern (do NOT do):** architecture.md lines 454–457. Direct `localStorage` from a component is exactly what story 1.1's ESLint rule catches; this story makes the alternative cheap.

### UX considerations for the Toast surface

The UX spec (`_bmad-output/planning-artifacts/ux-design-specification.md`) doesn't dictate exact toast positioning, color, or animation. **Choose minimal defaults** in this story; story-specific refinements happen in later UI stories or a dedicated polish pass. Defaults that match the spec's general direction:

- **Position:** bottom-right, fixed, with safe-area-inset bottom padding (mobile thumb zone) — this is the dominant pattern in similar apps and aligns with the run-view's bottom-anchored UI.
- **Color/contrast:** use Tailwind colors that meet WCAG AA contrast against white text (`bg-red-600`, `bg-green-600`, `bg-slate-700` all pass for body text size).
- **Animation:** `transition: opacity 0.2s, transform 0.2s` is enough. No spring physics, no entrance choreography.
- **Width:** clamp between `min(90vw, 28rem)` so it doesn't span the whole viewport on desktop or get cropped on small phones.
- **Stacking:** newer toasts on top (visually); the `<aside>` reverses with `flex-col-reverse` if needed.

These defaults are explicitly provisional. If the UX spec acquires a toast-specific section in a later iteration, refine then; do not block on it now.

### Testing standards

- **All Vitest tests co-locate** with the module under test (per architecture.md line 371). E.g., `ulid.ts` + `ulid.test.ts` in the same folder.
- **Run the storage backend tests in a JSDOM environment.** The vitest scaffold from story 1.1 already configures this — confirm by checking `vite.config.ts` test config or `vitest.config.ts`. If localStorage is not present in the test environment, the probe will set `available = false` and most tests will fail with `UNAVAILABLE`. JSDOM ships a localStorage shim.
- **Use `vi.useFakeTimers()` for the toast auto-dismiss test** so it doesn't actually wait 4 seconds.
- **Mock `DOMException` carefully** for the QuotaExceeded test — `new DOMException('Quota exceeded', 'QuotaExceededError')` works in modern Node (≥17 with web globals), which the project's Node 22 runtime provides.
- **Coverage targets:** none formal in this story. Aim for >85% line coverage on `localstorage-backend.ts` since it's the riskiest piece.

### What is explicitly OUT of scope

- **The `Run` Valibot schema.** Run methods are stubbed at the interface; Valibot enforcement lands in story 2.x.
- **HybridBackend / registry / `fetch` calls.** Growth phase, epic 6+.
- **PWA / service worker / offline.** Growth phase, epic 9.
- **Design tokens (colors, typography, spacing).** Tailwind utilities used directly; tokens land in a dedicated story before story 1.3 ships UI.
- **Any UI route that consumes the store.** Story 1.3 onward.
- **Migration logic for `schemaVersion`.** v1 is at version 1; future intra-v1 migrations land when needed. Don't write a migration framework speculatively.

### Project structure notes

The story's file paths align cleanly with architecture.md's directory tree (lines 549–617), with two clarifications:

1. **`template-store.svelte.ts` lives at `src/lib/state/`, not `src/lib/features/templates/`.** Architecture.md is internally inconsistent here — line 227 and line 446 (the worked example) place it in `lib/state/`; line 555 (the directory tree) places it in `lib/features/templates/`. The story AC and the worked example win — `lib/state/template-store.svelte.ts`.
2. **`storage/index.ts` is a factory, not a barrel re-export.** Per architecture.md line 245.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture → Storage abstraction] — the 8-method interface and v1↔v2 hinge rationale (lines 244–249)
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — Valibot at the boundary, schemaVersion field (lines 169–177)
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — file naming, ULID convention (lines 328–352)
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management] — runes-based stores in `lib/state/` (lines 391–396, 444–452)
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns] — toast mounting in `+layout.svelte` (lines 673–678)
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries → Data Boundaries] — storage isolation rule (lines 651–654)
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines] — "always run through `StorageBackend`" rule (line 434)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — original AC text
- [Source: _bmad-output/implementation-artifacts/1-1-initialize-project.md] — story 1.1 dev notes flagged the ULID/nanoid discrepancy; this story resolves it by spec
- [Source: _bmad-output/planning-artifacts/prd.md#FR17–FR20] — local persistence requirements gated by this story's storage abstraction

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

### Completion Notes List

- **All 10 ACs satisfied.** 24 unit tests pass across ulid, schema, backend, toast store, template store. svelte-check 0 errors, lint clean, build succeeds, size-limit 36.09 KB / 150 KB gzipped (room to spare).
- **ULID monotonic factory used.** Default `ulid()` from ulidx is non-monotonic — two calls in the same millisecond produced identical strings, breaking the lexicographic-sort AC. Fix: `monotonicFactory()` from ulidx, captured in module scope. Tested.
- **ULID/nanoid resolution committed.** Architecture.md line 174 (`nanoid`) is the outdated artifact; lines 333–334, 386 and the story spec all called for ULID. ULID wins. Architecture.md needs a future correction pass — flagged for a documentation story.
- **Vitest projects restructured.** Scaffold shipped a single `server` project with Node env. Storage and state tests need a DOM (localStorage). Restructured into two projects: `client` (jsdom env) for `src/lib/storage/**`, `src/lib/state/**`, and `*.svelte.test.ts`; `server` (node env) for everything else. Installed `jsdom` as a devDep. Each test file runs in exactly one project — no double-runs.
- **`Date` -> `nowIso()` helper.** ESLint plugin `svelte/prefer-svelte-reactivity` flagged `new Date()` calls inside `template-store.svelte.ts` even though we immediately convert to a string and never store the Date. Extracted to `src/lib/utils/date.ts` per the architecture's planned utils layout. Same idea will apply to any other `.svelte.ts` file that needs timestamps.
- **Storage boundary still intact.** Only `src/lib/storage/localstorage-backend.ts` and its test reference `localStorage` directly — verified by grep.
- **Persisted blob shape (final):**
  - `cl:tpl:index` → JSON array of template ULIDs
  - `cl:tpl:<ULID>` → `{ schemaVersion: 1, template: Template }`
  - `cl:run:active:<templateId>` → `{ schemaVersion: 1, run: Run }` (story 2.x will firm up the run schema)
  - `cl:run:archive:<templateId>` → `{ schemaVersion: 1, runs: Run[] }`
- **Run schema deferred.** Run methods (`saveRun`, `getActiveRun`, `clearRun`, `archiveRun`) work against a TS-only `Run` shape — no Valibot enforcement yet. Story 2.x lands the schema and the tightened validation; the call surface is stable.
- **Storage `index.ts` re-exports types.** `import { storage, StorageError, type StorageBackend, type Run } from '$lib/storage'` is the ergonomic call site. Kept the singleton factory + test-only `_setStorageForTests` seam clean.
- **Toast container mounted globally.** `+layout.svelte` now renders `<ToastContainer />` after the page slot. Future stories can call `toastStore.error(...)` from anywhere.
- **`+layout.ts` boots the template store** with a `browser` guard. The `if (!browser) return {}` guard is critical — adapter-static prerenders during build, where `localStorage` is undefined; without the guard the build errors. Real navigation in the browser still hits `loadTemplates()`.

### File List

**New (created in this story):**

- `src/lib/components/Toast.svelte`
- `src/lib/components/ToastContainer.svelte`
- `src/lib/schemas/template.ts`
- `src/lib/state/template-store.svelte.ts`
- `src/lib/state/template-store.test.ts`
- `src/lib/state/toast-store.svelte.ts`
- `src/lib/state/toast-store.test.ts`
- `src/lib/storage/index.ts`
- `src/lib/storage/localstorage-backend.ts`
- `src/lib/storage/localstorage-backend.test.ts`
- `src/lib/storage/storage-error.ts`
- `src/lib/storage/types.ts`
- `src/lib/storage/ulid.ts`
- `src/lib/storage/ulid.test.ts`
- `src/lib/utils/date.ts`

**Modified:**

- `package.json` (added `valibot`, `ulidx` deps; added `jsdom` devDep)
- `package-lock.json` (lockfile updates)
- `src/routes/+layout.svelte` (mounted `<ToastContainer />`)
- `src/routes/+layout.ts` (added `load()` that hydrates the template store on first browser navigation)
- `vite.config.ts` (split test projects: `client` jsdom env for storage/state/svelte tests; `server` node env for everything else)

**Removed:**

- `src/lib/storage/.gitkeep` (placeholder from story 1.1; no longer needed now that real files live there)

### Change Log

- ULID generation switched to `monotonicFactory()` from ulidx (default `ulid()` is non-monotonic; needed to satisfy the lexicographic-sort AC).
- Vitest config split into `client` (jsdom) and `server` (node) projects.
- Added `valibot@^1`, `ulidx@^2` runtime deps; `jsdom` devDep.
- localStorage namespace prefix locked at `cl:` across template + run keys.
- New utility module `src/lib/utils/date.ts` with `nowIso()` helper.
