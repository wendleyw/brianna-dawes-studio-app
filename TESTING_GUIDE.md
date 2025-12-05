# Guia Completo de Testes - Brianna Dawes Studio

Este guia detalha como testar todas as funcionalidades do sistema de gerenciamento de projetos integrado ao Miro.

---

## 1. Configuração do Ambiente

### 1.1 Pré-requisitos

```bash
# Node.js 18+
node --version

# Instalar dependências
npm install

# Variáveis de ambiente (.env.local)
cp .env.example .env.local
```

### 1.2 Variáveis de Ambiente Necessárias

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_MIRO_CLIENT_ID=seu-miro-client-id
VITE_MIRO_CLIENT_SECRET=seu-miro-client-secret
VITE_MIRO_REDIRECT_URI=http://localhost:5173/miro/callback
```

### 1.3 Configuração do Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Crie um novo projeto ou use um existente
3. Execute as migrations na ordem:

```bash
# No Supabase SQL Editor, execute cada arquivo na ordem:
supabase/migrations/001_create_users.sql
supabase/migrations/002_create_projects.sql
supabase/migrations/003_create_deliverables.sql
supabase/migrations/004_create_feedback.sql
supabase/migrations/005_create_functions.sql
supabase/migrations/006_create_storage.sql
supabase/migrations/007_create_views.sql
supabase/migrations/008_create_realtime.sql
supabase/migrations/009_create_notifications.sql
```

### 1.4 Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 2. Testes de Autenticação

### 2.1 Criar Usuários de Teste

No Supabase Dashboard > Authentication > Users, crie 3 usuários:

| Email | Senha | Role |
|-------|-------|------|
| admin@test.com | Test123! | admin |
| designer@test.com | Test123! | designer |
| client@test.com | Test123! | client |

Depois, no SQL Editor:

```sql
-- Atualizar roles dos usuários
UPDATE public.users SET role = 'admin' WHERE email = 'admin@test.com';
UPDATE public.users SET role = 'designer' WHERE email = 'designer@test.com';
UPDATE public.users SET role = 'client' WHERE email = 'client@test.com';
```

### 2.2 Testes de Login

| Teste | Passos | Resultado Esperado |
|-------|--------|-------------------|
| Login válido | 1. Acesse /login 2. Digite credenciais válidas 3. Clique em "Entrar" | Redirecionado para Dashboard |
| Login inválido | 1. Digite credenciais incorretas 2. Clique em "Entrar" | Mensagem de erro exibida |
| Logout | 1. Clique no avatar/menu 2. Clique em "Sair" | Redirecionado para /login |
| Sessão expirada | 1. Remova o token no DevTools 2. Navegue para página protegida | Redirecionado para /login |

### 2.3 Testes de Controle de Acesso (RBAC)

| Teste | Usuário | URL | Resultado Esperado |
|-------|---------|-----|-------------------|
| Admin acessa settings | admin@test.com | /settings | Página carregada |
| Designer acessa settings | designer@test.com | /settings | Página "Acesso Negado" |
| Client acessa settings | client@test.com | /settings | Página "Acesso Negado" |
| Todos acessam dashboard | qualquer | / | Dashboard carregado |
| Todos acessam projetos | qualquer | /projects | Lista de projetos |

---

## 3. Testes de Projetos

### 3.1 Criar Projeto (Admin/Designer)

1. Faça login como admin ou designer
2. Acesse /projects
3. Clique em "Novo Projeto"
4. Preencha o formulário:
   - Nome: "Projeto de Teste"
   - Descrição: "Descrição do projeto"
   - Cliente: Selecione um cliente
   - Status: "planning"
   - Prioridade: "high"
   - Data de início: hoje
   - Data de entrega: próxima semana
5. Clique em "Criar Projeto"

**Resultado esperado:** Projeto criado e redirecionado para detalhes.

### 3.2 Filtros e Busca

| Teste | Ação | Resultado Esperado |
|-------|------|-------------------|
| Busca por nome | Digite "Teste" na busca | Somente projetos com "Teste" no nome |
| Filtro por status | Selecione "Em Progresso" | Somente projetos in_progress |
| Filtro por prioridade | Selecione "Alta" | Somente projetos high priority |
| Combinar filtros | Busca + Status + Prioridade | Interseção dos filtros |

### 3.3 Editar Projeto

1. Acesse /projects/{id}
2. Clique em "Editar"
3. Modifique campos
4. Salve

**Verificar:** Alterações persistidas após refresh.

### 3.4 Permissões por Role

| Ação | Admin | Designer | Client |
|------|-------|----------|--------|
| Ver todos os projetos | Sim | Somente atribuídos | Somente próprios |
| Criar projeto | Sim | Não | Não |
| Editar projeto | Sim | Somente atribuídos | Não |
| Deletar projeto | Sim | Não | Não |

---

## 4. Testes de Deliverables

### 4.1 Upload de Arquivo

1. Acesse um projeto
2. Na aba "Deliverables", clique em "Novo Deliverable"
3. Arraste um arquivo para a área de upload (ou clique para selecionar)
4. Tipos aceitos: PNG, JPG, PDF, AI, PSD (máx 50MB)
5. Preencha nome e descrição
6. Clique em "Upload"

**Resultado esperado:**
- Barra de progresso durante upload
- Preview do arquivo após upload
- Deliverable na lista

### 4.2 Versionamento

1. Acesse um deliverable existente
2. Clique em "Nova Versão"
3. Faça upload de novo arquivo
4. Adicione notas da versão

**Resultado esperado:**
- Nova versão criada (v2, v3, etc.)
- Histórico de versões visível
- Versão anterior acessível

### 4.3 Status do Deliverable

Teste as transições de status:

```
draft → pending_review → needs_revision → pending_review → approved
       ↘                              ↗
        rejected → needs_revision →
```

### 4.4 Feedback em Deliverables

1. Acesse um deliverable
2. Clique em "Adicionar Comentário"
3. Se for imagem, clique em um ponto para marcar posição
4. Digite o comentário
5. Envie

**Verificar:**
- Comentário salvo
- Pin marker na posição correta (para imagens)
- Outros usuários recebem notificação

---

## 5. Testes de Integração Miro

### 5.1 Configuração do App Miro

1. Acesse [Miro Developer Portal](https://developers.miro.com)
2. Crie um novo app
3. Configure os scopes:
   - boards:read
   - boards:write
4. Configure redirect URI: `http://localhost:5173/miro/callback`
5. Copie Client ID e Secret para .env.local

### 5.2 Autenticação OAuth Miro

1. Na página de configurações do projeto, clique em "Conectar ao Miro"
2. Autorize o app no popup do Miro
3. Verifique token salvo

### 5.3 Master Timeline (Kanban)

1. Crie um novo board no Miro
2. No projeto, configure o board ID do Master Timeline
3. Acesse a aba "Timeline"

**Resultado esperado:**
- Board carregado no app
- Colunas do Kanban exibidas (Planning, In Progress, Review, Approved)
- Deliverables como sticky notes

### 5.4 Sincronização Bidirecional

| Teste | Ação | Resultado Esperado |
|-------|------|-------------------|
| App → Miro | Mova deliverable no app | Posição atualizada no Miro |
| Miro → App | Mova sticky note no Miro | Status atualizado no app |
| Criar no app | Crie novo deliverable | Sticky note criado no Miro |
| Deletar no app | Delete deliverable | Sticky note removido do Miro |

### 5.5 Brand Workspace

1. Configure o board ID do Brand Workspace
2. Acesse a aba "Workspace"

**Verificar:**
- Frames criados para cada seção
- Logos, paleta de cores, tipografia organizados
- Assets anexados aos frames corretos

---

## 6. Testes de Realtime

### 6.1 Configurar Realtime

No Supabase Dashboard:
1. Vá em Database > Publications
2. Verifique que `supabase_realtime` inclui:
   - projects
   - deliverables
   - deliverable_feedback
   - notifications

### 6.2 Teste de Presença

1. Abra o app em 2 abas/navegadores
2. Faça login com usuários diferentes
3. Acesse o mesmo projeto em ambas

**Resultado esperado:**
- Avatares dos outros usuários visíveis
- Indicador de "Online" atualizado
- Ao fechar uma aba, avatar some da outra

### 6.3 Teste de Atualizações em Tempo Real

**Preparação:** Abra o app em 2 abas com o mesmo projeto.

| Teste | Ação (Tab 1) | Resultado (Tab 2) |
|-------|--------------|-------------------|
| Editar projeto | Mude o status | Status atualizado automaticamente |
| Novo deliverable | Crie deliverable | Aparece na lista |
| Novo feedback | Adicione comentário | Comentário visível |
| Mover no Kanban | Arraste card | Card move automaticamente |

---

## 7. Testes de Notificações

### 7.1 Ícone de Notificação

1. Verifique o sino no header
2. Badge mostra contagem de não lidas
3. Clique abre dropdown

### 7.2 Triggers de Notificação

| Evento | Usuários Notificados |
|--------|---------------------|
| Status do deliverable mudou | Todos do projeto (exceto autor) |
| Novo feedback | Todos do projeto (exceto autor) |
| Projeto atribuído | Designer atribuído |
| Prazo próximo (3 dias) | Todos do projeto |

### 7.3 Ações de Notificação

| Teste | Ação | Resultado |
|-------|------|-----------|
| Marcar como lida | Clique na notificação | Estilo muda, badge atualiza |
| Marcar todas como lidas | Clique em "Marcar todas" | Todas ficam lidas |
| Navegar | Clique em notificação | Vai para página relacionada |
| Deletar | Clique no X | Notificação removida |

---

## 8. Testes do Dashboard e Relatórios

### 8.1 Dashboard Principal

Acesse a rota `/` (Dashboard)

**Verificar:**
- Saudação com nome do usuário
- Métricas carregadas:
  - Projetos Ativos
  - Pendentes de Revisão
  - Atrasados
  - Taxa de Conclusão
- Activity Feed com últimas ações
- Lista de próximos prazos

### 8.2 Métricas por Role

| Métrica | Admin | Designer | Client |
|---------|-------|----------|--------|
| Total projetos | Todos | Atribuídos | Próprios |
| Deliverables | Todos | Atribuídos | Próprios |
| Activity | Todos | Atribuídos | Próprios |

### 8.3 Activity Feed

Verifique que exibe:
- Criação de projetos
- Mudanças de status
- Novos deliverables
- Feedback recebido
- Upload de versões

Cada item deve mostrar:
- Ícone do tipo
- Título da ação
- Tempo relativo ("há 5 minutos")
- Link para o item relacionado

---

## 9. Testes de Performance

### 9.1 Carregamento Inicial

```bash
# Lighthouse no Chrome DevTools
# Target: Performance > 90, LCP < 2.5s
```

### 9.2 Lista com Muitos Itens

1. Crie 50+ projetos via SQL:

```sql
INSERT INTO public.projects (name, client_id, status)
SELECT
  'Projeto ' || generate_series,
  (SELECT id FROM public.users WHERE role = 'client' LIMIT 1),
  'in_progress'
FROM generate_series(1, 50);
```

2. Verifique:
   - Paginação funcionando
   - Scroll suave
   - Filtros rápidos

### 9.3 Upload de Arquivos Grandes

Teste upload de arquivo de ~40MB:
- Barra de progresso precisa
- Não trava a UI
- Cancellation funciona

---

## 10. Testes de Segurança

### 10.1 Row Level Security (RLS)

Teste direto via Supabase:

```sql
-- Como usuário designer, tente acessar projeto de outro designer
-- Deve retornar vazio
SELECT * FROM projects
WHERE id = 'projeto-de-outro-designer';
```

### 10.2 Políticas de Storage

Tente acessar diretamente um arquivo de outro usuário:
- URL direta deve retornar 403
- Download via app deve verificar permissões

### 10.3 Injeção SQL

Teste nos campos de busca/filtro:
- `'; DROP TABLE users; --`
- `" OR "1"="1`

**Resultado esperado:** Nenhum erro, queries tratadas corretamente.

### 10.4 XSS

Teste nos campos de texto:
- `<script>alert('xss')</script>`
- `<img src=x onerror=alert('xss')>`

**Resultado esperado:** Conteúdo escapado, sem execução de script.

---

## 11. Testes de Responsividade

### 11.1 Breakpoints

| Dispositivo | Largura | Verificar |
|-------------|---------|-----------|
| Desktop | 1920px | Layout 3 colunas |
| Laptop | 1366px | Layout 2 colunas |
| Tablet | 768px | Menu colapsável |
| Mobile | 375px | Layout single column, touch-friendly |

### 11.2 Componentes Mobile

- [ ] Menu hamburger funciona
- [ ] Cards empilham verticalmente
- [ ] Formulários ocupam largura total
- [ ] Botões têm área de toque adequada (44px mínimo)
- [ ] Upload funciona com câmera (mobile)

---

## 12. Checklist Final de Testes

### Autenticação
- [ ] Login com credenciais válidas
- [ ] Login com credenciais inválidas
- [ ] Logout
- [ ] Sessão persistente após refresh
- [ ] Redirecionamento de rotas protegidas
- [ ] RBAC funcionando

### Projetos
- [ ] Criar projeto
- [ ] Editar projeto
- [ ] Deletar projeto
- [ ] Filtrar por status
- [ ] Filtrar por prioridade
- [ ] Busca por nome
- [ ] Paginação

### Deliverables
- [ ] Upload de arquivo
- [ ] Preview de imagem
- [ ] Nova versão
- [ ] Histórico de versões
- [ ] Mudança de status
- [ ] Feedback com posição

### Miro Integration
- [ ] OAuth flow
- [ ] Carregar board
- [ ] Kanban drag-and-drop
- [ ] Sync App → Miro
- [ ] Sync Miro → App

### Realtime
- [ ] Presença de usuários
- [ ] Updates automáticos
- [ ] Notificações push

### Dashboard
- [ ] Métricas corretas
- [ ] Activity feed
- [ ] Próximos prazos
- [ ] Performance adequada

### Segurança
- [ ] RLS funcionando
- [ ] Storage policies
- [ ] Input sanitization

### Mobile
- [ ] Responsivo em todos breakpoints
- [ ] Touch interactions

---

## 13. Comandos Úteis para Debug

```bash
# Logs do Vite
npm run dev -- --debug

# Ver queries do React Query
# No DevTools, instale React Query Devtools

# Supabase logs
# Dashboard > Logs > API logs

# Limpar cache
localStorage.clear()
sessionStorage.clear()
```

## 14. Ferramentas Recomendadas

| Ferramenta | Uso |
|------------|-----|
| React DevTools | Inspeção de componentes |
| React Query DevTools | Cache e queries |
| Supabase Studio | Dados e logs |
| Chrome DevTools | Network, Performance |
| Lighthouse | Audit de performance |
| Postman | Testar APIs |

---

## 15. Troubleshooting Comum

### "Usuário não autenticado"
- Verifique token no localStorage
- Verifique expiração da sessão
- Faça logout/login novamente

### "Permissão negada"
- Verifique RLS policies no Supabase
- Confirme role do usuário na tabela users
- Verifique se está logado com usuário correto

### "Miro não conecta"
- Verifique Client ID/Secret
- Confirme redirect URI está correto
- Verifique scopes do app

### "Realtime não atualiza"
- Verifique Publication no Supabase
- Confirme que a tabela está na publication
- Verifique Network tab por WebSocket errors

### "Upload falha"
- Verifique Storage bucket existe
- Confirme políticas de storage
- Verifique tamanho máximo (50MB)

---

**Bons testes!** Se encontrar bugs, documente:
1. Passos para reproduzir
2. Resultado esperado vs. obtido
3. Screenshots/vídeos
4. Console logs
