# Plano Mestre de Refatoração (System Surgery) — Miro App · Brianna Dawes Studio

Este documento é um **backlog executável** (minucioso) para transformar este repositório em um sistema **reproduzível, seguro, escalável e “enterprise-ready”**.

## 0) Contexto (estado atual, sem açúcar)

### Principais constatações (bloqueadores)
- **Banco não é reprodutível**: migrations contraditórias + pelo menos 1 migration inválida (não-SQL) impedem reconstruir o schema com confiança.
- **Segurança quebrada por design**: o app usa chamadas PostgREST com `Authorization: Bearer <anon_key>` no iframe do Miro, o que **derruba qualquer história de RLS/segurança**.
- **Auth “de mentirinha”**: existe fallback para considerar o usuário autenticado via `localStorage` mesmo sem sessão Supabase válida.
- **Sync Miro↔Supabase não é durável**: depende de clientes abrirem o board e rodarem sync (sem job server-side), usa heurísticas frágeis (match por título/posição), e permite desync permanente.
- **Modelo de deliverables inconsistente**: código assume `deliverables.versions` (JSONB), enquanto migrations antigas criam `deliverable_versions` (tabela). Triggers/migrations posteriores também divergem.

### Hotfixes (já aplicados no código) — estabilização imediata
- **Reports / Dashboard mais resiliente a drift de schema**: fallbacks quando `activity_feed`/RPC não existem e quando colunas `count/bonus_count` não estão presentes.
- **Realtime subscription corrigida**: evitar subscription em tabela potencialmente inexistente.

Arquivos relevantes:
- `src/features/reports/services/reportService.ts`
- `src/features/reports/hooks/useRecentActivity.ts`
- `src/features/reports/pages/DashboardPage/DashboardPage.tsx`

### Resultado
Antes de qualquer “refatoração bonita”, precisamos **restaurar a verdade do schema**, **reconstruir a fronteira de confiança**, e **tornar sync durável**.

---

## Docs relacionados (para apresentação e alinhamento)
- Diagrama investor-ready: `docs/DIAGRAMA_FLOW_INVESTIDOR.md`
- Flow do Admin: `docs/FLOW_ADMIN.md`
- Arquitetura do banco (base): `docs/DATABASE_ARCHITECTURE.md`

## 1) Objetivos (Definition of Done global)

Ao final deste plano, o sistema deve:
- Ter **um schema canônico** (migrations limpas) que gera o banco do zero sem ambiguidades.
- Ter **controle de acesso real** (server-side) e **nenhum caminho de escrita/leitura privilegiada via anon key**.
- Ter **workflows formais** (projeto/revisão/aprovação/prazos/deliverables) com transições validadas.
- Ter **sync durável** com Miro (fila/job) e **idempotência**, com observabilidade e retry consistente.
- Ser operável em escala (paginação, agregações no DB, limitação de chamadas ao Miro, etc.).

---

## 2) Decisões obrigatórias (antes de implementar as fases críticas)

Estas decisões travam o desenho do banco e do sync. Sem elas, qualquer patch vira gambiarra.

### D-01: Versões de Deliverables
Escolher 1:
1) **Tabela `deliverable_versions` (relacional)**: melhor para auditoria, métricas, triggers, escalabilidade.
2) **JSONB `deliverables.versions`**: mais simples no curto prazo, mas pior para consultas e consistência.

**Recomendação**: (1) tabela relacional, com view/materialized view para leitura rápida se necessário.

### D-02: Modelo de autenticação/autorização
Escolher 1:
1) **Supabase Auth + RLS estrita** (sem anon REST) e resolver o problema do iframe de forma correta.
2) **Backend confiável (Edge Functions/API)**: o frontend não fala direto com PostgREST para operações sensíveis; valida token do Miro no servidor e usa service role.

**Recomendação**: (2). O app é embutido no Miro e precisa de uma fronteira de confiança real; o caminho atual já provou que “client-only + RLS” está frágil.

### D-03: Multi-tenant boundary
Definir: o tenant é o **Client (user_id)**, o **Board (miro_board_id)**, ou **ambos**?

**Recomendação**: tenant primário = client; board é uma propriedade/escopo operacional (com validação “client só acessa o próprio board primário + boards autorizados”).

---

## 3) Estratégia de execução (gates por fase)

Cada fase tem um **gate**. Não avance sem passar no gate. Isso evita “refactor theatre”.

- **Fase 0 (Freeze + Matriz)** → Gate: matriz de contrato completa
- **Fase 1 (DB canônico)** → Gate: migrations sobem do zero e batem com o contrato
- **Fase 2 (Segurança/Auth)** → Gate: nenhuma operação privilegiada funciona com anon; regras server-side
- **Fase 3 (Domínio/Workflows)** → Gate: state machines e invariantes centralizados e testados
- **Fase 4 (Sync durável)** → Gate: convergência garantida via jobs idempotentes
- **Fase 5 (Performance/DX)** → Gate: paginado, agregações no DB, observabilidade e CI mínimos

---

## 4) Backlog detalhado (tarefas minuciosas)

> Convenções:
> - Prioridade: **P0** (bloqueador), **P1** (alto), **P2** (médio), **P3** (baixo)
> - Cada tarefa tem: objetivo, passos, arquivos, critérios de aceite.

---

# FASE 0 — Freeze + Matriz de Contrato (P0)

## F0-001 (P0) Criar “Contrato do Sistema” (code ↔ schema ↔ seeds ↔ views/RPC)
**Objetivo:** ter uma lista única e verificável do que o app usa vs o que o DB fornece.
**Passos:**
1) Extrair do código todos os `.from('...')` e `rpc('...')` usados.
2) Extrair do SQL (migrations + FULL_MIGRATION) todos os `CREATE TABLE/TYPE/VIEW/FUNCTION/TRIGGER`.
3) Montar uma matriz por entidade: colunas, enums, chaves, permissões, triggers, RPCs.
4) Marcar divergências como P0/P1.
**Arquivos:**
- Criar: `docs/architecture/contract-matrix.md`
**Aceite:**
- Matrizes completas para: `users`, `projects`, `deliverables`, `deliverable_feedback`, `project_designers`, `user_boards`, `notifications`, `sync_logs`, `project_types`, `app_settings`, `subscription_plans`, views usadas.

## F0-002 (P0) Definir decisão D-01/D-02/D-03
**Objetivo:** congelar as decisões estruturais.
**Passos:**
1) Reunião/decisão documentada.
2) Atualizar este documento com as decisões finais.
**Arquivos:**
- Atualizar: `docs/REFATORACAO_MASTER_PLAN.md`
**Aceite:**
- D-01/D-02/D-03 decididos e assinados.

## F0-003 (P0) Criar checklist de “Gates” e “Smoke tests”
**Objetivo:** saber quando cada fase terminou.
**Passos:**
1) Definir smoke tests mínimos (DB build, login, listar projetos, criar projeto, sync básico).
2) Adicionar comandos e expectativas.
**Arquivos:**
- Criar: `docs/architecture/gates-and-smoke-tests.md`
**Aceite:**
- Cada gate tem verificação objetiva (pass/fail).

---

# FASE 1 — Banco Canônico e Reprodutível (P0)

## DB-001 (P0) Consertar migration inválida
**Objetivo:** não existir migration não-SQL.
**Passos:**
1) Corrigir ou remover `supabase/migrations/018_allow_clients_create_projects.sql` (conteúdo atual não é SQL).
2) Garantir ordem e dependências.
**Arquivos:**
- `supabase/migrations/018_allow_clients_create_projects.sql`
**Aceite:**
- Runner de migrations executa sem erro.

## DB-002 (P0) Escolher fonte canônica do schema (migrations vs FULL_MIGRATION.sql)
**Objetivo:** “uma verdade”.
**Passos (opção A — migrations):**
1) Revisar migrations existentes, eliminar duplicatas/contradições.
2) Garantir que o estado final bate com o contrato (F0-001).
**Passos (opção B — FULL_MIGRATION):**
1) Gerar um conjunto novo de migrations limpas a partir do `supabase/FULL_MIGRATION.sql`.
2) Arquivar (não usar) migrations antigas contraditórias.
**Arquivos:**
- `supabase/migrations/*`
- `supabase/FULL_MIGRATION.sql`
**Aceite:**
- DB sobe do zero e o schema final bate com o contrato.

## DB-003 (P0) Resolver deliverables: JSONB vs tabela (D-01)
**Objetivo:** alinhar DB + código + triggers.
**Passos (se tabela `deliverable_versions`):**
1) Remover uso de `deliverables.versions` no frontend e reintroduzir repository/queries para tabela.
2) Ajustar triggers de notificação para INSERT em `deliverable_versions` (não UPDATE JSONB).
3) Ajustar seed e métricas.
**Passos (se JSONB):**
1) Criar migration que remove `deliverable_versions` e adiciona `deliverables.versions jsonb`.
2) Atualizar enums/colunas para bater com UI.
3) Ajustar triggers e views.
**Arquivos:**
- `supabase/migrations/003_create_deliverables.sql`
- `supabase/migrations/039_complete_notification_system.sql`
- `src/features/deliverables/services/deliverableService.ts`
**Aceite:**
- Upload de versão funciona; notificações disparam; relatórios conseguem contar versões.

## DB-004 (P0) Garantir existência de tabelas/views referenciadas pelo código
**Objetivo:** código não pode depender de objetos inexistentes.
**Passos:**
1) Criar (ou remover uso) de: `boards`, `subscription_plans`, view `client_plan_stats`, `project_updates` (ou remover subscription).
2) Revisar `activity_feed` view e seu contrato.
**Arquivos:**
- `supabase/migrations/*`
- `src/features/admin/services/adminService.ts`
- `src/features/reports/hooks/useRecentActivity.ts`
**Aceite:**
- Nenhuma query/subscription falha por “relation does not exist”.

## DB-005 (P0) Normalizar enums (projetos e deliverables)
**Objetivo:** enums centralizados e consistentes.
**Passos:**
1) `project_status` deve refletir as 5 colunas (overdue/urgent/in_progress/review/done) + regra de arquivamento se existir.
2) `deliverable_status` e `deliverable_type` devem refletir o que a UI usa (ou a UI deve refletir o DB).
3) Atualizar `src/shared/lib/statusMapping.ts` e constantes.
**Arquivos:**
- `supabase/migrations/*`
- `src/shared/lib/statusMapping.ts`
- `src/features/deliverables/domain/deliverable.constants.ts`
**Aceite:**
- Não existe “mapeamento para ‘other’” por falta de enum; UI e DB falam a mesma língua.

## DB-006 (P1) Regerar types do Supabase e travar drift
**Objetivo:** `database.types.ts` não pode mentir.
**Passos:**
1) Gerar types a partir do schema final.
2) Criar checklist para re-gerar quando migrations mudarem.
**Arquivos:**
- `src/shared/types/database.types.ts`
**Aceite:**
- Types batem com DB e compila.

## DB-007 (P1) Seed coerente com schema final
**Objetivo:** seed não quebrar e refletir o domínio.
**Passos:**
1) Ajustar `supabase/seed_test_data.sql` para enums/colunas finais.
2) Remover inserts para colunas inexistentes.
**Arquivos:**
- `supabase/seed_test_data.sql`
**Aceite:**
- Seed executa e popula dados úteis para smoke tests.

## DB-008 (P1) Validar RLS/policies com base no modelo D-02
**Objetivo:** ou RLS estrita, ou server-side com service role (mas consistente).
**Passos:**
1) Documentar as policies por tabela.
2) Criar policies mínimas corretas (sem “anon permissivo”).
**Arquivos:**
- `supabase/migrations/*`
- `docs/architecture/rls-policy-map.md`
**Aceite:**
- Permissões são verificáveis por role e não dependem de UI.

---

# FASE 2 — Segurança / Auth / Trust Boundary (P0 — obrigatória)

## SEC-001 (P0) Remover caminho PostgREST anon no iframe
**Objetivo:** nenhuma leitura/escrita sensível via `Authorization: Bearer anon_key`.
**Passos:**
1) Descontinuar `src/shared/lib/supabaseRest.ts` para dados sensíveis.
2) Substituir chamadas por um caminho confiável (Edge Function/API) ou por Supabase Auth real.
**Arquivos:**
- `src/shared/lib/supabaseRest.ts`
- `src/features/projects/services/projectService.ts`
- `src/features/reports/pages/DashboardPage/DashboardPage.tsx` (usa REST)
**Aceite:**
- Sem `Bearer anon` para tabelas privadas; o app continua funcional no Miro iframe.

## AUTH-001 (P0) Eliminar “auth via localStorage” sem sessão válida
**Objetivo:** o app não pode se considerar autenticado sem prova server-side.
**Passos:**
1) Remover/alterar o fallback que seta `isAuthenticated: true` quando `supabaseAuthBridge` falha.
2) Ajustar UX para “sessão inválida → reauth”.
**Arquivos:**
- `src/features/auth/context/AuthProvider.tsx`
**Aceite:**
- Sem sessão válida: usuário não acessa rotas protegidas nem dados.

## AUTH-002 (P0) Remover “segredo” client-side (`VITE_AUTH_SECRET`)
**Objetivo:** parar de fingir segredo no frontend.
**Passos:**
1) Remover derivação de password no browser.
2) Se for usar Supabase Auth, criar fluxo server-side (Edge Function) para criar/linkar usuários.
**Arquivos:**
- `src/features/auth/services/supabaseAuthBridge.ts`
- `src/shared/config/env.ts`
**Aceite:**
- Não existe segredo que vaza para o bundle como mecanismo de segurança.

## AUTH-003 (P1) Verificação correta do token do Miro
**Objetivo:** não confiar em `atob()` de JWT sem verificação.
**Passos:**
1) Validar token do Miro server-side (JWKS/assinatura/audience/issuer).
2) Frontend apenas encaminha token.
**Arquivos:**
- `src/features/auth/services/miroAuthService.ts` (reduzir responsabilidade)
- Novo: `supabase/functions/*` (ou backend)
**Aceite:**
- Email/ID só são aceitos após verificação.

## SEC-002 (P1) Definir e aplicar “Board scoping” (anti-cross-tenant)
**Objetivo:** cliente não enxerga projetos de outro cliente/board.
**Passos:**
1) Backend valida que `user_id` tem permissão para `miro_board_id`.
2) Queries sempre filtram por escopo permitido.
**Arquivos:**
- `src/features/projects/services/projectService.ts`
- backend/Edge function
**Aceite:**
- Tentativas de listar projetos de outro board/cliente falham com 403.

## SEC-003 (P1) Storage seguro para deliverables
**Objetivo:** evitar URLs públicas para assets privados (se o produto exige privacidade).
**Passos:**
1) Definir bucket privado e uso de signed URLs.
2) Garantir RLS/policies em storage.
**Arquivos:**
- `src/features/deliverables/services/deliverableService.ts`
- `supabase/migrations/*` (storage policies)
**Aceite:**
- Assets não são publicamente enumeráveis sem autorização.

---

# FASE 3 — Domínio e Workflows (P1)

## DOM-001 (P0) Formalizar máquina de estados do Projeto (status + aprovação)
**Objetivo:** substituir `status + wasApproved/wasReviewed` por um workflow consistente.
**Passos:**
1) Definir estados e transições permitidas (Admin/Client/Designer).
2) Implementar validação server-side.
3) Mapear estados para as 5 colunas do timeline (se mantidas).
**Arquivos:**
- Novo: `src/features/projects/domain/workflow/*`
- Refatorar: `src/features/projects/components/ProjectCard/*`
**Aceite:**
- Não existem combinações inválidas (ex.: aprovado + in_progress sem transição explícita).

## DOM-002 (P0) Workflow de aprovação de due date
**Objetivo:** `dueDateApproved`, `requestedDueDate`, `dueDateRequestedAt/By` terem regras claras.
**Passos:**
1) Definir como o cliente solicita e como o admin aprova/recusa.
2) Persistir quem fez a ação (actor).
3) Notificar corretamente.
**Arquivos:**
- `src/features/projects/services/projectService.ts`
- `src/features/projects/components/ProjectCard/ProjectCard.tsx`
- migrations (colunas/policies)
**Aceite:**
- Estado “pending” é rastreável, auditável e consistente em UI/Miro.

## DOM-003 (P1) Centralizar catálogo de Project Types no DB
**Objetivo:** remover hardcode duplicado de tipos e SLAs.
**Passos:**
1) UI sempre consulta `project_types`.
2) Remover duplicações (ex.: `DeveloperTools` hardcoded).
**Arquivos:**
- `src/features/admin/services/projectTypeService.ts`
- `src/features/admin/components/DeveloperTools/DeveloperTools.tsx`
**Aceite:**
- Alterar tipos no admin reflete em criação/cálculo de prazo sem deploy.

## DOM-004 (P1) Modelo de permissões unificado
**Objetivo:** uma fonte de verdade para permissões.
**Passos:**
1) Definir regras por role + ownership (clientId/designer assignments).
2) Aplicar server-side.
3) UI apenas reflete permissões (não impõe).
**Arquivos:**
- `src/shared/config/roles.ts` (pode virar apenas “UI hints”)
- backend/Edge function policies
**Aceite:**
- Mesmo chamando APIs diretamente, permissões são respeitadas.

---

# FASE 4 — Sync Miro↔Supabase Durável e Idempotente (P0/P1)

## SYNC-001 (P0) Parar de depender de heurística por título/posição
**Objetivo:** Miro items devem ser endereçados por IDs persistidos.
**Passos:**
1) Garantir que `projects.miro_card_id` e `projects.miro_frame_id` sejam sempre preenchidos no momento de criação.
2) Todas as atualizações usam esses IDs; fallback por scan só em modo “reparação”.
**Arquivos:**
- `src/features/boards/services/miroSdkService.ts`
- `src/features/boards/services/projectSyncOrchestrator.ts`
- `src/features/projects/services/projectService.ts` (persistência)
**Aceite:**
- Renomear frames/cards no Miro não quebra sync.

## SYNC-002 (P0) Criar fila de jobs (`sync_jobs`) + tentativas (`sync_attempts`)
**Objetivo:** sync não depender do browser aberto.
**Passos:**
1) Migration criando `sync_jobs` (status, payload, idempotency_key, retries, next_run_at).
2) Criar worker (Edge Function + cron/scheduler) que processa jobs.
3) UI cria jobs em vez de executar sync completo.
**Arquivos:**
- `supabase/migrations/*`
- Novo: `supabase/functions/sync-worker/*`
**Aceite:**
- Criar/atualizar projeto enfileira job; worker executa e atualiza status.

## SYNC-003 (P0) Idempotência e rollback lógico
**Objetivo:** reprocessar job não cria duplicatas no Miro.
**Passos:**
1) Definir idempotency keys por operação (create/update/status-change).
2) No Miro, usar “upsert by id” (se id existe → update; senão → create e persistir id).
3) Registrar efeitos no DB (itens criados/atualizados).
**Arquivos:**
- worker sync
- schema (job logs)
**Aceite:**
- Rodar o mesmo job 5 vezes deixa o Miro no mesmo estado final.

## SYNC-004 (P1) Unificar caminhos de sync no frontend (enfileirar sempre)
**Objetivo:** um único fluxo de orquestração.
**Passos:**
1) Remover chamadas diretas ao `miro.board.*` de componentes (ex.: `ProjectCard`).
2) `useUpdateProjectWithMiro` vira “update → enqueue sync job”.
3) Board modal atualiza DB e apenas dispara job; UI observa status.
**Arquivos:**
- `src/app/BoardModalApp.tsx`
- `src/features/projects/hooks/useProjectWithMiro.ts`
- `src/features/projects/components/ProjectCard/ProjectCard.tsx`
**Aceite:**
- Sync status é sempre rastreado, e o mesmo fluxo é usado em todo lugar.

## SYNC-005 (P1) Fix no `syncLogService.incrementRetryCount`
**Objetivo:** corrigir bug lógico/SQL (update set column = rpc()).
**Passos:**
1) Reimplementar incremento via RPC que faz UPDATE internamente, ou via `select` + update.
2) Adicionar teste/manual check.
**Arquivos:**
- `src/features/boards/services/syncLogService.ts`
- migrations (RPC) se necessário
**Aceite:**
- Retry count incrementa corretamente e status muda para syncing sem erro.

---

# FASE 5 — Performance, Observabilidade e DX (P1/P2)

## PERF-001 (P1) Paginação real e limites (remover `pageSize: 1000`)
**Objetivo:** evitar fetch massivo.
**Passos:**
1) Board modal e lists paginam por status/scroll.
2) `getProjects` aceita cursor/offset e usa índices.
**Arquivos:**
- `src/app/BoardModalApp.tsx`
- `src/features/projects/services/projectService.ts`
**Aceite:**
- 10k projetos não derrubam o painel.

## PERF-002 (P1) Agregações no DB (analytics/reports)
**Objetivo:** remover contagens client-side.
**Passos:**
1) Criar views/RPC para métricas (projects by status, deliverables by type, etc.).
2) `analyticsService` e `reportService` usam essas views/RPCs.
**Arquivos:**
- `src/features/admin/services/analyticsService.ts`
- `src/features/reports/services/reportService.ts`
- migrations (views/RPCs)
**Aceite:**
- Dashboard não faz `select *` de tabelas grandes.

## OBS-001 (P1) Logging padronizado + reduzir console spam
**Objetivo:** logs úteis e sem vazamento.
**Passos:**
1) Substituir `console.log` por `createLogger` com níveis.
2) Garantir que logs sensíveis não aparecem em produção.
**Arquivos:**
- `src/features/boards/context/MiroContext.tsx`
- `src/shared/lib/supabase.ts`
**Aceite:**
- Produção: logs mínimos; dev: logs ricos, sem dados sensíveis.

## DX-001 (P1) CI mínima: typecheck + lint + smoke tests
**Objetivo:** travar regressões.
**Passos:**
1) Adicionar pipeline (GitHub Actions ou equivalente).
2) Rodar `npm run typecheck`, `npm run lint`.
3) (Opcional) script que valida contrato (F0-001).
**Arquivos:**
- `.github/workflows/ci.yml` (se aplicável)
**Aceite:**
- PR não passa sem typecheck/lint.

## TEST-001 (P2) Testes de domínio (state machine + permissões)
**Objetivo:** regra de negócio testável sem Miro.
**Passos:**
1) Testar transições de estado do projeto.
2) Testar matriz de permissões.
**Arquivos:**
- Novo: `src/features/projects/domain/workflow/*.test.ts`
**Aceite:**
- Casos críticos cobertos (aprovação, request changes, done, etc.).

---

## 5) Lista de problemas mapeados → tarefas correspondentes (rastreamento)

- Migrations contraditórias / não reprodutíveis → **Fase 1 (DB-001…DB-007)**
- Deliverables JSONB vs tabela → **DB-003**
- `project_updates` inexistente → **DB-004**
- `boards/subscription_plans/client_plan_stats` faltando → **DB-004**
- PostgREST anon no iframe → **SEC-001**
- Auth fallback localStorage → **AUTH-001**
- “secret” no frontend → **AUTH-002**
- Token sem verificação → **AUTH-003**
- Sync frágil e client-driven → **SYNC-001…SYNC-004**
- Bug em retry count (sync logs) → **SYNC-005**
- Fetch-all (analytics/board modal) → **PERF-001/PERF-002**

---

## 6) Estimativa (ordem de grandeza)

> Varia conforme D-01/D-02. Abaixo é uma faixa realista.

- Fase 0: 1–2 dias
- Fase 1: 3–7 dias
- Fase 2: 5–10 dias
- Fase 3: 5–10 dias
- Fase 4: 7–14 dias
- Fase 5: contínuo (primeiro pacote: 3–7 dias)

---

## 7) Próximos passos imediatos (para começar amanhã)
1) Executar **F0-001** (matriz de contrato) e anexar o resultado neste repo.
2) Tomar decisões **D-01/D-02/D-03**.
3) Iniciar **DB-001** e **DB-002** (sem isso, nada é confiável).
