import { describe, it, expect, beforeEach } from 'vitest';
import {
	getStorageUnavailable,
	setStorageUnavailable,
	_resetForTests
} from './storage-status.svelte';

beforeEach(() => {
	_resetForTests();
});

describe('storage-status', () => {
	it('is false by default', () => {
		expect(getStorageUnavailable()).toBe(false);
	});

	it('set to true is readable', () => {
		setStorageUnavailable(true);
		expect(getStorageUnavailable()).toBe(true);
	});

	it('set back to false', () => {
		setStorageUnavailable(true);
		setStorageUnavailable(false);
		expect(getStorageUnavailable()).toBe(false);
	});
});
