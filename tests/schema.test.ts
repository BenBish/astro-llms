import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	LlmsTxtCollectionConfigSchema,
	LlmsTxtManualLinkSchema,
	LlmsTxtOptionsSchema,
	MdxPolicySchema,
} from "../src/schema";

describe("MdxPolicySchema", () => {
	it("accepts 'skip'", () => {
		expect(MdxPolicySchema.parse("skip")).toBe("skip");
	});

	it("accepts 'raw'", () => {
		expect(MdxPolicySchema.parse("raw")).toBe("raw");
	});

	it("rejects 'strip' (no longer supported)", () => {
		expect(() => MdxPolicySchema.parse("strip")).toThrow();
	});

	it("rejects invalid value", () => {
		expect(() => MdxPolicySchema.parse("invalid")).toThrow();
	});
});

describe("LlmsTxtCollectionConfigSchema", () => {
	it("parses a minimal config", () => {
		const result = LlmsTxtCollectionConfigSchema.parse({ name: "articles" });
		expect(result.name).toBe("articles");
		expect(result.section).toBeUndefined();
		expect(result.defaultInclude).toBeUndefined();
	});

	it("parses full config", () => {
		const result = LlmsTxtCollectionConfigSchema.parse({
			name: "projects",
			section: "My Projects",
			defaultInclude: true,
		});
		expect(result.name).toBe("projects");
		expect(result.section).toBe("My Projects");
		expect(result.defaultInclude).toBe(true);
	});

	it("rejects empty name", () => {
		expect(() => LlmsTxtCollectionConfigSchema.parse({ name: "" })).toThrow();
	});
});

describe("LlmsTxtManualLinkSchema", () => {
	it("parses a minimal link", () => {
		const result = LlmsTxtManualLinkSchema.parse({
			url: "/developers",
			title: "Developers Overview",
		});
		expect(result.url).toBe("/developers");
		expect(result.title).toBe("Developers Overview");
		expect(result.optional).toBe(false);
	});

	it("parses full link", () => {
		const result = LlmsTxtManualLinkSchema.parse({
			url: "https://github.com/example",
			title: "GitHub",
			description: "Source code repository",
			optional: true,
		});
		expect(result.url).toBe("https://github.com/example");
		expect(result.title).toBe("GitHub");
		expect(result.description).toBe("Source code repository");
		expect(result.optional).toBe(true);
	});

	it("accepts relative paths starting with ./", () => {
		const result = LlmsTxtManualLinkSchema.parse({
			url: "./guide",
			title: "Guide",
		});
		expect(result.url).toBe("./guide");
	});

	it("rejects bare strings that are neither URLs nor paths", () => {
		expect(() =>
			LlmsTxtManualLinkSchema.parse({
				url: "not a url",
				title: "Bad",
			}),
		).toThrow();
	});
});

describe("LlmsTxtOptionsSchema", () => {
	it("parses minimal valid options", () => {
		const result = LlmsTxtOptionsSchema.parse({
			siteName: "My Site",
			collections: [{ name: "articles" }],
		});
		expect(result.siteName).toBe("My Site");
		expect(result.description).toBeUndefined();
		expect(result.collections).toHaveLength(1);
		expect(result.defaultInclude).toBe(false);
		expect(result.manualLinks).toEqual([]);
		expect(result.mirrorsPath).toBe("/llms/");
		expect(result.fullText).toBe(false);
		expect(result.mdxPolicy).toBe("skip");
	});

	it("parses full options", () => {
		const result = LlmsTxtOptionsSchema.parse({
			siteName: "My Site",
			description: "A description",
			collections: [
				{ name: "articles" },
				{ name: "projects", section: "Work" },
			],
			defaultInclude: true,
			manualLinks: [
				{ url: "/developers", title: "Developers" },
			],
			mirrorsPath: "/agent/",
			fullText: true,
			mdxPolicy: "raw",
		});
		expect(result.siteName).toBe("My Site");
		expect(result.description).toBe("A description");
		expect(result.collections).toHaveLength(2);
		expect(result.defaultInclude).toBe(true);
		expect(result.manualLinks).toHaveLength(1);
		expect(result.mirrorsPath).toBe("/agent/");
		expect(result.fullText).toBe(true);
		expect(result.mdxPolicy).toBe("raw");
	});

	it("rejects missing siteName", () => {
		expect(() =>
			LlmsTxtOptionsSchema.parse({
				collections: [{ name: "articles" }],
			}),
		).toThrow();
	});

	it("rejects empty collections", () => {
		expect(() =>
			LlmsTxtOptionsSchema.parse({
				siteName: "My Site",
				collections: [],
			}),
		).toThrow();
	});
});
