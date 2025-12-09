# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Miro App for Brianna Dawes Studios** - a project management system that transforms Miro boards into a comprehensive project management hub for design studios. The system enables collaboration between Admin, Designer, and Client roles with real-time synchronization between a database and visual Miro boards.

## Commands

```bash
# Development
npm run dev          # Start dev server (port 3000)
npm run build        # Type check + build for production
npm run preview      # Preview production build

# Code Quality
npm run typecheck    # TypeScript type checking only
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier formatting
```

## Documentation Files

The `.md` files in this repository (PRD.md, AI-DEV-GUIDE.md) are actually **JavaScript files** that use the `docx` library to generate Word documents. They are not markdown files despite their extension. Run them with Node.js to generate `.docx` output files.

```bash
node PRD.md
node AI-DEV-GUIDE.md
```

## Technology Stack

### Frontend
- React 19 + Vite 6 + TypeScript 5.x
- TanStack Query (React Query) for server state
- Zustand for client state
- CSS Modules + Design System tokens
- Zod for runtime validation

### Backend
- Supabase (Postgres 15 + RLS + Realtime + Edge Functions)
- Deno runtime for Edge Functions
- Supabase Storage for file uploads

### Integrations
- Miro SDK v2 (Board manipulation)
- Postmark (Transactional emails)
- Sentry (Error tracking)

## Architecture

The system follows **Clean Architecture** with feature-based modules:

```
/src
├── /app                  # React entry points
├── /features             # Feature modules (auth, projects, deliverables, boards, reports, settings)
│   └── /[feature]
│       ├── /components   # UI components
│       ├── /pages        # Page components
│       ├── /hooks        # React Query hooks
│       ├── /api          # API layer
│       ├── /domain       # Types, validators, entities
│       └── /infra        # Repository implementations
├── /shared
│   ├── /ui               # Design System (Button, Card, Dialog, Toast, etc.)
│   ├── /hooks            # Cross-cutting hooks
│   ├── /lib              # Utilities (httpClient, logger, queryClient)
│   └── /config           # Environment, roles, board config
├── /services-bundle      # UMD bundle for Miro SDK services
└── /supabase
    ├── /functions        # Edge Functions
    └── /migrations       # SQL migrations
```

## Key Design Patterns

- **Repository Pattern**: All data access through interfaces (e.g., `ProjectRepository`)
- **Use Case Pattern**: Business logic in orchestrating classes (e.g., `CreateProjectUseCase`)
- **React Query Keys Factory**: Query keys structured as `projectKeys.list(filters)`, `projectKeys.detail(id)`

## User Roles

- **Admin**: Full access to all projects and settings
- **Designer**: Access to assigned projects only
- **Client**: Access to own projects only

## Miro Integration

### Multiple Entry Points

The app has three HTML entry points for different Miro contexts (configured in `vite.config.ts`):
- `index.html` - Main panel entry
- `app.html` - Full app interface
- `board-modal.html` - Modal dialogs opened from board

### SDK Access

Use `miroAdapter` from `@shared/lib/miroAdapter` for all Miro SDK operations:
```typescript
import { miroAdapter } from '@shared/lib/miroAdapter';

// Check if running in Miro context
if (miroAdapter.isAvailable()) {
  await miroAdapter.showInfo('Hello from the app!');
}

// Safe operations that won't throw
const boardInfo = await miroAdapter.getBoardInfo(); // Returns null if not in Miro
```

### Services

- **MasterTimelineService**: Manages Kanban board with status columns (draft, in_progress, review, done)
- **BrandWorkspaceService**: Creates project workspace frames (brief, process sections)
- **BoardSyncService**: Handles DB <-> Miro synchronization with reconciliation
- **miroClient** (`src/features/boards/services/miroClient.ts`): REST API wrapper for Miro v2 API

## Database Tables

- `users` (with role enum: admin, designer, client)
- `projects` (with status enum: draft, in_progress, review, done, archived)
- `deliverables` (with status: pending, wip, review, approved)
- `project_updates` (JSONB payload for audit trail)
- `files` (linked to projects/deliverables)
- `audit_logs`

## Design Tokens

```
Primary: #050038
Accent: #2563EB
Success: #10B981
Warning: #F59E0B
Error: #EF4444
Fonts: Inter (UI), Playfair Display (headings)
Spacing: 4, 8, 12, 16, 24, 32px
Border radius: 4, 8, 12px
```

## Path Aliases

- `@features/*` -> src/features/*
- `@shared/*` -> src/shared/*
- `@config/*` -> src/shared/config/*
- `@app/*` -> src/app/*

## TypeScript Configuration

Strict mode is enabled with additional checks:
- `noUncheckedIndexedAccess`: Array/object access returns `T | undefined`
- `exactOptionalPropertyTypes`: Optional props require explicit `undefined` when set

## React Query Patterns

Query keys follow a factory pattern in each feature's `services/` folder:
```typescript
// src/features/projects/services/projectKeys.ts
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: ProjectsQueryParams) => [...projectKeys.lists(), params] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};
```
