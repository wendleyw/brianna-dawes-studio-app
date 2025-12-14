# Decisões de Arquitetura (D-01 / D-02 / D-03)

Este documento congela as decisões que destravam DB, auth e sync em escala.

---

## D-01 — Versionamento de Deliverables (fonte de verdade)
**Pergunta:** versões ficam em tabela relacional (`deliverable_versions`) ou em JSONB (`deliverables.versions`)?

### Opção A — `deliverable_versions` (recomendado)
- Prós: auditoria, queries, índices, triggers e métricas mais confiáveis; fácil garantir integridade.
- Contras: exige migração de modelo e ajustes de queries.

### Opção B — JSONB em `deliverables.versions`
- Prós: implementação rápida no curto prazo.
- Contras: consultas e consistência piores; difícil evitar drift e bugs; tendência a “gambiarra permanente”.

**Proposta:** **A (relacional)**.

**Impacto:** relatórios e notificações passam a contar versões via tabela; UI busca versões por join/paginação.

---

## D-02 — Fronteira de confiança (auth/autorizações)
**Pergunta:** o client fala direto com PostgREST (RLS) para tudo, ou existe API/Edge Functions como boundary?

### Opção A — Supabase Auth + RLS “client-first”
- Prós: menos backend para operar.
- Contras: no contexto do Miro iframe, qualquer atalho (anon key, tokens, storage) vira risco estrutural; difícil manter segurança com lógica sensível no client.

### Opção B — API/Edge Functions (recomendado)
- Prós: confiança real, validação server-side, auditoria, rate limiting, jobs duráveis; reduz acoplamento do UI com infra.
- Contras: mais componentes (funções + worker) para operar.

**Proposta:** **B (Edge Functions/API)**.

**Impacto:** operações sensíveis (criar projeto, provisionar board, sync, permissões, reports admin) viram endpoints; UI vira thin client.

---

## D-03 — Boundary de tenant (multi-tenant)
**Pergunta:** o “tenant” é o Client (empresa/cliente), o Board, ou ambos?

### Opção A — Tenant primário = Client (recomendado)
- Prós: billing, permissões, relatórios e governança ficam naturais; board vira um recurso do tenant.
- Contras: precisa mapear boards secundários quando existirem.

### Opção B — Tenant primário = Board
- Prós: simples para app “board-centric”.
- Contras: billing e governança por cliente ficam confusos; permissões viram mais frágeis quando há múltiplos boards.

**Proposta:** **A (Client primário; board como recurso)**.

---

## Próximo passo (para você aprovar)
Responda com:
- `D-01: A ou B`
- `D-02: A ou B`
- `D-03: A ou B`

Se você disser “vai na recomendação”, eu sigo com (A, B, A) e começo as migrações/Edge Functions/jobs.

