import { describe, expect, it } from "vitest";
import {
	buildLlmsTxt,
	buildLlmsFullTxt,
	buildMirrorFile,
	groupBySection,
	isEntryIncluded,
} from "../src/utils";

// Helper to create mock collection entries
function mockEntry(
	overrides: Record<string, unknown> = {},
): {
	slug: string;
	collection: string;
	data: Record<string, unknown>;
	body: string;
	rawFilename?: string;
} {
	return {
		slug: "test-entry",
		collection: "articles",
		data: {
			title: "Test Entry",
			description: "A test entry",
			llm: false,
			...overrides,
		},
		body: "# Test Entry\n\nThis is the body.",
		...overrides,
		rawFilename: overrides.rawFilename ?? "test-entry.md",
	};
}

describe("isEntryIncluded", () => {
	it("excludes entries with llm: false", () => {
		const entry = mockEntry({ llm: false });
		expect(isEntryIncluded(entry as any, true)).toBe(false);
	});

	it("includes entries with llm: true", () => {
		const entry = mockEntry({ llm: true });
		expect(isEntryIncluded(entry as any, false)).toBe(true);
	});

	it("respects global defaultInclude when llm is not set", () => {
		const entry = mockEntry({ llm: undefined });
		expect(isEntryIncluded(entry as any, false)).toBe(false);
		expect(isEntryIncluded(entry as any, true)).toBe(true);
	});

	it("includes entries without llm field when defaultInclude is true", () => {
		const entry = mockEntry({});
		// No llm field at all
		delete (entry.data as Record<string, unknown>).llm;
		expect(isEntryIncluded(entry as any, true)).toBe(true);
	});
});

describe("groupBySection", () => {
	it("groups entries by collection section", () => {
		const entries = [mockEntry({ title: "A" }), mockEntry({ title: "B" })];
		const grouped = groupBySection(entries as any, "Articles");
		expect(grouped.get("Articles")).toHaveLength(2);
	});

	it("groups entries by entry-level llmSection", () => {
		const entries = [
			mockEntry({ title: "A", llmSection: "Category 1" }),
			mockEntry({ title: "B", llmSection: "Category 2" }),
			mockEntry({ title: "C", llmSection: "Category 1" }),
		];
		const grouped = groupBySection(entries as any, "Articles");
		expect(grouped.get("Category 1")).toHaveLength(2);
		expect(grouped.get("Category 2")).toHaveLength(1);
	});
});

describe("buildLlmsTxt", () => {
	it("generates valid llms.txt with H1 and summary", () => {
		const result = buildLlmsTxt({
			siteName: "My Site",
			description: "A description",
			manualLinks: [],
			sections: [],
		});
		expect(result).toContain("# My Site");
		expect(result).toContain("> A description");
	});

	it("generates sections with entry links", () => {
		const entries = [
			{
				slug: "hello-world",
				collection: "articles",
				data: { title: "Hello World", description: "First post" },
			},
			{
				slug: "second-post",
				collection: "articles",
				data: { title: "Second Post" },
			},
		] as any;
		const result = buildLlmsTxt({
			siteName: "My Site",
			collections: [],
			manualLinks: [],
			sections: [
				{
					name: "Articles",
					entries,
					mirrorsPath: "/llms/",
				},
			],
		});
		expect(result).toContain("## Articles");
		expect(result).toContain(
			"- [Hello World](/llms/articles/hello-world.md): First post",
		);
		expect(result).toContain(
			"- [Second Post](/llms/articles/second-post.md)",
		);
	});

	it("includes manual links in Links section", () => {
		const result = buildLlmsTxt({
			siteName: "My Site",
			manualLinks: [
				{ url: "/developers", title: "Developers", description: "API docs" },
			],
			sections: [],
		});
		expect(result).toContain("## Links");
		expect(result).toContain(
			"- [Developers](/developers): API docs",
		);
	});

	it("puts optional links in Optional section", () => {
		const result = buildLlmsTxt({
			siteName: "My Site",
			manualLinks: [
				{ url: "/rss", title: "RSS Feed", description: "Atom feed", optional: true },
			],
			sections: [],
		});
		expect(result).toContain("## Optional");
		expect(result).toContain(
			"- [RSS Feed](/rss): Atom feed",
		);
	});

	it("omits summary when not provided", () => {
		const result = buildLlmsTxt({
			siteName: "My Site",
			manualLinks: [],
			sections: [],
		});
		expect(result).not.toContain("> ");
	});
});

describe("buildLlmsFullTxt", () => {
	it("concatenates entry bodies", () => {
		const entries = [
			{
				slug: "a",
				collection: "articles",
				data: { title: "Entry A" },
				body: "Body A",
			},
			{
				slug: "b",
				collection: "articles",
				data: { title: "Entry B" },
				body: "Body B",
			},
		] as any;
		const result = buildLlmsFullTxt(entries);
		expect(result).toContain("# Entry A");
		expect(result).toContain("Body A");
		expect(result).toContain("# Entry B");
		expect(result).toContain("Body B");
	});
});

describe("buildMirrorFile", () => {
	it("generates mirror with frontmatter and body", () => {
		const entry = mockEntry({
			title: "Test Entry",
			description: "Test description",
			date: "2026-01-01",
		});
		const result = buildMirrorFile(entry as any);
		expect(result).toContain("---");
		expect(result).toContain('title: "Test Entry"');
		expect(result).toContain('description: "Test description"');
		expect(result).toContain('date: "2026-01-01"');
		expect(result).toContain("# Test Entry");
		expect(result).toContain("This is the body.");
	});
});
