let _unavailable = $state(false);

export function getStorageUnavailable(): boolean {
	return _unavailable;
}

export function setStorageUnavailable(v: boolean): void {
	_unavailable = v;
}

export function _resetForTests(): void {
	_unavailable = false;
}
