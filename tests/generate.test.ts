import { describe, expect, it, vi } from "vitest";
import {
	buildLlmsTxt,
	buildLlmsFullTxt,
	buildMirrorFile,
	groupBySection,
	isEntryIncluded,
	normalizeDate,
	escapeYamlValue,
} from "../src/utils";

// Helper to create mock collection entries
function mockEntry(
	overrides: Record<string, unknown> = {},
): {
	id: string;
	collection: string;
	data: Record<string, unknown>;
	body: string;
	filePath?: string;
} {
	return {
		id: "test-entry",
		collection: "articles",
		data: {
			title: "Test Entry",
			description: "A test entry",
			llm: false,
			...overrides,
		},
		body: "# Test Entry\n\nThis is the body.",
		...overrides,
		filePath: overrides.filePath ?? "test-entry.md",
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

		it("falls back to defaultInclude when llm is undefined", () => {
			// llm: undefined is a boolean value that is not true/false,
			// so hasLlmFields passes but neither explicit check matches.
			const entry = mockEntry({ llm: undefined });
			expect(isEntryIncluded(entry as any, false)).toBe(false);
			expect(isEntryIncluded(entry as any, true)).toBe(true);
		});

		it("falls back to defaultInclude when llm field is missing", () => {
			// No llm field at all — hasLlmFields returns false.
			const entry = mockEntry({});
			delete (entry.data as Record<string, unknown>).llm;
			expect(isEntryIncluded(entry as any, true)).toBe(true);
			expect(isEntryIncluded(entry as any, false)).toBe(false);
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
				id: "hello-world",
				collection: "articles",
				data: { title: "Hello World", description: "First post" },
			},
			{
				id: "second-post",
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
				id: "a",
				collection: "articles",
				data: { title: "Entry A" },
				body: "Body A",
			},
			{
				id: "b",
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

	it("escapes special characters in frontmatter values", () => {
		const entry = mockEntry({
			title: 'Title with "quotes" and \\backslash',
		});
		const result = buildMirrorFile(entry as any);
		expect(result).toContain('title: "Title with \\"quotes\\" and \\\\backslash"');
	});
});

describe("normalizeDate", () => {
	it("normalizes ISO date strings", () => {
		expect(normalizeDate("2026-01-15")).toBe("2026-01-15T00:00:00.000Z");
	});

	it("normalizes Date objects", () => {
		const d = new Date("2026-06-01");
		expect(normalizeDate(d)).toBe(d.toISOString());
	});

	it("normalizes numeric timestamps", () => {
		const ts = new Date("2026-03-10").getTime();
		expect(normalizeDate(ts)).toBe(new Date(ts).toISOString());
	});

	it("returns undefined for invalid dates", () => {
		expect(normalizeDate("not-a-date")).toBeUndefined();
	});

	it("returns undefined for non-date values", () => {
		expect(normalizeDate(null)).toBeUndefined();
		expect(normalizeDate({})).toBeUndefined();
	});

	it("emits a warning for invalid dates with entryId", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		normalizeDate("invalid-date", "my-entry");
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Invalid date"),
		);
		warnSpy.mockRestore();
	});

	it("does not emit a warning when entryId is omitted", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		normalizeDate("invalid-date");
		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe("escapeYamlValue", () => {
	it("escapes backslashes", () => {
		expect(escapeYamlValue("a\\b")).toBe("a\\\\b");
	});

	it("escapes double quotes", () => {
		expect(escapeYamlValue('say "hi"')).toBe('say \\"hi\\"');
	});

	it("escapes newlines and tabs", () => {
		expect(escapeYamlValue("line1\nline2")).toBe("line1\\nline2");
		expect(escapeYamlValue("col1\tcol2")).toBe("col1\\tcol2");
	});

	it("leaves plain strings unchanged", () => {
		expect(escapeYamlValue("hello world")).toBe("hello world");
	});
});
