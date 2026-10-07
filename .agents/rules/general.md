---
paths: ["**/*"]
---
# General conventions

- Biome is the only linter and formatter (`biome.jsonc`). Never add ESLint or
  Prettier. `pnpm lint` is the one check CI runs; `pnpm lint:fix` repairs.
- No semicolons (`semicolons: "asNeeded"`), single quotes, trailing commas,
  100-column lines. Run the formatter rather than hand-formatting. Where ASI
  needs one, Biome keeps a leading `;` (before a line starting with `(` or `[`).
- Never weaken a rule, add a blanket ignore, or widen an exclude to make a check
  pass. Change a rule deliberately in `biome.jsonc` with a comment saying why.
  An inline `biome-ignore` is acceptable only with a reason naming what makes
  that line the exception.
- No `any`, no non-null `!`, no TS `enum` (use an `as const` object + derived union).
- Colocate tests in `__tests__/` beside the code under test. Test behaviour,
  not markup.
- Kebab-case module filenames (`use-api.ts`, `item-service.ts`); PascalCase
  component files (`ItemList.tsx`). Suffix by role: `*-service.ts`, `use-*.ts`.
- Dependency direction: apps → `packages/shared`; only `apps/api` → `packages/db`.
- Toolchain versions (TypeScript, Vitest, Playwright, Biome, tsx) are exact pins,
  shared through the `catalog:` in `pnpm-workspace.yaml`.
- Comment the non-obvious decision, not the obvious code.
- Don't invent domain features; placeholders until a concept is real.
