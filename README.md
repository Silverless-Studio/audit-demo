# audit-demo

Next.js 16 + TypeScript + Convex auth + shadcn/ui, using Bun workflows.

## Prerequisites

- [Bun](https://bun.sh) installed

## Getting Started (Bun)

```bash
bun install
bun run dev
```

Open `http://localhost:3000`.

## Bun Commands

- `bun run dev`: Start the local Next.js dev server.
- `bun run build`: Build the app for production.
- `bun run start`: Run the production server.
- `bun run lint`: Run ESLint checks.
- `bunx --bun shadcn@latest add <component>`: Add a shadcn/ui component.

## Convex

Run Convex development sync locally:

```bash
bunx convex dev
```

## Environment

Create `.env.local` with required variables, including:

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`
- `NEXT_PUBLIC_SITE_URL`
