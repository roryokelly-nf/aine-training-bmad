import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { RunSchema, RunItemStateSchema } from './run';

const validRun = {
	templateId: '01TEMPLATE00000000000000001',
	startedAt: '2026-04-30T10:00:00.000Z',
	itemStates: []
};

describe('RunSchema', () => {
	it('accepts a valid run with empty itemStates', () => {
		expect(v.safeParse(RunSchema, validRun).success).toBe(true);
	});

	it('accepts a run with checked and unchecked items', () => {
		const result = v.safeParse(RunSchema, {
			...validRun,
			itemStates: [
				{ itemId: 'I1', checked: true },
				{ itemId: 'I2', checked: false }
			]
		});
		expect(result.success).toBe(true);
	});

	it('rejects run missing templateId', () => {
		const bad = { startedAt: validRun.startedAt, itemStates: validRun.itemStates };
		expect(v.safeParse(RunSchema, bad).success).toBe(false);
	});

	it('rejects run with empty templateId', () => {
		expect(v.safeParse(RunSchema, { ...validRun, templateId: '' }).success).toBe(false);
	});

	it('rejects run with non-ISO startedAt', () => {
		expect(v.safeParse(RunSchema, { ...validRun, startedAt: 'yesterday' }).success).toBe(false);
	});
});

describe('RunItemStateSchema', () => {
	it('rejects itemState with empty itemId', () => {
		expect(v.safeParse(RunItemStateSchema, { itemId: '', checked: false }).success).toBe(false);
	});

	it('rejects itemState with non-boolean checked', () => {
		expect(v.safeParse(RunItemStateSchema, { itemId: 'I1', checked: 'yes' }).success).toBe(false);
	});

	it('accepts valid itemState', () => {
		expect(v.safeParse(RunItemStateSchema, { itemId: 'I1', checked: true }).success).toBe(true);
	});
});
