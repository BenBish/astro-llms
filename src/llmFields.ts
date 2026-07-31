import { z } from "astro/zod";

/**
 * Shared Zod field definitions for llms.txt integration.
 *
 * Spread these into your content collection schemas using
 * `z.object({ ..., ...llmFields })`. This ensures the fields
 * use the same Zod instance as Astro's content collections.
 *
 * IMPORTANT: Always use `z` from `astro/zod` (not `zod`) when
 * spreading `llmFields`, since Astro's content collections
 * rely on `astro/zod` internally.
 *
 * Usage:
 * import { z } from "astro/zod";
 * import { llmFields } from "astro-llms";
 *
 * const articles = defineCollection({
 *   schema: z.object({
 *     title: z.string(),
 *     description: z.string(),
 *     date: z.string(),
 *     ...llmFields,
 *   }),
 * });
 */
export const llmFields = {
	/**
	 * Opt-in flag to include this entry in the llms.txt agent surface.
	 * When the integration's defaultInclude is false, entries must have
	 * llm: true to be included.
	 * Default is undefined — the integration's defaultInclude controls
	 * inclusion when this field is not set.
	 */
	llm: z.boolean().optional(),

	/**
	 * Custom H2 section name for this entry in llms.txt.
	 * Overrides the collection-level section name.
	 */
	llmSection: z.string().optional(),

	/**
	 * Optional description override for the link entry in llms.txt.
	 * When not provided, the entry's `description` frontmatter field
	 * is used. If neither exists, no description suffix is shown.
	 */
	llmDescription: z.string().optional(),
} as const;

/**
 * Infer the llmFields shape for TypeScript usage.
 */
export type LlmFields = {
	/**
	 * Opt-in flag to include this entry in the llms.txt agent surface.
	 */
	llm: boolean;
	/**
	 * Custom H2 section name for this entry in llms.txt.
	 */
	llmSection?: string;
	/**
	 * Optional description override for the link entry in llms.txt.
	 */
	llmDescription?: string;
};
