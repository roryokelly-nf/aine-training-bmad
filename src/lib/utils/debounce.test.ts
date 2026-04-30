import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('collapses multiple rapid calls into one trailing invocation', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d('a');
		d('b');
		d('c');
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('c');
	});

	it('uses the most recent args, not the first', () => {
		const fn = vi.fn();
		const d = debounce(fn, 50);
		d(1);
		d(2);
		d(3);
		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledWith(3);
	});

	it('does not fire before the window elapses', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d('x');
		vi.advanceTimersByTime(99);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('flush() invokes immediately with the latest args and prevents the trailing call', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d('hello');
		d.flush();
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('hello');
		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('cancel() discards the pending invocation', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d('hello');
		d.cancel();
		vi.advanceTimersByTime(200);
		expect(fn).not.toHaveBeenCalled();
	});

	it('flush() is a no-op when nothing is pending', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d.flush();
		expect(fn).not.toHaveBeenCalled();
	});

	it('cancel() is a no-op when nothing is pending', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		expect(() => d.cancel()).not.toThrow();
		expect(fn).not.toHaveBeenCalled();
	});

	it('can be re-armed after flush', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d('first');
		d.flush();
		d('second');
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenNthCalledWith(1, 'first');
		expect(fn).toHaveBeenNthCalledWith(2, 'second');
	});

	it('can be re-armed after cancel', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d('first');
		d.cancel();
		d('second');
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('second');
	});
});
