import type { AstroIntegration } from "astro";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { generate, validateOptions } from "./generate.js";
import type { LlmsTxtOptions } from "./schema.js";

const REGISTRY_FILE = ".astro-llms-mirrors.json";

/**
 * Read the mirror registry written by page endpoints during prerender,
 * write the mirror files to the dist directory, then clean up.
 */
function processMirrors(distPath: string): void {
	const projectRoot = process.cwd();
	const registryPath = join(projectRoot, REGISTRY_FILE);
	if (!existsSync(registryPath)) return;

	const registry = JSON.parse(
		readFileSync(registryPath, "utf-8"),
	) as Record<string, string>;
	rmSync(registryPath);

	for (const [path, content] of Object.entries(registry)) {
		const fullPath = join(distPath, path);
		const dirPath = join(fullPath, "..");
		if (!existsSync(dirPath)) {
			mkdirSync(dirPath, { recursive: true });
		}
		writeFileSync(fullPath, content);
	}
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Create the astro-llms integration.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { defineConfig } from "astro/config";
 * import { llmsTxt } from "astro-llms";
 *
 * export default defineConfig({
 *   integrations: [
 *     llmsTxt({
 *       siteName: "My Site",
 *       description: "A description for agents.",
 *       collections: [{ name: "articles" }, { name: "projects" }],
 *     }),
 *   ],
 * });
 * ```
 */
export function llmsTxt(rawOptions: unknown): AstroIntegration {
	const [options, error] = validateOptions(rawOptions);

	if (error) {
		const messages = error.issues
			.map(
				(
					e: z.ZodIssue,
				) =>
					`  ${(e.path as string[]).join(".")}: ${e.message}`,
			)
			.join("\n");
		throw new Error(
			`Invalid astro-llms configuration:\n${messages}`,
		);
	}

	return {
		name: "astro-llms",
		hooks: {
			"astro:config:setup"({ injectRoute, config }) {
				// Inject the llms.txt page endpoint
				injectRoute({
					entrypoint: resolve(__dirname, "pages", "llms.txt.js"),
					pattern: "/llms.txt",
					prerender: true,
				});

				// Inject llms-full.txt if enabled
				if (options.fullText) {
					injectRoute({
						entrypoint: resolve(
							__dirname,
							"pages",
							"llms-full.txt.js",
						),
						pattern: "/llms-full.txt",
						prerender: true,
					});
				}

				// Store config in a temp file that page endpoints can read.
				// This is necessary because Vite bundles the integration and
				// page endpoints in separate module graphs, so globalThis
				// state is not shared.
				const configPath = join(
					fileURLToPath(config.root),
					".astro-llms-config.json",
				);
				writeFileSync(configPath, JSON.stringify(options));
			},
			"astro:build:done"({ dir }) {
				const distPath = fileURLToPath(dir);
				processMirrors(distPath);
			},
		},
	};
}

export { llmFields } from "./llmFields.js";
export type {
	LlmsTxtOptions,
	LlmsTxtCollectionConfig,
	LlmsTxtManualLink,
} from "./schema.js";
