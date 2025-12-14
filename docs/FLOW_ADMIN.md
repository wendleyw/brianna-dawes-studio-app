# Flow do Admin (como o Admin governa o sistema) — Brianna Dawes Studio · Miro App

## 1) Objetivo do Admin
O Admin é o “operador” do sistema: garante que cada projeto tenha **estrutura**, **papéis**, **status/prazos** e **dados consistentes** entre Supabase e Miro.

---

## 2) Checklist mental do Admin (o que ele controla)
- **Clientes**: quem é o client, quais projetos ele vê, qual board ele acessa.
- **Designers**: alocação por projeto, carga, prazos.
- **Projetos**: lifecycle (criar → executar → review → done), prioridades (urgent/overdue), arquivamento.
- **Board (Miro)**: template padrão, estrutura (frames/colunas), governança visual.
- **Sync**: saúde da sincronização Miro↔Supabase (erros, atrasos, pendências).
- **Relatórios**: entregáveis, feedback recente, gargalos, atrasos, throughput.

---

## 3) Fluxo “Admin 360” (sequência completa)

```text
┌───────────────────────────────────────────────────────────────────────┐
│ 1) Setup                                                             │
│   - Define template(s) e board master                                │
│   - Configura tipos de projeto / etapas / regras de status           │
└───────────────┬───────────────────────────────────────────────────────┘
                v
┌───────────────────────────────────────────────────────────────────────┐
│ 2) Onboard Cliente + Designer(s)                                      │
│   - Cria/valida usuários e papéis                                    │
│   - Define permissões (cliente vê só o que precisa)                  │
└───────────────┬───────────────────────────────────────────────────────┘
                v
┌───────────────────────────────────────────────────────────────────────┐
│ 3) Criar Projeto                                                      │
│   - Nome, tipo, prazos, briefing, etapas                              │
│   - Atribui designer(s)                                               │
└───────────────┬───────────────────────────────────────────────────────┘
                v
┌───────────────────────────────────────────────────────────────────────┐
│ 4) Criar/Associar Board no Miro                                       │
│   - Cria novo board (ou duplica template)                             │
│   - Monta estrutura: timeline / colunas / áreas de entregáveis        │
└───────────────┬───────────────────────────────────────────────────────┘
                v
┌───────────────────────────────────────────────────────────────────────┐
│ 5) Execução + Acompanhamento                                           │
│   - Designer produz entregáveis e versões                             │
│   - Admin monitora atrasos/risco e ajusta plano                        │
└───────────────┬───────────────────────────────────────────────────────┘
                v
┌───────────────────────────────────────────────────────────────────────┐
│ 6) Review / Aprovação (Client)                                        │
│   - Client comenta e aprova/reprova                                  │
│   - Admin garante que feedback vira ação                              │
└───────────────┬───────────────────────────────────────────────────────┘
                v
┌───────────────────────────────────────────────────────────────────────┐
│ 7) Fechamento + Relatórios                                             │
│   - Marca entregas como concluídas                                    │
│   - Gera report (progresso, throughput, atrasos, feedback)            │
│   - Arquiva projeto e mantém histórico                                │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 4) Fluxos críticos em detalhe (o que o Admin faz “na prática”)

### 4.1 Criar projeto (do zero ao “pronto para trabalhar”)
```text
Admin -> UI (Admin/Projects) -> Supabase: projects.insert
Admin -> UI -> Supabase: project_designers.insert (alocação)
Admin -> UI -> Miro SDK: criar/duplicar board
Admin -> UI -> Supabase: salvar miro_board_id + user_boards/permissões
Admin -> UI -> Miro SDK: aplicar estrutura (frames/colunas/cards base)
```
Sinais de fragilidade para o Admin vigiar:
- “Projeto existe no Supabase, mas board não foi criado/associado”
- “Board existe, mas o client não tem acesso correto”

### 4.2 Governança de status e prazos (evitar caos)
```text
Admin -> UI -> Supabase: projects.update(status, due_date, flags)
Admin -> UI -> (opcional) Miro SDK: refletir status no board (labels/cores)
Reports -> UI -> Supabase: métricas de overdue/urgent/review/done
```
Onde o Admin sofre se o domínio não estiver formalizado:
- status sendo atualizado por múltiplas telas com regras diferentes
- “overdue” calculado às vezes no UI, às vezes no DB

### 4.3 Review/Approval (orquestração)
```text
Client -> UI -> Supabase: deliverable_feedback.insert (approve/reject/comment)
Admin -> UI -> enxerga pendências (feedback não resolvido)
Admin -> Designer: prioriza correções
Designer -> UI -> Supabase: nova versão / resposta ao feedback
Admin -> UI -> fecha ciclo e atualiza status do projeto
```
Ponto de falha clássico:
- feedback existe, mas não dispara transição “voltar para in_progress” ou “ficar em review”

### 4.4 Sync health (Admin como SRE do produto)
O Admin precisa de uma visão simples:
```text
Projeto X: last_sync_at, last_sync_ok, last_sync_error, pending_jobs
  - Se falhou: re-sync / requeue / logs
  - Se desync: reconciliação (fonte de verdade + idempotência)
```
Hoje, se o sync depende do cliente (browser/iframe), o Admin fica sem um “botão confiável” para garantir convergência.

---

## 5) Como explicar isso para time/investidor (script curto)
- “O Admin cria um projeto e gera um board padronizado no Miro.”
- “O Designer executa dentro do board e tudo vira dados (entregáveis/versões/status).”
- “O Client revisa e aprova com rastreabilidade.”
- “O Admin acompanha saúde, prazos e produtividade via reports.”
- “Para escala, movemos sync e permissões sensíveis para jobs/API server-side com auditoria e retry.”

