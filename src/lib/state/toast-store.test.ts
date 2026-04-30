import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toastStore, getToasts, dismiss, _resetForTests } from './toast-store.svelte';

describe('toastStore', () => {
	beforeEach(() => {
		_resetForTests();
		vi.useRealTimers();
	});

	it('pushes a success toast', () => {
		toastStore.success('Saved!');
		expect(getToasts()).toHaveLength(1);
		expect(getToasts()[0].kind).toBe('success');
		expect(getToasts()[0].message).toBe('Saved!');
	});

	it('pushes an error toast with alert role intent', () => {
		toastStore.error('Quota exceeded');
		expect(getToasts()[0].kind).toBe('error');
	});

	it('dismiss removes by id', () => {
		toastStore.info('First');
		toastStore.info('Second');
		const firstId = getToasts()[0].id;
		dismiss(firstId);
		expect(getToasts()).toHaveLength(1);
		expect(getToasts()[0].message).toBe('Second');
	});

	it('auto-dismisses after timeout', () => {
		vi.useFakeTimers();
		toastStore.success('Bye', 1000);
		expect(getToasts()).toHaveLength(1);
		vi.advanceTimersByTime(1001);
		expect(getToasts()).toHaveLength(0);
		vi.useRealTimers();
	});

	it('timeoutMs <= 0 disables auto-dismiss', () => {
		vi.useFakeTimers();
		toastStore.error('Sticky', 0);
		vi.advanceTimersByTime(60_000);
		expect(getToasts()).toHaveLength(1);
		vi.useRealTimers();
	});
});
