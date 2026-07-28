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
 * Queue a mirror file for writing to the dist directory.
 */
export function registerMirror(path: string, content: string): void {
	pendingMirrors.set(path, content);
}

/**
 * Retrieve all queued mirrors and clear the registry.
 * Called once per build cycle by `astro:build:done`.
 */
export function getAndClearMirrors(): Map<string, string> {
	const mirrors = new Map(pendingMirrors);
	pendingMirrors.clear();
	return mirrors;
}
