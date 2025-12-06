# GUIDE.md - Analise Arquitetural do Projeto

**Projeto:** Brianna Dawes Studio - Miro App
**Data da Analise:** 2025-12-05
**Analista:** Claude (Arquiteto de Software + Code Reviewer Senior)

---

## 0. SUMARIO EXECUTIVO

Este documento apresenta uma analise REAL do codigo existente no repositorio, baseada exclusivamente nos arquivos encontrados e lidos. Nenhuma informacao foi inventada ou assumida.

**Stack Confirmado:**
- Frontend: React 19 + Vite 6 + TypeScript 5.6
- Backend: Supabase (PostgreSQL 15 + RLS + Realtime)
- Integracao: Miro SDK v2
- Estado: TanStack Query v5 + Zustand v4
- Validacao: Zod v3
- Estilizacao: CSS Modules + Design Tokens

---

## 1. INVENTARIO TECNICO

### 1.1 Linguagem e Framework

| Item | Valor | Arquivo de Referencia |
|------|-------|----------------------|
| Linguagem | TypeScript 5.6 | `package.json:36` |
| Framework | React 19.0.0 | `package.json:18` |
| Build Tool | Vite 6.0.0 | `package.json:37` |
| Runtime | Browser (Miro iframe) | `main.tsx` |

### 1.2 Dependencias Principais (package.json)

```
Producao:
- @supabase/supabase-js: ^2.45.0
- @tanstack/react-query: ^5.56.0
- react: ^19.0.0
- react-dom: ^19.0.0
- react-router-dom: ^6.26.0
- recharts: ^2.12.0
- zod: ^3.23.0
- zustand: ^4.5.0

Desenvolvimento:
- typescript: ^5.6.0
- vite: ^6.0.0
- eslint: ^9.9.0
- prettier: ^3.3.0
```

### 1.3 Integracoes Externas ENCONTRADAS

| Integracao | Arquivos | Funcoes Principais |
|------------|----------|-------------------|
| **Supabase** | `src/shared/lib/supabase.ts` | `createClient()`, `.from()`, `.auth`, `.rpc()` |
| **Miro SDK v2** | `src/features/boards/services/miroSdkService.ts` | `miro.board.createFrame()`, `miro.board.createCard()`, `miro.board.getUserInfo()` |
| **Miro Auth** | `src/features/auth/services/miroAuthService.ts` | `miro.board.getIdToken()`, `miro.board.getUserInfo()` |

### 1.4 Estrutura de Pastas Principal

```
/src
├── /app                           # Entry points e providers
│   ├── App.tsx                    # Root component
│   ├── Router.tsx                 # Definicao de rotas
│   ├── Providers.tsx              # QueryClient, Auth, Toast providers
│   └── BoardModalApp.tsx          # App para modal do board
│
├── /features                      # Modulos por feature (Clean Architecture)
│   ├── /auth                      # Autenticacao e autorizacao
│   │   ├── /services              # authService.ts, miroAuthService.ts
│   │   ├── /context               # AuthContext, AuthProvider
│   │   ├── /guards                # ProtectedRoute.tsx
│   │   ├── /components            # LoginForm, AccessDenied
│   │   ├── /pages                 # LoginPage
│   │   ├── /hooks                 # useAuth.ts
│   │   └── /domain                # auth.types.ts, auth.schema.ts
│   │
│   ├── /projects                  # Gestao de projetos
│   │   ├── /services              # projectService.ts, projectKeys.ts
│   │   ├── /components            # ProjectCard, ProjectList, ProjectForm
│   │   ├── /pages                 # ProjectsPage, ProjectDetailPage, NewProjectPage
│   │   ├── /hooks                 # useProjects.ts, useProject.ts, useProjectMutations.ts
│   │   └── /domain                # project.types.ts, project.schema.ts
│   │
│   ├── /deliverables              # Entregas e versoes
│   │   ├── /services              # deliverableService.ts
│   │   ├── /components            # DeliverableCard, DeliverableUpload, VersionHistory
│   │   ├── /hooks                 # useDeliverables.ts, useDeliverableMutations.ts
│   │   └── /domain                # deliverable.types.ts, deliverable.schema.ts
│   │
│   ├── /boards                    # Integracao Miro
│   │   ├── /services              # miroSdkService.ts, brandWorkspaceService.ts
│   │   ├── /context               # MiroContext.tsx
│   │   ├── /components            # KanbanBoard
│   │   ├── /hooks                 # useMiroBoardSync.ts
│   │   └── /constants             # layout.constants.ts, colors.constants.ts
│   │
│   ├── /admin                     # Painel administrativo
│   │   ├── /services              # adminService.ts
│   │   ├── /components            # UserManagement, BoardAssignments, AppSettings
│   │   ├── /pages                 # AdminSettingsPage
│   │   └── /hooks                 # useUsers.ts, useAppSettings.ts
│   │
│   ├── /reports                   # Dashboard e metricas
│   │   ├── /services              # reportService.ts
│   │   ├── /components            # MetricCard, ActivityFeed
│   │   ├── /pages                 # DashboardPage
│   │   └── /hooks                 # useDashboardMetrics.ts, useRecentActivity.ts
│   │
│   └── /notifications             # Sistema de notificacoes
│       ├── /context               # NotificationContext.tsx
│       ├── /components            # NotificationBell
│       └── /hooks                 # useNotifications.ts
│
├── /shared                        # Codigo compartilhado
│   ├── /ui                        # Design System
│   │   ├── Button, Card, Input, Dialog, Badge, Toast, Skeleton, Logo
│   │   ├── /styles                # global.css
│   │   └── /tokens                # colors.css, spacing.css, typography.css
│   ├── /lib                       # Utilitarios
│   │   ├── supabase.ts            # Cliente Supabase
│   │   ├── queryClient.ts         # Configuracao React Query
│   │   └── logger.ts              # Sistema de logging
│   ├── /config                    # Configuracoes
│   │   ├── env.ts                 # Variaveis de ambiente
│   │   └── roles.ts               # Configuracao de roles
│   └── /hooks                     # Hooks compartilhados
│       ├── useDebounce.ts
│       ├── useLocalStorage.ts
│       └── useRealtimeSubscription.ts
│
└── /assets                        # Assets estaticos
    └── /brand                     # Logo e imagens da marca

/supabase
└── /migrations                    # 20 arquivos SQL de migracao
    ├── 001_create_users.sql
    ├── 002_create_projects.sql
    ├── 003_create_deliverables.sql
    └── ... (ate 020_add_was_reviewed_column.sql)
```

---

## 2. ARQUITETURA E FLUXO DE DADOS

### 2.1 Padrao Arquitetural

O projeto segue uma variacao de **Clean Architecture** com:
- **Feature-based modules**: Cada feature e auto-contida
- **Service Layer**: Abstrai acesso ao Supabase
- **React Query**: Gerencia cache e estado do servidor
- **Context API**: Para estado global (Auth, Miro, Toast)

### 2.2 Fluxos de Dados Principais

#### Fluxo 1: Autenticacao via Miro

```
Origem: src/features/auth/components/LoginForm/LoginForm.tsx
  └── Chama: authenticateFromMiro() via useAuth hook
       └── Origem: src/features/auth/context/AuthProvider.tsx:241
            └── Chama: miroAuthService.getMiroUserFromSdk()
                 └── Origem: src/features/auth/services/miroAuthService.ts:80
                      └── Chama: window.miro.board.getUserInfo()
            └── Chama: miroAuthService.authenticateUser(miroUser)
                 └── Origem: src/features/auth/services/miroAuthService.ts:135
                      └── Chama: supabase.from('users').select().eq('miro_user_id', ...)
            └── Salva em: localStorage.setItem('bd_auth_user', JSON.stringify(user))
```

**Problemas identificados neste fluxo:**
1. `miroAuthService.ts:107-114` - Decode manual de JWT sem validacao de assinatura
2. `AuthProvider.tsx:100-102` - Usuario armazenado em localStorage sem encriptacao
3. `miroAuthService.ts:195-198` - Update de miro_user_id sem verificacao de permissao

#### Fluxo 2: Criacao de Projeto

```
Origem: src/features/projects/pages/NewProjectPage/NewProjectPage.tsx
  └── Usa: ProjectForm component
       └── Origem: src/features/projects/components/ProjectForm/ProjectForm.tsx
            └── Chama: createProject mutation via useProjectMutations hook
                 └── Origem: src/features/projects/hooks/useProjectMutations.ts (inferido)
                      └── Chama: projectService.createProject(input)
                           └── Origem: src/features/projects/services/projectService.ts:178
                                └── Chama: supabase.from('projects').insert({...})
                                └── Chama: supabase.from('project_designers').insert([...])
```

**Problemas identificados neste fluxo:**
1. `projectService.ts:200-213` - Insercao de designers sem transacao (pode falhar parcialmente)
2. Nao ha validacao de schema antes do insert (Zod existe mas nao e usado no service)

#### Fluxo 3: Sincronizacao com Miro Board

```
Origem: src/features/boards/services/miroSdkService.ts
  └── Classe: MiroMasterTimelineService
       └── Metodo: syncProject(project)
            └── Linha: 311-569
            └── Chama: miro.board.get({ type: 'card' })
            └── Chama: miro.board.createCard({...}) ou miro.board.sync(item)
            └── Problemas:
                - Linha 315-329: Usa Set para prevenir race conditions (correto)
                - Linha 343-349: Get cards pode falhar silenciosamente
                - Linha 508-542: Double-check antes de criar (bom)
```

### 2.3 Diagrama de Dependencias

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Pages      │────>│  Components  │────>│   UI Kit     │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                                  │
│         v                    v                                  │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │   Hooks      │<───>│   Context    │                         │
│  │ (useProjects)│     │ (AuthProvider)│                         │
│  └──────────────┘     └──────────────┘                         │
│         │                    │                                  │
│         v                    v                                  │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │  Services    │────>│  Supabase    │                         │
│  │ (projectSvc) │     │   Client     │                         │
│  └──────────────┘     └──────────────┘                         │
│         │                    │                                  │
│         v                    │                                  │
│  ┌──────────────┐           │                                  │
│  │  Miro SDK    │           │                                  │
│  └──────────────┘           │                                  │
└─────────────────────────────│──────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Supabase)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  PostgreSQL  │────>│     RLS      │────>│   Storage    │    │
│  │   Tables     │     │   Policies   │     │   Buckets    │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                                                       │
│         v                                                       │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │    Views     │     │  Functions   │                         │
│  │(activity_feed)│     │(get_dashboard_metrics)│                │
│  └──────────────┘     └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. AUTENTICACAO, PERMISSOES E SEGURANCA

### 3.1 Mecanismo de Autenticacao

O sistema usa **autenticacao dual**:

1. **Miro SDK Authentication** (primario):
   - Arquivo: `src/features/auth/services/miroAuthService.ts`
   - Metodo: `getMiroUserFromSdk()` linha 80-129
   - Obtem: `miro.board.getUserInfo()` + `miro.board.getIdToken()`

2. **Supabase Auth** (secundario/fallback):
   - Arquivo: `src/features/auth/services/authService.ts`
   - Metodo: `signIn()` linha 16-38
   - Usa: `supabase.auth.signInWithPassword()`

### 3.2 Sistema de Roles

Encontrado em `src/shared/config/roles.ts` e migrations:

```sql
-- supabase/migrations/001_create_users.sql:2
CREATE TYPE user_role AS ENUM ('admin', 'designer', 'client');
```

| Role | Permissoes DB (RLS) | Permissoes Frontend |
|------|---------------------|---------------------|
| **admin** | Full access a todas tabelas | Acesso a `/admin`, pode gerenciar usuarios |
| **designer** | Projetos atribuidos via `project_designers` | Acesso a projetos atribuidos |
| **client** | Projetos onde e `client_id` | Limitado ao board atribuido |

### 3.3 Validacao de Permissoes

#### No Frontend (ProtectedRoute)
```typescript
// src/features/auth/guards/ProtectedRoute.tsx:294-330
export function ProtectedRoute({ children, allowedRoles, redirectTo = '/login' }) {
  // ... valida isAuthenticated
  // Linha 327: if (allowedRoles && !allowedRoles.includes(user.role))
  //            return <AccessDenied ... />
}
```

#### No Backend (RLS Policies)
```sql
-- supabase/migrations/002_create_projects.sql:49-57
CREATE POLICY "Admins have full access to projects"
  ON public.projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3.4 RISCOS DE SEGURANCA IDENTIFICADOS

#### RISCO 1: Cache de Usuario em localStorage (ALTO)
- **Arquivo:** `src/features/auth/context/AuthProvider.tsx:276`
- **Codigo:** `localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))`
- **Problema:** Usuario completo (incluindo role) salvo sem encriptacao
- **Exploracao:** Um atacante pode modificar o localStorage para alterar `user.role` de `client` para `admin`
- **Impacto:** Bypass completo do frontend auth
- **Mitigacao no backend:** RLS ainda protege, mas o frontend mostra telas admin

#### RISCO 2: JWT Decode sem Validacao (MEDIO)
- **Arquivo:** `src/features/auth/services/miroAuthService.ts:104-114`
- **Codigo:**
```typescript
const payload = JSON.parse(atob(tokenParts[1]));
userEmail = payload.email || payload.user_email || '';
```
- **Problema:** Decodifica JWT sem verificar assinatura
- **Contexto:** JWT vem do Miro SDK, deve ser validado server-side

#### RISCO 3: Verificacao de Board apenas no Frontend (MEDIO)
- **Arquivo:** `src/features/auth/guards/ProtectedRoute.tsx:321-323`
- **Codigo:**
```typescript
if (user.role === 'client' && user.primaryBoardId && currentBoardId) {
  if (currentBoardId !== user.primaryBoardId) {
    return <WrongBoardAccess correctBoardId={user.primaryBoardId} />;
  }
}
```
- **Problema:** Cliente pode acessar dados de projetos de outros boards via API diretamente
- **Mitigacao parcial:** RLS existe mas e baseada em `client_id`, nao em `board_id`

#### RISCO 4: Admin Email em Variavel de Ambiente no Frontend (BAIXO)
- **Arquivo:** `src/shared/config/env.ts:10-13`
- **Codigo:**
```typescript
mainAdmin: {
  email: import.meta.env.VITE_ADMIN_EMAIL as string,
  password: import.meta.env.VITE_ADMIN_PASSWORD as string,
}
```
- **Problema:** `VITE_` variaveis sao expostas no bundle frontend
- **Nota:** Password parece nao ser usado (apenas email para verificacao de super admin)

### 3.5 Onde as Permissoes SAO Validadas

| Camada | Local | Tipo de Validacao |
|--------|-------|-------------------|
| Frontend Route | `ProtectedRoute.tsx` | Role-based, verificacao de board |
| Frontend Service | Nenhum | NAO ENCONTREI validacao |
| Backend RLS | Todas tabelas | `auth.uid()` + role check |
| Backend Function | `get_dashboard_metrics` | Usa RLS implicitamente |

---

## 4. BANCO DE DADOS / PERSISTENCIA

### 4.1 Onde os Dados sao Salvos

**Primario:** Supabase (PostgreSQL)
- Cliente: `src/shared/lib/supabase.ts`
- Configuracao: Realtime habilitado, session persistida

**Secundario:** localStorage (cache de sessao)
- Key: `bd_auth_user`
- Conteudo: Objeto User completo

### 4.2 Tabelas Encontradas nas Migrations

| Tabela | Arquivo | Colunas Principais |
|--------|---------|-------------------|
| `users` | `001_create_users.sql` | id, email, name, role, miro_user_id, primary_board_id, is_super_admin |
| `projects` | `002_create_projects.sql` | id, name, status, priority, client_id, miro_board_id, briefing |
| `project_designers` | `002_create_projects.sql` | project_id, user_id (junction table) |
| `deliverables` | `003_create_deliverables.sql` | id, project_id, name, type, status, count, bonus_count |
| `deliverable_versions` | `003_create_deliverables.sql` | id, deliverable_id, version_number, file_url |
| `deliverable_feedback` | `004_create_feedback.sql` | id, deliverable_id, user_id, content, status |
| `user_boards` | `010_user_board_associations.sql` | user_id, board_id, is_primary |
| `app_settings` | `010_user_board_associations.sql` | key, value (JSONB) |
| `notifications` | `009_create_notifications.sql` | (nao li o conteudo) |

### 4.3 Enums do Banco

```sql
-- user_role: admin, designer, client
-- project_status: active, on_hold, completed, archived
--   (atualizado em 013): on_track, overdue, urgent, critical, in_progress, review, done
-- project_priority: low, medium, high, urgent
-- deliverable_status: draft, in_review, approved, rejected, delivered
--   (na pratica usam): pending, wip, review, approved
-- deliverable_type: image, video, document, archive, other
```

### 4.4 RLS (Row Level Security)

Todas as tabelas tem RLS habilitado. Exemplo de policy:

```sql
-- 002_create_projects.sql:81-84
CREATE POLICY "Clients can view own projects"
  ON public.projects
  FOR SELECT
  USING (client_id = auth.uid());
```

### 4.5 Problemas no Schema/Persistencia

1. **Inconsistencia de Status:**
   - DB tem: `active, on_hold, completed, archived`
   - Migration 013 adiciona: `on_track, overdue, urgent, critical, in_progress, review, done`
   - Frontend mapeia: diferentes valores em `deliverableService.ts:51-62`

2. **Falta de Transacoes:**
   - `projectService.ts:178-216` - Cria projeto e designers sem transacao

3. **Colunas sem Foreign Key explicitamente referenciadas:**
   - `deliverables.count` e `deliverables.bonus_count` - valores numericos sem validacao

---

## 5. INTEGRACOES EXTERNAS

### 5.1 Miro SDK v2

**Arquivos de uso:**
- `src/features/boards/services/miroSdkService.ts` (principal)
- `src/features/boards/context/MiroContext.tsx`
- `src/features/auth/services/miroAuthService.ts`

**Funcoes mais usadas:**

| Funcao | Arquivo:Linha | Proposito |
|--------|---------------|-----------|
| `miro.board.createFrame()` | miroSdkService.ts:196 | Cria frames de projeto |
| `miro.board.createCard()` | miroSdkService.ts:545 | Cria cards no timeline |
| `miro.board.createShape()` | miroSdkService.ts:222 | Cria formas/colunas |
| `miro.board.createText()` | miroSdkService.ts:184 | Cria textos |
| `miro.board.get({ type })` | miroSdkService.ts:345 | Busca items do board |
| `miro.board.getById()` | miroSdkService.ts:463 | Busca item especifico |
| `miro.board.sync()` | miroSdkService.ts:472 | Sincroniza mudancas |
| `miro.board.remove()` | miroSdkService.ts:84 | Remove item |
| `miro.board.viewport.zoomTo()` | miroSdkService.ts:273 | Zoom na viewport |
| `miro.board.getUserInfo()` | miroAuthService.ts:89 | Obtem info do usuario |
| `miro.board.getIdToken()` | miroAuthService.ts:103 | Obtem JWT do usuario |

**Padrao de uso:** Encapsulado em services (bom), mas com singleton pattern que mantem estado em memoria:

```typescript
// miroSdkService.ts:1328-1330
export const miroTimelineService = new MiroMasterTimelineService();
export const miroProjectRowService = new MiroProjectRowService();
```

**Tratamento de erro:**

```typescript
// miroSdkService.ts:84-91
async function safeRemove(id: string): Promise<boolean> {
  try {
    await getMiroSDK().board.remove({ id });
    return true;
  } catch (error) {
    log('MiroService', `Failed to remove item ${id}`, error);
    return false; // Falha silenciosa - pode causar inconsistencias
  }
}
```

**Riscos de inconsistencia:**
- `syncProject()` atualiza Miro mas nao tem rollback se falhar
- Estado em memoria (`this.state`) pode divergir do board real
- Multiplas abas/usuarios podem causar conflitos

### 5.2 Supabase

**Cliente:** `src/shared/lib/supabase.ts`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

**Uso de Realtime:**
- `src/shared/hooks/useRealtimeSubscription.ts` - Hook generico para subscriptions
- `src/shared/hooks/useRealtimePresence.ts` - Presence (usuarios online)

**RPC Functions usadas:**
- `get_dashboard_metrics` - reportService.ts:15
- `get_project_stats` - reportService.ts:144
- `set_primary_board` - adminService.ts:175

### 5.3 Outras Integracoes Mencionadas mas NAO ENCONTRADAS no Codigo

- **Postmark:** Mencionado em CLAUDE.md mas nenhum codigo encontrado
- **Sentry:** Mencionado mas nenhuma integracao visivel
- **Edge Functions (Deno):** Pasta `supabase/functions` existe mas nao li o conteudo

---

## 6. QUALIDADE DO CODIGO E ORGANIZACAO

### 6.1 Padroes Positivos Encontrados

1. **Estrutura de Features bem definida**
2. **React Query keys factory pattern** (`projectKeys.ts`, `adminKeys`, etc.)
3. **Separacao de tipos em arquivos `.types.ts`**
4. **Validacao com Zod nos schemas** (`auth.schema.ts`, `project.schema.ts`)
5. **CSS Modules para isolamento de estilos**
6. **Logger centralizado** (`src/shared/lib/logger.ts`)
7. **Design tokens organizados** (`/shared/ui/tokens/`)

### 6.2 PROBLEMAS IDENTIFICADOS

#### Problema 1: Type Assertions Excessivas
- **Arquivo:** `src/features/projects/services/projectService.ts`
- **Linhas:** 293-327
- **Exemplo:**
```typescript
return {
  id: data.id as string,
  name: data.name as string,
  client: data.client
    ? {
        id: (data.client as Record<string, unknown>).id as string,
        // ...
      }
    : null,
};
```
- **Problema:** `as` assertions bypasses TypeScript safety
- **Sugestao:** Usar Zod para validar response do Supabase

#### Problema 2: Duplicacao de Mapeamento Status/Type
- **Arquivos:**
  - `src/features/deliverables/services/deliverableService.ts:35-62`
  - `src/features/boards/services/miroSdkService.ts:94-97`
- **Problema:** Mapeamento DB <-> UI duplicado em multiplos lugares
- **Sugestao:** Centralizar em um arquivo `statusMapping.ts`

#### Problema 3: Console.logs em Producao
- **Arquivo:** `src/features/admin/services/adminService.ts`
- **Linhas:** 107, 115, 117, 122
```typescript
console.log('[adminService] Deleting user:', id);
console.log('[adminService] Delete result:', { error, count });
```
- **Sugestao:** Usar o logger centralizado

#### Problema 4: Inline Styles em Componentes
- **Arquivo:** `src/features/auth/guards/ProtectedRoute.tsx`
- **Linhas:** 11-167 (PendingBoardAssignment), 173-291 (WrongBoardAccess)
- **Problema:** Centenas de linhas de inline styles
- **Sugestao:** Extrair para CSS Modules

#### Problema 5: Magic Numbers em Layout
- **Arquivo:** `src/features/boards/services/miroSdkService.ts`
- **Exemplo:** Linhas 1065-1066
```typescript
const BADGE_HEIGHT = 26;
const BADGE_GAP = 10;
const BADGE_WIDTHS = { priority: 80, client: 80, date: 115, type: 95 };
```
- **Nota:** Alguns valores estao em `/constants` mas nao todos
- **Sugestao:** Mover todos para constants

#### Problema 6: Falta de Error Boundaries
- **Observacao:** Nao encontrei `ErrorBoundary` components
- **Risco:** Erros podem crashar toda a aplicacao

#### Problema 7: Service Files muito Longos
- **Arquivo:** `src/features/boards/services/miroSdkService.ts` - 1358 linhas
- **Sugestao:** Dividir em:
  - `timelineService.ts`
  - `projectRowService.ts`
  - `miroHelpers.ts`

#### Problema 8: Mistura de Portugues/Ingles
- **Arquivo:** `src/features/projects/domain/project.types.ts` (inferido pelo uso)
- **Exemplo:** `briefing` (ingles) contendo campos como `objetivos` (portugues)?
- **Nota:** Nao li o arquivo de types completo, mas o CLAUDE.md menciona `briefing` como JSONB

#### Problema 9: TODOs/Comentarios Legacy
- **Arquivo:** `src/features/deliverables/services/deliverableService.ts:34-35`
```typescript
// To add new types to DB, run: ALTER TYPE deliverable_type ADD VALUE IF NOT EXISTS 'concept';
```
- **Problema:** Instrucao manual que deveria ser uma migration

#### Problema 10: Hooks sem Memoizacao
- **Arquivo:** `src/features/auth/context/AuthProvider.tsx`
- **Observacao:** `useMemo` e `useCallback` sao usados (bom)
- **Mas:** Alguns valores em `useEffect` dependencies arrays podem causar re-renders

### 6.3 Metricas de Codigo

| Metrica | Valor |
|---------|-------|
| Arquivos TypeScript/TSX | ~130+ |
| CSS Modules | ~25+ |
| Migrations SQL | 20 |
| Maior arquivo | miroSdkService.ts (1358 linhas) |
| Services | 7 (auth, project, deliverable, admin, report, miroSdk, miroAuth) |
| Features | 7 (auth, projects, deliverables, boards, admin, reports, notifications) |

---

## 7. PROPOSTA DE MELHORIAS

### 7.1 CURTO PRAZO (0-15 dias)

#### Seguranca
- [ ] **Remover password do env.ts** - `src/shared/config/env.ts:12` - Linha nao e usada, remover para evitar confusao
- [ ] **Adicionar validacao server-side do JWT do Miro** - Criar Edge Function para validar token antes de confiar nos dados
- [ ] **Encriptar/remover dados sensiveis do localStorage** - `src/features/auth/context/AuthProvider.tsx:276` - Armazenar apenas token, nao objeto completo

#### Qualidade de Codigo
- [ ] **Substituir console.log por logger** em `src/features/admin/services/adminService.ts:107,115,117,122`
- [ ] **Extrair inline styles** de `src/features/auth/guards/ProtectedRoute.tsx` para CSS Module
- [ ] **Centralizar mapeamento de status** - Criar `src/shared/lib/statusMapping.ts` e usar em deliverableService e miroSdkService

#### Bugs Potenciais
- [ ] **Adicionar try/catch** em `src/features/reports/services/reportService.ts:63-81` - `upcomingDeadlines` mapping pode falhar silenciosamente

### 7.2 MEDIO PRAZO (15-45 dias)

#### Arquitetura
- [ ] **Dividir miroSdkService.ts** em:
  - `src/features/boards/services/timeline/MasterTimelineService.ts`
  - `src/features/boards/services/project/ProjectRowService.ts`
  - `src/features/boards/services/helpers/miroHelpers.ts`
  - `src/features/boards/services/constants/index.ts` (consolidar todos)

#### Tipagem
- [ ] **Criar tipos Supabase gerados** - Usar `supabase gen types typescript` para gerar tipos das tabelas
- [ ] **Substituir `as` assertions** por validacao Zod no retorno das queries:
  ```typescript
  // Antes (projectService.ts:293)
  return { id: data.id as string, ... }

  // Depois
  const ProjectFromDB = z.object({ id: z.string(), ... });
  return ProjectFromDB.parse(data);
  ```

#### Resiliencia
- [ ] **Adicionar Error Boundaries** em:
  - `src/app/App.tsx` - Boundary global
  - `src/features/boards/components/` - Boundary para integracao Miro

- [ ] **Implementar transacoes no Supabase** para operacoes que envolvem multiplas tabelas:
  - `projectService.createProject()` - projeto + designers
  - `adminService.assignBoard()` - user_boards + users

#### Testes
- [ ] **Criar testes unitarios** para services criticos:
  - `authService.ts`
  - `miroAuthService.ts`
  - `projectService.ts`

### 7.3 LONGO PRAZO (45-120 dias)

#### Seguranca Avancada
- [ ] **Migrar autenticacao para Supabase Auth completo** - Usar Miro apenas para obter identidade, criar sessao Supabase real
- [ ] **Implementar audit log** para acoes administrativas (tabela `audit_logs` existe mas nao vi uso)
- [ ] **Adicionar rate limiting** via Edge Function

#### Arquitetura
- [ ] **Considerar separar BFF (Backend for Frontend)** - Edge Functions para:
  - Validacao de JWT Miro
  - Operacoes compostas (criar projeto + designers + timeline Miro)
  - Cache de dados frequentes

#### Performance
- [ ] **Implementar virtualizacao** para listas longas de projetos/deliverables
- [ ] **Adicionar React.lazy** para code splitting por feature
- [ ] **Otimizar queries Supabase** - Usar `.select()` especifico ao inves de `*`

#### Documentacao
- [ ] **Gerar documentacao de API** dos services
- [ ] **Criar Storybook** para componentes UI
- [ ] **Documentar fluxos de dados** com diagramas atualizados

---

## 8. APENDICE

### 8.1 Comandos Uteis

```bash
# Desenvolvimento
npm run dev           # Inicia servidor de desenvolvimento
npm run typecheck     # Verifica tipos TypeScript
npm run lint          # Executa ESLint
npm run lint:fix      # Corrige problemas do ESLint

# Build
npm run build         # Build de producao

# Banco de dados (requer Supabase CLI)
supabase db push      # Aplica migrations
supabase gen types typescript > src/types/supabase.ts  # Gera tipos
```

### 8.2 Variaveis de Ambiente Necessarias

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_MIRO_CLIENT_ID=xxx
VITE_ADMIN_EMAIL=admin@example.com
VITE_APP_URL=https://your-app.vercel.app
```

### 8.3 Arquivos NAO Analisados (Fora do Escopo)

- `supabase/functions/*` - Edge Functions (Deno)
- `node_modules/*`
- `.git/*`
- Arquivos de configuracao (vite.config.ts, tsconfig.json, etc.)
- Componentes UI individuais (Button, Card, etc.)

---

**FIM DO RELATORIO**

*Este documento foi gerado com base na analise real do codigo do repositorio. Todas as referencias a arquivos e linhas sao baseadas no estado do codigo no momento da analise.*
