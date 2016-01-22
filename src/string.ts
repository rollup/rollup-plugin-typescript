export function endsWith ( str: string, tail: string ): boolean {
	return !tail.length || str.slice( -tail.length ) === tail;
}
