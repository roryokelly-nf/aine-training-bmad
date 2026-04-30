import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => localStorage.clear());
	await page.reload();
});

test('template name and items persist across page reload', async ({ page }) => {
	// Create a template
	await page.goto('/templates/new');
	await page.getByLabel('Template name').fill('Preflight');
	await page.getByRole('button', { name: 'Create' }).click();

	// Now on /templates/{id} — add an item
	await page.getByLabel('Add item').fill('Check fuel');
	await page.keyboard.press('Enter');

	// Wait for the item to appear in the list
	await expect(page.getByLabel('Item 1 text')).toBeVisible();

	// Navigate to templates list and verify
	await page.goto('/templates');
	await expect(page.getByText('Preflight')).toBeVisible();

	// Reload — template must still be there
	await page.reload();
	await expect(page.getByText('Preflight')).toBeVisible();
});

test('run tick state persists across page reload', async ({ page }) => {
	// Create a template with two items
	await page.goto('/templates/new');
	await page.getByLabel('Template name').fill('Deploy checklist');
	await page.getByRole('button', { name: 'Create' }).click();

	// Add item 1
	await page.getByLabel('Add item').fill('Step 1');
	await page.keyboard.press('Enter');
	await expect(page.getByLabel('Item 1 text')).toBeVisible();

	// Add item 2
	await page.getByLabel('Add item').fill('Step 2');
	await page.keyboard.press('Enter');
	await expect(page.getByLabel('Item 2 text')).toBeVisible();

	// Start a run
	await page.getByRole('button', { name: 'Run' }).click();
	await expect(page).toHaveURL(/\/run$/);

	// Tick item 1 only
	await page.getByRole('button', { name: 'Step 1' }).click();
	await expect(page.getByRole('button', { name: 'Step 1' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.getByRole('button', { name: 'Step 2' })).toHaveAttribute(
		'aria-pressed',
		'false'
	);

	// Reload — tick state must be preserved.
	// Wait for the "1 of 2" counter to confirm the run has loaded before asserting tick state.
	await page.reload();
	await expect(page.getByText('1 of 2')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Step 1' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.getByRole('button', { name: 'Step 2' })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
});
