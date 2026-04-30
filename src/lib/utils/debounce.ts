export interface Debounced<Args extends unknown[]> {
	(...args: Args): void;
	flush(): void;
	cancel(): void;
}

export function debounce<Args extends unknown[]>(
	fn: (...args: Args) => void,
	ms: number
): Debounced<Args> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: Args | null = null;

	const debounced = ((...args: Args) => {
		pending = args;
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(() => {
			const a = pending;
			timer = null;
			pending = null;
			if (a) fn(...a);
		}, ms);
	}) as Debounced<Args>;

	debounced.flush = () => {
		if (timer === null) return;
		clearTimeout(timer);
		const a = pending;
		timer = null;
		pending = null;
		if (a) fn(...a);
	};

	debounced.cancel = () => {
		if (timer !== null) clearTimeout(timer);
		timer = null;
		pending = null;
	};

	return debounced;
}
