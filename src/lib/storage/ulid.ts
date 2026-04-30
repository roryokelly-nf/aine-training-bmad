import { monotonicFactory } from 'ulidx';

const generate = monotonicFactory();

export function newId(): string {
	return generate();
}
