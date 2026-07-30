import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { APIContext } from "astro";
import { generate } from "../generate.js";
import type { LlmsTxtOptions } from "../schema.js";

/**
 * Config stored by the astro-llms integration during astro:config:done.
 * Read from a temp file in the project root.
 */
function getConfig(): LlmsTxtOptions | undefined {
	try {
		const projectRoot = process.cwd();
		const configPath = join(projectRoot, ".astro-llms-config.json");
		if (!existsSync(configPath)) return undefined;
		return JSON.parse(readFileSync(configPath, "utf-8")) as LlmsTxtOptions;
	} catch {
		return undefined;
	}
}

/**
 * Registry for mirror files during prerender.
 * Uses a temporary JSON file in the project root to communicate between
 * the page endpoint (which runs during prerender) and the astro:build:done
 * hook. We use process.cwd() because import.meta.url may be unavailable
 * in Astro's prerender context.
 */
const REGISTRY_FILE = ".astro-llms-mirrors.json";

/**
 * Resolve the project root directory.
 * During Astro build, process.cwd() is the project root.
 */
function getProjectRoot(): string {
	return process.cwd();
}

/**
 * Queue a mirror file by writing to the temporary registry.
 */
function queueMirror(path: string, content: string): void {
	const projectRoot = getProjectRoot();
	const registryPath = join(projectRoot, REGISTRY_FILE);
	let registry: Record<string, string> = {};
	if (existsSync(registryPath)) {
		registry = JSON.parse(readFileSync(registryPath, "utf-8"));
	}
	registry[path] = content;
	writeFileSync(registryPath, JSON.stringify(registry));
}

/**
 * Shared page endpoint builder for /llms.txt and /llms-full.txt.
 *
 * Both endpoints follow the same pattern:
 * 1. Parse config from Vite define
 * 2. Load collections
 * 3. Generate artifacts
 * 4. Queue mirrors to a temporary file
 * 5. Return response
 *
 * @param contentFn - Returns the response body (llmsTxt or llmsFullTxt)
 */
export function buildLlmsPage(
	contentFn: (result: {
		llmsTxt: string;
		llmsFullTxt: string;
		mirrors: Map<string, string>;
		warnings: string[];
	}) => string,
) {
	return async function GET(_context: APIContext) {
		const config = getConfig();
		if (!config) {
			return new Response("Internal error: llms config not found", {
				status: 500,
			});
		}
		const collections = new Map();

		for (const collectionConfig of config.collections) {
			try {
				const { getCollection } = await import("astro:content");
				const entries = await getCollection(collectionConfig.name);
				collections.set(collectionConfig.name, entries);
			} catch {
				// Collection not found — skip silently
			}
		}

		const result = generate(config, collections);

		// Queue mirror files to a temporary JSON registry file in the
		// project root. The astro:build:done hook reads this file and
		// writes the mirrors to the dist directory, then deletes it.
		for (const [path, content] of result.mirrors) {
			queueMirror(path, content);
		}

		// Emit warnings if any
		for (const warning of result.warnings) {
			console.warn(`[astro-llms] ${warning}`);
		}

		return new Response(contentFn(result), {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	};
}
