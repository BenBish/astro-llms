/// <reference types="astro/client" />

import type { CollectionEntry } from "astro:content";
import type { LlmFields } from "./llmFields.js";

/**
 * Normalize a date value to an ISO-8601 string for consistent sorting.
 * Accepts strings, Date objects, or numeric timestamps.
 *
 * @param value - The date value to normalize
 * @param entryId - Optional entry identifier for warning messages
 * @returns ISO-8601 string or undefined if the value is not a valid date
 */
export function normalizeDate(
	value: unknown,
	entryId?: string,
): string | undefined {
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === "number") {
		return new Date(value).toISOString();
	}
	if (typeof value === "string") {
		const d = new Date(value);
		if (isNaN(d.getTime())) {
			if (entryId) {
				console.warn(
					`[astro-llms] Invalid date "${value}" in entry "${entryId}". Entries with unparseable dates are sorted by ID.`,
				);
			}
			return undefined;
		}
		return d.toISOString();
	}
	return undefined;
}

/**
 * Build the mirror URL for an entry.
 */
export function buildMirrorUrl(
	mirrorsPath: string,
	collection: string,
	id: string,
): string {
	return `${mirrorsPath}${collection}/${id}.md`;
}

/**
 * Escape a string value for safe inclusion in YAML frontmatter.
 *
 * Uses double-quoted YAML scalar encoding:
 * - Backslashes and double quotes are escaped
 * - Newlines and carriage returns are escaped
 * - Leading/trailing whitespace is quoted (handled by YAML parser)
 * - Strings starting with YAML special characters (`:`, `#`, `|`, `>`, `*`, `&`, `!`, `%`, `@`, `` ` ``) are preserved inside quotes
 *
 * This function wraps the value in double quotes, so the caller does not
 * need to add them — the frontmatter template adds them.
 */
export function escapeYamlValue(value: string): string {
	// Escape backslashes first (must be first), then double quotes, then control chars
	return value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t");
}

/**
 * Type guard: check if an entry has llmFields shape.
 */
export function hasLlmFields(
	entry: CollectionEntry<string>,
): entry is CollectionEntry<string> & { data: LlmFields } {
	return (
		typeof (entry.data as Record<string, unknown>).llm === "boolean"
	);
}

/**
 * Check if an entry should be included in the agent surface.
 * Excludes: drafts, private/unlisted entries, and llm: false entries.
 */
export function isEntryIncluded(
	entry: CollectionEntry<string>,
	globalDefaultInclude: boolean,
): boolean {
	// Respect explicit llm: false
	if (hasLlmFields(entry) && entry.data.llm === false) {
		return false;
	}

	// Respect explicit llm: true
	if (hasLlmFields(entry) && entry.data.llm === true) {
		return true;
	}

	// Fall back to global/default include setting
	return globalDefaultInclude;
}

/**
 * Get the section name for an entry.
 * Entry-level llmSection overrides collection-level section.
 */
export function getEntrySection(
	entry: CollectionEntry<string>,
	collectionSection: string,
): string {
	if (hasLlmFields(entry) && entry.data.llmSection) {
		return entry.data.llmSection;
	}
	return collectionSection;
}

/**
 * Get the description for a link entry in llms.txt.
 * Priority: llmDescription > description > empty string.
 */
export function getEntryDescription(
	entry: CollectionEntry<string>,
): string {
	if (hasLlmFields(entry) && entry.data.llmDescription) {
		return entry.data.llmDescription;
	}
	if ((entry.data as Record<string, unknown>).description) {
		return String(entry.data.description);
	}
	return "";
}

/**
 * Group entries by section name.
 * Returns a map of sectionName -> entries array.
 */
export function groupBySection(
	entries: CollectionEntry<string>[],
	collectionSection: string,
): Map<string, CollectionEntry<string>[]> {
	const groups = new Map<string, CollectionEntry<string>[]>();

	for (const entry of entries) {
		const section = getEntrySection(entry, collectionSection);
		const existing = groups.get(section) ?? [];
		existing.push(entry);
		groups.set(section, existing);
	}

	return groups;
}

/**
 * Build the llms.txt markdown content.
 */
export function buildLlmsTxt(
	options: {
		siteName: string;
		description?: string;
		bodyText?: string;
		manualLinks: Array<{
			url: string;
			title: string;
			description?: string;
			optional: boolean;
		}>;
		sections: Array<{
			name: string;
			entries: CollectionEntry<string>[];
			mirrorsPath: string;
		}>;
	},
): string {
	const lines: string[] = [];

	// H1 title
	lines.push(`# ${options.siteName}`);
	lines.push("");

	// Summary blockquote
	if (options.description) {
		lines.push(`> ${options.description}`);
		lines.push("");
	}

	// Optional body text
	if (options.bodyText) {
		lines.push(options.bodyText);
		lines.push("");
	}

	// Manual links
	const optionalLinks = options.manualLinks.filter((l) => l.optional);
	const requiredLinks = options.manualLinks.filter((l) => !l.optional);

	if (requiredLinks.length > 0) {
		lines.push("## Links");
		lines.push("");
		for (const link of requiredLinks) {
			const suffix = link.description ? `: ${link.description}` : "";
			lines.push(`- [${link.title}](${link.url})${suffix}`);
		}
		lines.push("");
	}

	// Content sections
	for (const section of options.sections) {
		lines.push(`## ${section.name}`);
		lines.push("");
		for (const entry of section.entries) {
			const mirrorUrl = buildMirrorUrl(
				section.mirrorsPath,
				entry.collection,
				entry.id,
			);
			const description = getEntryDescription(entry);
			const suffix = description ? `: ${description}` : "";
			lines.push(`- [${entry.data.title}](${mirrorUrl})${suffix}`);
		}
		lines.push("");
	}

	// Optional section (manual links that can be skipped)
	if (optionalLinks.length > 0) {
		lines.push("## Optional");
		lines.push("");
		for (const link of optionalLinks) {
			const suffix = link.description ? `: ${link.description}` : "";
			lines.push(`- [${link.title}](${link.url})${suffix}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Build the llms-full.txt content by concatenating entry bodies.
 */
export function buildLlmsFullTxt(
	entries: CollectionEntry<string>[],
): string {
	const parts: string[] = [];

	for (const entry of entries) {
		parts.push(`# ${entry.data.title}`);
		parts.push("");
		parts.push(entry.body);
		parts.push("");
	}

	return parts.join("\n");
}

/**
 * Build a per-entry mirror markdown file.
 */
export function buildMirrorFile(
	entry: CollectionEntry<string>,
): string {
	const lines: string[] = [];

	// Frontmatter
	lines.push("---");
	lines.push(`title: "${escapeYamlValue(String(entry.data.title))}"`);
	const description = getEntryDescription(entry);
	if (description) {
		lines.push(`description: "${escapeYamlValue(description)}"`);
	}
	const date = (entry.data as Record<string, unknown>).date;
	if (date) {
		lines.push(`date: "${escapeYamlValue(String(date))}"`);
	}
	lines.push("---");
	lines.push("");

	// Body from source
	lines.push(entry.body);

	return lines.join("\n");
}
