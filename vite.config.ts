import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), svelteTesting()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'jsdom',
					include: [
						'src/lib/storage/**/*.{test,spec}.{js,ts}',
						'src/lib/state/**/*.{test,spec}.{js,ts}',
						'src/**/*.svelte.{test,spec}.{js,ts}'
					]
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: [
						'src/lib/storage/**/*.{test,spec}.{js,ts}',
						'src/lib/state/**/*.{test,spec}.{js,ts}',
						'src/**/*.svelte.{test,spec}.{js,ts}'
					]
				}
			}
		]
	}
});
