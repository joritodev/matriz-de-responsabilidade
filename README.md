# Prazo

Sistema para supervisionar matrizes de responsabilidade e cobrar automaticamente os responsáveis pelas demandas: todo dia útil às 08:00 o Make chama a API, que monta uma mensagem por pessoa por canal (WhatsApp ou e-mail) com o que vence em até 3 dias ou no próprio dia. A trava no banco garante que ninguém é cobrado duas vezes pela mesma demanda e prazo.

Monorepo pnpm:

| Pasta | O que é |
|---|---|
| `apps/api` | API NestJS 11 + Drizzle (Postgres), validação com zod, login pelo Supabase, rotas do Make protegidas por `x-api-key` |
| `apps/web` | Site Next.js 16 + Tailwind v4: Matriz geral, Pastas, Responsáveis, Cobranças e login |
| `supabase/` | Migração do banco (`migrations/`) e dados de exemplo (`seed.sql`), vindos do kit |
| `apps/api/src/reminders/rules/` | Regra de cobrança do kit, sem alteração, com os 27 testes |
| `PROMPT.md`, `DESIGN.md`, `reference/`, `.cursor/rules/` | O pedido, o visual aprovado e as regras do projeto |

## Rodar localmente

Requisitos: Node 22 ou mais novo e pnpm 10 (`corepack enable`).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

- Site: <http://127.0.0.1:4317>
- API: <http://127.0.0.1:4318/v1/health>

Sem nenhuma credencial, tudo funciona em **modo local**:

- **Banco**: sem `DATABASE_URL`, a API usa o PGlite (Postgres embutido) em `apps/api/.data/pglite`, aplicando a migração e o `seed.sql` na primeira vez. Para recomeçar do zero, apague essa pasta. Com `PGLITE_DATA_DIR=memory` o banco fica só na memória.
- **Login**: sem Supabase, entre com `supervisor@prazo.local` / `prazo-local`. A API aceita o token `dev:<e-mail>` e libera esse e-mail em `members`.
- **Make**: a chave local das rotas do Make é `prazo-local-make-key`.
- **Data fixa**: `APP_FIXED_TODAY=2026-10-20` faz as telas baterem com as referências do seed. Apague a linha para usar a data real. Em produção ela é ignorada.

Para simular a cobrança das 08:00 como o Make faria:

```bash
curl -X POST http://127.0.0.1:4318/v1/reminders/dispatch -H "x-api-key: prazo-local-make-key"
# confirmar um lote enviado (ou "failed" com "error")
curl -X POST http://127.0.0.1:4318/v1/reminders/batches/<id>/result \
  -H "x-api-key: prazo-local-make-key" -H "Content-Type: application/json" \
  -d '{"status":"sent","providerMessageId":"teste","makeExecutionId":"1"}'
```

## Verificações

```bash
pnpm typecheck   # TypeScript nos dois apps
pnpm test        # 47 testes da API (inclui os 27 da regra do kit) + testes do site
pnpm build       # build de produção da API e do site
```

Os testes de integração sobem a API inteira com um banco PGlite em memória: cobrança repetida, `dispatch` em paralelo sem duplicar, falha com nova tentativa no dia útil seguinte, idempotência do `/result`, prorrogação liberando as reservas, login e validações.

## Publicar

1. **Supabase**: crie o projeto (região São Paulo). Aplique a migração com `supabase link` + `supabase db push`, ou cole `supabase/migrations/20261021000000_init.sql` no SQL Editor. **Não** rode o `seed.sql` em produção. Desligue o cadastro público, crie seu usuário em Authentication e insira seu e-mail em `members`:
   ```sql
   insert into public.members (email, role) values ('seu-email@exemplo.com', 'admin');
   ```
2. **Vercel, API**: novo projeto com Root Directory `apps/api` (NestJS é detectado sozinho). Variáveis: `DATABASE_URL` (pooler de **transação**, porta 6543), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MAKE_API_KEY` (gere com `openssl rand -hex 32`), `WEB_ORIGIN` (URL do site), `APP_TIME_ZONE=America/Fortaleza`.
3. **Vercel, site**: segundo projeto do mesmo repositório com Root Directory `apps/web`. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` (URL da API).
4. **Make**: cenário "Cobrança diária de prazos" (ver `PROMPT.md`, seção 9, e `reference/screens/07-cenario-make.png`): agenda de segunda a sexta às 08:00, `POST /v1/reminders/dispatch` com `x-api-key`, Iterator em `batches`, Router por canal, envio pelo provedor de WhatsApp ou Gmail/Microsoft 365, e `POST /v1/reminders/batches/{id}/result` com `sent` ou, na rota de erro, `failed` + Ignore.
5. **Conferência**: entre no site, crie uma pasta, um responsável com seu WhatsApp e uma demanda vencendo daqui a 2 dias; abra a Prévia de amanhã; rode o cenário; veja a mensagem chegar e o histórico atualizar; rode de novo e confirme que nada repete.

Em produção a API se recusa a subir sem `DATABASE_URL`, e o login local fica desligado.

## Credenciais que faltam

| Onde | Variável | Para quê |
|---|---|---|
| API | `DATABASE_URL` | Banco do Supabase (pooler de transação) |
| API | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Validar o login |
| API e Make | `MAKE_API_KEY` | Proteger as rotas que o Make chama |
| Site | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` | Login e endereço da API |
| Make | conta do provedor de WhatsApp, Gmail ou Microsoft 365 | Enviar as mensagens (ficam só no Make) |

## Ainda não feito

- Importar a matriz de um `.docx` (fase 6). O botão "Importar do Docs" aparece desativado. A exportação em CSV, nas mesmas colunas do documento, já funciona.
- Página de feriados (fase 6). As rotas `GET/POST/DELETE /v1/holidays` já existem.
- Deploy e cenário do Make (fase 5), que dependem das contas acima.
