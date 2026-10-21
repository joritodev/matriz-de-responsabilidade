# Prazo: construir o projeto

Você vai construir o **Prazo**, um sistema para supervisionar matrizes de responsabilidade e cobrar automaticamente os responsáveis pelas demandas. Este arquivo é o pedido completo. Leia tudo uma vez, depois execute **uma fase por vez** (seção 12) e pare em cada checkpoint para eu testar.

Arquivos deste pacote que você deve usar:

| Caminho | O que é | Como usar |
|---|---|---|
| `DESIGN.md` | Tokens, componentes, estados, responsivo | Fonte de verdade visual |
| `reference/screens/*.png` | Telas aprovadas | Comparar o resultado com elas, lado a lado |
| `reference/html/*.html` | As mesmas telas em HTML estático | Copiar valores exatos de CSS; não é para colar o HTML no app |
| `starter/reminders/` | Regra de cobrança pronta e testada (27 testes) | Copiar para a API sem mudar a lógica |
| `starter/supabase/migrations/` | Esquema do banco, validado em Postgres 16 | Mover para `supabase/migrations/` |
| `starter/supabase/seed.sql` | Dados de exemplo iguais às telas | Só em desenvolvimento |
| `.cursor/rules/` | Regras permanentes do projeto | Já são lidas automaticamente |

---

## 1. O problema

Hoje a matriz fica num documento do Google Docs com as colunas **Ordem, Responsável, Tarefa, Prazo, Possui pré-requisito?, Obs.** O supervisor coloca os prazos e cobra cada responsável à mão.

O Prazo guarda as matrizes e demandas e, todo dia útil às 08:00, cobra por WhatsApp ou e-mail quem tem demanda chegando: uma vez **até 3 dias antes** e outra **no dia do prazo**. Duas coisas não podem acontecer nunca:

1. a mesma demanda ser cobrada duas vezes no mesmo dia;
2. uma demanda ser cobrada longe do prazo.

O supervisor lê as respostas e, se for o caso, prorroga o prazo com motivo. No futuro (fora deste escopo) uma IA vai ler as respostas e o chefe vai aprovar prorrogações.

Quem usa agora é uma pessoa só; depois o produto pode ser vendido ao contratante, então **precisa parecer um produto feito com cuidado, não um template**.

## 2. Stack

- **Monorepo pnpm** com `apps/web` e `apps/api`. Node 22 LTS ou mais novo.
- **Web:** Next.js 16 (App Router, versão estável mais nova, no mínimo com o patch de segurança de 14/10/2026), React 19, Tailwind CSS v4, TypeScript. `@supabase/ssr` só para login. Formulários com `react-hook-form` + `zod`. Ícones `@phosphor-icons/react`. Fonte Onest via `next/font/google`.
- **API:** NestJS 11, TypeScript, Drizzle ORM + `postgres` (postgres.js), `zod`, `@supabase/supabase-js` (só para validar o token), Jest ou Vitest.
- **Banco e login:** Supabase (Postgres + Auth), região São Paulo.
- **Hospedagem:** Vercel, dois projetos apontando para o mesmo repositório (`apps/web` e `apps/api`).
- **Automação:** Make, chamando a API todo dia útil às 08:00.

Estrutura esperada:

```
prazo/
├─ apps/
│  ├─ web/                      Next.js
│  │  └─ src/
│  │     ├─ app/
│  │     │  ├─ (auth)/login/page.tsx
│  │     │  ├─ (app)/layout.tsx          TopNav no desktop, BottomTabBar no celular
│  │     │  ├─ (app)/page.tsx            Matriz geral
│  │     │  ├─ (app)/pastas/page.tsx     redireciona para a primeira pasta
│  │     │  ├─ (app)/pastas/[slug]/page.tsx
│  │     │  ├─ (app)/responsaveis/page.tsx
│  │     │  └─ (app)/cobrancas/page.tsx
│  │     ├─ components/                  um arquivo por componente do DESIGN.md
│  │     ├─ lib/api.ts                   cliente da API (envia o token do Supabase)
│  │     ├─ lib/api-types.ts
│  │     ├─ lib/folder-colors.ts
│  │     └─ middleware.ts                exige login nas rotas (app)
│  └─ api/                      NestJS
│     └─ src/
│        ├─ main.ts                      entrada (Vercel detecta src/main.ts)
│        ├─ app.module.ts
│        ├─ db/ (schema.ts, client.ts)
│        ├─ auth/ (supabase-auth.guard.ts, make-key.guard.ts)
│        ├─ matrices/  assignees/  tasks/  overview/  holidays/
│        └─ reminders/
│           ├─ rules/reminder-rules.ts       ← copiado de starter/reminders
│           ├─ rules/reminder-rules.spec.ts  ← copiado de starter/reminders
│           ├─ reminders.controller.ts
│           └─ reminders.service.ts
├─ supabase/
│  ├─ migrations/20261021000000_init.sql
│  └─ seed.sql
├─ DESIGN.md
├─ reference/
└─ pnpm-workspace.yaml
```

## 3. Variáveis de ambiente

`apps/api/.env`:

| Nome | Exemplo | Para quê |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` | Pooler de **transação** do Supabase (painel → Connect). Usar `prepare: false` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Validar o token de login |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Cliente do supabase-js usado só no `getClaims` |
| `MAKE_API_KEY` | 64 caracteres aleatórios | Cabeçalho `x-api-key` das rotas do Make |
| `WEB_ORIGIN` | `https://prazo.vercel.app` | CORS |
| `APP_TIME_ZONE` | `America/Fortaleza` | Fuso de "hoje" |
| `APP_FIXED_TODAY` | `2026-10-20` | **Só em desenvolvimento**, para reproduzir as telas com o seed. Ignorar em produção |

`apps/web/.env.local`:

| Nome | Exemplo |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `NEXT_PUBLIC_API_URL` | `https://prazo-api.vercel.app` |

Gerar `.env.example` nos dois apps. Nenhuma chave no repositório.

## 4. Banco

O esquema está pronto em `starter/supabase/migrations/20261021000000_init.sql`. Leia o arquivo inteiro antes de escrever o `schema.ts` do Drizzle, que deve espelhá-lo exatamente: mesmos nomes, tipos, enums e restrições. Pontos importantes:

- `matrices`: as pastas. `slug` vai na URL, `color` escolhe a paleta (8 opções), `position` ordena.
- `assignees`: o banco recusa canal sem o contato correspondente.
- `tasks`: `position` é a "Ordem" da matriz original (única por matriz, adiável para reordenar). `has_prerequisite` é calculado. `completed_at` precisa existir quando `status = 'done'`.
- `task_due_date_changes`: toda mudança de prazo. `kind = 'extension'` (prorrogação, motivo obrigatório) ou `'correction'` (corrigir digitação).
- `holidays`: dias sem cobrança. Já vem com feriados nacionais de out/2026 a dez/2027.
- `reminder_batches` (uma mensagem para uma pessoa num canal) e `reminder_batch_items` (quais demandas foram nela). O índice único `reminder_items_once` é a trava contra cobrança repetida. O gatilho `reminder_batches_status_guard` faz com que um lote que falhou libere suas reservas.
- `members`: e-mails que podem entrar no site.
- RLS ligado em tudo e **sem políticas**: o navegador nunca lê o banco direto. Tudo passa pela API.

## 5. Regra de cobrança

Copie `starter/reminders/reminder-rules.ts` e o `.spec.ts` para `apps/api/src/reminders/rules/` **sem mudar a lógica**. Os testes descrevem cada caso. Em resumo:

- Só roda em dia útil (segunda a sexta, fora de `holidays`). "Hoje" é a data em America/Fortaleza.
- **No dia (`due`)**: no dia do prazo; se o prazo cair em fim de semana ou feriado, no dia útil anterior.
- **Antecipada (`early`)**: a partir do primeiro dia útil entre D-3 e D-1 que seja antes da cobrança "no dia". Se fim de semana e feriado ocuparem essa janela, recua para D-4 ou D-5, nunca além. Continua elegível até a véspera da cobrança "no dia" (cobre demanda criada tarde e envio que falhou), mas a reserva garante que só sai uma vez.
- Uma demanda nunca recebe as duas no mesmo dia (`due` tem prioridade).
- Agrupa por responsável e canal: **uma mensagem por pessoa por canal por dia**. Canal `both` gera duas.
- Prorrogou? O `due_date` muda, a reserva antiga deixa de bater (`due_date_snapshot`) e as duas cobranças voltam a valer sozinhas.
- O texto da mensagem é gerado por `buildReminderMessage` (formato combinado com o usuário; ver `reference/screens/09-mensagens.png`).

## 6. API

Prefixo `/v1`. Rotas do site exigem `Authorization: Bearer <access token do Supabase>`. O guard valida com `supabase.auth.getClaims(token)` (verifica localmente pelas chaves públicas em `/auth/v1/.well-known/jwks.json`; se o projeto usar a chave HS256 antiga, ele consulta o servidor de Auth) e exige que o e-mail do token esteja em `members`. Rotas do Make exigem `x-api-key`. Erros sempre como `{ "message": "texto em português para a tela", "code": "..." }`.

### Visão geral (Matriz geral)

`GET /v1/overview` → tudo que a tela 01 precisa numa chamada:

```json
{
  "today": "2026-10-20",
  "greeting": { "dueToday": 2, "dueNext3Days": 4, "remindersSentToday": true },
  "days": [{ "date": "2026-10-19", "folderColors": [] }, { "date": "2026-10-20", "folderColors": ["lilac", "peach"] }],
  "folders": [{ "id": "…", "name": "Geral", "slug": "geral", "color": "lilac", "openCount": 5, "nextDueDate": "2026-10-20", "alert": { "kind": "overdue", "count": 1 }, "assigneeInitials": ["MA", "BT"] }],
  "ruler": {
    "columns": ["2026-10-19", "2026-10-20", "…10 dias úteis…"],
    "groups": [{ "folderId": "…", "name": "Geral", "color": "lilac", "rows": [
      { "taskId": "…", "title": "Atualizar a Assinatura Suprema no Site", "assigneeName": "Matheus Araújo", "initials": "MA",
        "dueDate": "2026-10-20", "earlyDate": "2026-10-19", "status": { "kind": "today" },
        "early": "sent", "due": "sent" } ] }]
  },
  "todayBatches": [{ "id": "…", "assigneeName": "…", "channel": "whatsapp", "kind": "due", "status": "sent", "summary": "…", "sentAt": "…", "error": null }],
  "tomorrow": { "date": "2026-10-21", "count": 2, "summary": "Matheus (no dia) e Rafael (nova tentativa)" }
}
```

Estados de cada cobrança na régua (`early` e `due`): `sent`, `planned`, `failed`, `queued`, `none`. A régua mostra os **10 próximos dias úteis a partir do dia útil anterior a hoje**, mais as demandas atrasadas no topo do grupo. `earlyDate` vem de `earlyReminderDate`.

### Matrizes

- `GET /v1/matrices` → lista com contagens (igual a `folders` acima).
- `POST /v1/matrices` `{ name, color, description? }` → cria com `slug` gerado do nome (sem acento, minúsculo, hífens; se existir, sufixo `-2`) e `position` no fim.
- `PATCH /v1/matrices/:id` `{ name?, color?, description?, isArchived? }`
- `POST /v1/matrices/reorder` `{ ids: [] }`

### Demandas

- `GET /v1/matrices/:slug/tasks?filter=open|done|extended` → linhas da tela 02, cada uma com `position`, `title`, `assignee`, `dueDate`, `prerequisite` (`{ taskId, title } | { note } | null`), `status`, `reminders: { early, due }` e `lastChange`.
- `POST /v1/matrices/:id/tasks` `{ title, assigneeId, dueDate, prerequisiteTaskId?, prerequisiteNote?, notes? }` → entra no fim da ordem. Prazo no passado: recusar com "O prazo precisa ser hoje ou depois."
- `PATCH /v1/tasks/:id` `{ title?, assigneeId?, notes?, prerequisiteTaskId?, prerequisiteNote? }` (nunca o prazo).
- `POST /v1/tasks/:id/extend` `{ newDueDate, reason, approvedBy? }` → transação: grava `task_due_date_changes` (`extension`) e atualiza `due_date`. Novo prazo tem que ser depois do atual.
- `POST /v1/tasks/:id/correct-due-date` `{ newDueDate, reason? }` → mesma coisa com `kind = 'correction'`.
- `POST /v1/tasks/:id/complete`, `/reopen`, `/cancel`.
- `POST /v1/matrices/:id/tasks/reorder` `{ taskIds: [] }` → reescreve `position` em uma transação.
- `GET /v1/tasks/:id/history` → criação, mudanças de prazo e cobranças, em ordem.
- `GET /v1/search?q=` → demandas e pessoas, agrupadas por pasta (mínimo 2 letras).

### Responsáveis

- `GET /v1/assignees` → com `openCount`, `nextDue` e `folderColors`.
- `POST /v1/assignees` `{ fullName, whatsapp?, email?, reminderChannel }` → normalizar WhatsApp para só dígitos com DDI (aceitar "+55 (11) 99812-4470").
- `PATCH /v1/assignees/:id` (inclui `isActive`).

### Cobranças

- `GET /v1/reminders/batches?from&to&assigneeId&status` → histórico agrupado por dia (tela 04), com `messageBody`.
- `GET /v1/reminders/preview?date=` → o que sairia nessa data (padrão: próximo dia útil), calculado com `planReminders` **sem reservar**. Inclui `skipped` com motivo.
- `POST /v1/reminders/dispatch` (**Make**, `x-api-key`) →
  1. calcula `today`; se não for dia útil, devolve `{ "date": "...", "batches": [] }`;
  2. carrega demandas `pending` com responsável e matriz, feriados e reservas ativas (`is_active = true`);
  3. roda `planReminders`;
  4. para cada lote, abre um savepoint e insere `reminder_batches` (`queued`) e seus `reminder_batch_items`; em `unique_violation` desfaz o savepoint e pula aquele lote (outra execução já reservou);
  5. responde:
  ```json
  { "date": "2026-10-20", "batches": [
    { "id": "uuid", "channel": "whatsapp", "to": "5511996305518", "assigneeName": "Larissa Menezes", "subject": null, "body": "Bom dia, Larissa. …" }
  ], "skipped": [] }
  ```
- `POST /v1/reminders/batches/:id/result` (**Make**) `{ status: "sent" | "failed", providerMessageId?, error?, makeExecutionId? }` → atualiza o lote. `failed` exige `error`. O gatilho do banco libera as reservas. Repetir a mesma chamada com o mesmo status responde 200 (idempotente); trocar o status de um lote finalizado responde 409.

Lote `queued` há mais de 2 horas aparece na interface como "sem confirmação" (não reenvia sozinho).

### Feriados

- `GET /v1/holidays`, `POST /v1/holidays` `{ date, name, kind }`, `DELETE /v1/holidays/:date`. Sem tela desenhada: fase 6.

### Testes da API

Além dos testes copiados da regra, escreva testes de integração contra um banco local (`supabase start`) para: dispatch duas vezes seguidas devolve vazio na segunda; dispatch concorrente (duas chamadas em paralelo) não gera reserva duplicada; `result failed` faz a demanda voltar no dia útil seguinte; prorrogação grava histórico e libera as cobranças.

## 7. Telas

Antes de cada tela, abra a imagem e o HTML de referência. O resultado precisa ficar visualmente igual. Tirar print da sua versão em 1440px e em 390px e comparar com a referência é parte da tarefa.

| Rota | Referência | O que precisa funcionar |
|---|---|---|
| `/` Matriz geral | `01-matriz-geral-desktop.png`, celular `05-celular-matriz-geral.png` | Saudação com contagens reais; tira de 7 dias úteis com pontos das pastas que vencem em cada dia (clicar filtra a régua para aquele dia); cartões de pasta (clicar abre a pasta; "Nova pasta" vira formulário inline com nome e as 8 cores); régua de prazos (`DeadlineRuler`) com barras do dia da antecipada até o prazo e os pontos de cobrança; "Cobranças de hoje" e o resumo de amanhã com link para a prévia. No celular, a régua é trocada pela lista "Vence logo" |
| `/pastas/[slug]` | `02-pasta-desktop.png`, celular `06-celular-pasta.png` | Abas das pastas; nome, contagem, "Importar do Docs" (fase 6) e "Exportar" (CSV com as colunas da matriz original); formulário rápido (Enter lança e mantém o foco no título); filtros Abertas/Concluídas/Prorrogadas; linhas com `ReminderTrack` e chip; clicar numa linha abre a edição inline com prorrogação, histórico, concluir e cancelar; arrastar para reordenar no desktop. No celular, cartões com `DateTile` e o mesmo bloco de prorrogação |
| `/responsaveis` | `03-responsaveis-desktop.png` | Cartões; "Novo responsável" abre um cartão em modo edição no início da grade; editar inline; seletor de canal salva na hora; desativar pessoa com confirmação; quadradinhos das pastas onde a pessoa tem demanda aberta |
| `/cobrancas` | `04-cobrancas-desktop.png` | Abas "Enviadas" e "Prévia de amanhã"; lista agrupada por dia; selecionar mostra a mensagem exata no balão de WhatsApp (ou o e-mail com assunto); a prévia mostra também os avisos (`skipped`) como "Sem WhatsApp cadastrado" |
| `/login` | sem imagem | Fundo canvas, cartão branco raio 24 com a marca, "Entrar no Prazo", e-mail, senha, botão primário. Erro inline: "E-mail ou senha incorretos." Se o e-mail não estiver em `members`: "Seu acesso ainda não foi liberado." |

Partes globais:

- **"Nova demanda" no topo** (desktop) e **botão flutuante** (celular): abre um painel com Pasta, Tarefa, Responsável, Prazo e Pré-requisito. No desktop é um popover ancorado no botão; no celular, uma folha que sobe de baixo. Dentro de uma pasta, a pasta já vem escolhida.
- **Busca no topo**: resultados num popover agrupados por pasta; Enter abre a demanda na pasta, já expandida.
- **Datas**: o campo de prazo aceita "23/10", "23/10/2026" e o seletor nativo de data; mostra o dia da semana ao lado ("sexta").
- **Esqueletos e estados vazios** exatamente como em DESIGN.md (seção Estados).

## 8. Login e acesso

- Supabase Auth com e-mail e senha. Cadastro público **desligado** (Authentication → Sign In / Providers → desmarcar "Allow new users to sign up").
- O usuário é criado pelo painel do Supabase (Authentication → Users → Add user) e o e-mail é inserido em `members` com papel `admin`.
- `middleware.ts` do Next renova a sessão (`@supabase/ssr`) e manda para `/login` quem não estiver logado.
- O web chama a API enviando o access token da sessão. Server Components buscam dados no servidor; mutações por Server Actions que chamam a API e fazem `revalidatePath`.

## 9. Make

Cenário "Cobrança diária de prazos" (ver `reference/screens/07-cenario-make.png`):

1. **Schedule**: dias da semana, segunda a sexta, 08:00. Conferir o fuso da organização no Make (America/Fortaleza).
2. **HTTP → Make a request**: `POST {API}/v1/reminders/dispatch`, cabeçalho `x-api-key`, resposta JSON.
3. **Iterator** em `batches`.
4. **Router** com dois caminhos, filtro `channel = whatsapp` e `channel = email`.
5. **WhatsApp**: módulo HTTP do provedor escolhido (texto livre: `to` e `body`). **E-mail**: Gmail ou Microsoft 365 "Send an email" com `subject` e `body`.
6. **HTTP**: `POST {API}/v1/reminders/batches/{id}/result` com `{ "status": "sent", "providerMessageId": "...", "makeExecutionId": "{{executionId}}" }`.
7. **Rota de erro** nos módulos de envio: HTTP para o mesmo `/result` com `status: "failed"` e a mensagem de erro, seguida de **Ignore** para o Iterator continuar com as outras pessoas.

As credenciais do provedor de WhatsApp ficam só no Make, nunca na API.

## 10. Deploy

1. **Supabase**: criar projeto (região South America, São Paulo). Aplicar a migração (`supabase link` + `supabase db push`, ou colar no SQL Editor). **Não** rodar `seed.sql` em produção. Desligar cadastro público, criar o usuário e inserir em `members`.
2. **Vercel, API**: novo projeto do repositório com Root Directory `apps/api`. O NestJS é detectado sem configuração (entrada em `src/main.ts` com `app.listen(process.env.PORT ?? 3000)`). Não pôr `"framework": null` no `vercel.json`. Configurar as variáveis da seção 3. Habilitar CORS para `WEB_ORIGIN`.
3. **Vercel, Web**: segundo projeto do mesmo repositório com Root Directory `apps/web` e as variáveis do web.
4. **Make**: criar o cenário com a URL da API de produção e a `MAKE_API_KEY`. Rodar uma vez manualmente num dia com demandas de teste.
5. **Conferência final**: logar, criar pasta, responsável com seu próprio WhatsApp, demanda vencendo daqui a 2 dias; abrir a prévia de amanhã; rodar o cenário; ver a mensagem chegar e o histórico atualizar; rodar de novo e confirmar que nada repete.

## 11. Fora do escopo agora

Ler respostas com IA, aprovação de prorrogação pelo chefe, acesso dos responsáveis ao site, tema escuro, notificações push. Deixe o código pronto para crescer (papéis em `members`, campo `approved_by`), mas não construa.

## 12. Fases

Ao terminar cada fase: `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build` passando, e um resumo curto do que foi feito e do que eu devo testar. **Pare e espere meu ok antes da fase seguinte.**

**Fase 1: base.** Monorepo pnpm, apps criados, Supabase local (`supabase init` + `supabase start`), migração e seed aplicados, Drizzle espelhando o SQL, guards de login e do Make, regra de cobrança copiada com os 27 testes passando.
*Checkpoint:* `pnpm --filter api test` verde; `GET /v1/overview` com `APP_FIXED_TODAY=2026-10-20` devolve as contagens da tela 01 (2 vencem hoje, 4 nos próximos 3 dias).

**Fase 2: API completa.** Todas as rotas da seção 6, com validação e mensagens em português, e os testes de integração de cobrança.
*Checkpoint:* chamar `dispatch` duas vezes (inclusive em paralelo) e mostrar que a segunda vem vazia; `result failed` e a prévia do dia seguinte mostrando a nova tentativa.

**Fase 3: telas no desktop.** Layout, TopNav, as 4 telas e o login, com dados reais da API, estados de carregando, vazio e erro.
*Checkpoint:* prints em 1440px das 4 telas ao lado das referências 01 a 04 com o seed e `APP_FIXED_TODAY=2026-10-20`.

**Fase 4: celular e acabamento.** BottomTabBar, botão flutuante, lista "Vence logo", pasta em cartões, folha de nova demanda, foco de teclado, `prefers-reduced-motion`, nenhuma rolagem horizontal em 390px.
*Checkpoint:* prints em 390px ao lado das referências 05 e 06.

**Fase 5: deploy.** Seção 10 completa e um README com como rodar local e como publicar.
*Checkpoint:* links de produção e a conferência final do passo 5.

**Fase 6: extras.** Importar a matriz de um `.docx` (upload, ler as tabelas com `mammoth`, prévia das linhas mapeadas para Ordem, Responsável, Tarefa, Prazo, Pré-requisito, Obs.; "Concluído" na Obs. vira `done`; responsáveis novos criados pelo nome; confirmar para gravar) e uma página simples de feriados.

Se algo deste documento estiver em conflito com o código que você encontrar, ou se uma decisão não estiver coberta aqui, pergunte antes de inventar.
