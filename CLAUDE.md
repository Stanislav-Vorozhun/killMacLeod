## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: tailwindcss

---

# Project Rules

## Stack

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`)
- **SvelteKit 2** — file-based routing, server/client split
- **shadcn-svelte** — UI component library
- **Prisma** — ORM with PostgreSQL (or configured DB)

---

## Svelte 5

- Use runes exclusively. Never use the legacy Options API (`export let`, `$:`, stores where runes suffice).
- `$props()` for component props. Destructure immediately: `let { value, onChange } = $props()`.
- `$state()` for reactive local state. `$derived()` for computed values — never recompute in templates.
- `$effect()` only for side effects that can't be expressed as derived state. Avoid overuse.
- Snippets (`{#snippet}`) over slot fallbacks.
- Events: use callback props (`onclick`, custom `onchange`) instead of `createEventDispatcher`.

## SvelteKit 2

- Colocate `+page.svelte`, `+page.server.ts`, `+layout.svelte`, `+layout.server.ts` per route.
- Data loading belongs in `load()` functions — never fetch inside `onMount`.
- Form mutations use SvelteKit form actions (`+page.server.ts` `actions`). Use `enhance` for progressive enhancement.
- Secrets and DB access only in `.server.ts` files. Never import Prisma in `+page.svelte`.
- Type `PageData` / `ActionData` from `$types` — always.
- Path aliases: use `$lib` for shared code.

## Prisma

- Schema lives in `prisma/schema.prisma`. Run `prisma generate` after every schema change.
- All DB calls go in `src/lib/server/db/` — never call Prisma directly from route files.
- Use `prisma.$transaction()` for multi-step writes.
- Never expose raw Prisma errors to the client — map to user-facing messages server-side.
- Migrations: `prisma migrate dev` in development, `prisma migrate deploy` in CI/prod.

## shadcn-svelte

- Add components via `npx shadcn-svelte@latest add <component>` — never hand-write copies.
- Extend, don't modify, generated component files. Put customizations in wrapper components under `src/lib/components/ui/`.
- Use the `cn()` utility for conditional class merging.

## TypeScript

- `strict: true` always on.
- No `any`. Use `unknown` and narrow explicitly.
- Prefer `type` over `interface` unless declaration merging is needed.

## File & Naming Conventions

- Route files: SvelteKit conventions (`+page`, `+layout`, `+server`, `+error`).
- Components: `PascalCase.svelte` in `src/lib/components/`.
- Server utilities: `src/lib/server/` — never imported from client code.
- Constants: `UPPER_SNAKE_CASE`.

## Code Style

- No comments unless the WHY is non-obvious.
- No unused imports, variables, or dead code.
- Keep components focused — extract logic to `$derived` / helper functions, not inline expressions.
- No `console.log` in committed code.

## Testing

- Unit tests with Vitest (`src/**/*.test.ts`).
- E2E with Playwright (`tests/`).
- Test behavior, not implementation. No mocking Prisma in unit tests — use a test database.

## Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`.
- No direct commits to `main`. PRs required.
