# Graph Report - workspace  (2026-08-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 619 nodes · 619 edges · 39 communities (37 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc93f56d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38

## God Nodes (most connected - your core abstractions)
1. `3. Casos de uso` - 33 edges
2. `3. Catálogo de entidades` - 25 edges
3. `07 — IA para triagem (human-in-the-loop)` - 23 edges
4. `06 — Integração WhatsApp (Cloud API)` - 21 edges
5. `05 — Arquitetura` - 20 edges
6. `09 — Plano de testes` - 16 edges
7. `02 — Modelo de domínio e banco de dados` - 15 edges
8. `04 — Motor de prazos (Deadline Engine)` - 15 edges
9. `08 — Segurança, threat model e LGPD` - 15 edges
10. `Brief de produto — Matriz de Responsabilidade` - 14 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (39 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (49): 07 — IA para triagem (human-in-the-loop), 11. Prompt versionado (PROMPT §38), 12.1 Gatilhos de fallback, 12.2 Comportamento obrigatório, 12. Fallback sem IA (PROMPT §39, A8, A32), 13. Human-in-the-loop — Central de Pendências (PROMPT §20), 14.1 Frase explícita quando o sistema não decidiu sozinho, 14.2 Templates (derivados do JSON) (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (45): 0. Convenções, 10. Gaps de produto que não bloqueiam arquitetura, 11. Rastreio da qualidade (seção 50) nesta spec, 12. Fora desta spec, 1. Atores, 2.1 Identidade, tenant e arquivo, 2.2 Sequência, ordem e dependência, 2.3 Responsáveis (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (42): 06 — Integração WhatsApp (Cloud API), 10. Scheduler e ciclo diário, 11. Dev local vs produção, 12. Falhas visíveis e resiliência, 13. Qualidade da conta e rate limit — comportamento do produto, 14. LGPD e dados pessoais, 15. Modelo conceitual (não é migration), 16. Fluxos ponta a ponta (resumo) (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (38): 10. Critério de qualidade (seção 50) — resposta da UI, 11. Riscos de usabilidade, 12. Assumptions e perguntas (não reabrir A1–A36; não fechar Qx), 13. Inventário de telas (entrega), 1.1 Escopo desta spec, 1.2 Fora de escopo (não desenhar agora), 1. Escopo e não-escopo, 2. Princípios operacionais (lei) (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (37): 10. Ordem de TDD (obrigatório), 11. Gate entre fases, 12. O que esta fase **não** entrega, 1. Mapa fases × DoD (§48), 2. FASE 0 — Especificação (esta entrega), 3. FASE 1 — Core (sem WhatsApp, sem IA), 4. FASE 2 — Deadline engine, 5. FASE 3 — WhatsApp (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (36): 05 — Arquitetura, 10. Autenticação e autorização (A9), 11. Configuração e validação de ENV, 12. Observabilidade, 13.1 IA indisponível (PROMPT §39), 13.2 WhatsApp indisponível, 13.3 Worker indisponível, 13.4 Postgres indisponível (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (34): 09 — Plano de testes, 10. Testing Library — telas críticas, 11. Dados de fixture reutilizáveis, 12. Como rodar localmente, 13. Ordem de implementação dos testes (vertical slices), 14. Qualidade (§50) aplicada ao plano, 15. Lista de testes críticos (resumo executivo), 1.1 Sempre test-first (red → green → refactor) (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (33): 3. Casos de uso, UC-01 — Criar matriz, UC-02 — Arquivar e reativar matriz, UC-03 — Listar matrizes (visão Matrizes), UC-04 — Cadastrar responsável, UC-05 — Editar responsável e opt-in, UC-06 — Criar tarefa, UC-07 — Editar tarefa (não destrutivo) (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (31): 04 — Motor de prazos (Deadline Engine), 10.1 CASO A — `FIXED_DATE`, 10.2 CASO C — `BUSINESS_DAYS_AFTER_DEPENDENCY` (15 úteis), 10.3 CASO D — 3º dia útil de cada mês (`RECURRING_BUSINESS_DAY`), 10. Casos de teste trabalhados (seção 44) — ano 2026, 11. Riscos de modelagem (prazos), 12. Interface conceitual (`packages/core`), 13. Matriz de testes TDD (além de A, C, D) (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (30): 08 — Segurança, threat model e LGPD, 10. OWASP — issues aplicáveis a este app, 11. Backup (alto nível), 12. O que **não** está no MVP de segurança, 13. Qualidade (PROMPT §50) — checklist deste desenho, 14. Ameaças top (resumo executivo), 1.1 O que protegemos, 1.2 Superfície exposta (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (26): 3.10 `deadline_occurrences` *(extra justificado)*, 3.11 `deadline_extensions`, 3.12 `task_notes`, 3.13 `task_status_history`, 3.14 `conversations`, 3.15 `messages`, 3.16 `prompt_versions` *(extra justificado)*, 3.17 `ai_classifications` (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (21): 03 — Máquinas de estado, 10. Assumptions locais, 1.1 O que é proibido à IA, 1.2 Política SYSTEM permitida (conservadora), 1. Atores — o que cada um pode fazer, 2.1 Diagrama, 2.2 Tabela de transições permitidas, 2.3 Transições explicitamente proibidas (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (20): 10. O que o sistema NÃO faz, 11. Inconsistências do PROMPT tratadas neste brief, 12. Perguntas do dono (respondidas em 27/08/2026), 13. Critério de sucesso (produto), 1. Visão, 2. Problema (o Word de hoje), 3. Objetivo central, 4. Não-objetivos (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (19): 02 — Modelo de domínio e banco de dados, 10. Mapeamento eventos de domínio → tabelas, 11. Schema ilustrativo (Drizzle-like), 12.1 Pessoais (identificar, contato ou conteúdo da pessoa), 12.2 Operacionais (em geral não pessoais, salvo se o texto citar pessoa), 12.3 Tratamento no modelo, 12. LGPD — o que é dado pessoal, 13. Invariantes que testes (TDD) devem travar (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (10): 1. Três produtos diferentes (não misturar), 2. Por que pedem CNPJ, 3. Opções (escolha de produto, não de gambiarra), 4. Recomendação para este projeto, Explicitamente fora, Opção A — Recomendada agora: operar sem Cloud API, Opção B — Cloud API direto na Meta (quando houver empresa), Opção C — Cloud API via BSP brasileiro (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (9): 6.3.1 Colunas canônicas (seção 23), 6.3.2 Filtro, busca, sort, 6.3.3 Expand da linha (não é o detalhe completo), 6.3.4 Ações da seção 23 — mapeamento, 6.3.5 Reordenar exibição, 6.3.6 Criar demanda (`+ Demanda`), 6.3.7 Estados da tela da matriz, 6.3.8 Conversa (drawer) (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (8): 6.6.1 Princípio “o sistema NÃO decidiu” (P10, seção 21), 6.6.2 Tipos de item (filas), 6.6.3 Layout master-detail (desktop), 6.6.4 Ações (seção 20) — comportamento exato, 6.6.5 Classificação e sugestão, 6.6.6 Estados da Caixa de Entrada, 6.6 Caixa de Entrada / Central de Pendências (seção 20), O que não fazer no Inbox

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (7): Backups, ENV (conceitual), Flags, Fluxo esperado na FASE 1, O que `docker compose up` deve subir, Proibido, Runbook — desenvolvimento local

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (7): 10.1 Sempre (classificação válida), 10.2 Inbox, 10.3 `suggested_reply`, 10.4 Efeito de sistema: “já entreguei” (PROMPT §19, A14, caso G), 10.5 Efeito de sistema: pedido de prorrogação (PROMPT §12, caso F), 10.6 Lista fechada — a IA / o pós-processamento **nunca**, 10. Efeitos permitidos após JSON válido

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (5): Fases, Graphify (skill de primeira classe), Modelo dos Sub-agents, Papel do agente principal, Regras de operação dos agentes

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (6): 6.5.1 Cards (exatamente os da seção 22), 6.5.2 Lista “Prioridade de atenção”, 6.5 Dashboard (seção 22), Estados do Dashboard, Hierarquia, O que não fazer no Dashboard

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (6): 6.9.1 Geral — timezone, 6.9.2 Feriados (A21, A22), 6.9.3 Regras de notificação (seção 16), 6.9.4 Destinos de notificação (A30, A24, Q4), 6.9 Configurações mínimas, Estados das configurações

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (5): ADR-001 — Web local-first e Docker Compose como ambiente de verdade, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): ADR-002 — PostgreSQL + Drizzle ORM + migrations versionadas, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (5): ADR-003 — Meta WhatsApp Cloud API oficial e provider abstrato, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (5): ADR-004 — Human-in-the-loop e ações proibidas à IA, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (5): ADR-005 — pg-boss + outbox transacional (sem Redis no MVP), Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): ADR-006 — OpenAI Responses API + Structured Outputs + Zod, com fallback sem IA, Alternativas rejeitadas, Consequências, Contexto, Decisão

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (5): 6.1 Lista de matrizes, Estados, Formulário “Nova matriz” (dialog ou página curta), Hierarquia de informação, O que não fazer nesta tela

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (5): 6.2 Visão Geral (agregada), 6. Telas, Estados, Hierarquia, O que não fazer

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (5): 6.7 Cadastro de responsáveis, Estados, Formulário criar/editar, Lista (`/responsibles`) — tabela, não cards, O que não fazer

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (5): 6.8.1 Escolha do tipo (rádio vertical com 1 exemplo cada), 6.8.2 Campos por tipo, 6.8.3 Superfície `WAITING_FOR_TRIGGER` (todas as telas), 6.8.4 Form de prorrogação (humano), 6.8 Formulários de prazo (6 tipos) e `WAITING_FOR_TRIGGER`

### Community 33 - "Community 33"
Cohesion: 0.40
Nodes (5): Como os agentes DEVEM usar, Como um humano instala no próprio máquina, Graphify neste repositório, O que já está no repo, Quando rebuildar

### Community 34 - "Community 34"
Cohesion: 0.40
Nodes (4): Assumptions da FASE 0, Decisões travadas, Inconsistências do PROMPT.md e como foram resolvidas, Integração (decisões do agente principal)

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (5): ADRs, Documentação — Matriz de Responsabilidade, Gate, Ordem de leitura, Runbooks

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (4): 6.4 Detalhe da tarefa + timeline (seção 24), Confirmar entrega (A14, Q5), Estados do detalhe, Hierarquia (de cima para baixo, uma coluna + trilho)

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (3): Agentes, Estado atual, Matriz de Responsabilidade

## Knowledge Gaps
- **496 isolated node(s):** `Modelo dos Sub-agents`, `Papel do agente principal`, `Fases`, `Graphify (skill de primeira classe)`, `PAPEL` (+491 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Especificação UX/UI operacional` connect `Community 3` to `Community 30`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `Especificação funcional — Matriz de Responsabilidade` connect `Community 1` to `Community 7`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Why does `07 — IA para triagem (human-in-the-loop)` connect `Community 0` to `Community 16`, `Community 19`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **What connects `Modelo dos Sub-agents`, `Papel do agente principal`, `Fases` to the rest of the system?**
  _496 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._