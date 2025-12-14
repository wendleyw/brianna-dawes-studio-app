# Gates e Smoke Tests (para refatorar sem quebrar)

Este documento define “pass/fail” para cada fase do plano de refatoração, com checagens rápidas.

---

## Gate 0 — Contrato do sistema existe
**Passa se:**
- `docs/architecture/contract-matrix.md` lista todos os objetos do DB usados pelo app (tabelas/views/RPCs/subscriptions).
- Cada item tem responsável (DB vs frontend) e prioridade (P0/P1/P2).

---

## Gate 1 — Banco reprodutível (do zero)
**Passa se:**
- Migrations executam do zero sem erro e o schema final bate com a matriz de contrato.

**Smoke (local):**
- `supabase start`
- `supabase db reset`
- Verificar no Studio local:
  - existem tabelas `projects`, `deliverables`, `deliverable_feedback`, `user_boards`, `sync_logs`
  - existem RPCs: `create_project_with_designers`, `update_project_with_designers`, `get_dashboard_metrics`

---

## Gate 2 — Fronteira de confiança (security) está correta
**Passa se:**
- Nenhuma operação sensível usa anon key no client para bypass de RLS.
- Operações sensíveis passam por uma camada confiável (Edge Functions/API) com validação de identidade.

**Smoke:**
- Usuário “client” não consegue:
  - ler projeto de outro cliente
  - atualizar status/prazos fora do escopo permitido
  - chamar RPCs administrativas
- Auditoria mínima registra: actor_id, ação, timestamp.

---

## Gate 3 — Workflows (domínio) centralizados
**Passa se:**
- Status e transições são validadas em um único lugar (domínio/aplicação), não espalhadas em telas.

**Smoke:**
- Tentativa de transição inválida retorna erro padronizado (ex.: `INVALID_TRANSITION`) e não grava no DB.

---

## Gate 4 — Sync durável e idempotente
**Passa se:**
- Existe fila/job (`sync_jobs`) com retry/backoff.
- Repetir o mesmo job não duplica cards/frames nem duplica deliverables no DB.

**Smoke:**
- Forçar 3 falhas seguidas no worker → job fica `failed` com `last_error`, e um “requeue” cria nova tentativa.
- Rodar sync 2x seguidas → board converge sem duplicar nada.

---

## Gate 5 — Performance e DX mínimos
**Passa se:**
- Queries pesadas estão no DB (views/materialized views) e UI pagina resultados.
- Build e typecheck passam sempre.

**Smoke (repo):**
- `npm run typecheck`
- `npm run build`

