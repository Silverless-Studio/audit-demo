# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js App Router project with Convex auth and shadcn/ui.
- `src/app/`: App Router entrypoints (`layout.tsx`, `page.tsx`) and API routes (`src/app/api/auth/[...all]/route.ts`).
- `src/components/ui/`: shadcn-generated UI primitives.
- `src/components/`: composed components built from `ui/*`.
- `src/lib/`: shared helpers (`auth-client.ts`, `auth-server.ts`, `utils.ts` with `cn()`).
- `convex/`: Convex backend config and auth wiring (`auth.ts`, `http.ts`, `convex.config.ts`).
- `convex/_generated/`: generated Convex artifacts; treat as generated code.
- `public/`: static assets.
- `.next/`: build output; do not edit.

## Build, Test, and Development Commands
Use Bun-first workflows in this repo:
- `bun run dev`: starts Next.js dev server on `http://localhost:3000`.
- `bun run build`: creates a production build.
- `bun run start`: serves the production build.
- `bun run lint`: runs ESLint (`eslint.config.mjs`).
- `bunx --bun shadcn@latest add <component>`: adds shadcn/ui components.
- `npx convex dev`: runs Convex local/deployment sync for backend changes.

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` mode enabled (`tsconfig.json`).
- Styling: Tailwind CSS v4 + shadcn theme tokens in `src/app/globals.css`.
- Linting: Next.js Core Web Vitals + TypeScript ESLint presets.
- Indentation: 2 spaces; keep semicolons and double quotes consistent with existing files.
- Naming:
  - React components: `PascalCase` (`ConvexClientProvider.tsx`).
  - Utility modules: `kebab-case` or descriptive lowercase (`auth-client.ts`).
  - App Router conventions: `page.tsx`, `layout.tsx`, `route.ts`.
- Imports: prefer `@/*` alias for `src/*` paths.
- shadcn guidance:
  - keep primitives in `src/components/ui/`;
  - put app-specific wrappers/variants in `src/components/`.

## Testing Guidelines
There is currently no dedicated test runner or `test` script. For now:
- run `bun run lint` before submitting changes;
- run `bun run build` to catch type/build regressions.
When adding tests, colocate them near code as `*.test.ts` or `*.test.tsx` and add a script in `package.json`.

## Commit & Pull Request Guidelines
Git history is minimal (`Initial commit from Create Next App`), so use clear imperative subjects.
- Keep commits focused and scoped to one change.
- PRs should include: purpose, key files changed, env/setup updates, and screenshots for UI changes.
- Link related issues/tasks and list verification steps you ran (`bun run lint`, `bun run build`).

## Security & Configuration Tips
- Never commit secrets; `.env*` is gitignored.
- Required local variables are documented in `.env.local` (`NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, deployment values).
- Avoid manual edits in generated files under `convex/_generated/`.
- Keep `components.json` aliases aligned with `tsconfig.json` (`@/*`) to avoid broken imports.
