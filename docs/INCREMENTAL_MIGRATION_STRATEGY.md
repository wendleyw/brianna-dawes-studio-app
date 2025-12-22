# ESTRATÉGIA DE MIGRAÇÃO INCREMENTAL
## Miro App - Brianna Dawes Studios

**Abordagem:** Evolução, não Revolução
**Princípio:** Reaproveitar o que funciona, substituir apenas o que está quebrado

---

## 🎯 FILOSOFIA: STRANGLER FIG PATTERN

Ao invés de **Big Bang Rewrite** (perigoso), vamos usar o **Strangler Fig Pattern**:

```
Sistema Atual (funcionando)
│
├─ Identificar componente problemático
├─ Criar nova implementação lado a lado
├─ Redirecionar tráfego gradualmente (feature flag)
├─ Quando 100% migrado → mover código antigo para /_legacy
└─ Deletar /_legacy apenas quando confirmado que não é mais necessário
```

**Benefícios:**
- ✅ Sistema continua funcionando durante toda migração
- ✅ Rollback instantâneo (só mudar feature flag)
- ✅ Deploy contínuo (pequenos PRs)
- ✅ Risco mínimo
- ✅ Reaproveita código que funciona

---

## 📁 ESTRUTURA DE PASTAS

### Criar pastas de transição

```bash
# Estrutura durante migração
/src/features/boards/services/
├── _legacy/                    # Código antigo (será deletado depois)
│   ├── miroSdkService.ts      # 2586 linhas - client-side sync
│   ├── projectSyncOrchestrator.ts
│   └── README.md              # Explica por que está deprecated
│
├── _v2/                       # Nova implementação (em desenvolvimento)
│   ├── MiroRestClient.ts      # Wrapper para Miro REST API (server-side)
│   └── SyncOrchestrator.ts    # Novo orquestrador (event-driven)
│
└── index.ts                   # Exporta versão ativa (via feature flag)
```

### Feature Flag para controlar versão ativa

```typescript
// src/features/boards/services/index.ts
import { env } from '@shared/config/env';

// Durante migração: importa ambas versões
import * as legacySync from './_legacy/miroSdkService';
import * as v2Sync from './_v2/MiroRestClient';

// Feature flag decide qual usar
export const miroTimelineService = env.features.useV2Sync
  ? v2Sync.miroTimelineService
  : legacySync.miroTimelineService;

export const miroProjectRowService = env.features.useV2Sync
  ? v2Sync.miroProjectRowService
  : legacySync.miroProjectRowService;
```

### `.env` com feature flags

```bash
# .env.development
VITE_FEATURE_USE_V2_SYNC=false          # Dev: testa V1
VITE_FEATURE_USE_SERVER_SYNC=false      # Dev: client-side ainda

# .env.staging
VITE_FEATURE_USE_V2_SYNC=true           # Staging: V2 ativo
VITE_FEATURE_USE_SERVER_SYNC=true       # Staging: server-side

# .env.production
VITE_FEATURE_USE_V2_SYNC=false          # Prod: V1 até validar V2
VITE_FEATURE_USE_SERVER_SYNC=false      # Prod: rollout gradual
```

---

## 🔄 MIGRAÇÃO POR COMPONENTE (Não tudo de uma vez!)

### Priorização: O que migrar primeiro?

| Componente | Problema | Prioridade | Estratégia |
|------------|----------|------------|------------|
| **Sync Dual** | Race conditions | 🔴 P0 | Desabilitar client-sync via flag |
| **sync-worker** | Já existe, só melhorar | 🟡 P1 | Adicionar idempotência, deduplicação |
| **Webhook handler** | Não funciona | 🟡 P1 | Implementar do zero (pequeno) |
| **miroSdkService** | 2586 linhas no client | 🟢 P2 | Migrar gradualmente para server |
| **Event Store** | Não existe | 🟢 P3 | Adicionar depois que sync estabilizar |

---

## 🛠️ PLANO DE MIGRAÇÃO INCREMENTAL

### **SPRINT 1 (Semana 1): Quick Win - Desabilitar Dual Sync**

**Objetivo:** Eliminar race conditions SEM reescrever código

#### Passo 1.1: Criar feature flag

```typescript
// src/shared/config/env.ts
export const env = {
  // ... existing
  features: {
    useClientSync: import.meta.env.VITE_FEATURE_USE_CLIENT_SYNC === 'true',
  }
};
```

```bash
# .env.development
VITE_FEATURE_USE_CLIENT_SYNC=false  # Desliga client sync

# .env.production
VITE_FEATURE_USE_CLIENT_SYNC=false  # Prod: forçar server-sync apenas
```

#### Passo 1.2: Modificar hook existente

```typescript
// src/features/projects/hooks/useProjectWithMiro.ts
import { env } from '@shared/config/env';

export function useCreateProjectWithMiro() {
  const { isInMiro, miro } = useMiro();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      // ANTIGO: Client-sync se isInMiro
      // if (isInMiro && miro) { ... }

      // NOVO: Feature flag controla
      if (env.features.useClientSync && isInMiro && miro) {
        // PATH A: Client-side sync (legacy)
        logger.warn('Using legacy client-side sync (will be deprecated)');
        const result = await projectSyncOrchestrator.createProjectWithSync(input);
        return result.project;
      } else {
        // PATH B: Server-side sync (preferred)
        logger.info('Using server-side sync (v2)');
        const project = await projectService.createProject(input);

        // Enqueue sync job
        await syncJobQueueService.enqueue('project_sync', {
          projectId: project.id,
          boardId: project.miroBoardId ?? undefined,
        });

        // Show feedback
        await MiroNotifications.showInfo('Project created! Syncing to board...');
        return project;
      }
    },
    // ... rest
  });
}
```

**Resultado:**
- ✅ 1 arquivo modificado (useProjectWithMiro.ts)
- ✅ Race condition eliminada
- ✅ Rollback fácil (só mudar .env)
- ✅ Zero risco

#### Passo 1.3: Adicionar deduplicação no sync-worker

**Modificar:** `supabase/functions/sync-worker/index.ts`

```typescript
// ANTES de criar card, verificar se já existe
const { data: existingMapping } = await supabase
  .from('miro_item_map')
  .select('miro_item_id')
  .eq('project_id', project.id)
  .eq('item_type', 'timeline_card')
  .maybeSingle();

if (existingMapping) {
  // Card já existe, UPDATE em vez de CREATE
  logger.info('Card already exists, updating instead of creating', {
    projectId: project.id,
    cardId: existingMapping.miro_item_id
  });

  const updateResult = await miroUpdateCard(
    miroAccessToken,
    boardId,
    existingMapping.miro_item_id,
    { title: cardTitle, description, dueDate }
  );

  if (updateResult.ok) {
    // Sucesso, pular criação
    cardId = existingMapping.miro_item_id;
    miroOp = 'updated';
  } else if (updateResult.status === 404) {
    // Card foi deletado no Miro, criar novo
    logger.warn('Card was deleted from Miro, creating new one');
    // ... criar novo card
  }
}
```

**Resultado:**
- ✅ Idempotência: pode reprocessar job sem duplicar
- ✅ Recuperação: se card deletado no Miro, cria novo
- ✅ 1 arquivo modificado

---

### **SPRINT 2 (Semana 2): Mover código legado**

#### Passo 2.1: Criar pasta `_legacy` e mover

```bash
# Criar estrutura
mkdir -p src/features/boards/services/_legacy

# Mover arquivos que serão substituídos
git mv src/features/boards/services/miroSdkService.ts \
       src/features/boards/services/_legacy/

git mv src/features/boards/services/projectSyncOrchestrator.ts \
       src/features/boards/services/_legacy/
```

#### Passo 2.2: Criar README explicativo

```markdown
<!-- src/features/boards/services/_legacy/README.md -->
# ⚠️ Legacy Code - Deprecated

This folder contains **deprecated code** that is being phased out.

## Why deprecated?

- **miroSdkService.ts**: 2586 lines of client-side sync logic that causes:
  - Race conditions (dual sync)
  - Security issues (business logic in browser)
  - Bundle bloat

- **projectSyncOrchestrator.ts**: Client-side orchestrator replaced by server-side sync-worker

## Migration Status

- ✅ **Sprint 1**: Feature flag added, client-sync disabled by default
- 🚧 **Sprint 2**: Server-side sync now primary path
- 📅 **Sprint 4**: Delete this folder (after 2 weeks of V2 in production)

## Rollback

If V2 has issues:

```bash
# .env
VITE_FEATURE_USE_CLIENT_SYNC=true  # Re-enable legacy
```

## Delete After

- 2 weeks of V2 stable in production
- Zero rollbacks
- All E2E tests passing with V2
```

#### Passo 2.3: Atualizar imports

```typescript
// src/features/boards/services/index.ts
import { env } from '@shared/config/env';

// V1 (Legacy)
import {
  miroTimelineService as miroTimelineServiceV1,
  miroProjectRowService as miroProjectRowServiceV1
} from './_legacy/miroSdkService';

// V2 (New - quando estiver pronto)
// import {
//   miroTimelineService as miroTimelineServiceV2,
// } from './_v2/MiroRestClient';

// Export: feature flag decide qual versão usar
export const miroTimelineService = env.features.useClientSync
  ? miroTimelineServiceV1  // Legacy
  : null;  // V2 (server-side não precisa exportar, Edge Function usa diretamente)

export const miroProjectRowService = env.features.useClientSync
  ? miroProjectRowServiceV1
  : null;
```

---

### **SPRINT 3 (Semana 3): Melhorar sync-worker (reuso!)**

**NÃO criar do zero!** O sync-worker já existe e funciona. Apenas melhorar.

#### Passo 3.1: Adicionar sync_state table (novo)

```sql
-- supabase/migrations/058_add_sync_state_table.sql
CREATE TABLE IF NOT EXISTS public.sync_state (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, syncing, synced, error
  last_outbound_sync_at TIMESTAMPTZ,
  last_inbound_sync_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  miro_card_id TEXT,
  miro_briefing_frame_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_state_status ON public.sync_state(status);
CREATE INDEX idx_sync_state_next_retry ON public.sync_state(next_retry_at) WHERE status = 'error';

-- Trigger para updated_at
CREATE TRIGGER update_sync_state_updated_at
  BEFORE UPDATE ON public.sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Popular com dados atuais
INSERT INTO public.sync_state (
  project_id, status, miro_card_id, last_outbound_sync_at
)
SELECT
  id,
  sync_status,
  miro_card_id,
  last_synced_at
FROM public.projects
WHERE miro_board_id IS NOT NULL
ON CONFLICT (project_id) DO NOTHING;
```

#### Passo 3.2: Modificar sync-worker para usar sync_state

```typescript
// supabase/functions/sync-worker/index.ts

// ANTES de sync
await supabase
  .from('sync_state')
  .upsert({
    project_id: project.id,
    status: 'syncing',
    last_outbound_sync_at: new Date().toISOString()
  });

// DEPOIS de sync bem-sucedido
await supabase
  .from('sync_state')
  .update({
    status: 'synced',
    miro_card_id: cardId,
    miro_briefing_frame_id: frameId,
    error_message: null,
    retry_count: 0
  })
  .eq('project_id', project.id);

// DEPOIS de erro
await supabase
  .from('sync_state')
  .update({
    status: 'error',
    error_message: err.message,
    retry_count: supabase.sql`retry_count + 1`,
    next_retry_at: calculateNextRetry(attemptCount)
  })
  .eq('project_id', project.id);
```

#### Passo 3.3: Deprecar colunas antigas em projects (não deletar!)

```sql
-- supabase/migrations/059_deprecate_project_sync_columns.sql

-- Adicionar comentários indicando deprecated
COMMENT ON COLUMN public.projects.sync_status IS
  'DEPRECATED: Use sync_state table instead. Will be removed in v2.0';

COMMENT ON COLUMN public.projects.sync_error_message IS
  'DEPRECATED: Use sync_state.error_message. Will be removed in v2.0';

COMMENT ON COLUMN public.projects.miro_card_id IS
  'DEPRECATED: Use sync_state.miro_card_id. Will be removed in v2.0';

-- Criar view para backward compatibility
CREATE OR REPLACE VIEW public.projects_with_sync AS
SELECT
  p.*,
  ss.status AS sync_status_v2,
  ss.error_message AS sync_error_message_v2,
  ss.miro_card_id AS miro_card_id_v2
FROM public.projects p
LEFT JOIN public.sync_state ss ON ss.project_id = p.id;

-- Grant
GRANT SELECT ON public.projects_with_sync TO authenticated;
```

**Resultado:**
- ✅ Novo modelo de dados (sync_state)
- ✅ Colunas antigas ainda funcionam (backward compatibility)
- ✅ View para consultas que usam colunas antigas
- ✅ Podemos deletar colunas antigas em Sprint 6 (após validação)

---

### **SPRINT 4 (Semana 4): Implementar webhook (pequeno!)**

**Reaproveitar:** `supabase/functions/miro-webhook/index.ts` já existe!

#### Passo 4.1: Completar implementação

```typescript
// supabase/functions/miro-webhook/index.ts
import { inferStatusFromPosition } from '../_shared/miroHelpers.ts';

serve(async (req) => {
  // 1. Verify signature (já existe)
  const signature = req.headers.get('X-Miro-Signature');
  const body = await req.text();
  const isValid = verifyWebhookSignature(body, signature, MIRO_WEBHOOK_SECRET);
  if (!isValid) return json({ error: 'invalid_signature' }, { status: 401 });

  // 2. Parse event
  const event = JSON.parse(body);

  // 3. Handle event types
  if (event.type === 'item:updated') {
    await handleItemUpdated(supabase, event.data);
  } else if (event.type === 'item:deleted') {
    await handleItemDeleted(supabase, event.data);
  }

  return json({ ok: true });
});

async function handleItemUpdated(supabase, data) {
  // Lookup project via miro_item_map
  const { data: mapping } = await supabase
    .from('miro_item_map')
    .select('project_id')
    .eq('miro_item_id', data.id)
    .maybeSingle();

  if (!mapping) return; // Unknown item

  // Fetch current sync state
  const { data: syncState } = await supabase
    .from('sync_state')
    .select('last_outbound_sync_at')
    .eq('project_id', mapping.project_id)
    .single();

  // Ignore echo events (our own sync)
  const eventTime = new Date(data.modifiedAt);
  const lastOutbound = new Date(syncState.last_outbound_sync_at);
  if (eventTime < lastOutbound + 10000) { // 10s grace period
    console.log('Ignoring echo event');
    return;
  }

  // Infer changes
  const updates: any = {};
  if (data.position) {
    updates.status = inferStatusFromPosition(data.position.x);
  }
  if (data.data?.dueDate) {
    updates.due_date = data.data.dueDate;
  }

  // Apply changes
  await supabase
    .from('projects')
    .update(updates)
    .eq('id', mapping.project_id);

  // Update sync state
  await supabase
    .from('sync_state')
    .update({ last_inbound_sync_at: new Date().toISOString() })
    .eq('project_id', mapping.project_id);
}
```

#### Passo 4.2: Criar helper compartilhado

```typescript
// supabase/functions/_shared/miroHelpers.ts
export function inferStatusFromPosition(x: number): string {
  // Timeline columns: overdue (0), urgent (150), in_progress (300), review (450), done (600)
  const columns = [
    { x: 0, status: 'overdue' },
    { x: 150, status: 'urgent' },
    { x: 300, status: 'in_progress' },
    { x: 450, status: 'review' },
    { x: 600, status: 'done' }
  ];

  // Find closest column
  const closest = columns.reduce((prev, curr) =>
    Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev
  );

  return closest.status;
}
```

**Resultado:**
- ✅ Webhook funcionando
- ✅ Sync bidirecional (DB ↔ Miro)
- ✅ Pequeno (< 100 linhas)
- ✅ Reusa estrutura existente

---

### **SPRINT 5-6 (Semanas 5-6): Realtime feedback + limpeza**

#### Passo 5.1: Adicionar Realtime subscription no frontend

```typescript
// src/features/projects/hooks/useRealtimeSyncState.ts (NOVO)
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@shared/lib/supabase';
import { projectKeys } from '../services/projectKeys';
import { toast } from '@shared/ui/Toast';

export function useRealtimeSyncState(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`sync-state-${projectId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sync_state',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        const newState = payload.new;

        // Invalidate queries para refetch
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });

        // Show toast feedback
        if (newState.status === 'synced') {
          toast.success('Project synced to Miro!');
        } else if (newState.status === 'error') {
          toast.error(`Sync failed: ${newState.error_message}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}
```

#### Passo 5.2: Usar no componente

```typescript
// src/features/projects/pages/ProjectDetailPage.tsx
import { useRealtimeSyncState } from '../hooks/useRealtimeSyncState';

export function ProjectDetailPage({ projectId }: Props) {
  const { data: project } = useProject(projectId);

  // Subscribe to realtime sync updates
  useRealtimeSyncState(projectId);

  // ... rest of component
}
```

#### Passo 6.1: Deletar código legacy (após 2 semanas em prod)

```bash
# Após validar que V2 está 100% estável:

# 1. Remover feature flag
# .env - deletar linha:
# VITE_FEATURE_USE_CLIENT_SYNC=false

# 2. Deletar pasta _legacy
rm -rf src/features/boards/services/_legacy/

# 3. Limpar imports
# src/features/boards/services/index.ts - remover importações V1

# 4. Commit
git add .
git commit -m "chore: remove legacy client-side sync code

After 2 weeks of V2 (server-side sync) in production:
- Zero rollbacks
- Sync success rate: 99.2%
- No race conditions reported

Deleted:
- miroSdkService.ts (2586 lines)
- projectSyncOrchestrator.ts (580 lines)

Total reduction: -3166 lines of client-side code
"
```

---

## 📊 COMPARAÇÃO: Big Bang vs Incremental

| Aspecto | Big Bang Rewrite | Migração Incremental |
|---------|------------------|---------------------|
| **Risco** | 🔴 Altíssimo (tudo pode quebrar) | 🟢 Baixo (rollback fácil) |
| **Tempo até deploy** | 4-6 semanas (tudo ou nada) | 1 semana (primeiro valor) |
| **Custo** | Alto (time parado) | Baixo (features continuam) |
| **Rollback** | Difícil (reverter tudo) | Fácil (feature flag) |
| **Testing** | Big bang no final | Contínuo (cada sprint) |
| **Code review** | PR gigante (5000+ linhas) | PRs pequenos (50-200 linhas) |
| **Aprendizado** | No final (tarde demais) | Contínuo (ajustar curso) |

---

## 🎯 CRONOGRAMA REALISTA

### Timeline: 6 semanas (vs 10-12 semanas do rewrite)

```
Sprint 1 (Sem 1): Desabilitar dual sync         → Deploy Fri
  ├─ Feature flag
  ├─ Modificar useProjectWithMiro
  └─ Deduplicação no sync-worker

Sprint 2 (Sem 2): Mover para _legacy            → Deploy Fri
  ├─ git mv para _legacy/
  ├─ README.md explicativo
  └─ Atualizar imports

Sprint 3 (Sem 3): sync_state table              → Deploy Fri
  ├─ Migration 058
  ├─ Modificar sync-worker
  └─ View de compatibilidade

Sprint 4 (Sem 4): Webhook handler               → Deploy Fri
  ├─ Implementar handleItemUpdated
  ├─ Helper inferStatusFromPosition
  └─ Testes com ngrok

Sprint 5 (Sem 5): Realtime feedback             → Deploy Fri
  ├─ useRealtimeSyncState hook
  ├─ Toast notifications
  └─ Dashboard de sync health

Sprint 6 (Sem 6): Limpeza + Monitoramento       → Deploy Fri
  ├─ Deletar _legacy/ (se validado)
  ├─ Grafana dashboard
  └─ Documentação final
```

**Cada sprint entrega valor!**

---

## 🧪 ESTRATÉGIA DE TESTES

### Por Sprint

#### Sprint 1: Testes de Regressão
```bash
# Antes de desabilitar client-sync
npm run test:e2e -- --spec="project-creation.spec.ts"

# Depois de desabilitar
# Rodar mesmo teste, deve passar
npm run test:e2e -- --spec="project-creation.spec.ts"

# Validar: Zero duplicação
SELECT project_id, COUNT(*)
FROM miro_item_map
WHERE item_type = 'timeline_card'
GROUP BY project_id
HAVING COUNT(*) > 1;
-- Deve retornar 0 rows
```

#### Sprint 3: Validar sync_state
```sql
-- Todos projetos devem ter sync_state
SELECT COUNT(*) FROM projects WHERE miro_board_id IS NOT NULL;
SELECT COUNT(*) FROM sync_state;
-- Counts devem ser iguais
```

#### Sprint 4: Testar webhook
```bash
# Usar ngrok para tunnel local
ngrok http 54321

# Configurar webhook no Miro com ngrok URL
# Mover card no Miro
# Verificar DB atualizou

SELECT status, updated_at
FROM projects
WHERE id = 'test-project-id'
ORDER BY updated_at DESC
LIMIT 1;
```

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

### Hoje (30 minutos)

1. **Criar branch**
   ```bash
   git checkout -b feature/incremental-migration-sprint-1
   ```

2. **Adicionar feature flag**
   ```bash
   # .env
   echo "VITE_FEATURE_USE_CLIENT_SYNC=false" >> .env
   ```

3. **Modificar 1 arquivo**
   - `src/features/projects/hooks/useProjectWithMiro.ts`
   - Adicionar `if (env.features.useClientSync)` check

4. **Testar localmente**
   ```bash
   npm run dev
   # Criar projeto
   # Verificar que sync-worker processou (não client)
   ```

5. **Commit + PR**
   ```bash
   git add .
   git commit -m "feat: add feature flag to disable client-side sync (Sprint 1.1)"
   git push origin feature/incremental-migration-sprint-1
   # Abrir PR (será pequeno: ~20 linhas)
   ```

### Amanhã (1 hora)

6. **Adicionar deduplicação no sync-worker**
   - Modificar `supabase/functions/sync-worker/index.ts`
   - Verificar `miro_item_map` antes de criar card

7. **Deploy staging**
   ```bash
   git push origin feature/incremental-migration-sprint-1
   # CI/CD deploys to staging
   ```

8. **Validar staging**
   - Criar 5 projetos
   - Verificar zero duplicação
   - Check logs: "Card already exists, updating instead of creating"

### Sexta-feira (Deploy prod)

9. **Merge PR**
10. **Deploy prod**
11. **Monitor sync_health_metrics**
12. **🎉 Sprint 1 completo!**

---

## 📝 CHECKLIST DE VALIDAÇÃO

### Antes de deletar _legacy/

- [ ] V2 rodando em prod por 2 semanas
- [ ] Zero rollbacks necessários
- [ ] Sync success rate > 95%
- [ ] Todos E2E tests passando
- [ ] Zero issues reportados relacionados a sync
- [ ] Grafana metrics normais
- [ ] Aprovação do time

**Só então:** `rm -rf _legacy/`

---

## 🔄 ROLLBACK PLAN

### Se algo der errado

#### Opção 1: Feature Flag (instantâneo)
```bash
# .env.production
VITE_FEATURE_USE_CLIENT_SYNC=true  # Volta para V1
```

#### Opção 2: Git Revert
```bash
git revert <commit-hash>
git push origin main
# CI/CD deploys automaticamente
```

#### Opção 3: Reativar _legacy (se já deletado)
```bash
git checkout <commit-before-delete> -- src/features/boards/services/_legacy/
git commit -m "chore: temporarily restore legacy sync"
git push
```

---

## 💡 LIÇÕES DO STRANGLER FIG

**Por que funciona:**

1. **Risco distribuído:** Pequenas mudanças = pequenos riscos
2. **Feedback rápido:** Deploy semanal = aprender rápido
3. **Valor contínuo:** Cada sprint entrega algo útil
4. **Time feliz:** PRs pequenos = reviews rápidas
5. **Negócio feliz:** Sistema nunca para

**Exemplos reais:**

- **GitHub:** Migrou de Ruby monolith para microservices em 3 anos (incremental)
- **Netflix:** Strangler Fig do datacenter para AWS (6 anos!)
- **Shopify:** Rails monolith para modular monolith (ongoing)

Nenhum deles fez Big Bang Rewrite. Todos usaram Strangler Fig.

---

**Documento criado por:** Claude Code (Sonnet 4.5)
**Abordagem:** Pragmática e evolutiva
**Risco:** Mínimo
**Tempo até primeiro deploy:** 1 semana
**Total de sprints:** 6 semanas (vs 10-12 rewrite)

🚀 **Vamos começar pelo Sprint 1?**
