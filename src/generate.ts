/// <reference types="astro/client" />

import type { CollectionEntry } from "astro:content";
import { z } from "zod";
import type { LlmsTxtOptions } from "./schema.js";
import { LlmsTxtOptionsSchema } from "./schema.js";
import {
	buildLlmsFullTxt,
	buildLlmsTxt,
	buildMirrorFile,
	groupBySection,
	isEntryIncluded,
} from "./utils.js";

/**
 * Result of a generation pass.
 */
export interface GenerationResult {
	/** The llms.txt markdown content */
	llmsTxt: string;
	/** The llms-full.txt content (empty string if disabled) */
	llmsFullTxt: string;
	/** Per-entry mirror files: { path: content } */
	mirrors: Map<string, string>;
	/** Warnings emitted during generation */
	warnings: string[];
}

/**
 * Generate all llms.txt artifacts from resolved content collections.
 *
 * This function is the core of the integration. It receives entries from
 * multiple collections and produces the index, full-text, and mirror files.
 */
export function generate(
	options: LlmsTxtOptions,
	collections: Map<string, CollectionEntry<string>[]>,
): GenerationResult {
	const warnings: string[] = [];
	const mirrors = new Map<string, string>();
	const sections: Array<{
		name: string;
		entries: CollectionEntry<string>[];
	}> = [];

	// Collect all included entries grouped by section
	for (const [collectionName, entries] of collections) {
		const collectionConfig = options.collections.find(
			(c) => c.name === collectionName,
		);
		if (!collectionConfig) {
			warnings.push(
				`Collection "${collectionName}" not found in config. Skipping.`,
			);
			continue;
		}

		const defaultInclude =
			collectionConfig.defaultInclude ?? options.defaultInclude;
		const collectionSection = collectionConfig.section ?? collectionName;

		// Filter entries
		const included = entries.filter((entry) =>
			isEntryIncluded(entry, defaultInclude),
		);

		// Handle MDX policy
		const mdEntries: CollectionEntry<string>[] = [];
		for (const entry of included) {
			if (entry.rawFilename?.endsWith(".mdx")) {
				switch (options.mdxPolicy) {
					case "skip":
						warnings.push(
							`Skipping MDX entry "${entry.slug}" in collection "${collectionName}" (mdxPolicy: "skip"). Use .md files for LLM surfaces.`,
						);
						continue;
					case "raw":
						mdEntries.push(entry);
						break;
					case "strip":
						warnings.push(
							`MDX entry "${entry.slug}" cannot be stripped (strip not yet implemented). Skipping.`,
						);
						continue;
				}
			} else {
				mdEntries.push(entry);
			}
		}

		// Group by section
		const grouped = groupBySection(mdEntries, collectionSection);
		for (const [sectionName, sectionEntries] of grouped) {
			// Sort entries by date if available, then by slug
			sectionEntries.sort((a, b) => {
				const dateA = (a.data as Record<string, unknown>).date as
					| string
					| undefined;
				const dateB = (b.data as Record<string, unknown>).date as
					| string
					| undefined;
				if (dateA && dateB) {
					if (dateA < dateB) return 1;
					if (dateA > dateB) return -1;
				}
				return a.slug.localeCompare(b.slug);
			});
			sections.push({ name: sectionName, entries: sectionEntries });
		}
	}

	// Build llms.txt
	const llmsTxt = buildLlmsTxt({
		siteName: options.siteName,
		description: options.description,
		manualLinks: options.manualLinks.map((l) => ({
			...l,
			optional: l.optional ?? false,
		})),
		sections: sections.map((s) => ({
			...s,
			mirrorsPath: options.mirrorsPath,
		})),
	});

	// Build llms-full.txt
	let llmsFullTxt = "";
	if (options.fullText) {
		const allEntries = sections.flatMap((s) => s.entries);
		llmsFullTxt = buildLlmsFullTxt(allEntries);
	}

	// Build per-entry mirrors
	for (const section of sections) {
		for (const entry of section.entries) {
			const mirrorPath = `${options.mirrorsPath}${entry.collection}/${entry.slug}.md`;
			const mirrorContent = buildMirrorFile(entry);
			mirrors.set(mirrorPath, mirrorContent);
		}
	}

	return {
		llmsTxt,
		llmsFullTxt,
		mirrors,
		warnings,
	};
}

/**
 * Validate and normalize options.
 * Returns [options, error] tuple.
 */
export function validateOptions(
	raw: unknown,
): [LlmsTxtOptions, null] | [null, z.ZodError] {
	const result = LlmsTxtOptionsSchema.safeParse(raw);
	if (result.success) {
		return [result.data, null];
	}
	return [null, result.error];
}
