import { z } from "zod";

/**
 * Shared Zod fields for llms.txt integration.
 * Spread this into your content collection schemas.
 *
 * Usage:
 * const articles = defineCollection({
 *   schema: z.object({
 *     title: z.string(),
 *     description: z.string(),
 *     date: z.string(),
 *     ...llmFields,
 *   }),
 * });
 */
export const llmFields = z.object({
	/**
	 * Opt-in flag to include this entry in the llms.txt agent surface.
	 * When the integration's defaultInclude is false, entries must have
	 * llm: true to be included.
	 */
	llm: z.boolean().default(false),

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
});

/**
 * Infer the llmFields shape for TypeScript usage.
 */
export type LlmFields = z.infer<typeof llmFields>;
