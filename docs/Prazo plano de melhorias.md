# Prazo: plano de melhorias

Oct 21, 2026 · @Jorito

## Resumo

O plano tem 4 fases e 21 mudanças. A primeira deixa a API pelo menos 3 vezes mais rápida com histórico grande; as outras fecham furos de permissão, de cobrança e de uso no celular.

O projeto já está em bom estado. Typecheck, os 54 testes (47 da API, 7 do site), o lint e o build passam. As 5 telas batem com `reference/screens/` no desktop (1440px) e no celular (390px), sem rolagem horizontal. A trava contra cobrança duplicada funciona: dois `dispatch` seguidos e o segundo volta vazio.

Objetivos do plano:

- **Velocidade estável com o uso**: nenhuma página acima de 150 ms na API com 1 ano de histórico.
- **Regras aplicadas no servidor**: papéis, expiração de lotes e ordem das demandas sem erro 500.
- **Celular completo**: tudo o que o desktop mostra sobre uma pasta também aparece no celular.
- **Terminar o que o README lista como pendente**: importar `.docx`, feriados e deploy.

Regras do projeto respeitadas em todas as fases: a lógica de `reminder-rules.ts` não muda, toda escrita em mais de uma tabela roda em transação, e cada fase só termina com `pnpm typecheck`, `pnpm test` e `pnpm build` passando. Commits pequenos, em português, no branch `claude/sharp-albattani-sa3jg9`.

## Fase 1 — Velocidade

A Fase 1 leva toda rota da API para menos de 150 ms com 1 ano de histórico e corta pela metade as chamadas por página. Hoje a Matriz geral leva 502 ms só na API.

&#91;embedded content: Medido em 21/10/2026 · API local com PGlite · média de 5 pedidos por rota · base grande: 3.014 demandas, 1.834 lotes, 7.310 itens de cobrança\]

A causa é uma só: quase toda rota chama `loadSnapshot`, que lê o banco inteiro a cada pedido, inclusive demandas concluídas e todos os itens de cobrança já enviados. Esse custo cresce cerca de 2 itens por pessoa por dia útil, para sempre. Cada página ainda dispara de 3 a 5 chamadas, e cada clique numa ação redesenha tudo de novo.

| # | Mudança | Onde | O que muda |
| --- | --- | --- | --- |
| 1.1 | Limitar o snapshot | `api/src/common/snapshot.ts` | Carrega só demandas `pending` e os itens de cobrança dessas demandas. Contagens de concluídas, canceladas e prorrogadas saem de um `count ... group by` no SQL. |
| 1.2 | Consultas próprias onde o snapshot sobra | `tasks.service.ts` (`listForMatrix`, `search`) | O filtro Concluídas/Prorrogadas busca só a pasta pedida. A busca lê só id, título e responsável das demandas não canceladas. |
| 1.3 | Um snapshot por pedido em `/overview` | `overview.service.ts` | `listBatches` passa a receber o snapshot já carregado. Sai a consulta `todayRows`: `remindersSentToday` vem dos lotes de hoje. |
| 1.4 | Layout mais leve | `web/src/app/(app)/layout.tsx`, `NewTaskPanel.tsx` | O layout busca só `/me`. Pastas e responsáveis do painel "Nova demanda" são buscados quando o painel abre. |
| 1.5 | Revalidar só o que mudou | `web/src/app/(app)/actions.ts` | Cada ação revalida a página afetada em vez de `revalidatePath("/", "layout")`. Reordenar não revalida: a tela já mostra a nova ordem. |
| 1.6 | Cache curto do login | `supabase-auth.guard.ts` | Guarda por 60 s o resultado de token → membro, para não consultar `members` a cada chamada. Configurar o Supabase com chaves JWT assimétricas, para `getClaims` validar sem ir à rede. |
| 1.7 | Índice para o histórico da demanda | nova migração em `supabase/migrations/` | `create index on reminder_batch_items (task_id)`, usado por `/tasks/:id/history`. |
| 1.8 | Script de carga | `apps/api/scripts/bench` | Gera a base grande usada acima e mede as rotas, para conferir antes e depois. |

**Pronto quando:** todas as rotas ficam abaixo de 150 ms na base grande; a Matriz geral faz no máximo 2 chamadas à API; os 54 testes continuam passando sem edição em `reminder-rules.spec.ts`.

**Cuidado:** a prévia de amanhã precisa dos itens inativos com falha para marcar "nova tentativa". Eles são de demandas pendentes, então continuam no snapshot limitado; um teste de integração vai cobrir isso.

## Fase 2 — Lógica e segurança

A Fase 2 fecha 5 furos: um de permissão, um que deixa demandas sem cobrança para sempre, um erro 500 por clique duplo, ciclos de pré-requisito e o CSV inseguro.

| # | Problema hoje | Onde | Mudança | Teste novo |
| --- | --- | --- | --- | --- |
| 2.1 | O papel `viewer` existe em `members`, mas nenhuma rota confere o papel: um visualizador cria, prorroga e cancela. | `auth/supabase-auth.guard.ts` | Decorador `@Roles('admin','editor')` aplicado a todo `POST`, `PATCH` e `DELETE` do site; `viewer` recebe 403 "Seu acesso é só de leitura.". O site esconde os botões de escrita para `viewer` (o papel já vem em `/me`). | `viewer` lê a Matriz geral e recebe 403 ao prorrogar. |
| 2.2 | Lote que o Make nunca confirma fica `queued` e a reserva continua ativa: a demanda não é cobrada de novo. | `reminders.service.ts` (`dispatch`) | No início do `dispatch`, lotes `queued` de dias anteriores viram `failed` com o erro "Sem confirmação do Make.". O gatilho do banco já libera as reservas, e a cobrança sai de novo nesse dia. | Lote `queued` de ontem é reenviado hoje; `/result` atrasado desse lote recebe 409. |
| 2.3 | Duas criações ao mesmo tempo na mesma pasta calculam a mesma posição; no Postgres real a restrição adiada estoura no commit e o usuário vê erro 500. | `tasks.service.ts` (`create`) | Travar a linha da pasta com `select ... for update` antes de ler `max(position)`. O mesmo em `matrices.service.ts` (`create`). | Teste em Postgres real (não PGlite) com 4 criações em paralelo: posições 1 a 4, nenhum 500. |
| 2.4 | Pré-requisito circular é aceito: A depende de B e B depende de A. | `tasks.service.ts` (`assertPrerequisite`) | Seguir a cadeia de pré-requisitos (no máximo 50 passos) e recusar com "Isso criaria um ciclo: … já depende desta demanda.". | A → B aceito; B → A recusado com 400. |
| 2.5 | O CSV exportado aceita fórmula (título começando com `=`, `+`, `-` ou `@` vira fórmula no Excel), não escapa `\r` e sai só com as demandas abertas. | `web/.../pastas/[slug]/exportar/route.ts` | Prefixar com `'` células que começam com esses caracteres, escapar `\r`, e exportar abertas e concluídas com uma coluna "Situação". | Teste unitário da função `cell`. |

O item 2.1 contraria a seção 11 do `PROMPT.md`, que pede deixar os papéis preparados sem construí-los. Só entra se você aprovar (veja a última seção).

O item 2.3 pede um Postgres de verdade no teste, porque o PGlite tem uma conexão só e não reproduz a disputa. Proposta: um job de CI com o serviço `postgres:16`, rodando os testes de integração com `DATABASE_URL`.

**Pronto quando:** os 5 testes novos passam junto com os 54 atuais.

## Fase 3 — Fluxo e layout

A Fase 3 faz o celular mostrar o que o desktop mostra e tira a busca da fila das gravações. O visual aprovado no `DESIGN.md` não muda.

| # | Problema hoje | Onde | Mudança |
| --- | --- | --- | --- |
| 3.1 | No celular os filtros Abertas / Concluídas / Prorrogadas ficam ocultos (`max-md:hidden`): não dá para ver demandas concluídas nem prorrogadas. | `web/.../pastas/[slug]/page.tsx` | Mostrar os filtros como pílulas com rolagem horizontal dentro do cartão, abaixo do título da pasta, sem rolar a página em 390px. |
| 3.2 | "Exportar" só aparece no desktop. | mesma página | Botão "Exportar" no cabeçalho móvel da pasta (ícone de download, rótulo para leitor de tela). |
| 3.3 | A busca roda como Server Action. O Next executa as ações uma de cada vez, então a busca espera uma gravação em andamento, e vice-versa. Respostas antigas também podem sobrescrever as novas. | `components/SearchBox.tsx` | Rota `GET /buscar?q=` (Route Handler) chamada com `fetch` e `AbortController`; cada tecla cancela a busca anterior. |
| 3.4 | Após uma ação, a tela espera o servidor redesenhar tudo para mostrar o resultado. | `TaskList.tsx`, `ExtendInline.tsx` | `useOptimistic` para concluir, cancelar e prorrogar: a linha muda na hora e volta se a API recusar, com o erro no toast. |
| 3.5 | A saudação ("Bom dia") usa o relógio real, mas "hoje" pode vir fixo de `APP_FIXED_TODAY`. Só afeta o modo local. | `app/(app)/page.tsx` | Nenhuma mudança de código; anotar no README que a saudação segue o relógio real. |

**Texto da mensagem de cobrança:** o modelo do kit escreve "Deadline: hoje, 20/10", com uma palavra em inglês. A regra do projeto proíbe mudar a lógica de `reminder-rules.ts`. Se você quiser "Prazo:", a mudança é só de texto, mas exige editar esse arquivo e o teste do kit que confere a mensagem. Fica como decisão sua (veja a última seção).

**Pronto quando:** as 5 telas continuam sem rolagem horizontal em 390px (conferido com Playwright), e uma demanda concluída é encontrada pelo celular sem usar a busca.

## Fase 4 — Pendências do README

A Fase 4 entrega o que o `PROMPT.md` chama de fases 5 e 6 e ainda está aberto: importar a matriz de um `.docx`, a página de feriados, e o deploy com o cenário do Make.

### 4.1 Importar do Docs (`.docx`)

1. O botão "Importar do Docs" da pasta abre um envio de arquivo `.docx` (até 5 MB).
2. A API recebe em `POST /v1/matrices/:id/import/preview`, lê as tabelas com `mammoth` e mapeia as colunas Ordem, Responsável, Tarefa, Prazo, Pré-requisito e Obs.
3. A tela mostra a prévia linha a linha: o que vira demanda, quem é responsável novo (criado pelo nome), linhas com "Concluído" na Obs. (viram `done`) e linhas com erro (prazo ilegível, tarefa vazia), cada uma com o motivo.
4. "Confirmar" chama `POST /v1/matrices/:id/import` com as linhas aprovadas, tudo numa transação: responsáveis novos, demandas e posições.
5. Testes: um `.docx` de exemplo em `apps/api/test/fixtures/`, com uma linha de cada caso.

Decisão necessária: responsável novo criado pelo nome não tem WhatsApp nem e-mail, e a tabela exige contato para o canal escolhido. Proposta: criar como inativo e listar em "Avisos" na prévia de cobranças até alguém cadastrar o contato.

### 4.2 Página de feriados

- Rota `/feriados`, acessada por um link na página Cobranças (a navegação principal continua com 4 abas).
- Lista por ano, com data, nome e tipo (nacional, ponto facultativo, local); formulário de uma linha para adicionar; remover com confirmação.
- Usa as rotas que já existem (`GET/POST/DELETE /v1/holidays`). Um aviso quando o ano seguinte ainda não tem feriados cadastrados (a migração só cobre até dez/2027).

### 4.3 Deploy e Make

1. Supabase (São Paulo): aplicar a migração e a do índice da Fase 1, sem o `seed.sql`; desligar cadastro público; inserir seu e-mail em `members`.
2. Vercel: o `vercel.json` atual publica `web` e `api` num projeto só, diferente dos dois projetos que o `PROMPT.md` descreve. Manter o projeto único (mesmo domínio, sem CORS) e atualizar o `PROMPT.md`.
3. Make: montar o cenário do `PROMPT.md` (seção 9) e rodar uma vez à mão.
4. Conferência final: demanda vencendo em 2 dias para você mesmo, prévia de amanhã, rodar o cenário, ver a mensagem chegar, rodar de novo e confirmar que nada repete.

Esta parte depende das suas contas (Supabase, Vercel, Make e o provedor de WhatsApp). Eu preparo o código e o roteiro; a criação das contas e das credenciais é sua.

## Execução, riscos e decisões

As fases rodam em ordem, uma por vez, e eu paro no fim de cada uma para você testar, como pede o `PROMPT.md`. Antes de começar, preciso das 6 decisões da tabela abaixo.

### Ordem

1. **Fase 1 — Velocidade.** Vem primeiro porque mexe no carregamento de dados que as outras fases usam. Você confere: as telas com o seed mostram os mesmos números de antes, e o script de carga mostra todas as rotas abaixo de 150 ms.
2. **Fase 2 — Lógica e segurança.** Você confere: os testes novos e um `dispatch` com um lote `queued` do dia anterior.
3. **Fase 3 — Fluxo e layout.** Você confere: no celular, achar uma demanda concluída e exportar o CSV.
4. **Fase 4 — Pendências.** Importação e feriados primeiro; deploy e Make por último, quando as contas existirem.

Cada fase termina com `pnpm typecheck`, `pnpm test`, `pnpm build` e o lint passando, prints em 1440px e 390px comparados com `reference/screens/`, e push no branch `claude/sharp-albattani-sa3jg9`.

### Riscos

| Risco | Fase | Como evitar |
| --- | --- | --- |
| Limitar o snapshot muda algum número na tela (contagens, "nova tentativa" na prévia) | 1 | Testes de integração que comparam as respostas de `/overview`, `/matrices` e `/reminders/preview` antes e depois, com o seed e `APP_FIXED_TODAY=2026-10-20` |
| Lote que o Make enviou mas não confirmou é reenviado no dia seguinte (mensagem duplicada) | 2 | Expirar só lotes de dias anteriores, nunca do dia; mostrar "Sem confirmação do Make" no histórico |
| Documentos `.docx` com tabelas em formatos diferentes do modelo | 4 | A prévia mostra cada linha e o motivo da recusa; nada é gravado sem "Confirmar" |
| Disputa de posição só aparece no Postgres real | 2 | Teste no CI com `postgres:16` |

### Decisões suas

| # | Pergunta | Minha recomendação | Decisão |
| --- | --- | --- | --- |
| D1 | Aplicar os papéis (`viewer` só lê), mesmo o `PROMPT.md` deixando isso para depois? | Sim, só o bloqueio no servidor e os botões escondidos | Pendente |
| D2 | Trocar "Deadline:" por "Prazo:" na mensagem, editando `reminder-rules.ts` e o teste do kit? | Sim; muda só o texto, não a regra | Pendente |
| D3 | Lote sem confirmação do Make: reenviar no dia útil seguinte? | Sim; melhor uma mensagem repetida que uma cobrança perdida | Pendente |
| D4 | Responsável novo vindo do `.docx` sem contato: criar inativo e avisar na prévia? | Sim | Pendente |
| D5 | Vercel: manter o projeto único atual em vez dos dois projetos do `PROMPT.md`? | Sim, e atualizar o `PROMPT.md` | Pendente |
| D6 | Adicionar um job de CI com Postgres real para os testes de integração? | Sim | Pendente |

Marque a coluna Decisão ou comente numa linha; eu começo a Fase 1 assim que D1 a D3 estiverem respondidas.
