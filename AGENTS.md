# Agent guide

Conventions are path-scoped in [`.agents/rules/`](.agents/rules/). Before editing
a file, read the rule files whose `paths` match it:

| Rule                | Covers                                              |
| ------------------- | --------------------------------------------------- |
| `general.md`        | Everything: Biome, naming, tests, dependency direction |
| `validation.md`     | Zod at boundaries, schema-first types, `Prettify`   |
| `web-app.md`        | Next.js routes                                      |
| `web-components.md` | Text, Button, Field and other `ui/` primitives      |
| `forms.md`          | React Hook Form + Zod                               |
| `modals.md`         | `<Modal>`, ConfirmModal, disclosure vs registry     |
| `web-lib.md`        | hooks, services, data, providers, env               |
| `api.md`            | Hono routes/services, envelope, AppError            |
| `auth.md`           | Privy, useAuth, requireAuth, the local user record  |
| `data-fetching.md`  | oRPC contract, React Query, error handling          |
| `player-settings.md`| Front-loaded onboarding, settings form, auto-save   |
| `curriculum.md`     | Chords, shapes, groups, membership, user progress   |
| `chord-components.md` | ChordDiagram and ChordButton                      |
| `lessons.md`        | Lesson grid, lesson player, guest/account progress |
| `preferences.md`    | Hamburger menu, instrument/display prefs, intervals |
| `packages.md`       | shared and db packages, migrations                  |

Every directory also has a README stating its intent. Done means `pnpm lint`,
`pnpm typecheck` and `pnpm test` all pass.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
