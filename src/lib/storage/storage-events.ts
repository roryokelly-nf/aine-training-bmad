let _futureSchemaDetected = false;

export function signalFutureSchema(): void {
	_futureSchemaDetected = true;
}

export function consumeFutureSchemaWarning(): boolean {
	const val = _futureSchemaDetected;
	_futureSchemaDetected = false;
	return val;
}

export function _resetFutureSchemaForTests(): void {
	_futureSchemaDetected = false;
}
