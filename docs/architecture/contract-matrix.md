# Matriz de Contrato (Code ↔ DB ↔ Views/RPC ↔ Realtime)

Este documento é o “mapa de dependências” que impede drift entre:
- **Frontend** (queries, RPCs, subscriptions)
- **Supabase Postgres** (tabelas, views, enums, policies)
- **Sync com Miro** (efeitos colaterais e fonte de verdade)

> Objetivo prático: se algum objeto abaixo não existir (ou tiver colunas diferentes), o app quebra silenciosamente.

---

## 1) Objetos do DB referenciados no código (inventário inicial)

### 1.1 Tabelas/Views (via `.from('...')`)
| Objeto | Tipo | Onde aparece (exemplos) | Observações de risco |
|---|---|---|---|
| `users` | tabela | `src/features/auth/context/AuthProvider.tsx`, `src/features/admin/services/adminService.ts`, `src/features/reports/pages/DashboardPage/DashboardPage.tsx` | Core para roles/permissões e atribuição |
| `projects` | tabela | `src/features/projects/services/projectService.ts`, `src/features/reports/services/reportService.ts` | Status/prazos precisam virar state machine |
| `project_designers` | tabela | `src/features/projects/services/projectService.ts`, `src/features/boards/services/masterBoardService.ts` | Tabela de relacionamento crítica |
| `deliverables` | tabela | `src/features/deliverables/services/deliverableService.ts`, `src/features/reports/services/reportService.ts` | Drift conhecido (colunas `count/bonus_count` vs fallback) |
| `deliverable_feedback` | tabela | `src/features/deliverables/services/deliverableService.ts`, `src/features/reports/services/reportService.ts` | Base do review/aprovação |
| `sync_logs` | tabela | `src/features/boards/services/syncLogService.ts` | Observabilidade inicial do sync |
| `user_boards` | tabela | `src/features/admin/services/adminService.ts`, `src/features/projects/pages/ProjectsPage/ProjectsPage.tsx` | Associação usuário↔board (tenant boundary) |
| `app_settings` | tabela | `src/features/admin/services/adminService.ts`, `src/features/boards/services/masterBoardService.ts` | Configuração global: risco de “god settings” |
| `project_types` | tabela | `src/features/admin/services/projectTypeService.ts` | Tipos/templating |
| `notifications` | tabela | `src/features/notifications/*` (indireto), `supabase/migrations/*` | Precisa ser coerente com triggers |
| `boards` | tabela | `src/features/admin/services/adminService.ts` | Atualmente suspeita de “relation does not exist” em alguns ambientes |
| `subscription_plans` | tabela | `src/features/admin/services/adminService.ts` | Se não existir, Admin pages quebram |
| `client_plan_stats` | view | `src/features/admin/services/adminService.ts` | View agregada; precisa contrato estável |
| `activity_feed` | view | `src/features/reports/services/reportService.ts` | Reports usam fallback se view não existir |
| `files` | tabela/view | `src/features/*` (referência indireta) | Validar se é tabela real vs legado |
| `deliverable-files` | tabela | `src/features/deliverables/services/deliverableService.ts` | Nome com hífen exige quotes; provável fonte de erro/drift |

### 1.2 RPCs (via `supabase.rpc('...')`)
| RPC | Onde aparece | Finalidade |
|---|---|---|
| `get_dashboard_metrics` | `src/features/reports/services/reportService.ts` | Métricas agregadas do dashboard |
| `get_project_stats` | `src/features/reports/services/reportService.ts` | Estatísticas por projeto |
| `create_project_with_designers` | `src/features/projects/services/projectService.ts`, `src/features/projects/infra/SupabaseProjectRepository.ts` | Criação transacional (projeto + relações) |
| `update_project_with_designers` | `src/features/projects/services/projectService.ts`, `src/features/projects/infra/SupabaseProjectRepository.ts` | Update transacional |
| `get_projects_needing_sync` | `src/features/projects/services/projectService.ts` | Seleção para sync |
| `increment_sync_retry` | `src/features/projects/services/projectService.ts` | Health/retry de sync |
| `get_sync_health_metrics` | `src/features/projects/services/projectService.ts` | Observabilidade do sync |
| `create_sync_log` | `src/features/boards/services/syncLogService.ts` | Início de execução de sync |
| `complete_sync_log` | `src/features/boards/services/syncLogService.ts` | Finalização de sync |
| `set_primary_board` | `src/features/admin/services/adminService.ts` | Definir board primário do usuário |
| `increment_deliverables_used` | `src/features/admin/services/adminService.ts` | Billing/limites (se existir) |
| `link_auth_user` | `src/features/auth/services/supabaseAuthBridge.ts` | Bridge auth usuário (miro↔supabase) |
| `ensure_super_admin` | `src/features/auth/services/miroAuthService.ts` | Bootstrap de admin |

### 1.3 Realtime (supabase.channel)
- `src/shared/hooks/useRealtimePresence.ts` (presence)
- `src/shared/hooks/useRealtimeSubscription.ts` (generic channel)

**Requisito de contrato:** cada subscription precisa apontar para tabela real e políticas Realtime coerentes.

---

## 2) Lacunas conhecidas (P0/P1)

### P0 — Objetos que podem não existir / drift frequente
- `project_updates`, `boards`, `subscription_plans`, `client_plan_stats`, `activity_feed` (varia por ambiente/migrations).
- `deliverable-files`: nome de tabela com hífen é altamente propenso a quebra e inconsistência de schema cache.

### P0 — Segurança / fronteira de confiança
- Qualquer acesso privilegiado que dependa do client (iframe) é risco estrutural; operações sensíveis devem ir para API/Edge Functions.

---

## 3) Como completar a matriz (tarefas)

Para cada objeto acima:
1) **Schema:** colunas, tipos, chaves, índices, FKs.
2) **Policies:** RLS (select/insert/update/delete), roles (admin/client/designer), Realtime.
3) **Domínio:** invariantes (ex.: transições de status), ownership, auditoria (created_by/updated_by).
4) **Sync:** o que é “fonte de verdade” (DB vs Miro) e como reconciliar.

Saída final esperada:
- Uma tabela por entidade em `docs/architecture/contract-matrix.md` (este arquivo), com links para migrations/views/RPCs.

