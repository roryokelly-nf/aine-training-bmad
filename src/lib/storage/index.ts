import type { StorageBackend } from './types';
import { LocalStorageBackend } from './localstorage-backend';

let _instance: StorageBackend | null = null;

export function storage(): StorageBackend {
	if (!_instance) _instance = new LocalStorageBackend();
	return _instance;
}

export function _setStorageForTests(backend: StorageBackend | null): void {
	_instance = backend;
}

export type { StorageBackend, Run } from './types';
export { StorageError } from './storage-error';
export type { StorageErrorKind } from './storage-error';
export { consumeFutureSchemaWarning } from './storage-events';
