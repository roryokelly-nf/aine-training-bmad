---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain (skipped)', 'step-06-innovation (skipped)', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
releaseMode: phased
inputDocuments: []
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: greenfield
classificationNotes:
  v1Scope: client-only browser SPA, localStorage-backed; v1 data is throwaway when sharing layer lands
  sharingLayer: publish-and-copy templates via backend; brings identity, moderation, content lifecycle (no real-time collab)
  positioningWedge: undecided; "general-purpose checklist" is placeholder; candidate thesis = repeatable-run / SOP-runner
  distributionGoal: founder wants other people to use it (not personal-only)
  founderMotivation: 'I like checklists'
workflowType: 'prd'
---

# Product Requirements Document - bmad

**Author:** guy
**Date:** 2026-04-28

## Executive Summary

A browser-based checklist application for people who run the same multi-step procedures repeatedly — packing trips, weekly routines, deploy runbooks, recipes, ops procedures. Users author **reusable templates**, instantiate them as **runs**, tick items as they go, and finish to a fully-ticked **"go state"** that stays visible rather than disappearing on completion. Runs can be archived for record-keeping or reset for the next iteration. v1 is a client-only web app backed by browser localStorage with no authentication; a planned future layer adds a backend that lets users **publish templates for others to copy** (sharing-by-copy, not real-time collaboration). v1 data is intentionally throwaway when the sharing layer lands — the v1 deliverable optimizes for simplicity, not forward-compatibility.

### What Makes This Special

The wedge against general-purpose todo apps (Todoist, Apple Reminders, Notion, TickTick) is a different optimization target: those apps treat completion as deletion and a list as ephemeral. This product treats completion as **state worth preserving** and a list as **a procedure worth re-running**.

- **Re-run, don't rebuild.** Templates are first-class objects. Instantiating a run from a template is the core verb. Users who do the same procedure weekly do not recreate or duplicate-then-edit a list every time.
- **Completion is visible, not erased.** Ticked items stay visible inside a run. A fully-ticked run resolves to an explicit "go state" — the visual payoff *is* the product. Completion is not a delete event.
- **Copy and use, no friction.** Published templates are grab-and-go via a single copy action; no screenshots, no manual retyping, no shared editing surface to coordinate.

**Core insight:** Generic todo apps optimize for *clearing the list*. Procedural checklists optimize for *finishing the procedure with confidence and a record*. Most incumbents have chosen the wrong endpoint for this user, and the gap is structural rather than cosmetic.

## Project Classification

- **Project Type:** `web_app` (browser-based SPA; v1 is the client-only slice of a web_app whose roadmap includes a server-side sharing layer)
- **Domain:** `general` (consumer productivity; no regulated-industry constraints. Positioning wedge — "repeatable-run / SOP-runner" — is a candidate thesis to be sharpened during the PRD, not a confirmed market segment)
- **Complexity:** `medium` (v1 is genuinely low: localStorage CRUD with throwaway data. Sharing layer adds identity, publishing, moderation, and content-lifecycle concerns that pull the *project as a whole* into medium territory)
- **Project Context:** `greenfield` (no prior code, no migration burden, no existing users)

## Success Criteria

### User Success

- A first-time visitor can author a template, run it, and reach the go-state without reading any docs.
- A returning user re-runs their most-used template in ≤ 2 taps/clicks from the home screen.
- The "aha" moment is the first **re-run** — the user opens an existing template, instantiates a fresh run, and realizes they did not have to rebuild anything.
- The end-of-run go-state is the emotional payoff: a finished checklist that visibly reads as **complete**, not as an empty list.

### Business Success

- **3-month target:** ≥ 50 weekly active users, each running at least one template per week.
- **12-month target:** ≥ 1,000 weekly active users; once the sharing layer ships, ≥ 100 templates published to the public registry.
- **Monetization:** free in v1 and Growth; optional paid hosted-sharing tier deferred to Vision or later.

### Technical Success

- App loads and is interactive in under 2s on a mid-range phone over 4G.
- Zero data loss during normal localStorage operation; explicit messaging when storage is unavailable, full, or has been cleared by the browser.
- Latest two versions of Chrome, Safari, Firefox, and Edge — desktop and mobile.
- v1 works fully without network access once the page has loaded (no backend dependency).

### Measurable Outcomes

- Template-creation completion rate (start → save) ≥ 70% for first-time users.
- Run-completion rate (start → go-state) ≥ 60% per run started.
- 7-day return rate ≥ 30% for users who saved at least one template.
- p95 UI interaction latency ≤ 100ms (tick, navigate, save).

## Product Scope

### MVP — Minimum Viable Product

The smallest set that proves the wedge ("re-run, don't rebuild" + visible go-state):

1. **Create / edit / delete templates** — the authoring surface.
2. **Run a template** — instantiate a run, tick items, reach the go-state when fully ticked.
3. **Reset and re-run** — wipe a run's state in place to start over from the same template.

### Growth Features (Post-MVP)

The features that make it competitive and unlock the sharing thesis:

- **Archive completed runs** with history (record-keeping, not just reset).
- **Item refinements:** reorder, nested items, item notes.
- **Publish a template** to a public registry.
- **Browse / search / copy** others' published templates.
- **Mobile / PWA install** so the app can be added to a phone home screen.

### Vision (Future)

Larger investments, deferred until the wedge is proven:

- **Drag-and-drop template editor** (richer authoring UX).
- **Accounts and login** (and the identity / moderation surface that comes with publishing).
- **Export / import templates as JSON** (portability, backup, escape hatch).
- **Themes / dark mode.**

## User Journeys

### Persona 1 — Maya (Primary user / template author)

A 34-year-old project manager who travels for work twice a month, runs the same Sunday-morning grocery list every week, and hosts a recurring D&D session that requires the same setup every time. She likes order. She is a *frequent re-doer of the same procedure*. Her current tool is Apple Reminders, which loses context the moment she ticks an item, and a Google Doc, which she keeps editing in place and losing track of.

#### Journey 1A — Success path: first template, first run *(MVP)*

- **Opening scene.** 7:14 AM Tuesday. Maya is in her kitchen, half-dressed, leaving for a four-day trip in two hours. She has lost her old packing checklist again. She googles "checklist app re-runnable" out of frustration and lands on the product.
- **Rising action.** No signup wall. She taps **Create template**, names it "Travel pack — 4-day work trip," and types items as fast as she can think them. She saves. She taps **Run** on the new template. Items appear unticked.
- **Climax.** As she packs, she ticks items one-handed with greasy thumbs. Items stay visible after she ticks them — she can see *what's still left* and *what's already done* in the same glance. The last item ticks and the run resolves to a green **go-state** that says, plainly, *all packed*.
- **Resolution.** Friday evening, she's home. She opens the app on her laptop. Her template is still there. She taps **Reset** and the list is fresh for next month's trip. She did not rebuild a single item.
- **Capabilities revealed.** Template create / edit / save (v1). Template list view. Run instantiation. Tick state persistence within a run. Visible go-state. Reset. localStorage durability across sessions and devices on the same browser.

#### Journey 1B — Edge case: localStorage cleared *(MVP)*

- **Opening scene.** Same Maya, three weeks later. She switched browsers (started using Arc instead of Safari). She opens the app on her phone in Arc and sees no templates.
- **Rising action.** Confusion. *Did I delete it? Did the app delete it?* She is one tap from leaving forever and writing the app off as broken.
- **Climax.** The empty state is honest: *"No templates yet on this browser. Templates are stored locally on each browser — they don't sync across browsers in this version. Your Safari templates are still there."* A muted secondary line: *"Sync between browsers is on the roadmap."*
- **Resolution.** Maya re-opens Safari, finds her templates intact, mentally accepts the constraint, and goes back to using the app where she originally created it. She does not rage-quit.
- **Capabilities revealed.** Honest empty-state messaging when localStorage is empty for this origin/browser. Storage-quota error handling. Optional: simple JSON export/import as the manual escape hatch (Vision-tier feature, but flagged here as the long-term answer to this journey).

### Persona 2 — Sam (Primary user / publisher) *(Growth)*

A 41-year-old DevOps engineer who has built a "Production deploy" runbook he runs every Friday. Three teammates have asked him for it. He has been pasting it into Slack. He wants a place to put it where someone can grab and use it without him being on call to explain.

#### Journey 2 — Publish a template to the registry *(Growth)*

- **Opening scene.** Sam already uses the app for his deploy runbook. The Growth release lands. A new **Publish** button appears next to his template.
- **Rising action.** He taps Publish. He's asked for a template title (already filled), a one-line description, and a handful of tags ("devops", "deploy"). No login is required for v1 of publishing — the registry uses an anonymous handle generated client-side, persisted in localStorage. *(Or: requires login; pick one — see open question.)*
- **Climax.** A shareable link appears. He pastes it into Slack. A teammate clicks it, taps **Copy**, and the template lands in their own template list as a fresh, editable copy — not a live-shared instance.
- **Resolution.** The teammate runs their own version, marks it up the way they prefer. Sam's original is untouched. Two days later Sam updates his template; his teammate's copy is unaffected — copy means *fork*, not *follow*.
- **Capabilities revealed.** Publish flow. Public registry storage and retrieval. Shareable URL. **Copy-on-clone semantics** (forking, not symlinking). Tagging. A minimal authorship model (anonymous handle vs login — open question).

### Persona 3 — Pat (Primary user / template consumer) *(Growth)*

A 28-year-old new manager onboarding to a team. She has never written an SOP in her life. She knows other people have. She wants someone else's checklist for "running a 1:1," not to invent her own.

#### Journey 3 — Discover and copy a published template *(Growth)*

- **Opening scene.** Pat opens the app, lands on the Browse tab. Featured / popular templates appear, plus a search bar.
- **Rising action.** She searches "1:1." Three templates appear with author handles, descriptions, and item counts. She previews one — items are visible without copying.
- **Climax.** She taps **Copy to my templates**. The template appears in her template list, immediately editable. She edits two items to reflect her team's quirks.
- **Resolution.** She runs the template before her next 1:1 the same afternoon. She did not start from a blank screen. She also did not invent the structure — somebody else did the thinking.
- **Capabilities revealed.** Browse / search the registry. Preview without copy. Copy-to-mine action. Light featuring or popularity ranking. Moderation surface (deferred — flagged as a Growth-era requirement once user-generated content lives on a public surface).

### Journey Requirements Summary

The journeys above reveal the following capability buckets — grouped by horizon:

**MVP capabilities (revealed by journeys 1A and 1B):**
- Template authoring: create, name, edit items, save, delete.
- Template list view.
- Run instantiation from a template.
- Tick state persisted within a run.
- Visible go-state on full completion.
- Reset a run in place.
- localStorage persistence with honest empty-state messaging when storage is unavailable, cleared, or scoped to a different browser.

**Growth capabilities (revealed by journeys 2 and 3):**
- Publish a template to a public registry.
- Browse and search the registry.
- Preview a published template without copying.
- Copy-to-mine (fork) semantics — not symlinks, not live-shared.
- Authorship attribution (handle, anonymous or authenticated — open question).
- Moderation surface for user-generated content.
- Tagging / categorization.

**Vision capabilities (referenced as long-term answers to journey 1B and beyond):**
- Cross-browser / cross-device sync (only meaningful with accounts and a backend).
- JSON export / import (manual escape hatch, also a power-user feature).

**Open questions surfaced by these journeys:**
1. **Anonymous publishing vs login-required publishing in Growth.** Journey 2 currently sketches anonymous handles; this avoids accounts entirely but weakens moderation and reputation. Decision deferred — flag for the Architecture step.
2. **Run history.** Journey 1A ends with "Reset" — the previous run's tick history is gone. This is consistent with MVP scope (Archive is a Growth feature). Confirmed not a regression for MVP.
3. **What counts as "popular" or "featured" in journey 3.** Out of scope for MVP. Decision deferred until the registry has actual content.

## Web App Specific Requirements

### Project-Type Overview

A single-page web application (SPA), browser-resident, with **no backend dependency in v1**. The application is loaded once, then operates entirely against `localStorage` for the lifetime of the user's session and across subsequent visits in the same browser. The Growth release introduces a backend layer for the public template registry; the core authoring-and-running experience continues to operate locally even when the registry is unreachable.

### Technical Architecture Considerations

- **Application shell:** SPA architecture; client-side routing for the small set of views (template list, template editor, run view, and — in Growth — registry browse / template detail).
- **Storage:** `localStorage` is the v1 source of truth for templates, run state, and any preferences. v1 data is intentionally throwaway; the schema is designed for the v1 product, not for forward-compatibility with the Growth backend.
- **Network:** v1 requires the network only to load the static assets. Once loaded, every interaction is local. Growth adds outbound HTTPS calls to the registry for publish, browse, search, and copy — all non-blocking to local authoring.
- **Build & delivery:** static build deployable behind any CDN; no server-side rendering required in v1. Growth-era SEO needs (registry pages) will require SSR/SSG for the public-facing registry surface only — not the authoring app.

### Browser Matrix

- **Desktop:** latest two stable versions of Chrome, Safari, Firefox, Edge.
- **Mobile:** latest two stable versions of Chrome (Android), Safari (iOS), Firefox (Android), Samsung Internet.
- **Not supported:** Internet Explorer; legacy/embedded browsers; in-app browsers below Chromium 100 or WebKit 16.

### Responsive Design

- **Mobile-web first.** The hot path of the product is *ticking items during a real procedure*, which usually happens on a phone. The run view is designed for one-thumb interaction at small viewports first, then enhanced for tablet and desktop.
- **Breakpoints:** small (≤ 480 px), medium (481–768 px), large (≥ 769 px). The template editor is permitted to be desktop-leaning; the run view must be excellent on small viewports.
- **Touch targets:** tick affordances ≥ 44 × 44 CSS pixels on touch devices, per Apple HIG / Material guidance.

### Performance Targets

Performance targets are stated as testable NFRs — see **NFR1–NFR5**. Summary: load and interactive in under 2s on mid-range mobile over 4G, ≤ 150 KB gzipped initial bundle (CI-gated hard budget), ≤ 100ms p95 interaction latency for tick/navigate/save, Core Web Vitals (LCP, INP, CLS) in Google's "good" thresholds on the run view at the small viewport.

### SEO Strategy

- **MVP:** no public-facing surface. The authoring app does not need indexing. A single static landing page (one URL) is acceptable; OpenGraph metadata for shareable home URL is sufficient.
- **Growth:** the public template registry **requires** SEO. Each published template gets an indexable, server-rendered page with a clear title, description, item count, tags, and author handle. Search-engine traffic is a primary acquisition channel for the registry (per Pat's journey: she searches "1:1 checklist" and lands on a template). Implementation: SSR or SSG for the registry surface; the authoring app remains a client-rendered SPA.
- **Vision:** structured data (`HowTo`, `ItemList`) on registry pages to surface checklists in rich results.

### Accessibility Level

- **MVP target:** keyboard navigability + readable contrast — see **NFR17, NFR18, FR44**. Form fields in the template editor have associated labels.
- **Growth target:** full WCAG 2.1 AA conformance — see **NFR19, FR45**. Audited with axe / Lighthouse plus a manual screen-reader pass on the run view.
- **Explicitly deferred from MVP:** screen-reader optimization beyond default semantics, full colour-contrast audit beyond key surfaces, reduced-motion preferences, language declarations beyond the document root.

### Implementation Considerations

- **Framework choice is open** — any modern SPA framework (React, Vue, Svelte, Solid, Preact, or vanilla) can meet the bundle and performance targets. Pick the one with lowest cognitive overhead for the team; the product does not have framework-specific needs.
- **Storage abstraction:** wrap `localStorage` access behind a thin storage interface in v1 so that the Growth migration can swap in a remote backend without rewriting call sites — even though v1 data is throwaway, the *call surface* should not be.
- **Error handling:** graceful degradation when `localStorage` is unavailable (private mode, quota exceeded, disabled). Surface honest empty-state messaging per Journey 1B.
- **Sections explicitly skipped (from CSV `skip_sections`):** `native_features`, `cli_commands`. This is a browser app; native bridges and command-line surfaces are out of scope.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach: Experience MVP.** The wedge of this product is not a new feature in a known category — it's a *different optimization target* (completion is preserved state, not deletion; templates are first-class). Therefore the MVP succeeds or fails on whether the **core experience** lands: can a user create a template, run it, hit the visible go-state, and reset it for next time, all without help and within ninety seconds?

This is not a Problem-Solving MVP (the problem isn't novel — checklists are universal), nor a Revenue MVP (no monetization in v1), nor a Platform MVP (no extensibility surface). Experience MVP is the right framing: invest exactly enough to make the four nouns of the mental model (**template → run → tick → archive/reset**) feel obvious, fast, and unambiguous, and ship.

**Resource Requirements:**
- One full-stack web engineer (frontend-leaning) — a few weeks of focused work, given no backend in v1.
- Optional: a designer or design-conscious eye for the run view and go-state animation. The product's emotional payoff lives there; under-investment here flattens the wedge.
- No backend, DBA, DevOps, or compliance roles needed for MVP.
- Growth phase requires a backend engineer (or full-stack) for the registry service and the SSR/SSG-rendered template pages.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1A — Maya's first template, first run, first reset (success path, MVP).
- Journey 1B — Maya hits an empty localStorage on a different browser and gets honest messaging (edge case, MVP).

**Must-Have Capabilities** — the FR contract for MVP: Template Authoring (**FR1–FR7**), Run Execution (**FR8–FR13**), Reset & Re-Run (**FR14–FR16**), Local Persistence & State Recovery (**FR17–FR20**), and the keyboard + contrast accessibility floor (**FR44, NFR17–NFR18**). The visible go-state (**FR12**) is **not optional** — it carries the wedge.

**Explicitly NOT in MVP** (deferred with rationale):
- *Archive of completed runs:* Growth. Reset is sufficient to prove the re-run loop; archive is record-keeping, which is a second-order benefit.
- *Reorder, nested items, item notes:* Growth. A flat list of plain items is enough to validate the wedge; richness can wait for evidence.
- *Mobile/PWA install:* Growth. Mobile-web works without install; "add to home screen" is a polish lap, not a wedge.
- *Drag-and-drop editor:* Vision. Add-edit-delete is sufficient authoring for MVP.
- *Accounts, login, sync:* Vision. v1 is single-browser, throwaway-data on purpose.
- *Export/import JSON:* Vision. Manual escape hatch; not needed to validate the experience.
- *Themes / dark mode:* Vision. Pure polish; does not move the wedge.

### Post-MVP Features

**Phase 2 — Growth (post-MVP, post-validation):** Run History & Archive (**FR21–FR24**), Item Refinements (**FR25–FR27**), Template Sharing — Publish (**FR28–FR32**), Template Discovery — Browse & Copy (**FR33–FR38**), Mobile / PWA (**FR39–FR40**), Identity & Moderation (**FR41–FR43**), full WCAG 2.1 AA (**NFR19, FR45**), SSR/SSG-rendered registry pages (per SEO Strategy). The anonymous-vs-authenticated authorship decision (**FR31**) is deferred to Architecture.

**Phase 3 — Vision (long-horizon, no commitment):** Portability & Cross-Device Sync (**FR46–FR48**), drag-and-drop template editor, themes / dark mode, structured-data SEO on registry pages (`HowTo`, `ItemList`).

### Risk Mitigation Strategy

**Technical Risks:**
- *localStorage durability and quota.* The most realistic v1 failure mode. Mitigation: wrap storage behind an interface; detect quota and unavailability up front; surface honest messaging per Journey 1B; budget item-count and template-count limits well below browser quotas (e.g., target ≤ 5 MB total app footprint).
- *Bundle bloat from framework choice.* Mitigation: enforce the 150 KB gzipped budget as CI-gated; pick a small-footprint framework (Preact, Solid, Svelte, vanilla) if React's overhead pushes the budget.
- *Growth-era data migration.* Mitigation: declare v1 data throwaway (already done); design v2 schema cleanly without trying to forward-port v1 blobs.

**Market Risks:**
- *Saturated category, weak wedge.* The biggest risk. Mitigation: validate the wedge against a small audience (10–30 users; founder's network, indie-hacker forums) before investing in Growth. The success metric to watch is the **7-day return rate** for users who saved at least one template — if that's below ~30%, the "re-run, don't rebuild" thesis is not landing and the build pause should be longer than the build sprint.
- *Founder motivation drift.* The stated motivation is "I like checklists" — strong personal pull is a great launch fuel and a poor sustaining strategy if usage data is silent. Mitigation: instrument template-creation and run-completion from day one; even a tiny feedback loop beats vibes.

**Resource Risks:**
- *Single-developer scope creep into Growth.* The publish-and-copy registry is structurally bigger than v1. Mitigation: hard-stop release boundary between MVP and Growth; do not start Growth work until MVP has shipped, been used by ≥ 10 distinct users, and the wedge metric (7-day return ≥ 30%) is met or honestly reckoned with.
- *Under-investment in the go-state moment.* This is the wedge in animated form. Mitigation: spend a disproportionate share of the polish budget here (motion, copy, color) — it carries the differentiation no other surface does.

## Functional Requirements

This section is the **capability contract** for the entire product. UX, architecture, and epic breakdown will only design, support, and implement what is listed here. Phase tags (`MVP` / `Growth` / `Vision`) match the scoping in the previous section.

### Template Authoring *(MVP)*

- **FR1:** Users can create a new checklist template with a name.
- **FR2:** Users can add items to a template.
- **FR3:** Users can edit any item's text in a template.
- **FR4:** Users can remove items from a template.
- **FR5:** Users can rename an existing template.
- **FR6:** Users can delete a template.
- **FR7:** Users can view a list of all templates they have authored on the current browser.

### Run Execution *(MVP)*

- **FR8:** Users can instantiate a run from a template in a single action.
- **FR9:** Users can tick an item within a run to mark it complete.
- **FR10:** Users can untick a previously ticked item within a run.
- **FR11:** Ticked items remain visible within the run (completion is preserved state, not removal).
- **FR12:** A run reaches an explicit, visually distinct **go-state** when every item is ticked.
- **FR13:** Users can navigate between the template list and an active run without losing tick state.

### Reset & Re-Run *(MVP)*

- **FR14:** Users can reset an active run, clearing tick state while preserving the underlying template.
- **FR15:** Users can re-instantiate a run from the same template at any time after reset.
- **FR16:** Each template has at most one active run at a time; starting a new run replaces the previous run for that template. *(Confirm: this is the v1 model — no concurrent runs of the same template.)*

### Local Persistence & State Recovery *(MVP)*

- **FR17:** All template data persists across browser sessions in localStorage.
- **FR18:** Active run tick state persists across browser sessions in localStorage.
- **FR19:** The system surfaces honest empty-state messaging when localStorage is empty for the current origin/browser, including an explicit note that templates do not sync across browsers in v1.
- **FR20:** The system surfaces an explicit error message when localStorage is unavailable, full, or has been cleared by the browser, distinguishing these states from "no templates yet."

### Run History & Archive *(Growth)*

- **FR21:** Users can archive a completed run as a permanent record at the moment they reach the go-state, before reset.
- **FR22:** Users can view a list of archived runs for a given template.
- **FR23:** Users can open an archived run to view its items and tick state as they were at archive time.
- **FR24:** Users can delete an archived run.

### Item Refinements *(Growth)*

- **FR25:** Users can reorder items within a template.
- **FR26:** Users can nest an item as a sub-item beneath a parent item.
- **FR27:** Users can attach a note to an item; the note is visible during a run.

### Template Sharing — Publish *(Growth)*

- **FR28:** Users can publish a template they own to the public registry.
- **FR29:** Users can attach a title, one-line description, and tags to a template when publishing.
- **FR30:** Each published template is reachable via a stable, shareable URL.
- **FR31:** Each published template carries an authorship attribution. *(Open question for Architecture: anonymous client-generated handle persisted in localStorage, vs. authenticated account. Decision deferred.)*
- **FR32:** Users can unpublish a template they have published, removing it from the public registry.

### Template Discovery — Browse & Copy *(Growth)*

- **FR33:** Users can browse a list of publicly published templates.
- **FR34:** Users can search the public registry by title, description, or tag.
- **FR35:** Users can preview a published template's items without copying it.
- **FR36:** Users can copy a published template into their own template list with a single action.
- **FR37:** A copied template is independent of the source: edits to the source do not propagate to the copy, and edits to the copy do not affect the source. (Fork semantics, not symlink.)
- **FR38:** The system surfaces featured or popular templates on the registry browse surface. *(Ranking signal definition deferred until the registry has content — see open question.)*

### Mobile / PWA *(Growth)*

- **FR39:** Users can install the application as a Progressive Web App on supported mobile platforms.
- **FR40:** The installed PWA supports the full authoring and run experience offline once installed, matching v1 in-browser behaviour.

### Identity & Moderation *(Growth)*

- **FR41:** Each published template displays an authorship handle visible to viewers.
- **FR42:** Users can flag a published template for moderation review.
- **FR43:** Operators can remove a flagged template from the public registry.

### Accessibility *(cross-cutting)*

- **FR44:** All interactive elements (tick, save, create, reset, navigate) are operable via keyboard alone, with a visible focus state. *(MVP)*
- **FR45:** All dynamic state changes (tick, untick, reaching go-state, reset) are announced to assistive technologies. *(Growth — part of full WCAG 2.1 AA conformance.)*

### Portability & Cross-Device Sync *(Vision)*

- **FR46:** Users can export their templates and run history as a JSON file.
- **FR47:** Users can import templates from a previously exported JSON file.
- **FR48:** Users with accounts can sync templates and run state across browsers and devices.

## Non-Functional Requirements

This section is the **quality contract** — how well the system must perform. Only categories that materially apply to a localStorage-first browser app with a Growth-era public registry are included; integration NFRs are intentionally absent.

### Performance

- **NFR1:** First Contentful Paint ≤ 1.5s on a mid-range Android phone over 4G.
- **NFR2:** Time-to-Interactive ≤ 2s on the same baseline.
- **NFR3:** p95 UI interaction latency ≤ 100ms for tick, navigate, and save.
- **NFR4:** Initial JavaScript bundle ≤ 150 KB gzipped, enforced as a CI-gated hard budget.
- **NFR5:** Core Web Vitals (LCP, INP, CLS) within Google's "good" thresholds on the run view at the small viewport.

### Reliability & Data Durability

- **NFR6:** Zero data loss during normal localStorage operation: save → reload → state restored exactly.
- **NFR7:** When localStorage is unavailable, full, or cleared, the system fails safely with explicit, distinguishable messaging — never silently and never with a generic error.
- **NFR8:** v1 functions fully without network connectivity once static assets have loaded.
- **NFR9 (Growth):** Public registry availability ≥ 99.5% measured monthly. Registry downtime never blocks local authoring or run execution.

### Security & Privacy

- **NFR10 (MVP):** v1 collects no personal data and stores no user data outside the browser.
- **NFR11 (Growth):** Published template content is sanitized against script injection (XSS) when rendered on registry surfaces.
- **NFR12 (Growth):** All registry traffic is served over HTTPS.
- **NFR13 (Growth):** Flagged content can be reviewed and, if warranted, removed within 24 hours of being flagged.
- **NFR14 (Growth):** Authorship handles — anonymous or authenticated — do not expose personally identifiable information by default.

### Scalability

- **NFR15:** v1 supports at least 100 templates per browser and 1,000 items per template without perceptible slowdown, with total app data footprint ≤ 5 MB (well below localStorage quotas).
- **NFR16 (Growth):** Public registry supports ≥ 10,000 published templates and ≥ 1,000 concurrent browse/search requests at the 12-month traffic target.

### Accessibility

- **NFR17 (MVP):** All interactive elements operable via keyboard alone, with visible focus state on every focusable element.
- **NFR18 (MVP):** Text and key UI elements meet ≥ 4.5:1 contrast; the go-state green meets contrast for both text-on-green and icon-on-green.
- **NFR19 (Growth):** Full WCAG 2.1 AA conformance, audited with axe/Lighthouse plus a manual screen-reader pass on the run view.

### Compatibility

- **NFR20:** Application functions on the latest two stable versions of Chrome, Safari, Firefox, and Edge — desktop and mobile (including Samsung Internet on Android).
- **NFR21:** Internet Explorer, in-app browsers below Chromium 100 / WebKit 16, and legacy embedded browsers are explicitly out of scope.
