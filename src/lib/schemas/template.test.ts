import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { ItemSchema, PersistedTemplateSchema, TemplateSchema } from './template';

const validTemplate = {
	id: '01H0000000000000000000000A',
	name: 'A reasonable template name',
	items: [],
	createdAt: '2026-04-29T12:00:00.000Z',
	updatedAt: '2026-04-29T12:00:00.000Z'
};

describe('TemplateSchema', () => {
	describe('name', () => {
		it('rejects empty string', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, name: '' });
			expect(result.success).toBe(false);
		});

		it('accepts a 1-character name', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, name: 'a' });
			expect(result.success).toBe(true);
		});

		it('accepts a 200-character name (boundary)', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, name: 'a'.repeat(200) });
			expect(result.success).toBe(true);
		});

		it('rejects a 201-character name (over boundary)', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, name: 'a'.repeat(201) });
			expect(result.success).toBe(false);
		});

		it('rejects a non-string name', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, name: 42 });
			expect(result.success).toBe(false);
		});
	});

	describe('id', () => {
		it('rejects empty id', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, id: '' });
			expect(result.success).toBe(false);
		});
	});

	describe('timestamps', () => {
		it('rejects non-ISO createdAt', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, createdAt: 'yesterday' });
			expect(result.success).toBe(false);
		});

		it('rejects non-ISO updatedAt', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, updatedAt: 'yesterday' });
			expect(result.success).toBe(false);
		});
	});

	describe('items', () => {
		it('accepts an empty items array', () => {
			const result = v.safeParse(TemplateSchema, { ...validTemplate, items: [] });
			expect(result.success).toBe(true);
		});

		it('accepts a populated items array', () => {
			const result = v.safeParse(TemplateSchema, {
				...validTemplate,
				items: [{ id: 'item-1', text: 'Pack toothbrush', order: 0 }]
			});
			expect(result.success).toBe(true);
		});

		it('rejects an item with empty text', () => {
			const result = v.safeParse(TemplateSchema, {
				...validTemplate,
				items: [{ id: 'item-1', text: '', order: 0 }]
			});
			expect(result.success).toBe(false);
		});
	});
});

describe('ItemSchema', () => {
	it('accepts a 280-char item text', () => {
		const result = v.safeParse(ItemSchema, { id: 'i', text: 'a'.repeat(280), order: 0 });
		expect(result.success).toBe(true);
	});

	it('rejects a 281-char item text', () => {
		const result = v.safeParse(ItemSchema, { id: 'i', text: 'a'.repeat(281), order: 0 });
		expect(result.success).toBe(false);
	});

	describe('order', () => {
		it('rejects an item missing order', () => {
			const result = v.safeParse(ItemSchema, { id: 'i', text: 'hello' });
			expect(result.success).toBe(false);
		});

		it('rejects negative order', () => {
			const result = v.safeParse(ItemSchema, { id: 'i', text: 'hello', order: -1 });
			expect(result.success).toBe(false);
		});

		it('rejects non-integer order', () => {
			const result = v.safeParse(ItemSchema, { id: 'i', text: 'hello', order: 1.5 });
			expect(result.success).toBe(false);
		});

		it('rejects string order', () => {
			const result = v.safeParse(ItemSchema, { id: 'i', text: 'hello', order: '0' });
			expect(result.success).toBe(false);
		});

		it('accepts order = 0 (boundary)', () => {
			const result = v.safeParse(ItemSchema, { id: 'i', text: 'hello', order: 0 });
			expect(result.success).toBe(true);
		});
	});
});

describe('PersistedTemplateSchema', () => {
	it('accepts schemaVersion 1 envelope', () => {
		const result = v.safeParse(PersistedTemplateSchema, {
			schemaVersion: 1,
			template: validTemplate
		});
		expect(result.success).toBe(true);
	});

	it('rejects schemaVersion 2', () => {
		const result = v.safeParse(PersistedTemplateSchema, {
			schemaVersion: 2,
			template: validTemplate
		});
		expect(result.success).toBe(false);
	});
});
