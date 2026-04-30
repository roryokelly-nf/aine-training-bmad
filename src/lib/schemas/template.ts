import * as v from 'valibot';

export const ItemSchema = v.object({
	id: v.pipe(v.string(), v.nonEmpty()),
	text: v.pipe(v.string(), v.minLength(1), v.maxLength(280)),
	order: v.pipe(v.number(), v.integer(), v.minValue(0))
});

export const TemplateSchema = v.object({
	id: v.pipe(v.string(), v.nonEmpty()),
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
	items: v.array(ItemSchema),
	createdAt: v.pipe(v.string(), v.isoTimestamp()),
	updatedAt: v.pipe(v.string(), v.isoTimestamp())
});

export const PersistedTemplateSchema = v.object({
	schemaVersion: v.literal(1),
	template: TemplateSchema
});

export type Item = v.InferOutput<typeof ItemSchema>;
export type Template = v.InferOutput<typeof TemplateSchema>;
export type PersistedTemplate = v.InferOutput<typeof PersistedTemplateSchema>;
