# AGENTS.md

## Project Structure

```
src/
├── index.ts          # Main integration entry point
├── types.ts          # Shared TypeScript types
├── config.ts         # Configuration schema & defaults
├── generator.ts      # llms.txt generation logic
└── utils/            # Utility functions
```

## Commands

| Command | Description |
| --- | --- |
| `npm install` | Install all dependencies |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run the test suite |

## Conventions

- **Branch naming:** `feature/<description>`, `fix/<description>`, `chore/<description>`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- **PRs:** Squash merge preferred
- **TypeScript:** Strict mode enforced via `tsconfig.json`
- **Module system:** ESM only (`"type": "module"`)
