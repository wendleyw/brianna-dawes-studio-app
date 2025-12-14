# Diagrama do Flow do App (Investor-Ready) — Brianna Dawes Studio · Miro App

## 1) Resumo (30 segundos)
Este produto é um **workspace de gestão de projetos criativos dentro do Miro**:
- **Admin** cria e governa projetos, estrutura (brief/timeline/etapas), acesso e relatórios.
- **Designer** executa o trabalho no board (entregas/versões), com status e prazos.
- **Client** revisa, aprova e comenta entregas, com visibilidade controlada.

O app conecta **UI embutida no Miro** ↔ **Supabase (dados, permissões, relatórios)** ↔ **Miro Board (execução visual)**.

---

## 2) Personas e responsabilidades (alto nível)

### Admin (Studio / Operação)
- Cria projeto, define tipo/prazos/etapas e organiza o board
- Atribui designer(es) e concede acesso ao client
- Controla status (in progress / review / done / overdue etc.)
- Monitora saúde do sync e gera relatórios de produtividade/entregas

### Designer (Execução)
- Trabalha no board do projeto, produz entregáveis e versões
- Atualiza status e responde feedback do client
- Mantém o board “limpo” dentro do padrão (cards/frames)

### Client (Revisão / Aprovação)
- Visualiza progresso do projeto
- Comenta e aprova/reprova entregáveis
- (Opcional) aprova prazos/alterações quando aplicável

---

## 3) Mapa do sistema (hoje)

```text
                           +------------------------------+
                           |            MIRO              |
                           |  - Boards (execução visual)  |
                           |  - Permissões do board       |
                           |  - SDK (embedded app)        |
                           +---------------+--------------+
                                           |
                                           | (Miro SDK / iframe)
                                           v
+----------------------------+     +----------------------------+
|  Frontend (Embedded App)   |     |  Modals/Panels/Pages       |
|  - React + TS              |     |  - Admin modal             |
|  - TanStack Query          |     |  - Board modal             |
|  - Zustand/Zod             |     |  - Main app/panel          |
+-------------+--------------+     +-------------+--------------+
              |
              | (Supabase client / PostgREST / Realtime)
              v
   +------------------------------+
   |           SUPABASE           |
   |  - Postgres (projetos etc.)  |
   |  - Auth (sessões/usuários)   |
   |  - Realtime (subscriptions)  |
   |  - Storage (assets)          |
   |  - RPC/views (métricas)      |
   +------------------------------+
```

Ponto crítico (para escala e segurança): hoje, parte do sync e da operação depende do **cliente** (navegador/iframe) rodar lógica e executar ações no Miro/DB.

---

## 4) Fluxos principais (end-to-end)

### 4.1 Criação de Projeto (Admin)
```text
Admin -> UI (Admin Modal) -> Supabase (projects.insert)
                             -> (opcional) relacionamentos: designers, client, settings
UI -> Miro SDK -> cria/associa board (ou seleciona existente)
UI -> Supabase -> salva miro_board_id + metadata do projeto
```

### 4.2 Criação / Preparação do Board (Admin)
```text
Admin -> UI -> Miro SDK
  - cria board ou duplica template
  - cria estrutura base (frames/colunas) do projeto
UI -> Supabase
  - registra user_boards / projeto->board
  - marca sync_status (inicial)
```

### 4.3 Timeline / Briefing / Stages (Admin)
```text
Admin -> UI -> Supabase (project settings / stages)
UI -> Miro SDK -> renderiza/atualiza visual (frames/cards/labels) no board
```

### 4.4 Atualização de Status (Designer/Admin)
```text
User -> UI -> Supabase (projects.update status / due_date / flags)
UI -> Miro SDK -> reflete status no board (tags/cores/colunas)
```

### 4.5 Sync entre Supabase e Miro (hoje: client-driven)
```text
Trigger (usuário abre board / ação no UI)
 -> UI roda "orchestrator" de sync
 -> lê Supabase (projetos/entregáveis/feedback)
 -> lê Miro (cards/frames) via SDK
 -> decide diferenças (heurísticas) e aplica writes
 -> grava logs/status no Supabase
```
Risco: se o usuário não abrir o board, ou se o sync falhar no meio, pode haver **desconvergência**.

### 4.6 Client Review & Approval
```text
Client -> UI -> Supabase (deliverable_feedback.insert / aprovação)
UI -> (opcional) Miro SDK -> marca card como aprovado/reprovado
Designer/Admin -> UI -> resolve pendências e atualiza status
```

### 4.7 Deliverables & Reports
```text
Designer/Admin -> UI -> Supabase (deliverables + feedback)
Reports -> UI -> Supabase (views/RPC + queries agregadas)
Dashboard -> métricas (projetos, entregas, feedback recente, atrasos)
```

---

## 5) Como escalar esse produto (visão alvo)

### 5.1 Arquitetura alvo (durável e escalável)
```text
           +-----------------+          +------------------+
           |      MIRO       |<-------->|  Sync Worker     |
           |  Boards + API   |          |  (Jobs/Queue)    |
           +--------+--------+          +--------+---------+
                    ^                            |
                    |                            v
+-------------------+-------------------+  +---------------------+
| Frontend Embedded (React)             |  |  Supabase Postgres   |
| - UI only (no segredo, pouca lógica)  |  |  + RLS + audit logs  |
+-------------------+-------------------+  +----------+----------+
                    |                                 |
                    v                                 v
          +--------------------+            +---------------------+
          | API/Edge Functions |            | Observabilidade     |
          | - Auth boundary    |            | logs, métricas,     |
          | - Orquestração     |            | tracing, alertas    |
          +--------------------+            +---------------------+
```

### 5.2 O que muda na prática (escala)
- **Sync vira job server-side**: filas (`sync_jobs`) com retry, idempotência e rastreabilidade.
- **UI deixa de ser orquestrador**: UI dispara intents; servidor garante consistência.
- **Autorização “de verdade”**: acesso e escrita sensível acontecem via API confiável (service role), não via anon key no client.
- **Consistência**: status/transições validadas no domínio; sem “cada tela faz do seu jeito”.
- **Performance**: agregações via views/materialized views; paginação; evitar chamadas chatty ao Miro.

---

## 6) Proposta de pitch (1 frase)
“Uma plataforma de gestão de projetos criativos nativa do Miro, com governança, visibilidade e relatórios — conectando Studio, Designer e Client com um fluxo simples de criação, execução e aprovação.”

