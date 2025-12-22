# Project Restart Blueprint - Brianna Dawes Studio Miro App

## 0) Purpose
This document is the single source of truth to restart the project with a clean foundation. It summarizes the current system, highlights structural blockers, defines the target architecture, and lists the strategic questions that must be answered before building.

## 1) Current system snapshot (from repo)
- Product: project management system embedded in Miro for design studios.
- Roles: Admin, Designer, Client.
- Core capabilities: master timeline, project workspaces, briefings, deliverables, realtime sync with Supabase.
- Stack: React + Vite + TypeScript + TanStack Query + Zustand; Supabase (Postgres, RLS, Realtime, Edge Functions); Miro SDK; Postmark; Sentry.
- Key reference docs:
  - `README.md`
  - `docs/DATABASE_ARCHITECTURE.md`
  - `docs/REFATORACAO_MASTER_PLAN.md`
  - `docs/architecture/DECISOES_ARQUITETURA.md`
  - `docs/architecture/MIRO_SYNC.md`
  - `docs/architecture/contract-matrix.md`
  - `docs/architecture/gates-and-smoke-tests.md`
  - `docs/FLOW_ADMIN.md`

## 2) Critical blockers identified in repo
- DB not reproducible: contradictory migrations and at least one invalid SQL migration.
- Security boundary broken: PostgREST calls using anon key in the Miro iframe.
- Auth fallback: localStorage-based auth path bypasses real Supabase session.
- Sync not durable: client-driven, fragile matching, allows permanent desync.
- Deliverables model drift: code expects JSONB versions while migrations define a relational table.

## 3) Restart goals (business + tech)
- Single canonical schema that builds from zero without drift.
- Real trust boundary (server-side) for all privileged operations.
- Durable Miro sync with idempotency, retries, and observability.
- Formal workflows (status transitions, approvals, SLAs) implemented once in the domain layer.
- Operable system: logs, health metrics, and clear failure handling.

## 4) Scope and non-goals
### MVP scope (foundation)
- Admin can create projects, assign designers, and provision a Miro board.
- Designer can create deliverables and submit versions for review.
- Client can approve or reject deliverables with feedback.
- Master timeline with consistent status, due dates, and risk flags.
- Basic reports (per-project progress, overdue items).

### Explicit non-goals for MVP
- Complex billing/plan enforcement (unless required for launch).
- Deep analytics beyond core operational reports.
- Multi-workspace cross-tenant analytics.
- Advanced automation rules beyond the core workflow.

## 5) Personas and key flows
- Admin: onboard client + designers, create project, provision board, monitor sync, close project.
- Designer: execute deliverables, manage versions, respond to feedback.
- Client: review, approve/reject, comment, track status.

## 6) Architecture decisions to lock (must decide before build)
- D-01 Deliverable versions: relational table vs JSONB on deliverables.
- D-02 Trust boundary: Edge Functions/API for privileged ops vs client-first RLS.
- D-03 Tenant boundary: client as tenant vs board as tenant.
- D-04 Source of truth for status/due dates: DB vs Miro.
- D-05 Sync model: job queue, idempotency keys, conflict resolution strategy.
- D-06 Required integrations in MVP: Postmark, Sentry, other?
- D-07 Data migration: keep any existing data or reset fully?

## 7) Canonical data model (target)
Core entities (exact schema must align with contract matrix):
- users (role, auth_user_id, miro_user_id, subscription_plan_id)
- projects (status, priority, due_date, client_id, created_by)
- project_designers (project_id, user_id)
- deliverables
- deliverable_versions OR deliverables.versions (choose D-01)
- deliverable_feedback
- user_boards, boards
- notifications
- project_updates (audit/history)
- sync_logs and (future) sync_jobs/sync_events
- app_settings, project_types, subscription_plans
- files (if needed for uploads)

## 8) Security and auth
- Use Miro OAuth for board access; store refresh tokens encrypted.
- Use Supabase Auth for app identity, but keep privileged ops server-side.
- RLS remains as safety net, not as primary boundary.
- All admin-only actions routed through Edge Functions with audit logs.

## 9) Miro sync design (target)
- Outbound: DB changes enqueue sync jobs that update Miro timeline/frames.
- Inbound: Miro webhook enqueues jobs that update DB with strict mapping.
- Idempotency: prevent duplicate cards/frames and duplicate deliverable versions.
- Observability: sync_logs + metrics (last_ok, last_error, retries).

## 10) Reliability and observability
- Minimal dashboards: per-project sync health, error rates, retry count.
- Structured logs for Edge Functions and sync worker.
- Sentry for runtime errors (optional in MVP).

## 11) Phased plan and gates
- Phase 0: contract matrix + decisions locked.
- Phase 1: canonical DB migrations, reproducible from zero.
- Phase 2: trust boundary (Edge Functions/API) and auth hardening.
- Phase 3: workflow state machines and invariants.
- Phase 4: durable sync (jobs, idempotency, retries).
- Phase 5: performance + DX (pagination, build checks, CI).

## 12) Deliverables for the reboot
- Updated PRD or concise product brief.
- Contract matrix (code vs DB vs RPCs).
- Clean migration set (single source of truth).
- Edge Functions/API spec for privileged ops.
- Miro sync spec (webhook + job worker).
- MVP UI map and flows.

## 13) Open questions (need answers)
### Product and business
- What is the primary revenue model (subscription, per-seat, per-client)?
- Who is the primary buyer and decision maker (studio owner, PM, admin)?
- What is the single most critical workflow to sell the product?
- What is the target launch scope and timeline?

### Scope and UX
- Which admin features are non-negotiable on day 1?
- Which parts of the workflow can be manual in V1?
- Do we keep the master timeline as the core UI or pivot to another view?
- Do we need a standalone web app outside Miro?

### Data and domain
- D-01 choice: deliverable_versions table vs JSONB?
- Source of truth for status and due dates (DB vs Miro)?
- Required status transitions and approval rules?
- What is the minimum audit/history required by clients?

### Security and ops
- D-02 choice: Edge Functions/API vs client-first RLS?
- Compliance requirements (LGPD, SOC2, etc)?
- Need for rate limiting or usage caps in MVP?

### Miro integration
- How many boards per client are expected?
- Must the system handle offline or partial sync?
- What is the acceptable sync latency (seconds vs minutes)?

### Migration and reset
- Do we need to migrate any existing data from current envs?
- If yes, which entities and what is the cutoff date?

## 14) Decisions log (fill as answers are provided)
- D-01:
- D-02:
- D-03:
- D-04:
- D-05:
- D-06:
- D-07:

