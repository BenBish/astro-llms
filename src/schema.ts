import { z } from "zod";

/**
 * Configuration for a single content collection.
 */
export const LlmsTxtCollectionConfigSchema = z.object({
	/**
	 * The collection name as defined in Astro's content.config.ts
	 * (e.g., "articles", "projects", "docs").
	 */
	name: z.string().min(1),

	/**
	 * H2 section name in llms.txt for entries from this collection.
	 * Defaults to the collection name if not provided.
	 */
	section: z.string().optional(),

	/**
	 * Whether entries from this collection are included by default
	 * without needing llm: true in frontmatter. Defaults to false
	 * (opt-in via frontmatter).
	 */
	defaultInclude: z.boolean().optional(),
});

export type LlmsTxtCollectionConfig = z.infer<typeof LlmsTxtCollectionConfigSchema>;

/**
 * A manual link to include in the llms.txt index.
 */
export const LlmsTxtManualLinkSchema = z.object({
	/**
	 * URL path or full URL for the link.
	 */
	url: z.string().url().or(z.string().min(1)),

	/**
	 * Display text for the link.
	 */
	title: z.string().min(1),

	/**
	 * Optional description shown after ": " in the link entry.
	 */
	description: z.string().optional(),

	/**
	 * If true, this link goes in the "Optional" section so tools
	 * can skip it when context is limited.
	 */
	optional: z.boolean().default(false),
});

export type LlmsTxtManualLink = z.infer<typeof LlmsTxtManualLinkSchema>;

/**
 * MDX handling policy.
 * - "skip": Don't include MDX entries, emit a warning to the console.
 * - "raw": Include the raw .mdx source file content as the mirror body.
 * - "strip": Attempt to strip Astro components (requires rehype/remark; not yet implemented, treated as "skip").
 */
export const MdxPolicySchema = z.enum(["skip", "raw", "strip"]).default("skip");

export type MdxPolicy = z.infer<typeof MdxPolicySchema>;

/**
 * Full integration configuration options.
 */
export const LlmsTxtOptionsSchema = z.object({
	/**
	 * Site name shown as the H1 heading in llms.txt.
	 */
	siteName: z.string().min(1),

	/**
	 * One-line summary shown as a blockquote after the H1.
	 */
	description: z.string().optional(),

	/**
	 * Content collections to include in the agent surface.
	 */
	collections: z.array(LlmsTxtCollectionConfigSchema).min(1),

	/**
	 * Global default include behavior. Overrides per-collection defaultInclude.
	 * When false (default), entries must have llm: true in frontmatter.
	 */
	defaultInclude: z.boolean().default(false),

	/**
	 * Optional manual links to include in the index (e.g., API docs, RSS feed).
	 */
	manualLinks: z.array(LlmsTxtManualLinkSchema).default([]),

	/**
	 * Subdirectory path for per-entry .md mirrors.
	 * Mirrors are written to /{mirrorsPath}{collection}/{slug}.md.
	 */
	mirrorsPath: z.string().default("/llms/"),

	/**
	 * Whether to generate /llms-full.txt as a concatenation of included entry bodies.
	 */
	fullText: z.boolean().default(false),

	/**
	 * How to handle MDX entries.
	 */
	mdxPolicy: MdxPolicySchema.default("skip"),
});

export type LlmsTxtOptions = z.infer<typeof LlmsTxtOptionsSchema>;

/**
 * Resolve a collection's effective section name.
 */
export function resolveSection(
	collection: LlmsTxtCollectionConfig,
): string {
	return collection.section ?? collection.name;
}
