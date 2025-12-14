# Conectar no Supabase via MCP (debug/inspeção)

## Por que
Usamos MCP para inspecionar schema/objetos e acelerar auditorias (sem depender de prints manuais).

## Pré-requisitos
- Um **Supabase Personal Access Token (PAT)** com permissão para ler projetos/metadata.
- Network habilitada para baixar/executar `@supabase/mcp-server-supabase` via `npx`.

## Setup seguro (sem commitar token)
1) Crie `./.env.mcp.local` (já é ignorado por `.gitignore` via `.env.*.local`):

```bash
cat > .env.mcp.local <<'EOF'
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Opcional (se quiser fixar manualmente)
SUPABASE_PROJECT_REF=ivgxeruylaqpgbijukds
EOF
```

2) Instale o SDK do MCP (só para o script de probe):
- `npm i -D @modelcontextprotocol/sdk`

3) Rode o probe:
- `node scripts/mcp-supabase-probe.mjs > supabase.mcp.json`

Saída esperada:
- `tools`, `resources` e `resourceTemplates` listados em JSON (para eu conseguir mapear schema/fluxos de forma automatizada).

## Observação sobre o Codex MCP tool
Se você quiser usar o MCP “nativo” do Codex (tool `list_mcp_resources`), pode precisar reiniciar a sessão para recarregar `.mcp.json`.

