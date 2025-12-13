# Database Architecture - Miro App Brianna Dawes Studio

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              REACT UI COMPONENTS                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Dashboard  │  │  Projects   │  │Deliverables │  │   Admin     │            │
│  │    Page     │  │    Page     │  │    Page     │  │   Panel     │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REACT QUERY HOOKS LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ useRecent   │  │ useProjects │  │useDeliver   │  │  useUsers   │            │
│  │ Activity    │  │ useProject  │  │ ables       │  │useSettings  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                │                    │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│  │ reportKeys  │  │projectKeys  │  │deliverable  │  │ adminKeys   │            │
│  │   .all      │  │  .list()    │  │ Keys.list() │  │  .users()   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             SERVICES LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  report     │  │  project    │  │deliverable  │  │   admin     │            │
│  │  Service    │  │  Service    │  │  Service    │  │  Service    │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                │                    │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│  │ auth        │  │ masterBoard │  │ syncLog     │  │miroAuth     │            │
│  │ Service     │  │ Service     │  │ Service     │  │Service      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE CLIENT LAYER                                   │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐         │
│  │     supabase.ts (JS Client)    │  │   supabaseRest.ts (REST API)   │         │
│  │  - Standard web context        │  │  - Miro iframe context          │         │
│  │  - Full query builder          │  │  - Direct HTTP requests         │         │
│  │  - Joins, aggregations         │  │  - No joins (REST limitation)   │         │
│  └────────────────┬───────────────┘  └────────────────┬───────────────┘         │
│                   │                                   │                          │
│                   └───────────────┬───────────────────┘                          │
│                                   ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐         │
│  │                    REALTIME SUBSCRIPTIONS                          │         │
│  │  useRealtimeSubscription.ts                                        │         │
│  │  - deliverables table (filtered by project_id)                     │         │
│  │  - users table (all events)                                        │         │
│  └────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE BACKEND                                         │
│  ┌────────────────────────────────────────────────────────────────────┐         │
│  │                     PostgreSQL Database                            │         │
│  │  ┌─────────────────────────────────────────────────────────────┐  │         │
│  │  │                    CORE TABLES                               │  │         │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐  ┌────────────┐  │  │         │
│  │  │  │  users  │  │projects │  │deliverables │  │   boards   │  │  │         │
│  │  │  │         │◄─┤         │◄─┤  (versions  │  │            │  │  │         │
│  │  │  │ id,name │  │id,name  │  │   JSONB)    │  │ id,name    │  │  │         │
│  │  │  │ email   │  │status   │  │             │  │            │  │  │         │
│  │  │  │ role    │  │priority │  │ id,name     │  └────────────┘  │  │         │
│  │  │  │miro_id  │  │due_date │  │ status,type │                   │  │         │
│  │  │  └────┬────┘  │client_id│  │ versions[]  │                   │  │         │
│  │  │       │       └────┬────┘  └──────┬──────┘                   │  │         │
│  │  │       │            │              │                          │  │         │
│  │  └───────┼────────────┼──────────────┼──────────────────────────┘  │         │
│  │          │            │              │                             │         │
│  │  ┌───────┼────────────┼──────────────┼──────────────────────────┐  │         │
│  │  │       │  JUNCTION TABLES          │                          │  │         │
│  │  │       │            │              │                          │  │         │
│  │  │  ┌────▼────────────▼───┐   ┌──────▼─────┐                    │  │         │
│  │  │  │ project_designers   │   │user_boards │                    │  │         │
│  │  │  │ (project_id,user_id)│   │(user_id,   │                    │  │         │
│  │  │  └─────────────────────┘   │ board_id)  │                    │  │         │
│  │  │                            └────────────┘                    │  │         │
│  │  └──────────────────────────────────────────────────────────────┘  │         │
│  │                                                                    │         │
│  │  ┌──────────────────────────────────────────────────────────────┐  │         │
│  │  │                  SUPPORT TABLES                               │  │         │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │  │         │
│  │  │  │notifications│  │app_settings │  │  subscription_plans  │  │  │         │
│  │  │  │             │  │             │  │                      │  │  │         │
│  │  │  │ user_id     │  │ key,value   │  │ name,limit,color     │  │  │         │
│  │  │  │ type,title  │  │ description │  │ sort_order,is_active │  │  │         │
│  │  │  └─────────────┘  └─────────────┘  └──────────────────────┘  │  │         │
│  │  │                                                               │  │         │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │         │
│  │  │  │                      sync_logs                          │  │  │         │
│  │  │  │  id, project_id, operation, status, error_message       │  │  │         │
│  │  │  │  miro_items_created[], miro_items_updated[]             │  │  │         │
│  │  │  │  duration_ms, retry_count                               │  │  │         │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │         │
│  │  └──────────────────────────────────────────────────────────────┘  │         │
│  │                                                                    │         │
│  │  ┌──────────────────────────────────────────────────────────────┐  │         │
│  │  │                      VIEWS                                    │  │         │
│  │  │  ┌──────────────────────────────────────────────────────┐    │  │         │
│  │  │  │              client_plan_stats                        │    │  │         │
│  │  │  │  user_id, plan_name, deliverables_limit/used/remaining│    │  │         │
│  │  │  │  plan_status (active/expired/limit_reached)           │    │  │         │
│  │  │  └──────────────────────────────────────────────────────┘    │  │         │
│  │  └──────────────────────────────────────────────────────────────┘  │         │
│  │                                                                    │         │
│  │  ┌──────────────────────────────────────────────────────────────┐  │         │
│  │  │                 RPC FUNCTIONS                                 │  │         │
│  │  │  • create_project_with_designers()                           │  │         │
│  │  │  • update_project_with_designers()                           │  │         │
│  │  │  • set_primary_board()                                       │  │         │
│  │  │  • increment_deliverables_used()                             │  │         │
│  │  │  • get_projects_needing_sync()                               │  │         │
│  │  │  • get_sync_health_metrics()                                 │  │         │
│  │  │  • add_deliverable_version()                                 │  │         │
│  │  │  • get_latest_version()                                      │  │         │
│  │  └──────────────────────────────────────────────────────────────┘  │         │
│  └────────────────────────────────────────────────────────────────────┘         │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐         │
│  │                  ROW LEVEL SECURITY (RLS)                          │         │
│  │  • Users: role-based access (admin sees all, others see self)     │         │
│  │  • Projects: client_id or designer assignment filter               │         │
│  │  • Deliverables: through project ownership                         │         │
│  │  • Boards/UserBoards: user_id match                               │         │
│  └────────────────────────────────────────────────────────────────────┘         │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐         │
│  │                     STORAGE                                        │         │
│  │  • Bucket: deliverable-files                                       │         │
│  │  • Used by: deliverableService.uploadVersion()                     │         │
│  └────────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA (After Migration 038)                    │
└──────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  subscription_plans │
                    ├─────────────────────┤
                    │ id (PK)             │
                    │ name                │
                    │ display_name        │
                    │ deliverables_limit  │
                    │ color               │
                    │ sort_order          │
                    │ is_active           │
                    └──────────┬──────────┘
                               │
                               │ 1:N
                               ▼
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│      boards      │     │        users        │     │   app_settings   │
├──────────────────┤     ├─────────────────────┤     ├──────────────────┤
│ id (PK, TEXT)    │◄────│ primary_board_id    │     │ id (PK)          │
│ name             │     │ id (PK)             │     │ key (UNIQUE)     │
│ created_at       │     │ email               │     │ value (JSONB)    │
│ updated_at       │     │ name                │     │ description      │
└────────┬─────────┘     │ role (enum)         │     └──────────────────┘
         │               │ avatar_url          │
         │               │ miro_user_id        │
         │               │ auth_user_id        │
         │ N:M           │ is_super_admin      │
         │               │ company_name        │
         ▼               │ subscription_plan_id│──┐
┌──────────────────┐     │ deliverables_used   │  │
│   user_boards    │     │ plan_start_date     │  │
├──────────────────┤     │ plan_end_date       │  │
│ id (PK)          │     └──────────┬──────────┘  │
│ user_id (FK)     │────────────────┘             │
│ board_id (FK)    │────────────────┐             │
│ board_name       │                │             │
│ is_primary       │                │             │
└──────────────────┘                │             │
                                    │             │
                    ┌───────────────┘             │
                    │                             │
                    ▼                             │
         ┌─────────────────────┐                  │
         │      projects       │◄─────────────────┘
         ├─────────────────────┤        1:N (client)
         │ id (PK)             │
         │ name                │
         │ description         │
         │ status (enum)       │
         │ priority (enum)     │
         │ start_date          │
         │ due_date            │
         │ completed_at        │
         │ client_id (FK)──────┼──────────► users.id
         │ miro_board_id       │
         │ miro_board_url      │
         │ thumbnail_url       │
         │ briefing (JSONB)    │
         │ was_reviewed        │
         │ google_drive_url    │
         └──────────┬──────────┘
                    │
         ┌──────────┼──────────────────┐
         │          │                  │
         │ 1:N      │ N:M              │ 1:N
         ▼          ▼                  ▼
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
│   deliverables   │  │  project_designers   │  │    sync_logs     │
├──────────────────┤  ├──────────────────────┤  ├──────────────────┤
│ id (PK)          │  │ project_id (PK,FK)   │  │ id (PK)          │
│ project_id (FK)  │  │ user_id (PK,FK)──────┼─►│ project_id (FK)  │
│ name             │  │ assigned_at          │  │ operation (enum) │
│ description      │  └──────────────────────┘  │ status (enum)    │
│ type (enum)      │                            │ miro_items_*[]   │
│ status (enum)    │                            │ error_message    │
│ versions (JSONB) │◄── [{version, file_url,   │ error_category   │
│ miro_frame_id    │     file_name, file_size,  │ retry_count      │
│ miro_url         │     mime_type,             │ duration_ms      │
│ external_url     │     uploaded_by_id,        │ started_at       │
│ thumbnail_url    │     comment, created_at}]  │ completed_at     │
│ count            │                            └──────────────────┘
│ bonus_count      │
│ due_date         │
│ delivered_at     │
└──────────────────┘


┌──────────────────┐
│  notifications   │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)─────┼──────────► users.id
│ type             │
│ title            │
│ message          │
│ data (JSONB)     │
│ is_read          │
│ created_at       │
└──────────────────┘


                    ┌─────────────────────────────────────────┐
                    │       VIEW: client_plan_stats           │
                    ├─────────────────────────────────────────┤
                    │ Computed view joining users +           │
                    │ subscription_plans with calculated:     │
                    │ • deliverables_remaining                │
                    │ • plan_status (active/expired/limit)    │
                    └─────────────────────────────────────────┘
```

---

## Data Flow by Feature

### 1. Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  LoginForm  │────►│ authService │────►│  Supabase   │────►│   users     │
│             │     │  .signIn()  │     │    Auth     │     │   table     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ miroAuth    │ (for Miro iframe)
                    │ Service     │
                    └─────────────┘
```

### 2. Projects Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ProjectPage │────►│ useProjects │────►│ project     │────►│  projects   │
│             │     │   hook      │     │ Service     │     │   table     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Mutations:  │     │projectKeys  │     │ RPC:        │     │  project_   │
│ create      │     │  .list()    │     │ create_     │     │  designers  │
│ update      │     │  .detail()  │     │ project_    │     │   table     │
│ delete      │     │             │     │ with_       │     │             │
│ archive     │     │             │     │ designers   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 3. Deliverables Flow (with Realtime)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Deliverable │────►│useDeliver   │────►│deliverable  │────►│deliverables │
│    Page     │     │ ables hook  │     │  Service    │     │   table     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       │
                           │                                       │
                           ▼                                       │
                    ┌─────────────┐                                │
                    │useRealtime  │◄───────────────────────────────┘
                    │Subscription │        (INSERT/UPDATE/DELETE)
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Invalidate │
                    │  Query      │
                    │  Cache      │
                    └─────────────┘
```

### 4. Admin Panel Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ AdminPanel  │────►│ useUsers    │────►│ admin       │
│             │     │ useSettings │     │ Service     │
└─────────────┘     │useBoards    │     └──────┬──────┘
                    └─────────────┘            │
                                               │
        ┌──────────────────────────────────────┼──────────────────────────┐
        │                                      │                          │
        ▼                                      ▼                          ▼
┌───────────────┐                    ┌─────────────────┐          ┌──────────────┐
│    users      │                    │   user_boards   │          │ app_settings │
│    boards     │                    │subscription_plan│          │              │
│notifications  │                    │                 │          │              │
└───────────────┘                    └─────────────────┘          └──────────────┘
```

### 5. Miro Sync Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Project   │────►│masterBoard  │────►│ Miro SDK    │────►│ Miro Board  │
│   Created   │     │ Service     │     │ miroClient  │     │  (Visual)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  projects   │     │  sync_logs  │
│(miro_board_ │     │ (operation, │
│ id, url)    │     │  status,    │
│             │     │  errors)    │
└─────────────┘     └─────────────┘
```

---

## Tables to Remove (Migration 038)

After applying migration 038, these will be **REMOVED**:

| Table/View | Reason |
|------------|--------|
| `deliverable_versions` | Migrated to `deliverables.versions` JSONB |
| `deliverable_feedback` | Not used in UI |
| `files` | Uploads go directly to Miro |
| `audit_logs` | Never implemented |
| `activity_feed` (view) | Not used |

---

## Final Schema Summary

**TABLES KEPT (10):**
1. `users` - User accounts with roles
2. `projects` - Project records
3. `project_designers` - Designer assignments (junction)
4. `deliverables` - Deliverables with versions JSONB
5. `boards` - Miro boards registry
6. `user_boards` - User-board assignments
7. `notifications` - User notifications
8. `app_settings` - Global settings
9. `subscription_plans` - Billing plans (future)
10. `sync_logs` - Miro sync debugging

**VIEWS KEPT (1):**
- `client_plan_stats` - Computed plan usage stats

**RPC FUNCTIONS (8):**
- `create_project_with_designers()`
- `update_project_with_designers()`
- `set_primary_board()`
- `increment_deliverables_used()`
- `get_projects_needing_sync()`
- `get_sync_health_metrics()`
- `add_deliverable_version()`
- `get_latest_version()`
