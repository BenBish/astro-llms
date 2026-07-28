/**
 * Page endpoint for /llms-full.txt
 *
 * Called at build time by Astro. Reads content collections,
 * generates the full-text concatenation, and queues mirror files.
 */
import { getCollection } from "astro:content";
import { generate } from "../generate.js";
import { registerMirror } from "../mirrors.js";

const config = JSON.parse(import.meta.env.__LLMS_CONFIG__);

export async function GET(context) {
	const collections = new Map();

	for (const collectionConfig of config.collections) {
		try {
			const entries = await getCollection(collectionConfig.name);
			collections.set(collectionConfig.name, entries);
		} catch {
			// Collection not found — skip silently
		}
	}

	const result = generate(config, collections);

	// Queue each mirror file for writing during astro:build:done
	for (const [path, content] of result.mirrors) {
		registerMirror(path, content);
	}

	// Emit warnings if any
	for (const warning of result.warnings) {
		console.warn(`[astro-llms] ${warning}`);
	}

	return new Response(result.llmsFullTxt, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}
