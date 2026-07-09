# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

This is an English learning toolset built on the T3 stack. The main product areas are:

- Vocabulary learning with FSRS spaced repetition and AI-generated contextual stories.
- Grammar correction with online AI analysis and optional local LanguageTool support.
- Sentence logic analysis for parsing complex English sentences.
- Semantic bridge for turning Chinese ideas or rough concepts into natural English.

The app uses Next.js 15 App Router, React 19, tRPC, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui-style components, and AI providers selected through a central provider utility.

## Important Files

- `src/app/`: App Router pages and layouts.
- `src/app/_components/`: Page-specific React components.
- `src/components/ui/`: Shared UI primitives.
- `src/server/api/root.ts`: tRPC router registration.
- `src/server/api/routers/`: Domain routers for words, grammar, bridge, and analysis.
- `src/server/lib/provider.ts`: Central AI provider switch for Gemini and DeepSeek.
- `src/env.js`: Environment variable schema and runtime validation.
- `src/server/db.ts`: Prisma client access.
- `prisma/schema.prisma`: Database schema.
- `prisma/seed.ts`: Vocabulary seed script.
- `data/oxford_5000_filtered.json`: Seed vocabulary data.
- `startup.bat`: Windows helper for local startup and optional LanguageTool.

## Local Setup

Required environment variables are validated in `src/env.js`.

Create `.env` with at least:

```env
DATABASE_URL="postgresql://..."
PROVIDER="gemini"
GEMINI_API_KEY="..."
RUNNING_ENV="local"
```

Use `PROVIDER="deepseek"` with `DEEPSEEK_API_KEY` to switch providers. When `RUNNING_ENV="web"`, `PASSKEY` is required and must be at least 8 characters.

LanguageTool offline grammar mode expects `LanguageTool-6.6/languagetool-server.jar` in the project root and serves on port `8081`.

## Common Commands

- `npm run dev`: Start Next.js dev server with Turbopack.
- `startup.bat`: Windows one-click local startup.
- `startup.bat --lt`: Also attempt to start the local LanguageTool server.
- `npm run build`: Production build.
- `npm run typecheck`: TypeScript check.
- `npm run check`: Lint plus TypeScript check.
- `npm run format:check`: Prettier check.
- `npm run format:write`: Prettier write.
- `npm run db:generate`: Run `prisma migrate dev`.
- `npm run db:migrate`: Run deployed Prisma migrations.
- `npm run db:push`: Push Prisma schema changes.
- `npm run db:studio`: Open Prisma Studio.
- `npx prisma db seed`: Seed the vocabulary data.

## Coding Conventions

- Use TypeScript and keep strictness intact. `noUncheckedIndexedAccess` is enabled.
- Prefer the `~/*` path alias for imports from `src`.
- Keep tRPC procedures in the relevant router under `src/server/api/routers/`, then register new routers in `src/server/api/root.ts`.
- Route AI calls through `callProvider` in `src/server/lib/provider.ts` instead of instantiating provider clients elsewhere.
- Keep server-only logic out of client components. Use `"use client"` only where interactive client behavior is required.
- Follow existing UI patterns: Tailwind classes, shared `src/components/ui/*` primitives, and lucide icons where appropriate.
- Let Prettier handle formatting, including Tailwind class ordering.
- Do not commit secrets, `.env`, generated build output, or local LanguageTool binaries.

## Database Notes

The `Word` model stores vocabulary text, CEFR level, and FSRS scheduling fields. When changing Prisma schema:

- Update `prisma/schema.prisma`.
- Add or update migrations with Prisma.
- Regenerate the Prisma client if needed.
- Consider whether `prisma/seed.ts` or `data/oxford_5000_filtered.json` must change.

## Product Notes

- The vocabulary workflow centers on selecting due and new words, generating a contextual story, then feeding review ratings back into FSRS.
- Web deployments use `AuthGuard` and tRPC middleware protection with `PASSKEY`.
- Offline grammar checking is local-only and depends on the LanguageTool HTTP server.
- The UI is intended to feel like a focused desktop-grade learning tool, not a marketing site.

## Working Safely

- Check `git status` before editing. This repository may contain user changes in progress.
- Do not revert or overwrite unrelated user changes.
- Keep edits scoped to the requested behavior.
- Before adding new dependencies, confirm they are necessary and fit the existing stack.
- Run the narrowest useful verification command after changes. For broad code changes, prefer `npm run typecheck` or `npm run check`.
