/**
 * Shared mirror registry.
 *
 * Both the integration (`astro:build:done` hook) and the page endpoints
 * import this module. Page endpoints call `registerMirror()` to queue
 * mirror files, and the integration reads them during the build-done
 * hook via `getAndClearMirrors()`.
 */

/**
 * Internal registry of pending mirror files: { path: content }.
 */
const pendingMirrors: Map<string, string> = new Map();

/**
 * Track whether mirrors have been consumed in the current build.
 * Astro should only call astro:build:done once, but HMR/dev-mode
 * edge cases can trigger multiple calls. We warn on the second.
 */
let isConsumed = false;

/**
 * Queue a mirror file for writing to the dist directory.
 */
export function registerMirror(path: string, content: string): void {
	pendingMirrors.set(path, content);
}

/**
 * Retrieve all queued mirrors and clear the registry.
 * Called once per build cycle by `astro:build:done`.
 *
 * If called more than once in the same module lifetime, emits a
 * warning and returns an empty map (mirrors from the first call
 * were already consumed).
 */
export function getAndClearMirrors(): Map<string, string> {
	if (isConsumed) {
		console.warn(
			"[astro-llms] getAndClearMirrors() called more than once. " +
				"Subsequent calls return an empty map. This may indicate " +
				"an unexpected build cycle.",
		);
		return new Map();
	}
	isConsumed = true;
	const mirrors = new Map(pendingMirrors);
	pendingMirrors.clear();
	return mirrors;
}
