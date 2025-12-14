# Roadmap Q1–Q4 (produto + engenharia) — rumo a escala

Este roadmap transforma o app em uma plataforma **durável, segura e operável**. Ele assume as recomendações de arquitetura em `docs/architecture/DECISOES_ARQUITETURA.md`.

---

## Q1 — “Confiável e reprodutível” (fundação)

### Resultado de negócio (personas)
- **Admin**: cria projeto + provisiona board com 1 clique, com checklist de setup e reports confiáveis.
- **Designer**: trabalha com entregáveis/versões sem perder histórico; feedback aparece consistente.
- **Client**: revisa e aprova sem depender de “abrir o board certo na hora certa”.

### Entregas de engenharia (P0/P1)
- **Banco canônico**: migrations sobem do zero; contrato fechado (`docs/architecture/contract-matrix.md`).
- **Reports robustos**: métricas via views/RPC estáveis (sem drift); paginação onde necessário.
- **Observabilidade mínima**: `sync_logs` confiáveis; erros e last_ok por projeto.
- **Correções críticas de segurança (primeiro corte)**:
  - remover atalhos client-side que bypassam segurança (especialmente anon REST para operações sensíveis).

### “Definition of Done” Q1
- Gate 1 e Gate 2 aprovados em `docs/architecture/gates-and-smoke-tests.md`.

---

## Q2 — “Workflows governados” (processo vendável)

### Resultado de negócio (personas)
- **Admin**: governa transições de status e prazos com regras claras; aprova mudanças; vê gargalos.
- **Designer**: fila de feedback; reprovação reabre ciclo automaticamente; menos “vai e volta” manual.
- **Client**: review guiado (aprova/reprova + motivo); histórico e recibo de aprovação.

### Entregas de engenharia
- **State machines**: transições centralizadas para `project_status`, `deliverable_status`, e regras de prazos.
- **Notificações e digests**: “pendências esperando você” por papel (admin/designer/client).
- **RBAC/ABAC unificado**: uma estratégia de permissões (server-side) com testes básicos.

### “Definition of Done” Q2
- Gate 3 aprovado (workflow centralizado).

---

## Q3 — “Durável e escalável” (muitos projetos/boards)

### Resultado de negócio (personas)
- **Admin**: re-sync/reconcile com 1 clique; capacidade por designer; operações em lote.
- **Designer**: “Minha semana” (prioridades, deadlines, itens em review); multi-projeto com baixa fricção.
- **Client**: multi-projeto com filtros por status e aprovações pendentes; permissões mais granulares.

### Entregas de engenharia
- **Sync server-side com jobs**:
  - tabelas `sync_jobs`/`sync_events` (ou equivalente), idempotência, retry/backoff
  - rate limiting por board/tenant
  - “requeue” e “dead-letter” (falha definitiva)
- **Outbox/audit**: trilha de eventos para reprocessamento e consistência.
- **Performance**: materialized views para relatórios; queries paginadas; redução de chamadas chatty ao Miro.

### “Definition of Done” Q3
- Gate 4 aprovado (sync durável e idempotente).

---

## Q4 — “Enterprise-ready” (operável e vendável para contas grandes)

### Resultado de negócio (personas)
- **Admin**: console de auditoria e governança; templates versionados; relatórios executivos.
- **Designer**: automações de repetição; qualidade e previsibilidade.
- **Client**: portal de aprovação por stakeholder; trilha de decisões; exports.

### Entregas de engenharia
- **Observabilidade completa**: métricas, alertas, tracing (p95 sync, taxa de falha, filas).
- **Segurança avançada**: hardening, políticas, segregação de tenant, revisões de RLS/boundary.
- **DX/CI**: smoke tests automatizados (mínimo), lint/typecheck/build em pipeline.

### “Definition of Done” Q4
- Gate 5 aprovado (performance + DX), com SLOs definidos.

