import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => localStorage.clear());
	await page.reload();
});

test('full create → run → tick → go-state → reset cycle works offline', async ({ page, context }) => {
	// App is fully loaded (all assets cached by the static build).
	// Now go offline — client-side SvelteKit routing uses the already-loaded JS bundle.
	await page.goto('/templates');
	await expect(page.getByRole('button', { name: 'Create template' })).toBeVisible();
	await context.setOffline(true);

	// Navigate via client-side routing (no network request needed in static SPA)
	await page.getByRole('button', { name: 'Create template' }).click();
	await expect(page).toHaveURL(/\/templates\/new$/);

	// Create template
	await page.getByLabel('Template name').fill('Flight checklist');
	await page.getByRole('button', { name: 'Create' }).click();
	await expect(page).toHaveURL(/\/templates\/[^/]+$/);

	// Add two items
	await page.getByLabel('Add item').fill('Seatbelt on');
	await page.keyboard.press('Enter');
	await expect(page.getByLabel('Item 1 text')).toBeVisible();

	await page.getByLabel('Add item').fill('Tray table up');
	await page.keyboard.press('Enter');
	await expect(page.getByLabel('Item 2 text')).toBeVisible();

	// Start run
	await page.getByRole('button', { name: 'Run' }).click();
	await expect(page).toHaveURL(/\/run$/);

	// Tick both items → reach go-state
	await page.getByRole('button', { name: 'Seatbelt on' }).click();
	await page.getByRole('button', { name: 'Tray table up' }).click();
	await expect(page.getByText('Done.')).toBeVisible();

	// Reset
	await page.getByRole('button', { name: 'Reset' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Reset' }).click();

	// Back on template detail page — run cleared
	await expect(page).toHaveURL(/\/templates\/[^/]+$/);
	await expect(page.getByText('Flight checklist')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
});
