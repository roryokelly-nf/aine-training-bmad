import { describe, it, expect } from 'vitest';
import { newId } from './ulid';

describe('newId (ULID)', () => {
	it('returns a 26-character Crockford base32 string', () => {
		const id = newId();
		expect(id).toHaveLength(26);
		expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
	});

	it('two ULIDs generated in sequence sort lexicographically', () => {
		const a = newId();
		const b = newId();
		expect(a < b).toBe(true);
	});

	it('returns a string type', () => {
		expect(typeof newId()).toBe('string');
	});
});
