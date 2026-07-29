#!/usr/bin/env node
/**
 * Post-build script: copies src/pages/*.js files to dist/pages/
 * so they are included in the published package.
 *
 * Only .js files are copied — .ts files in pages/ are compiled by tsc.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const srcPages = resolve(__dirname, "..", "src", "pages");
const distPages = resolve(__dirname, "..", "dist", "pages");

if (!existsSync(srcPages)) {
	console.log("[postbuild] No src/pages/ directory found. Skipping.");
	process.exit(0);
}

if (!existsSync(distPages)) {
	mkdirSync(distPages, { recursive: true });
}

const files = readdirSync(srcPages);
let copied = 0;

for (const file of files) {
	if (!file.endsWith(".js")) continue;

	const src = join(srcPages, file);
	const dest = join(distPages, file);
	copyFileSync(src, dest);
	copied++;
}

console.log(`[postbuild] Copied ${copied} page file(s) to dist/pages/`);
