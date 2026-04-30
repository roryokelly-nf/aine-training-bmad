export type StorageErrorKind =
	| 'QUOTA_EXCEEDED'
	| 'UNAVAILABLE'
	| 'INVALID'
	| 'NOT_FOUND'
	| 'UNKNOWN';

export class StorageError extends Error {
	readonly kind: StorageErrorKind;
	readonly cause?: unknown;

	constructor(kind: StorageErrorKind, message: string, cause?: unknown) {
		super(message);
		this.name = 'StorageError';
		this.kind = kind;
		this.cause = cause;
	}
}
