# astro-llms

A content-collection-first Astro integration that generates curated `llms.txt` agent surfaces from Astro content collections. No HTML scraping, no reverse-engineered markdown — just source-faithful index files and per-entry mirrors built from your content layer.

## Why

Existing Astro llms.txt integrations either target Starlight or scrape rendered HTML and convert it to markdown. This package reads directly from Astro's Content Layer API, so:

- Index metadata comes from frontmatter (curated, not inferred)
- Body content comes from the original Markdown files
- Drafts, private, and `llm: false` entries are excluded
- Zero runtime dependencies beyond Astro and Zod

## Install

```bash
npm i astro-llms
```

Peer dependencies: `astro` (4+), `zod` (4+).

## Quick start

### 1. Add to your content schemas

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { llmFields } from "astro-llms";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    ...llmFields,
  }),
});

export const collections = { articles };
```

### 2. Configure the integration

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import { llmsTxt } from "astro-llms";

export default defineConfig({
  integrations: [
    llmsTxt({
      siteName: "My Blog",
      description: "Notes on distributed systems and tooling.",
      collections: [{ name: "articles" }],
    }),
  ],
});
```

### 3. Mark entries for inclusion

With `defaultInclude: true`, all entries are included automatically — no frontmatter flag needed.

With `defaultInclude: false` (the default), opt entries in with `llm: true`:

```yaml
---
title: "Building a Router from Scratch"
description: "How I built a URL router in Go without any libraries."
date: "2026-07-01"
llm: true
---
```

### 4. Build

```bash
npm run build
```

This produces:

- `/llms.txt` — the index file with H1, summary, and H2 sections
- `/llms/articles/{id}.md` — per-entry mirror files (one per included entry, keyed by Astro's entry ID)

## Configuration

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `siteName` | `string` | (required) | Shown as the H1 heading in llms.txt |
| `description` | `string` | — | Shown as a blockquote summary after the H1 |
| `collections` | `Array` | (required) | List of collection configs (see below) |
| `defaultInclude` | `boolean` | `false` | When `true`, all entries are included without `llm: true` in frontmatter |
| `manualLinks` | `Array` | `[]` | Extra links to include in the index (API docs, RSS, etc.) |
| `mirrorsPath` | `string` | `"/llms/"` | Subdirectory for per-entry .md mirrors |
| `fullText` | `boolean` | `false` | Whether to generate `/llms-full.txt` |
| `mdxPolicy` | `"skip" \| "raw"` | `"skip"` | How to handle MDX entries |

### Collection config

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | (required) | Collection name as defined in `content.config.ts` |
| `section` | `string` | collection name | H2 section name in llms.txt |
| `defaultInclude` | `boolean` | integration default | Per-collection include behavior |

### Frontmatter fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `llm` | `boolean` | — (optional) | Opt-in flag to include in agent surfaces. Entries without `llm` fall through to the integration's `defaultInclude` setting. |
| `llmSection` | `string` | collection section | Override the section name for this entry |
| `llmDescription` | `string` | `description` field | Override the description shown in the index |

## Examples

### Single-collection blog

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import { llmsTxt } from "astro-llms";

export default defineConfig({
  integrations: [
    llmsTxt({
      siteName: "Jane's Blog",
      description: "Writing about web performance and accessibility.",
      collections: [{ name: "posts" }],
    }),
  ],
});
```

### Multi-collection site with manual links

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import { llmsTxt } from "astro-llms";

export default defineConfig({
  integrations: [
    llmsTxt({
      siteName: "My Portfolio",
      description: "Projects, writing, and tools by Ben Bishop.",
      collections: [
        { name: "articles", section: "Writing" },
        { name: "projects", section: "Projects" },
      ],
      defaultInclude: false,
      manualLinks: [
        {
          url: "/developers",
          title: "Developers overview",
          description: "Machine-readable surfaces",
        },
        {
          url: "/feed.xml",
          title: "RSS feed",
          optional: true,
        },
      ],
      fullText: true,
    }),
  ],
});
```

## Output format

The generated `llms.txt` follows the [llms.txt specification](https://llmstxt.org/):

```
# My Site

> A short description of the site.

## Writing

- [Post Title](/llms/articles/building-a-router-from-scratch.md): Description from frontmatter

## Projects

- [Project Name](/llms/projects/astro-llms.md)
```

Per-entry mirrors include the entry's frontmatter as YAML and the original Markdown body.

## MDX policy

| Value | Behavior |
| --- | --- |
| `"skip"` (default) | Skip MDX entries, emit a console warning |
| `"raw"` | Include the raw `.mdx` source as the mirror body |

Recommendation: use `.md` files for content that should appear in agent surfaces. MDX components don't translate cleanly to plain markdown.

## License

MIT
