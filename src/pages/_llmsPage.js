/**
 * Shared page endpoint builder for /llms.txt and /llms-full.txt.
 *
 * Both endpoints follow the same pattern:
 * 1. Parse config from Vite define
 * 2. Load collections
 * 3. Generate artifacts
 * 4. Queue mirrors
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
	return async function GET(context: import("astro").AstroContext) {
		const config = JSON.parse(import.meta.env.__LLMS_CONFIG__);
		const { generate } = await import("../generate.js");
		const { registerMirror } = await import("../mirrors.js");

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

		// Queue each mirror file for writing during astro:build:done
		for (const [path, content] of result.mirrors) {
			registerMirror(path, content);
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
