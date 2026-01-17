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
- Recharts for data visualization
- React PDF Renderer for PDF generation

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
├── /features             # Feature modules (auth, projects, deliverables, boards, reports, admin, notifications)
│   └── /[feature]
│       ├── /components   # UI components
│       ├── /pages        # Page components
│       ├── /hooks        # React Query hooks and custom hooks
│       ├── /services     # Business logic, API clients, query keys (most common)
│       ├── /domain       # Types, Zod schemas, entities
│       ├── /context      # React context providers (when needed, e.g., AuthProvider)
│       └── /api          # API layer (used in some features like reports)
├── /shared
│   ├── /ui               # Design System (Button, Card, Dialog, Toast, etc.)
│   ├── /hooks            # Cross-cutting hooks (useDebounce, useRealtimeSubscription)
│   ├── /lib              # Utilities (logger, miroAdapter, supabase clients, etc.)
│   ├── /config           # Environment, roles, board config
│   ├── /types            # Shared TypeScript types
│   └── /components       # Shared components
├── /legacy               # Legacy code (excluded from TypeScript compilation)
└── /supabase
    ├── /functions        # Edge Functions (Deno)
    └── /migrations       # SQL migrations
```

## Key Design Patterns

- **Services Pattern**: Business logic organized in service classes (e.g., `masterBoardService`, `projectService`)
- **React Query Keys Factory**: Query keys structured as `projectKeys.list(filters)`, `projectKeys.detail(id)`
- **Singleton Adapters**: Single instances for SDK access (`miroAdapter`)
- **Feature-Based Modules**: Each feature is self-contained with its own components, hooks, services, and domain logic

## User Roles

- **Admin**: Full access to all projects and settings
- **Designer**: Access to assigned projects only
- **Client**: Access to own projects only

## Miro Integration

### Multiple Entry Points

The app has four HTML entry points for different Miro contexts (configured in `vite.config.ts`):
- `index.html` - Main panel entry
- `app.html` - Full app interface
- `board-modal.html` - Modal dialogs opened from board
- `admin-modal.html` - Admin-specific modal dialogs

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

The Miro integration uses several specialized services in `src/features/boards/services/`:

- **masterBoardService**: Manages consolidated "Master Board" displaying all clients with projects in vertical frames with mini-kanbans
- **projectRowService**: Manages individual project rows on the timeline with status columns
- **brandWorkspaceService**: Creates project workspace frames (brief, process sections)
- **miroSdkService**: Core SDK wrapper with comprehensive board manipulation methods (106KB - the main workhorse)
- **projectSyncOrchestrator**: Coordinates DB <-> Miro synchronization
- **miroClient**: REST API wrapper for Miro v2 API operations
- **miroReportService**: Generates visual reports on Miro boards
- **miroClientReportService**: Client-facing report generation
- **miroHelpers**: Utility functions for Miro operations (timeline frame detection, safe item removal)
- **miroItemRegistry**: Tracks Miro items and their database relationships
- **constants/**: Layout constants, colors, and briefing templates for board elements

### Timeline Frame Detection

The `findTimelineFrame()` function in `miroHelpers.ts` identifies the Master Timeline frame by:
1. **Title match** (primary): Frames with title containing "MASTER TIMELINE" or "Timeline Master"
2. **Dimension match** (fallback): Frames with width ~1000px and height >= 550px

Project briefing frames are positioned to the RIGHT of the timeline, aligned with its top edge.

## Database & Backend

### Database Tables

**Core Tables:**
- `users` - User profiles (role enum: admin, designer, client; has subscription plan, company info)
- `projects` - Project management (status enum: critical, overdue, urgent, on_track, in_progress, review, done)
- `deliverables` - Project deliverables (status: draft, in_progress, in_review, approved, rejected, delivered)
- `project_designers` - Many-to-many link between projects and designers

**Configuration:**
- `project_types` - Dynamic project type definitions (label, color, icon, default days)
- `subscription_plans` - Client subscription plans with deliverables limits
- `app_settings` - Global application settings (key-value JSONB)

**Miro Integration:**
- `boards` - Registered Miro boards
- `user_boards` - User-board associations (tracks primary board)
- `miro_item_map` - Maps DB entities to Miro item IDs
- `miro_oauth_tokens` - OAuth tokens (encrypted)
- `miro_oauth_states` - OAuth flow state management

**Sync & Logging:**
- `sync_jobs` - Background sync job queue (queued, running, succeeded, failed)
- `sync_logs` - Detailed sync operation logs

**Reporting:**
- `project_reports` - Generated PDF reports with storage URLs
- `notifications` - In-app notifications

### Supabase Edge Functions

Located in `supabase/functions/`, these Deno-based serverless functions handle:

- `miro-oauth-start` - Initiates Miro OAuth flow
- `miro-oauth-callback` - Handles OAuth callback and token exchange
- `miro-webhook` - Processes Miro webhook events
- `projects-create` - Server-side project creation logic
- `projects-update` - Server-side project update logic
- `sync-worker` - Background worker for board synchronization
- `_shared` - Shared utilities for Edge Functions

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

Similar patterns exist for:
- `deliverableKeys.ts` in features/deliverables/services
- `reportKeys.ts` in features/reports/services

## Feature Modules

Each feature follows a consistent structure:
- `components/` - UI components specific to the feature
- `pages/` - Page-level components
- `hooks/` - React Query hooks and custom hooks
- `services/` - Business logic, API clients, query keys
- `domain/` - TypeScript types, Zod schemas, entities
- `context/` (when needed) - React context providers (e.g., AuthProvider)

Current features:
- `auth` - Authentication with Miro OAuth and Supabase
- `projects` - Project management core functionality
- `deliverables` - Deliverables tracking
- `boards` - Miro board integration (largest feature module)
- `reports` - Analytics, reporting with PDF generation, and Public KPI Dashboard
- `admin` - Admin tools, analytics, project type management
- `notifications` - In-app and email notifications

## Routes

### Public Routes (no authentication required)
- `/login` - Login page
- `/auth/miro/oauth/callback` - Miro OAuth callback handler
- `/kpi` - **Public KPI Dashboard** - Real-time studio metrics visible without login

### Protected Routes (authentication required)
- `/dashboard` - Main dashboard (home)
- `/projects` - Projects list
- `/projects/new` - Create new project (admin/client only)
- `/projects/:id` - Project detail view
- `/projects/:id/edit` - Edit project (admin only)
- `/board/:boardId` - Miro board view
- `/notifications` - Notifications center
- `/reports` - Client reports list
- `/reports/:id` - Report detail view
- `/admin` - Admin dashboard (admin only)
- `/admin/users` - User management (admin only)
- `/admin/settings` - System settings (admin only)

## Important Utilities

- `logger.ts` - Structured logging with createLogger()
- `miroAdapter.ts` - Singleton adapter for safe Miro SDK access with error handling
- `supabase.ts` - Supabase client initialization
- `supabaseRest.ts` - Direct REST API calls to Supabase
- `queryClient.ts` - React Query configuration
- `dateFormat.ts` - Date formatting utilities
- `statusMapping.ts` - Maps between database statuses and Miro timeline statuses
- `timelineStatus.ts` - Timeline-specific status logic
- `priorityConfig.ts` - Priority levels and colors
- `projectBroadcast.ts` - Cross-window/tab project updates
- `miroNotifications.ts` - Miro-specific notification helpers

## Design System

Components in `src/shared/ui/` follow a consistent pattern:
- Each component has its own folder with `ComponentName.tsx`, `ComponentName.module.css`, types, and index
- Fully typed with TypeScript interfaces
- CSS Modules with camelCase class names
- Design tokens in `src/shared/ui/tokens/`

Available components: Badge, Button, Card, Checkbox, CreditBar, Dialog, EmptyState, Icons, Input, Logo, Radio, Select, Skeleton, Spinner, SplashScreen, Table, Tabs, Textarea, Toast

## Important Conventions

### Logging
Use the `createLogger` function from `@shared/lib/logger` for structured logging:
```typescript
import { createLogger } from '@shared/lib/logger';
const logger = createLogger('ComponentName');
logger.debug('Message', { context });
```

### Miro SDK Access
Always use `miroAdapter` instead of directly accessing `window.miro`:
- Provides error handling and initialization checks
- Returns null on failure instead of throwing (for optional operations)
- Includes caching and retry logic

### TypeScript Strict Checks
Due to `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`:
- Array/object access requires null checks: `array[0]` returns `T | undefined`
- Optional properties must explicitly include `undefined` when setting values

### Legacy Code
The `/src/legacy` directory contains old code that's excluded from TypeScript compilation. Avoid modifying legacy code; prefer migrating to the new feature-based structure when needed.
