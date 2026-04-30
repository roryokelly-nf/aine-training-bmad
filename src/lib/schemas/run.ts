import * as v from 'valibot';

export const RunItemStateSchema = v.object({
	itemId: v.pipe(v.string(), v.nonEmpty()),
	checked: v.boolean()
});

export const RunSchema = v.object({
	templateId: v.pipe(v.string(), v.nonEmpty()),
	startedAt: v.pipe(v.string(), v.isoTimestamp()),
	itemStates: v.array(RunItemStateSchema)
});

export type RunItemState = v.InferOutput<typeof RunItemStateSchema>;
export type Run = v.InferOutput<typeof RunSchema>;
