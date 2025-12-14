# Rollout seguro (feature flags)

Estas flags permitem migrar para a arquitetura escalável **sem quebrar o sistema atual**.

## Flags
- `VITE_USE_SYNC_JOBS` (default `0`): habilita enfileirar jobs de sync (infra já existe; worker ainda é base).
- `VITE_USE_EDGE_API` (default `0`): direciona operações sensíveis para Edge Functions (a implementar por etapas).
- `VITE_USE_DELIVERABLE_VERSIONS_TABLE` (default `0`): escreve/lê versões via `deliverable_versions` (mantendo `deliverables.versions` como cache derivado).
- `VITE_DISABLE_ANON_REST` (default `0`): desliga fallback perigoso de PostgREST com anon key no iframe; exige sessão válida.

## Ordem recomendada (sem downtime)
1) **Aplicar migrations** (primeiro em dev/stage): `038a`, `041`, `042`, `043`, `044` (e próximas).
2) Habilitar `VITE_USE_DELIVERABLE_VERSIONS_TABLE=1` e validar:
   - upload de versão
   - feedback por versão
   - reports/atividade
3) Implementar Edge Functions de operações sensíveis e só então habilitar `VITE_USE_EDGE_API=1`.
4) Implementar sync real no worker e então habilitar `VITE_USE_SYNC_JOBS=1`.
5) Por último (depois de confirmar que o iframe sempre autentica), habilitar `VITE_DISABLE_ANON_REST=1`.

