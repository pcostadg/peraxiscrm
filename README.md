# Peraxis CRM

CRM em Next.js 16 com autenticação Supabase, isolamento por Row Level Security e módulos de leads, atendimento, projetos, financeiro, campanhas e agentes.

## Recursos implementados

- Supabase Auth com sessão SSR em cookies e renovação via `proxy.ts`.
- Autorização validada no layout e novamente em cada Server Action.
- RLS por usuário em todas as tabelas expostas.
- Dashboard alimentado por dados reais.
- CRUD de leads, projetos e lançamentos financeiros.
- Contatos e conversas, com envio de texto pela WhatsApp Cloud API.
- Endpoint de webhook Meta com verificação de token e assinatura SHA-256.
- Campanhas, agentes e visualização da equipe.
- Páginas de erro, interface responsiva e componentes reutilizáveis.

## Configuração inicial

1. Copie `.env.example` para `.env.local` e preencha as credenciais.
2. No painel do Supabase, abra **SQL Editor**.
3. Execute todo o arquivo `supabase/migrations/202606220001_initial_crm.sql`.
4. Em **Authentication > Users**, crie o primeiro usuário por e-mail e senha.
5. Instale e execute o projeto:

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` e entre com o usuário criado no Supabase. As antigas credenciais `root` foram removidas.

## WhatsApp Cloud API

Configure em `.env.local`:

- `META_APP_SECRET` e `META_VERIFY_TOKEN` para o webhook.
- `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID` e `META_GRAPH_API_VERSION` para envio.
- URL de callback no painel da Meta: `https://SEU_DOMINIO/api/webhooks/meta`.

O endpoint valida `x-hub-signature-256` antes de persistir o evento. O token permanente nunca deve usar o prefixo `NEXT_PUBLIC_`.

## Validação e produção

```bash
npm run test       # TypeScript + ESLint
npm run build      # build de produção
npm run check      # todos os checks
npm run start      # servidor de produção
```

Antes do deploy, aplique a migração no ambiente de produção, cadastre as variáveis no provedor e confirme a URL do webhook. `.env.local` está ignorado pelo Git.

## Estrutura

```text
src/
├── app/
│   ├── api/webhooks/meta/   # webhook oficial da Meta
│   ├── login/              # autenticação
│   └── painel/             # módulos autenticados
├── components/              # layout e componentes UI
├── lib/
│   ├── meta/              # cliente WhatsApp
│   └── supabase/          # clientes browser, servidor e admin
├── types/
└── proxy.ts                # renovação da sessão
supabase/migrations/            # schema, triggers e políticas RLS
```

Versões antigas permanecem preservadas em `.archive/legacy`, fora da compilação.
