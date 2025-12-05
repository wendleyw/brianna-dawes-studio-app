# Brianna Dawes Studio - Miro App

A project management system that transforms Miro boards into a comprehensive project management hub for design studios.

## Overview

This Miro App enables collaboration between Admin, Designer, and Client roles with real-time synchronization between a Supabase database and visual Miro boards. It features a Master Timeline for project tracking and individual project workspaces with briefing details and process stages.

## Features

- **Master Timeline**: Kanban-style board with status columns (Critical, Overdue, Urgent, Active, Done)
- **Project Workspaces**: Individual frames for each project with briefing and process stages
- **Role-Based Access**: Admin, Designer, and Client roles with appropriate permissions
- **Real-time Sync**: Automatic synchronization between database and Miro board
- **Project Briefing**: Structured briefing forms with goals, deliverables, and style notes

## Tech Stack

### Frontend
- React 19 + Vite 6 + TypeScript 5.x
- TanStack Query (React Query)
- Zustand for client state
- CSS Modules + Design System tokens
- Zod for runtime validation

### Backend
- Supabase (Postgres 15 + RLS + Realtime + Edge Functions)
- Deno runtime for Edge Functions

### Integrations
- Miro SDK v2
- Postmark (Transactional emails)
- Sentry (Error tracking)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Miro Developer Account
- Supabase Project

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MIRO_CLIENT_ID=your_miro_client_id
```

## Development

```bash
# Start dev server
npm run dev

# Type check
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── app/                    # React entry points
├── features/               # Feature modules
│   ├── auth/              # Authentication
│   ├── boards/            # Miro board integration
│   ├── projects/          # Project management
│   ├── deliverables/      # Deliverables tracking
│   ├── reports/           # Reporting
│   └── admin/             # Admin tools
├── shared/
│   ├── ui/                # Design System components
│   ├── hooks/             # Shared hooks
│   ├── lib/               # Utilities
│   └── config/            # Configuration
└── supabase/
    ├── functions/         # Edge Functions
    └── migrations/        # SQL migrations
```

## User Roles

| Role | Access |
|------|--------|
| Admin | Full access to all projects and settings |
| Designer | Access to assigned projects only |
| Client | Access to own projects only |

## Design Tokens

```
Primary: #050038
Accent: #2563EB
Success: #10B981
Warning: #F59E0B
Error: #EF4444
Fonts: Inter (UI), Playfair Display (headings)
```

## License

Private - Brianna Dawes Studio
