import { newId } from '$lib/storage/ulid';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastEntry {
	id: string;
	kind: ToastKind;
	message: string;
	timeoutMs: number;
}

let toasts = $state<ToastEntry[]>([]);

export function getToasts(): ToastEntry[] {
	return toasts;
}

function push(kind: ToastKind, message: string, timeoutMs = 4000): string {
	const id = newId();
	const entry: ToastEntry = { id, kind, message, timeoutMs };
	toasts = [...toasts, entry];
	if (timeoutMs > 0) {
		setTimeout(() => dismiss(id), timeoutMs);
	}
	return id;
}

export const toastStore = {
	success: (m: string, t?: number) => push('success', m, t),
	error: (m: string, t?: number) => push('error', m, t),
	info: (m: string, t?: number) => push('info', m, t)
};

export function dismiss(id: string): void {
	toasts = toasts.filter((t) => t.id !== id);
}

export function _resetForTests(): void {
	toasts = [];
}
