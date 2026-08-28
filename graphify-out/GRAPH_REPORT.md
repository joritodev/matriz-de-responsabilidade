# Graph Report - workspace  (2026-08-27)

## Corpus Check
- 125 files · ~89,134 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1224 nodes · 1588 edges · 91 communities (79 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05ac3b47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- actions.ts
- core/src/index.ts
- Especificação funcional — Matriz de Responsabilidade
- 3. Catálogo de entidades
- 06 — Integração WhatsApp (Cloud API)
- Especificação UX/UI operacional
- Roadmap — fatias verticais
- [taskId]/page.tsx
- db/package.json
- 05 — Arquitetura
- 09 — Plano de testes
- 3. Casos de uso
- 04 — Motor de prazos (Deadline Engine)
- 08 — Segurança, threat model e LGPD
- compilerOptions
- scripts
- worker/package.json
- worker/src/index.ts
- 03 — Máquinas de estado
- Brief de produto — Matriz de Responsabilidade
- devDependencies
- config/package.json
- shared/package.json
- compilerOptions
- dependencies
- core/package.json
- 07 — IA para triagem (human-in-the-loop)
- docs/README.md
- compilerOptions
- 3. Opções (escolha de produto, não de gambiarra)
- ai/package.json
- whatsapp/package.json
- ai/tsconfig.json
- config/tsconfig.json
- core/tsconfig.json
- db/tsconfig.json
- shared/tsconfig.json
- whatsapp/tsconfig.json
- web/package.json
- 6.3 Tela da matriz (TanStack Table) — superfície principal
- 6.6 Caixa de Entrada / Central de Pendências (seção 20)
- Runbook — desenvolvimento local
- 10. Efeitos permitidos após JSON válido
- ADR-007 — Sem WhatsApp Web / Baileys / Evolution / WAHA como transporte
- 6. Schema de saída (PROMPT §18)
- 6.5 Dashboard (seção 22)
- 6.9 Configurações mínimas
- ADR-001 — Web local-first e Docker Compose como ambiente de verdade
- ADR-002 — PostgreSQL + Drizzle ORM + migrations versionadas
- ADR-003 — Meta WhatsApp Cloud API oficial e provider abstrato
- ADR-004 — Human-in-the-loop e ações proibidas à IA
- ADR-005 — pg-boss + outbox transacional (sem Redis no MVP)
- ADR-006 — OpenAI Responses API + Structured Outputs + Zod, com fallback sem IA
- Regras de operação dos agentes
- eslint.config.mjs
- app/layout.tsx
- 19. Testes (obrigatórios neste recorte)
- 3. Quando a IA é acionada
- 5. Integração OpenAI (estado atual da API)
- 6.1 Lista de matrizes
- 6. Telas
- 6.7 Cadastro de responsáveis
- 6.8 Formulários de prazo (6 tipos) e `WAITING_FOR_TRIGGER`
- Graphify neste repositório
- Assumptions da FASE 0
- Documentação — Matriz de Responsabilidade
- whatsapp/src/index.ts
- web/README.md
- middleware.ts
- 7. Input da IA (mínimo necessário)
- 9. Persistência: `ai_classifications` e o que **não** guardar
- 6.4 Detalhe da tarefa + timeline (seção 24)
- ai/src/index.ts
- 12. Fallback sem IA (PROMPT §39, A8, A32)
- 14. Resumos para o administrador (PROMPT §21)
- next.config.ts
- @matriz/core
- @matriz/db
- next
- react
- eslint
- postcss.config.mjs
- docker-entrypoint.sh
- PROMPT.md

## God Nodes (most connected - your core abstractions)
1. `3. Casos de uso` - 33 edges
2. `getDb()` - 31 edges
3. `3. Catálogo de entidades` - 25 edges
4. `07 — IA para triagem (human-in-the-loop)` - 23 edges
5. `06 — Integração WhatsApp (Cloud API)` - 21 edges
6. `05 — Arquitetura` - 20 edges
7. `compilerOptions` - 17 edges
8. `compilerOptions` - 16 edges
9. `09 — Plano de testes` - 16 edges
10. `loadTaskRows()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `createDb()`  [EXTRACTED]
  apps/worker/src/index.ts → packages/db/src/client.ts
- `createTaskAction()` --calls--> `assertCanAddDependency()`  [EXTRACTED]
  apps/web/src/lib/actions.ts → packages/core/src/dependency/graph.ts
- `addDependencyAction()` --calls--> `assertCanAddDependency()`  [EXTRACTED]
  apps/web/src/lib/actions.ts → packages/core/src/dependency/graph.ts
- `getEnv()` --calls--> `loadEnv()`  [EXTRACTED]
  apps/web/src/lib/db.ts → packages/config/src/env.ts
- `listMatrices()` --calls--> `computeDeadlineStatus()`  [EXTRACTED]
  apps/web/src/lib/queries.ts → packages/core/src/deadline/status.ts

## Import Cycles
- None detected.

## Communities (91 total, 12 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.06
Nodes (68): GET(), ResponsibleDetailPage(), SettingsPage(), LoginForm(), onSubmit(), LoginPage(), Person, Person (+60 more)

### Community 1 - "core/src/index.ts"
Cohesion: 0.06
Nodes (43): AttentionInput, attentionRank(), DEADLINE_WEIGHT, addBusinessDays(), addCalendarDays(), businessDaysBetween(), CivilDate, formatCivil() (+35 more)

### Community 2 - "Especificação funcional — Matriz de Responsabilidade"
Cohesion: 0.04
Nodes (45): 0. Convenções, 10. Gaps de produto que não bloqueiam arquitetura, 11. Rastreio da qualidade (seção 50) nesta spec, 12. Fora desta spec, 1. Atores, 2.1 Identidade, tenant e arquivo, 2.2 Sequência, ordem e dependência, 2.3 Responsáveis (+37 more)

### Community 3 - "3. Catálogo de entidades"
Cohesion: 0.04
Nodes (45): 02 — Modelo de domínio e banco de dados, 10. Mapeamento eventos de domínio → tabelas, 11. Schema ilustrativo (Drizzle-like), 12.1 Pessoais (identificar, contato ou conteúdo da pessoa), 12.2 Operacionais (em geral não pessoais, salvo se o texto citar pessoa), 12.3 Tratamento no modelo, 12. LGPD — o que é dado pessoal, 13. Invariantes que testes (TDD) devem travar (+37 more)

### Community 4 - "06 — Integração WhatsApp (Cloud API)"
Cohesion: 0.05
Nodes (42): 06 — Integração WhatsApp (Cloud API), 10. Scheduler e ciclo diário, 11. Dev local vs produção, 12. Falhas visíveis e resiliência, 13. Qualidade da conta e rate limit — comportamento do produto, 14. LGPD e dados pessoais, 15. Modelo conceitual (não é migration), 16. Fluxos ponta a ponta (resumo) (+34 more)

### Community 5 - "Especificação UX/UI operacional"
Cohesion: 0.05
Nodes (38): 10. Critério de qualidade (seção 50) — resposta da UI, 11. Riscos de usabilidade, 12. Assumptions e perguntas (não reabrir A1–A36; não fechar Qx), 13. Inventário de telas (entrega), 1.1 Escopo desta spec, 1.2 Fora de escopo (não desenhar agora), 1. Escopo e não-escopo, 2. Princípios operacionais (lei) (+30 more)

### Community 6 - "Roadmap — fatias verticais"
Cohesion: 0.05
Nodes (37): 10. Ordem de TDD (obrigatório), 11. Gate entre fases, 12. O que esta fase **não** entrega, 1. Mapa fases × DoD (§48), 2. FASE 0 — Especificação (esta entrega), 3. FASE 1 — Core (sem WhatsApp, sem IA), 4. FASE 2 — Deadline engine, 5. FASE 3 — WhatsApp (+29 more)

### Community 7 - "[taskId]/page.tsx"
Cohesion: 0.13
Nodes (27): AppLayout(), NAV, MatrixPage(), TaskDetailPage(), MatricesPage(), OverviewPage(), DashboardPage(), ResponsiblesPage() (+19 more)

### Community 8 - "db/package.json"
Cohesion: 0.05
Nodes (36): drizzle-kit, dependencies, bcryptjs, drizzle-orm, @matriz/config, @matriz/core, @matriz/shared, postgres (+28 more)

### Community 9 - "05 — Arquitetura"
Cohesion: 0.06
Nodes (36): 05 — Arquitetura, 10. Autenticação e autorização (A9), 11. Configuração e validação de ENV, 12. Observabilidade, 13.1 IA indisponível (PROMPT §39), 13.2 WhatsApp indisponível, 13.3 Worker indisponível, 13.4 Postgres indisponível (+28 more)

### Community 10 - "09 — Plano de testes"
Cohesion: 0.06
Nodes (34): 09 — Plano de testes, 10. Testing Library — telas críticas, 11. Dados de fixture reutilizáveis, 12. Como rodar localmente, 13. Ordem de implementação dos testes (vertical slices), 14. Qualidade (§50) aplicada ao plano, 15. Lista de testes críticos (resumo executivo), 1.1 Sempre test-first (red → green → refactor) (+26 more)

### Community 11 - "3. Casos de uso"
Cohesion: 0.06
Nodes (33): 3. Casos de uso, UC-01 — Criar matriz, UC-02 — Arquivar e reativar matriz, UC-03 — Listar matrizes (visão Matrizes), UC-04 — Cadastrar responsável, UC-05 — Editar responsável e opt-in, UC-06 — Criar tarefa, UC-07 — Editar tarefa (não destrutivo) (+25 more)

### Community 12 - "04 — Motor de prazos (Deadline Engine)"
Cohesion: 0.06
Nodes (31): 04 — Motor de prazos (Deadline Engine), 10.1 CASO A — `FIXED_DATE`, 10.2 CASO C — `BUSINESS_DAYS_AFTER_DEPENDENCY` (15 úteis), 10.3 CASO D — 3º dia útil de cada mês (`RECURRING_BUSINESS_DAY`), 10. Casos de teste trabalhados (seção 44) — ano 2026, 11. Riscos de modelagem (prazos), 12. Interface conceitual (`packages/core`), 13. Matriz de testes TDD (além de A, C, D) (+23 more)

### Community 13 - "08 — Segurança, threat model e LGPD"
Cohesion: 0.06
Nodes (30): 08 — Segurança, threat model e LGPD, 10. OWASP — issues aplicáveis a este app, 11. Backup (alto nível), 12. O que **não** está no MVP de segurança, 13. Qualidade (PROMPT §50) — checklist deste desenho, 14. Ameaças top (resumo executivo), 1.1 O que protegemos, 1.2 Superfície exposta (+22 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 15 - "scripts"
Cohesion: 0.08
Nodes (25): devDependencies, @types/node, typescript, engines, node, @types/node, typescript, name (+17 more)

### Community 16 - "worker/package.json"
Cohesion: 0.08
Nodes (24): dependencies, @matriz/config, @matriz/db, @matriz/shared, pg-boss, devDependencies, tsx, @types/node (+16 more)

### Community 17 - "worker/src/index.ts"
Cohesion: 0.13
Nodes (13): env, logger, main(), AppConfig, baseSchema, booleanish, loadEnv(), valid (+5 more)

### Community 18 - "03 — Máquinas de estado"
Cohesion: 0.09
Nodes (21): 03 — Máquinas de estado, 10. Assumptions locais, 1.1 O que é proibido à IA, 1.2 Política SYSTEM permitida (conservadora), 1. Atores — o que cada um pode fazer, 2.1 Diagrama, 2.2 Tabela de transições permitidas, 2.3 Transições explicitamente proibidas (+13 more)

### Community 19 - "Brief de produto — Matriz de Responsabilidade"
Cohesion: 0.10
Nodes (20): 10. O que o sistema NÃO faz, 11. Inconsistências do PROMPT tratadas neste brief, 12. Perguntas do dono (respondidas em 27/08/2026), 13. Critério de sucesso (produto), 1. Visão, 2. Problema (o Word de hoje), 3. Objetivo central, 4. Não-objetivos (+12 more)

### Community 20 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint-config-next, @eslint/eslintrc, tailwindcss, @tailwindcss/postcss, @types/bcryptjs, @types/node, @types/react (+11 more)

### Community 21 - "config/package.json"
Cohesion: 0.11
Nodes (18): dependencies, zod, devDependencies, @types/node, typescript, vitest, exports, @types/node (+10 more)

### Community 22 - "shared/package.json"
Cohesion: 0.11
Nodes (18): dependencies, pino, devDependencies, @types/node, typescript, vitest, exports, @types/node (+10 more)

### Community 23 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 24 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, bcryptjs, drizzle-orm, @matriz/config, @matriz/shared, react-dom, @tanstack/react-table, uuid (+9 more)

### Community 25 - "core/package.json"
Cohesion: 0.12
Nodes (15): devDependencies, @types/node, typescript, vitest, exports, @types/node, typescript, vitest (+7 more)

### Community 26 - "07 — IA para triagem (human-in-the-loop)"
Cohesion: 0.14
Nodes (14): 07 — IA para triagem (human-in-the-loop), 11. Prompt versionado (PROMPT §38), 13. Human-in-the-loop — Central de Pendências (PROMPT §20), 15. `suggested_reply` — rascunho, nunca conversa livre, 16. Riscos e mitigações, 17. Observabilidade, 18. Pacotes e FASE, 1. Princípios (+6 more)

### Community 27 - "docs/README.md"
Cohesion: 0.18
Nodes (4): Respostas do dono (Q1–Q5), Agentes, Estado atual, Matriz de Responsabilidade

### Community 28 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, outDir, rootDir, types, extends, include, ES2022 (+3 more)

### Community 29 - "3. Opções (escolha de produto, não de gambiarra)"
Cohesion: 0.18
Nodes (10): 1. Três produtos diferentes (não misturar), 2. Por que pedem CNPJ, 3. Opções (escolha de produto, não de gambiarra), 4. Recomendação para este projeto, Opção A — Recomendada agora: operar sem Cloud API, Opção B — Cloud API direto na Meta (quando houver empresa), Opção C — Cloud API via BSP brasileiro, Opção D — Esperar o CNPJ e só então ligar a FASE 3 (+2 more)

### Community 30 - "ai/package.json"
Cohesion: 0.18
Nodes (10): devDependencies, typescript, exports, typescript, name, private, scripts, typecheck (+2 more)

### Community 31 - "whatsapp/package.json"
Cohesion: 0.18
Nodes (10): devDependencies, typescript, exports, typescript, name, private, scripts, typecheck (+2 more)

### Community 32 - "ai/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 33 - "config/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 34 - "core/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 35 - "db/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 36 - "shared/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 37 - "whatsapp/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 38 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 39 - "6.3 Tela da matriz (TanStack Table) — superfície principal"
Cohesion: 0.22
Nodes (9): 6.3.1 Colunas canônicas (seção 23), 6.3.2 Filtro, busca, sort, 6.3.3 Expand da linha (não é o detalhe completo), 6.3.4 Ações da seção 23 — mapeamento, 6.3.5 Reordenar exibição, 6.3.6 Criar demanda (`+ Demanda`), 6.3.7 Estados da tela da matriz, 6.3.8 Conversa (drawer) (+1 more)

### Community 40 - "6.6 Caixa de Entrada / Central de Pendências (seção 20)"
Cohesion: 0.25
Nodes (8): 6.6.1 Princípio “o sistema NÃO decidiu” (P10, seção 21), 6.6.2 Tipos de item (filas), 6.6.3 Layout master-detail (desktop), 6.6.4 Ações (seção 20) — comportamento exato, 6.6.5 Classificação e sugestão, 6.6.6 Estados da Caixa de Entrada, 6.6 Caixa de Entrada / Central de Pendências (seção 20), O que não fazer no Inbox

### Community 41 - "Runbook — desenvolvimento local"
Cohesion: 0.25
Nodes (7): Backups, ENV (conceitual), Flags, Fluxo esperado na FASE 1, O que `docker compose up` deve subir, Proibido, Runbook — desenvolvimento local

### Community 42 - "10. Efeitos permitidos após JSON válido"
Cohesion: 0.29
Nodes (7): 10.1 Sempre (classificação válida), 10.2 Inbox, 10.3 `suggested_reply`, 10.4 Efeito de sistema: “já entreguei” (PROMPT §19, A14, caso G), 10.5 Efeito de sistema: pedido de prorrogação (PROMPT §12, caso F), 10.6 Lista fechada — a IA / o pós-processamento **nunca**, 10. Efeitos permitidos após JSON válido

### Community 43 - "ADR-007 — Sem WhatsApp Web / Baileys / Evolution / WAHA como transporte"
Cohesion: 0.29
Nodes (6): ADR-007 — Sem WhatsApp Web / Baileys / Evolution / WAHA como transporte, Alternativas rejeitadas, Consequências, Contexto, Decisão, Por que o volume baixo não salva a unofficial

### Community 44 - "6. Schema de saída (PROMPT §18)"
Cohesion: 0.33
Nodes (6): 6.1 Contrato conceitual, 6.2 Semântica dos campos, 6.3 Zod conceitual (fonte do contrato), 6.4 Extração de data (anti-alucinação de prazo), 6.5 Prioridade de classificação (desempate), 6. Schema de saída (PROMPT §18)

### Community 45 - "6.5 Dashboard (seção 22)"
Cohesion: 0.33
Nodes (6): 6.5.1 Cards (exatamente os da seção 22), 6.5.2 Lista “Prioridade de atenção”, 6.5 Dashboard (seção 22), Estados do Dashboard, Hierarquia, O que não fazer no Dashboard

### Community 46 - "6.9 Configurações mínimas"
Cohesion: 0.33
Nodes (6): 6.9.1 Geral — timezone, 6.9.2 Feriados (A21, A22), 6.9.3 Regras de notificação (seção 16), 6.9.4 Destinos de notificação (A30, A24, Q4), 6.9 Configurações mínimas, Estados das configurações

### Community 47 - "ADR-001 — Web local-first e Docker Compose como ambiente de verdade"
Cohesion: 0.33
Nodes (5): ADR-001 — Web local-first e Docker Compose como ambiente de verdade, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 48 - "ADR-002 — PostgreSQL + Drizzle ORM + migrations versionadas"
Cohesion: 0.33
Nodes (5): ADR-002 — PostgreSQL + Drizzle ORM + migrations versionadas, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 49 - "ADR-003 — Meta WhatsApp Cloud API oficial e provider abstrato"
Cohesion: 0.33
Nodes (5): ADR-003 — Meta WhatsApp Cloud API oficial e provider abstrato, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 50 - "ADR-004 — Human-in-the-loop e ações proibidas à IA"
Cohesion: 0.33
Nodes (5): ADR-004 — Human-in-the-loop e ações proibidas à IA, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 51 - "ADR-005 — pg-boss + outbox transacional (sem Redis no MVP)"
Cohesion: 0.33
Nodes (5): ADR-005 — pg-boss + outbox transacional (sem Redis no MVP), Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 52 - "ADR-006 — OpenAI Responses API + Structured Outputs + Zod, com fallback sem IA"
Cohesion: 0.33
Nodes (5): ADR-006 — OpenAI Responses API + Structured Outputs + Zod, com fallback sem IA, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 53 - "Regras de operação dos agentes"
Cohesion: 0.40
Nodes (5): Fases, Graphify (skill de primeira classe), Modelo dos Sub-agents, Papel do agente principal, Regras de operação dos agentes

### Community 54 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 55 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): ibmSans, metadata, sourceSerif

### Community 56 - "19. Testes (obrigatórios neste recorte)"
Cohesion: 0.40
Nodes (5): 19.1 Caso F (PROMPT §44), 19.2 Caso G (PROMPT §44), 19.3 Fixtures de JSON, 19.4 Outros testes de borda, 19. Testes (obrigatórios neste recorte)

### Community 57 - "3. Quando a IA é acionada"
Cohesion: 0.40
Nodes (5): 3.1 Gatilho único no MVP, 3.2 Condições para enfileirar o job, 3.3 Onde a IA é proibida, 3.4 Idempotência do job, 3. Quando a IA é acionada

### Community 58 - "5. Integração OpenAI (estado atual da API)"
Cohesion: 0.40
Nodes (5): 5.1 API e não Chat Completions, 5.2 Regras de Structured Outputs que o schema deve obedecer, 5.3 Recusa, resposta incompleta e reasoning, 5.4 Modelo nunca hardcoded, 5. Integração OpenAI (estado atual da API)

### Community 59 - "6.1 Lista de matrizes"
Cohesion: 0.40
Nodes (5): 6.1 Lista de matrizes, Estados, Formulário “Nova matriz” (dialog ou página curta), Hierarquia de informação, O que não fazer nesta tela

### Community 60 - "6. Telas"
Cohesion: 0.40
Nodes (5): 6.2 Visão Geral (agregada), 6. Telas, Estados, Hierarquia, O que não fazer

### Community 61 - "6.7 Cadastro de responsáveis"
Cohesion: 0.40
Nodes (5): 6.7 Cadastro de responsáveis, Estados, Formulário criar/editar, Lista (`/responsibles`) — tabela, não cards, O que não fazer

### Community 62 - "6.8 Formulários de prazo (6 tipos) e `WAITING_FOR_TRIGGER`"
Cohesion: 0.40
Nodes (5): 6.8.1 Escolha do tipo (rádio vertical com 1 exemplo cada), 6.8.2 Campos por tipo, 6.8.3 Superfície `WAITING_FOR_TRIGGER` (todas as telas), 6.8.4 Form de prorrogação (humano), 6.8 Formulários de prazo (6 tipos) e `WAITING_FOR_TRIGGER`

### Community 63 - "Graphify neste repositório"
Cohesion: 0.40
Nodes (5): Como os agentes DEVEM usar, Como um humano instala no próprio máquina, Graphify neste repositório, O que já está no repo, Quando rebuildar

### Community 64 - "Assumptions da FASE 0"
Cohesion: 0.40
Nodes (4): Assumptions da FASE 0, Decisões travadas, Inconsistências do PROMPT.md e como foram resolvidas, Integração (decisões do agente principal)

### Community 65 - "Documentação — Matriz de Responsabilidade"
Cohesion: 0.40
Nodes (5): ADRs, Documentação — Matriz de Responsabilidade, Gate, Ordem de leitura, Runbooks

### Community 67 - "web/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 69 - "7. Input da IA (mínimo necessário)"
Cohesion: 0.50
Nodes (4): 7.1 Princípio de minimização (LGPD / PII), 7.2 Payload estruturado (user message), 7.3 System prompt, 7. Input da IA (mínimo necessário)

### Community 70 - "9. Persistência: `ai_classifications` e o que **não** guardar"
Cohesion: 0.50
Nodes (4): 9.1 Campos obrigatórios da classificação, 9.2 `input_reference`, 9.3 Proibido persistir, 9. Persistência: `ai_classifications` e o que **não** guardar

### Community 71 - "6.4 Detalhe da tarefa + timeline (seção 24)"
Cohesion: 0.50
Nodes (4): 6.4 Detalhe da tarefa + timeline (seção 24), Confirmar entrega (A14, Q5), Estados do detalhe, Hierarquia (de cima para baixo, uma coluna + trilho)

### Community 73 - "12. Fallback sem IA (PROMPT §39, A8, A32)"
Cohesion: 0.67
Nodes (3): 12.1 Gatilhos de fallback, 12.2 Comportamento obrigatório, 12. Fallback sem IA (PROMPT §39, A8, A32)

### Community 74 - "14. Resumos para o administrador (PROMPT §21)"
Cohesion: 0.67
Nodes (3): 14.1 Frase explícita quando o sistema não decidiu sozinho, 14.2 Templates (derivados do JSON), 14. Resumos para o administrador (PROMPT §21)

## Knowledge Gaps
- **752 isolated node(s):** `__filename`, `__dirname`, `compat`, `eslintConfig`, `nextConfig` (+747 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Especificação UX/UI operacional` connect `Especificação UX/UI operacional` to `6. Telas`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `Especificação funcional — Matriz de Responsabilidade` connect `Especificação funcional — Matriz de Responsabilidade` to `3. Casos de uso`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `07 — IA para triagem (human-in-the-loop)` connect `07 — IA para triagem (human-in-the-loop)` to `7. Input da IA (mínimo necessário)`, `9. Persistência: `ai_classifications` e o que **não** guardar`, `12. Fallback sem IA (PROMPT §39, A8, A32)`, `10. Efeitos permitidos após JSON válido`, `14. Resumos para o administrador (PROMPT §21)`, `6. Schema de saída (PROMPT §18)`, `19. Testes (obrigatórios neste recorte)`, `3. Quando a IA é acionada`, `5. Integração OpenAI (estado atual da API)`, `docs/README.md`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `compat` to the rest of the system?**
  _752 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0630673674151935 - nodes in this community are weakly interconnected._
- **Should `core/src/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062004662004662 - nodes in this community are weakly interconnected._
- **Should `Especificação funcional — Matriz de Responsabilidade` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._