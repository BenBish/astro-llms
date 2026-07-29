import type { AstroIntegration } from "astro";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { generate, validateOptions } from "./generate.js";
import type { LlmsTxtOptions } from "./schema.js";
import { getAndClearMirrors } from "./mirrors.js";

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

				// Pass config to the page endpoints via Vite define.
				// Note: mutating config.vite directly is a known Astro integration
				// pattern (see astro docs on injectRoute + define). In Astro 4+,
				// config.vite is always mutable.
				config.vite ??= {};
				(config.vite.define ??= {})["__LLMS_CONFIG__"] =
					JSON.stringify(options);
			},
			"astro:build:done"({ dir }) {
				// Write all queued mirror files to the dist directory
				const mirrors = getAndClearMirrors();
				const distPath = dir.pathname;

				for (const [path, content] of mirrors) {
					const fullPath = join(distPath, path);
					const dirPath = join(fullPath, "..");
					if (!existsSync(dirPath)) {
						mkdirSync(dirPath, { recursive: true });
					}
					writeFileSync(fullPath, content);
				}
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
