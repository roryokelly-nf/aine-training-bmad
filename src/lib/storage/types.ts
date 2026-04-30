import type { Template } from '$lib/schemas/template';
export type { Run, RunItemState } from '$lib/schemas/run';
import type { Run } from '$lib/schemas/run';

export interface StorageBackend {
	getTemplates(): Promise<Template[]>;
	getTemplate(id: string): Promise<Template | null>;
	saveTemplate(t: Template): Promise<void>;
	deleteTemplate(id: string): Promise<void>;
	getActiveRun(templateId: string): Promise<Run | null>;
	saveRun(r: Run): Promise<void>;
	clearRun(templateId: string): Promise<void>;
	archiveRun(r: Run): Promise<void>;
}
