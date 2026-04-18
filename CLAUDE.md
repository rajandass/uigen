# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack + node-compat polyfills)
npm run build        # Production build
npm run lint         # ESLint via Next.js config
npm run test         # Run Vitest test suite
npm run setup        # First-time setup: install deps + Prisma generate + migrate
npm run db:reset     # Reset SQLite database (destructive)
```

Run a single test file: `npx vitest src/lib/__tests__/file-system.test.ts`

Requires `ANTHROPIC_API_KEY` in `.env` for real AI responses; falls back to a mock static provider otherwise.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in natural language; Claude generates/edits files in a virtual file system; a live preview renders the result in an iframe.

### Three-Panel Layout (`src/app/main-content.tsx`)
- **Left (35%)**: Chat interface
- **Right (65%)**: Tabs — live preview iframe OR Monaco code editor + file tree

Both panels are wrapped in `FileSystemProvider` and `ChatProvider` contexts that share state across the whole UI.

### Chat → AI → File System Loop
1. User submits a message via `ChatProvider` (`src/lib/contexts/chat-context.tsx`)
2. POST to `/api/chat` (`src/app/api/chat/route.ts`) with message history + serialized VirtualFileSystem
3. Anthropic Claude Haiku streams a response using two AI tools:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`): create, view, str_replace, insert operations on files
   - `file_manager` (`src/lib/tools/file-manager.ts`): rename and delete operations
4. Tool calls mutate `VirtualFileSystem` on the server; deltas stream back to the client
5. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) updates in the browser, triggering PreviewFrame refresh

### Virtual File System (`src/lib/file-system.ts`)
The `VirtualFileSystem` class is the central data model — an in-memory tree. It serializes to/from JSON for:
- Sending to the AI API on each request
- Persisting to the `Project.data` column in SQLite via Prisma

No actual disk writes occur; all file state lives in memory and in the DB.

### Preview Pipeline (`src/lib/transform/jsx-transformer.ts` + `src/components/preview/PreviewFrame.tsx`)
- Detects entry point (`/App.jsx`, `/App.tsx`, etc.)
- Transforms JSX with Babel Standalone using the React automatic JSX runtime
- Builds an import map pointing `react`, `react-dom`, and other packages to `esm.sh` CDN
- Injects Tailwind CSS CDN
- Renders result in a sandboxed iframe with a runtime error boundary

### Authentication (`src/lib/auth.ts`, `src/actions/index.ts`, `src/middleware.ts`)
JWT sessions stored in cookies (7-day expiry). Server actions handle sign-up/sign-in with bcrypt. Middleware protects `/api/projects` and `/api/filesystem` routes. Projects can be owned by a user or anonymous (`userId = null`).

### Database
Prisma + SQLite. The schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database. Two models: `User` and `Project`. `Project.messages` (JSON string) stores chat history; `Project.data` (JSON string) stores the serialized `VirtualFileSystem`. `Project.userId` is nullable for anonymous projects.

## Code Style
- Only comment complex or non-obvious code. Skip comments on self-explanatory logic.

## Key Import Alias
`@/*` resolves to `./src/*` (configured in `tsconfig.json`).

## AI Provider
`src/lib/provider.ts` returns either the real Anthropic model (`claude-haiku-4-5`) or a `MockLanguageModel` that returns a hardcoded static component. The mock is used when `ANTHROPIC_API_KEY` is absent. The system prompt lives in `src/lib/prompts/generation.tsx` and uses Anthropic's ephemeral prompt caching.
