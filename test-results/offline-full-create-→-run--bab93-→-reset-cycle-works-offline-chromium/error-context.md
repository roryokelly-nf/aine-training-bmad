# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline.spec.ts >> full create → run → tick → go-state → reset cycle works offline
- Location: tests/e2e/offline.spec.ts:9:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Create template' })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'Create template' }) resolved to 2 elements:
    1) <button type="button" aria-disabled="false" class="mt-4 rounded bg-slate-900 px-4 py-2 text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-40">Create template</button> aka getByRole('button', { name: 'Create template' }).first()
    2) <button type="button" class="rounded bg-slate-900 px-4 py-2 text-white">Create template</button> aka getByRole('status').getByRole('button', { name: 'Create template' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Create template' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Templates" [level=1] [ref=e3]
  - button "Create template" [ref=e4]
  - status [ref=e5]:
    - paragraph [ref=e6]: No templates yet on this browser.
    - paragraph [ref=e7]: Templates are stored locally on each browser — they don't sync across browsers in this version. Sync between browsers is on the roadmap.
    - button "Create template" [ref=e8]
  - complementary
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.beforeEach(async ({ page }) => {
  4  | 	await page.goto('/');
  5  | 	await page.evaluate(() => localStorage.clear());
  6  | 	await page.reload();
  7  | });
  8  | 
  9  | test('full create → run → tick → go-state → reset cycle works offline', async ({ page, context }) => {
  10 | 	// App is fully loaded (all assets cached by the static build).
  11 | 	// Now go offline — client-side SvelteKit routing uses the already-loaded JS bundle.
  12 | 	await page.goto('/templates');
> 13 | 	await expect(page.getByRole('button', { name: 'Create template' })).toBeVisible();
     |                                                                      ^ Error: expect(locator).toBeVisible() failed
  14 | 	await context.setOffline(true);
  15 | 
  16 | 	// Navigate via client-side routing (no network request needed in static SPA)
  17 | 	await page.getByRole('button', { name: 'Create template' }).click();
  18 | 	await expect(page).toHaveURL(/\/templates\/new$/);
  19 | 
  20 | 	// Create template
  21 | 	await page.getByLabel('Template name').fill('Flight checklist');
  22 | 	await page.getByRole('button', { name: 'Create' }).click();
  23 | 	await expect(page).toHaveURL(/\/templates\/[^/]+$/);
  24 | 
  25 | 	// Add two items
  26 | 	await page.getByLabel('Add item').fill('Seatbelt on');
  27 | 	await page.keyboard.press('Enter');
  28 | 	await expect(page.getByLabel('Item 1 text')).toBeVisible();
  29 | 
  30 | 	await page.getByLabel('Add item').fill('Tray table up');
  31 | 	await page.keyboard.press('Enter');
  32 | 	await expect(page.getByLabel('Item 2 text')).toBeVisible();
  33 | 
  34 | 	// Start run
  35 | 	await page.getByRole('button', { name: 'Run' }).click();
  36 | 	await expect(page).toHaveURL(/\/run$/);
  37 | 
  38 | 	// Tick both items → reach go-state
  39 | 	await page.getByRole('button', { name: 'Seatbelt on' }).click();
  40 | 	await page.getByRole('button', { name: 'Tray table up' }).click();
  41 | 	await expect(page.getByText('Done.')).toBeVisible();
  42 | 
  43 | 	// Reset
  44 | 	await page.getByRole('button', { name: 'Reset' }).click();
  45 | 	await page.getByRole('dialog').getByRole('button', { name: 'Reset' }).click();
  46 | 
  47 | 	// Back on template detail page — run cleared
  48 | 	await expect(page).toHaveURL(/\/templates\/[^/]+$/);
  49 | 	await expect(page.getByText('Flight checklist')).toBeVisible();
  50 | 	await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
  51 | });
  52 | 
```